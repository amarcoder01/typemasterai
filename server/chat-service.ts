import OpenAI from "openai";
import * as cheerio from "cheerio";
import { AIProjectClient } from "@azure/ai-projects";
import { ClientSecretCredential } from "@azure/identity";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Azure AI Foundry Client Setup
let azureClient: AIProjectClient | null = null;
let cachedBingGroundingAgentId: string | null = null;

function getAzureClient(): AIProjectClient {
  if (!azureClient) {
    const projectEndpoint = process.env.AZURE_PROJECT_ENDPOINT;
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!projectEndpoint || !tenantId || !clientId || !clientSecret) {
      throw new Error("Azure AI Foundry credentials not configured");
    }

    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    azureClient = new AIProjectClient(projectEndpoint, credential);
    console.log("[Azure AI Foundry] Client initialized successfully");
  }
  return azureClient;
}

// Initialize Bing Grounding Agent at startup (creates once, reuses across searches)
async function getOrCreateBingGroundingAgent(): Promise<string> {
  if (cachedBingGroundingAgentId) {
    return cachedBingGroundingAgentId;
  }

  const client = getAzureClient();
  const agentsClient = client.agents;
  const modelDeployment = process.env.AZURE_MODEL_DEPLOYMENT || "gpt-4o-mini";
  const connectionId = process.env.AZURE_BING_CONNECTION_ID;

  if (!connectionId) {
    throw new Error("AZURE_BING_CONNECTION_ID not configured");
  }

  try {
    const agent = await agentsClient.createAgent(modelDeployment, {
      name: "bing-search-agent",
      instructions: `You are a web search agent. Your ONLY job is to:
1. Use Bing search to find relevant, current information
2. Extract and return search results in a structured format
3. Include titles, URLs, and snippets from the search

Return results as a JSON array with this exact structure:
[{"title": "...", "url": "...", "snippet": "..."}]

Be concise and focus only on factual search results.`,
      tools: [
        {
          type: "bing_grounding",
          bingGrounding: {
            searchConfigurations: [{ connectionId }],
          },
        },
      ],
    });

    cachedBingGroundingAgentId = agent.id;
    console.log(`[Azure Bing Grounding] Agent created and cached: ${agent.id}`);
    return agent.id;
  } catch (error) {
    console.error("[Azure Bing Grounding] Failed to create agent:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface ScrapedData {
  title: string;
  content: string;
  url: string;
}

interface SearchDecision {
  shouldSearch: boolean;
  searchQuery: string;
  reason: string;
}

async function scrapeWebPage(url: string): Promise<ScrapedData | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    $("script, style, nav, footer, iframe, noscript, header, aside, [role='navigation'], [role='banner'], .advertisement, .ads, .sidebar").remove();

    const title = $("title").text() || $("h1").first().text();
    
    const mainContent = $("article, main, .content, .post-content, .entry-content, .article-content, .blog-post, [role='main']").first();
    const container = mainContent.length ? mainContent : $("body");
    
    const headings = container.find("h1, h2, h3")
      .map((_, el) => `### ${$(el).text().trim()}`)
      .get()
      .filter((text) => text.length > 4);
    
    const paragraphs = container.find("p, li, td, dd, blockquote")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((text) => 
        text.length > 20 && 
        !text.toLowerCase().includes("cookie") && 
        !text.toLowerCase().includes("privacy policy") &&
        !text.toLowerCase().includes("terms of service") &&
        !text.toLowerCase().includes("subscribe") &&
        !text.toLowerCase().includes("sign up") &&
        !text.toLowerCase().includes("newsletter") &&
        !text.toLowerCase().includes("advertisement")
      )
      .slice(0, 30);

    let content = "";
    let charCount = 0;
    const maxChars = 6000;
    
    for (let i = 0; i < paragraphs.length && charCount < maxChars; i++) {
      const para = paragraphs[i];
      if (charCount + para.length <= maxChars) {
        content += para + "\n\n";
        charCount += para.length + 2;
      } else {
        content += para.substring(0, maxChars - charCount) + "...";
        break;
      }
    }

    return {
      title: title.trim(),
      content: content.trim(),
      url,
    };
  } catch (error) {
    return null;
  }
}

async function searchWithBing(query: string): Promise<SearchResult[]> {
  let threadId: string | null = null;
  
  try {
    console.log(`[Azure Bing Grounding] Starting search for: "${query}"`);
    const startTime = Date.now();

    // Get or create cached agent (avoids requiring write permissions on every search)
    const agentId = await getOrCreateBingGroundingAgent();
    console.log(`[Azure Bing Grounding] Using agent: ${agentId}`);

    const client = getAzureClient();
    const agentsClient = client.agents;

    // Create thread
    const thread = await agentsClient.threads.create();
    threadId = thread.id;
    console.log(`[Azure Bing Grounding] Thread created: ${threadId}`);

    // Send search message
    await agentsClient.messages.create(
      threadId,
      "user",
      `Search for: ${query}\n\nReturn the top 10 search results as a JSON array with title, url, and snippet for each result.`
    );

    // Create and poll run
    const runResponse = await agentsClient.runs.create(threadId, agentId);
    console.log(`[Azure Bing Grounding] Run created: ${runResponse.id}`);

    // Poll for completion (max 30 seconds)
    const maxPollTime = 30000;
    const pollInterval = 1000;
    let pollCount = 0;
    let run = runResponse;

    while (
      run.status === "queued" ||
      run.status === "in_progress" ||
      run.status === "requires_action"
    ) {
      if (Date.now() - startTime > maxPollTime) {
        console.error("[Azure Bing Grounding] Timeout waiting for run completion");
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      run = await agentsClient.runs.get(threadId, run.id);
      pollCount++;

      if (pollCount % 5 === 0) {
        console.log(`[Azure Bing Grounding] Run status: ${run.status} (${pollCount}s)`);
      }
    }

    console.log(`[Azure Bing Grounding] Final run status: ${run.status} after ${Date.now() - startTime}ms`);

    if (run.status === "completed") {
      // Retrieve messages
      const messages = agentsClient.messages.list(threadId);
      const messagesArray = [];
      
      for await (const msg of messages) {
        messagesArray.push(msg);
      }

      // Find assistant's response
      const assistantMessage = messagesArray.find((m) => m.role === "assistant");

      if (assistantMessage && assistantMessage.content && assistantMessage.content.length > 0) {
        const content = assistantMessage.content[0];
        
        if (content.type === "text") {
          const textContent = content as any;
          const responseText = textContent.text?.value || "";
          console.log(`[Azure Bing Grounding] Response received: ${responseText.substring(0, 200)}...`);

          // Try to parse JSON from the response
          try {
            // Extract JSON array from the response (handle markdown code blocks)
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const results = JSON.parse(jsonMatch[0]);
              if (Array.isArray(results)) {
                console.log(`[Azure Bing Grounding] ✅ Parsed ${results.length} search results`);
                
                return results.slice(0, 10).map((r: any) => ({
                  title: r.title || "",
                  url: r.url || "",
                  snippet: r.snippet || r.description || "",
                }));
              }
            }
          } catch (parseError) {
            console.error("[Azure Bing Grounding] Failed to parse JSON from response");
          }

          // Fallback: create synthetic results from the response
          console.log("[Azure Bing Grounding] Using fallback result extraction");
          
          return [{
            title: "Search Results",
            url: "https://www.bing.com/search?q=" + encodeURIComponent(query),
            snippet: responseText.substring(0, 300),
          }];
        }
      }
    } else if (run.status === "failed") {
      console.error(`[Azure Bing Grounding] Run failed: ${run.lastError?.message || "Unknown error"}`);
    }

    return [];
  } catch (error) {
    console.error(`[Azure Bing Grounding] Search error:`, error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(`[Azure Bing Grounding] Stack trace:`, error.stack);
    }
    return [];
  } finally {
    // Always clean up thread, even on errors (agent is cached and reused)
    if (threadId) {
      try {
        const client = getAzureClient();
        await client.agents.threads.delete(threadId);
        console.log(`[Azure Bing Grounding] Thread ${threadId} deleted`);
      } catch (cleanupError) {
        // Ignore cleanup errors - thread will expire eventually
        console.warn(`[Azure Bing Grounding] Thread cleanup warning:`, cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
      }
    }
  }
}

async function searchWithTavily(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        include_answer: false,
        max_results: 5,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`[Tavily] API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.substring(0, 300) || "",
    }));
  } catch (error) {
    console.error("[Tavily] Search error:", error);
    return [];
  }
}

async function searchWithDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    $(".result, .web-result").each((i, elem) => {
      if (i >= 6) return false;

      const titleElem = $(elem).find(".result__a, .result-link");
      const title = titleElem.text().trim();
      const href = titleElem.attr("href") || "";
      const snippet = $(elem).find(".result__snippet, .result-snippet").text().trim();

      let url = "";
      if (href.includes("uddg=")) {
        try {
          const uddg = new URL(href, "https://duckduckgo.com").searchParams.get("uddg");
          url = uddg ? decodeURIComponent(uddg) : "";
        } catch {
          url = "";
        }
      } else if (href.startsWith("http")) {
        url = href;
      } else {
        const urlText = $(elem).find(".result__url").text().trim();
        if (urlText) url = urlText.startsWith("http") ? urlText : `https://${urlText}`;
      }

      if (title && url && url.startsWith("http")) {
        results.push({ title, url, snippet });
      }
    });

    return results;
  } catch (error) {
    console.error("DuckDuckGo search error:", error);
    return [];
  }
}

async function generateSearchQueries(originalQuery: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a search query optimization expert. Your job is to generate HIGHLY RELEVANT, FOCUSED search queries that stay EXACTLY on topic.

CRITICAL RULES:
1. **STAY ON TOPIC**: Every query must be 100% relevant to the user's exact question
2. **NO TANGENTS**: Don't broaden the scope or add unrelated topics
3. **EXTRACT CORE INTENT**: Understand what the user really wants to know
4. **BE SPECIFIC**: Include exact entities, dates, names mentioned by user
5. **MAINTAIN CONTEXT**: Keep all important qualifiers (e.g., "top", "best", "latest", "2024")
6. **REMOVE FLUFF**: Strip phrases like "give me info about", "tell me about"
7. **OPTIMIZE FOR RELEVANCE**: Each query should find highly relevant results only

Query Generation Strategy:
- Query 1: Most specific version (exact entities + qualifiers + time)
- Query 2: Slightly broader but still focused (synonyms, alternative phrasing)
- Query 3: Different angle but same core topic (e.g., reviews, comparisons, technical details)

WRONG Examples (TOO BROAD):
User asks: "top AI coding tools 2024"
❌ Bad: ["AI tools", "artificial intelligence applications", "machine learning software"]
✅ Good: ["best AI coding assistants 2024", "top AI code generation tools comparison 2024", "leading AI programming tools reviews 2024"]

Respond with JSON only:
{
  "queries": ["highly specific query 1", "focused query 2", "relevant query 3"]
}`,
        },
        {
          role: "user",
          content: `Generate optimized search queries for: ${originalQuery}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 250,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    const queries = result.queries && Array.isArray(result.queries) && result.queries.length > 0 
      ? result.queries 
      : [originalQuery];
    console.log(`[DeepSearch] Generated ${queries.length} search queries:`, queries);
    return queries.slice(0, 3);
  } catch (error) {
    console.error("Query generation error:", error);
    return [originalQuery];
  }
}

export async function performWebSearch(query: string): Promise<{ results: SearchResult[]; content: string }> {
  console.log(`[WebSearch] Searching for: "${query}"`);
  
  // Only use Bing Grounding
  const results = await searchWithBing(query);
  
  if (results.length === 0) {
    console.warn("[WebSearch] No results found from Bing Grounding");
    return { results: [], content: "" };
  }
  
  console.log(`[WebSearch] Found ${results.length} results via Bing Grounding`);

  let extractedContent = "";
  const scrapedUrls: string[] = [];

  for (let i = 0; i < Math.min(results.length, 8); i++) {
    const result = results[i];
    try {
      const scraped = await scrapeWebPage(result.url);
      if (scraped && scraped.content && scraped.content.length > 100) {
        extractedContent += `\n\n---\n**Source ${i + 1}: ${scraped.title}**\nURL: ${result.url}\n\n${scraped.content}\n`;
        scrapedUrls.push(result.url);
        console.log(`[WebSearch] Scraped ${scraped.content.length} chars from ${result.url}`);
        if (extractedContent.length > 30000) break;
      }
    } catch (error) {
      console.log(`[WebSearch] Failed to scrape ${result.url}`);
    }
  }

  console.log(`[WebSearch] Scraped ${scrapedUrls.length} pages successfully. Total content: ${extractedContent.length} chars`);

  if (extractedContent.length === 0 && results.length > 0) {
    for (let i = 0; i < Math.min(results.length, 6); i++) {
      const result = results[i];
      extractedContent += `\n\n---\n**Source ${i + 1}: ${result.title}**\nURL: ${result.url}\n\n${result.snippet}\n`;
    }
    console.log(`[WebSearch] Using snippets as fallback. Total content: ${extractedContent.length} chars`);
  }

  return { results, content: extractedContent };
}

export async function performDeepWebSearch(query: string): Promise<{ results: SearchResult[]; content: string }> {
  console.log(`[DeepSearch] Starting deep search for: "${query}"`);
  
  const startTime = Date.now();
  const MAX_TOTAL_TIME = 60000;
  
  const queries = await generateSearchQueries(query);
  
  const allResults: SearchResult[] = [];
  const seenUrls = new Set<string>();
  
  for (const searchQuery of queries) {
    if (Date.now() - startTime > MAX_TOTAL_TIME) {
      console.log(`[DeepSearch] Reached time limit, stopping query execution`);
      break;
    }
    
    console.log(`[DeepSearch] Executing query: "${searchQuery}"`);
    
    // Only use Bing Grounding
    const queryResults = await searchWithBing(searchQuery);
    if (queryResults.length > 0) {
      console.log(`[DeepSearch] Found ${queryResults.length} results via Bing Grounding for "${searchQuery}"`);
    }
    
    for (const result of queryResults) {
      if (!seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        allResults.push(result);
      }
    }
    
    if (allResults.length >= 15) break;
  }
  
  console.log(`[DeepSearch] Total unique results: ${allResults.length}`);
  
  if (allResults.length === 0) {
    console.log("[DeepSearch] No results found");
    return { results: [], content: "" };
  }
  
  let extractedContent = "";
  const scrapedUrls: string[] = [];
  const maxPages = Math.min(allResults.length, 10);
  
  for (let i = 0; i < maxPages; i++) {
    if (Date.now() - startTime > MAX_TOTAL_TIME) {
      console.log(`[DeepSearch] Reached time limit, stopping scrape`);
      break;
    }
    
    const result = allResults[i];
    try {
      const scraped = await scrapeWebPage(result.url);
      if (scraped && scraped.content && scraped.content.length > 100) {
        extractedContent += `\n\n---\n**Source ${scrapedUrls.length + 1}: ${scraped.title}**\nURL: ${result.url}\n\n${scraped.content}\n`;
        scrapedUrls.push(result.url);
        console.log(`[DeepSearch] Scraped ${scraped.content.length} chars from ${result.url}`);
        
        if (extractedContent.length > 40000) {
          console.log(`[DeepSearch] Reached content limit (40k chars), stopping scrape`);
          break;
        }
      }
    } catch (error) {
      console.log(`[DeepSearch] Failed to scrape ${result.url}`);
    }
  }
  
  console.log(`[DeepSearch] Scraped ${scrapedUrls.length} pages successfully. Total content: ${extractedContent.length} chars. Total time: ${Date.now() - startTime}ms`);
  
  if (extractedContent.length === 0 && allResults.length > 0) {
    for (let i = 0; i < Math.min(allResults.length, 10); i++) {
      const result = allResults[i];
      extractedContent += `\n\n---\n**Source ${i + 1}: ${result.title}**\nURL: ${result.url}\n\n${result.snippet}\n`;
    }
    console.log(`[DeepSearch] Using snippets as fallback. Total content: ${extractedContent.length} chars`);
  }
  
  return { results: allResults.slice(0, 10), content: extractedContent };
}

export async function decideIfSearchNeeded(message: string): Promise<SearchDecision> {
  const lowerMessage = message.toLowerCase();

  const urlPattern = /\b(?:https?:\/\/)?(?:www\.)?[\w-]+\.(?:com|org|net|io|co|ai|dev|app|info|edu|gov)\b/i;
  if (urlPattern.test(message)) {
    const urlMatch = message.match(urlPattern);
    return {
      shouldSearch: true,
      searchQuery: urlMatch ? urlMatch[0] : message,
      reason: "URL detected - fetching content",
    };
  }

  const quickTriggers = [
    "search", "websearch", "web search", "look up", "lookup", "find", "google",
    "latest", "current", "recent", "news", "today", "now", "update",
    "2024", "2025", "this week", "this month", "this year",
    "price", "cost", "stock", "weather", "score",
    "what is", "what are", "who is", "who are", "which are", "which is",
    "top", "best", "ranking", "list", "comparison", "compare",
    "new", "breaking", "trending", "popular", "hot",
  ];
  
  const hasQuickTrigger = quickTriggers.some(t => lowerMessage.includes(t));
  if (hasQuickTrigger) {
    console.log(`[AI Search] Quick trigger detected: searching for "${message}"`);
    return {
      shouldSearch: true,
      searchQuery: message.replace(/perform\s+a?\s*web\s*search\s+(and\s+)?/gi, "").replace(/search\s+for\s+/gi, "").trim(),
      reason: "Quick trigger keyword detected",
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a search decision agent. You should be VERY AGGRESSIVE about triggering searches - when in doubt, SEARCH.

ALWAYS SEARCH for (be generous):
- ANY question asking "what is", "what are", "who is", "which are", "top X", "best X", "list of"
- Current events, news, or information that could be recent (after 2023)
- Real-time data: stock prices, weather, sports scores, crypto prices, market data
- Specific products, companies, tools, libraries, frameworks, or services
- Technical documentation, APIs, or specific implementations
- Factual claims, statistics, or data that could be verified
- Questions about specific websites, apps, or online platforms
- Pricing, reviews, or comparisons
- Information about people, organizations, or events
- Technology topics, AI models, coding tools, programming languages
- Anything with years 2024, 2025 or later
- Questions that benefit from fresh/current information

ONLY SKIP SEARCH for:
- Pure creative writing requests (poems, stories with no factual basis)
- Basic math calculations
- Simple logical reasoning with no external facts needed
- Personal advice based on subjective opinion only

When in doubt → SEARCH. Prioritize recency and accuracy.

Respond with JSON only:
{
  "search": true/false,
  "query": "optimized search query (remove phrases like 'perform a web search', 'search for')",
  "reason": "brief reason"
}`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0,
      max_tokens: 150,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    
    return {
      shouldSearch: result.search === true,
      searchQuery: result.query || message,
      reason: result.reason || "",
    };
  } catch (error) {
    console.error("Search decision error:", error);
    
    return {
      shouldSearch: true,
      searchQuery: message,
      reason: "Fallback - default to search on error",
    };
  }
}

export function shouldPerformWebSearch(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  const urlPattern = /\b(?:https?:\/\/)?(?:www\.)?[\w-]+\.(?:com|org|net|io|co|ai|dev|app|info|edu|gov)\b/i;
  if (urlPattern.test(message)) {
    return true;
  }

  const explicitSearchTriggers = [
    "search for", "search about", "google", "look up", "lookup",
    "find online", "find on the web", "web search", "search the web",
    "search the internet", "what is the latest", "current news",
  ];

  const freshnessTriggers = [
    "current", "latest", "recent", "news", "today", "this week",
    "this month", "this year", "2024", "2025", "update on",
    "updates on", "what's new", "breaking", "price of", "stock price",
    "weather in", "who won", "score of",
  ];

  const hasExplicitSearch = explicitSearchTriggers.some((trigger) => lowerMessage.includes(trigger));
  const hasFreshnessTrigger = freshnessTriggers.some((trigger) => lowerMessage.includes(trigger));

  return hasExplicitSearch || hasFreshnessTrigger;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamEvent {
  type: "searching" | "search_complete" | "content" | "sources" | "done" | "error";
  data?: any;
}

export async function* streamChatCompletionWithSearch(
  messages: ChatMessage[],
  useAISearch: boolean = true
): AsyncGenerator<StreamEvent, void, unknown> {
  let searchData: { results: SearchResult[]; content: string } = { results: [], content: "" };
  let searchQuery = "";

  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "user") {
      if (useAISearch) {
        yield { type: "searching", data: { status: "deciding" } };
        
        const decision = await decideIfSearchNeeded(lastMessage.content);
        console.log(`[AI Search] Decision: ${decision.shouldSearch ? "SEARCH" : "NO SEARCH"} - ${decision.reason}`);
        
        if (decision.shouldSearch) {
          searchQuery = decision.searchQuery;
          yield { type: "searching", data: { status: "searching", query: searchQuery } };
          
          searchData = await performDeepWebSearch(searchQuery);
          
          if (searchData.results.length > 0) {
            yield { 
              type: "search_complete", 
              data: { 
                results: searchData.results.slice(0, 10),
                query: searchQuery 
              } 
            };
          }
        }
      } else {
        const quickCheck = shouldPerformWebSearch(lastMessage.content);
        if (quickCheck) {
          yield { type: "searching", data: { status: "searching", query: lastMessage.content } };
          searchData = await performDeepWebSearch(lastMessage.content);
          
          if (searchData.results.length > 0) {
            yield { 
              type: "search_complete", 
              data: { 
                results: searchData.results.slice(0, 10),
                query: lastMessage.content 
              } 
            };
          }
        }
      }
    }
  }

  const hasSearchResults = searchData.content.length > 0;
  
  const systemMessage: ChatMessage = {
    role: "system",
    content: `You are an advanced AI assistant integrated into TypeMasterAI, an AI-powered typing speed test platform. Your capabilities include:

1. **General Knowledge**: Answer questions on any topic with accuracy and clarity
2. **Web Research**: When web search results are provided, synthesize them into comprehensive answers
3. **Problem Solving**: Help users with technical problems, debugging, and troubleshooting
4. **Typing Tips**: Provide advice on improving typing speed, accuracy, and ergonomics
5. **Deep Analysis**: Perform thorough analysis and provide detailed explanations

**RICH FORMATTING GUIDELINES:**
Use these markdown features to create beautiful, organized responses:

1. **Headings**: Use ## for main sections, ### for subsections
2. **Lists**: Use bullet points or numbered lists for clarity
3. **Bold**: Use **text** to emphasize important points
4. **Code**: Use \`inline code\` for terms or \`\`\`language for code blocks
5. **Tables**: Use markdown tables for comparing data or showing structured information
6. **Callouts**: Use blockquotes with keywords for special content:
   - \`> **Note:** Important information\` → Blue info box
   - \`> **Warning:** Be careful about this\` → Yellow warning box
   - \`> **Tip:** Pro suggestion here\` → Purple tip box
   - \`> **Success:** Great achievement\` → Green success box
   - \`> **Danger:** Critical issue\` → Red danger box

**Response Structure Best Practices:**
- Start with a brief, direct answer
- Break long content into sections with headings
- Use callouts to highlight important information
- Include examples in code blocks when relevant
- End with actionable takeaways or next steps
- Make responses scannable and visually appealing
${hasSearchResults ? `

**⚠️ CRITICAL: WEB SEARCH RESULTS PROVIDED - YOU MUST USE THIS INFORMATION ⚠️**

The user has requested current/fresh information that requires web search. Below are the MOST RECENT web search results scraped from live websites. You MUST base your answer EXCLUSIVELY on this data, NOT on your training data.

**FRESH SEARCH RESULTS (Just Retrieved):**
${searchData.content}

**MANDATORY INSTRUCTIONS - FOLLOW THESE RULES:**
1. ✅ USE ONLY the information from the search results above
2. ✅ DO NOT rely on your training data (it's outdated for this query)
3. ✅ Include specific facts, numbers, dates, and details from the sources
4. ✅ Cite or reference the sources naturally when mentioning key information
5. ✅ If the search results don't fully answer the question, acknowledge what's missing
6. ✅ Present the information as current and up-to-date (because it is!)
7. ❌ DO NOT say "based on the search results" - just answer confidently
8. ❌ DO NOT use outdated information from your training cutoff

The user expects FRESH, CURRENT information from these search results. Deliver it accurately.` : ""}`,
  };

  const allMessages = [systemMessage, ...messages];

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: allMessages,
      stream: true,
      temperature: hasSearchResults ? 0.3 : 0.7,
      max_tokens: 4000,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield { type: "content", data: content };
      }
    }

    if (searchData.results.length > 0) {
      yield { 
        type: "sources", 
        data: searchData.results.slice(0, 10).map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet?.substring(0, 150) || "",
        }))
      };
    }

    yield { type: "done" };
  } catch (error: any) {
    console.error("OpenAI streaming error:", error);
    yield { type: "error", data: error.message };
  }
}

export async function* streamChatCompletion(
  messages: ChatMessage[],
  performSearch: boolean = false
): AsyncGenerator<string, void, unknown> {
  const generator = streamChatCompletionWithSearch(messages, performSearch);
  
  for await (const event of generator) {
    if (event.type === "content") {
      yield event.data;
    }
  }
}

/**
 * Generate a concise, meaningful title for a conversation based on the first user message.
 * This mimics ChatGPT's auto-naming behavior.
 */
export async function generateConversationTitle(userMessage: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a conversation title generator. Generate a short, concise title (3-6 words max) that captures the essence of the user's message.

Rules:
- Title should be 3-6 words maximum
- Be descriptive and specific to the topic
- Use title case (capitalize first letter of major words)
- No punctuation at the end
- No quotes around the title
- If it's a question, summarize the topic rather than using the question format
- If it's about coding, include the language/technology if mentioned
- Be creative but accurate

Examples:
- "How do I center a div in CSS?" → "CSS Div Centering Guide"
- "What's the best way to learn Python?" → "Python Learning Path"
- "Can you help me write a poem about rain?" → "Rain Poetry Creation"
- "I need to improve my typing speed" → "Typing Speed Improvement"
- "Explain quantum computing to me" → "Quantum Computing Basics"`,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      temperature: 0.7,
      max_tokens: 20,
    });

    const title = response.choices[0]?.message?.content?.trim();
    
    // Fallback if empty or too long
    if (!title || title.length > 50) {
      return generateFallbackTitle(userMessage);
    }
    
    // Remove any quotes that might be in the response
    return title.replace(/^["']|["']$/g, '').trim();
  } catch (error) {
    console.error("Title generation error:", error);
    return generateFallbackTitle(userMessage);
  }
}

/**
 * Generate a simple fallback title from the message content
 */
function generateFallbackTitle(message: string): string {
  // Remove special characters and extra whitespace
  const cleaned = message
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Take first few words
  const words = cleaned.split(' ').slice(0, 5);
  
  // Capitalize first letter of each word
  const title = words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return title.length > 40 ? title.substring(0, 40) + '...' : title;
}
