import OpenAI from "openai";
import * as cheerio from "cheerio";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    $("script, style, nav, footer, iframe, noscript, header, aside, [role='navigation'], [role='banner']").remove();

    const title = $("title").text() || $("h1").first().text();
    
    const mainContent = $("article, main, .content, .post-content, .entry-content, [role='main']").first();
    const container = mainContent.length ? mainContent : $("body");
    
    const paragraphs = container.find("p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((text) => text.length > 30 && !text.includes("cookie") && !text.includes("privacy policy"))
      .slice(0, 8);

    const content = paragraphs.join("\n\n");

    return {
      title: title.trim(),
      content: content.substring(0, 3000),
      url,
    };
  } catch (error) {
    return null;
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
      console.error(`Tavily API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.substring(0, 300) || "",
    }));
  } catch (error) {
    console.error("Tavily search error:", error);
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

export async function performWebSearch(query: string): Promise<{ results: SearchResult[]; content: string }> {
  console.log(`[WebSearch] Searching for: "${query}"`);
  
  let results: SearchResult[] = [];

  if (process.env.TAVILY_API_KEY) {
    results = await searchWithTavily(query);
    if (results.length > 0) {
      console.log(`[WebSearch] Found ${results.length} results via Tavily`);
    }
  }

  if (results.length === 0) {
    results = await searchWithDuckDuckGo(query);
    if (results.length > 0) {
      console.log(`[WebSearch] Found ${results.length} results via DuckDuckGo`);
    }
  }

  if (results.length === 0) {
    console.log("[WebSearch] No results found");
    return { results: [], content: "" };
  }

  let extractedContent = "";
  const scrapedUrls: string[] = [];

  for (let i = 0; i < Math.min(results.length, 3); i++) {
    const result = results[i];
    try {
      const scraped = await scrapeWebPage(result.url);
      if (scraped && scraped.content && scraped.content.length > 100) {
        extractedContent += `\n\n---\n**Source ${i + 1}: ${scraped.title}**\nURL: ${result.url}\n\n${scraped.content}\n`;
        scrapedUrls.push(result.url);
        console.log(`[WebSearch] Scraped ${scraped.content.length} chars from ${result.url}`);
        if (extractedContent.length > 8000) break;
      }
    } catch (error) {
      console.log(`[WebSearch] Failed to scrape ${result.url}`);
    }
  }

  console.log(`[WebSearch] Scraped ${scrapedUrls.length} pages successfully. Total content: ${extractedContent.length} chars`);

  if (extractedContent.length === 0 && results.length > 0) {
    for (let i = 0; i < Math.min(results.length, 5); i++) {
      const result = results[i];
      extractedContent += `\n\n---\n**Source ${i + 1}: ${result.title}**\nURL: ${result.url}\n\n${result.snippet}\n`;
    }
    console.log(`[WebSearch] Using snippets as fallback. Total content: ${extractedContent.length} chars`);
  }

  return { results, content: extractedContent };
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

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a search decision agent. Analyze the user's query and decide if a web search is needed.

SEARCH NEEDED for:
- Current events, news, or recent information (after Oct 2023)
- Real-time data: stock prices, weather, sports scores, crypto prices
- Specific products, companies, or services the user wants to learn about
- Technical documentation for specific tools/libraries/APIs
- Factual claims that need verification
- Questions about specific websites, apps, or online services
- Pricing information for products or services
- Reviews or comparisons of products/services
- Information about specific people, organizations, or events
- Questions containing years 2024 or later

NO SEARCH NEEDED for:
- General knowledge questions (history, science concepts, math)
- Programming help with code logic (not specific library docs)
- Creative writing, brainstorming, or opinion-based questions
- Personal advice or conversations
- Explaining concepts, tutorials, or how-to guides
- Translation or language help
- Questions about the assistant itself

Respond with JSON only:
{
  "search": true/false,
  "query": "optimized search query if search=true, empty string if false",
  "reason": "brief reason for decision"
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
    
    const quickTriggers = [
      "latest", "current", "news", "today", "2024", "2025",
      "price", "stock", "weather", "what is", "who is",
      "search", "look up", "find",
    ];
    
    const needsSearch = quickTriggers.some(t => lowerMessage.includes(t));
    return {
      shouldSearch: needsSearch,
      searchQuery: message,
      reason: "Fallback decision based on keywords",
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
          
          searchData = await performWebSearch(searchQuery);
          
          if (searchData.results.length > 0) {
            yield { 
              type: "search_complete", 
              data: { 
                results: searchData.results.slice(0, 5),
                query: searchQuery 
              } 
            };
          }
        }
      } else {
        const quickCheck = shouldPerformWebSearch(lastMessage.content);
        if (quickCheck) {
          yield { type: "searching", data: { status: "searching", query: lastMessage.content } };
          searchData = await performWebSearch(lastMessage.content);
          
          if (searchData.results.length > 0) {
            yield { 
              type: "search_complete", 
              data: { 
                results: searchData.results.slice(0, 5),
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
      max_tokens: 2500,
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
        data: searchData.results.slice(0, 5).map(r => ({
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
