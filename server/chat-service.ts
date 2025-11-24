import OpenAI from "openai";
import * as cheerio from "cheerio";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface BingSearchResult {
  name: string;
  url: string;
  snippet: string;
}

interface ScrapedData {
  title: string;
  content: string;
  url: string;
}

async function scrapeWebPage(url: string): Promise<ScrapedData | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    $("script, style, nav, footer, iframe").remove();

    const title = $("title").text() || $("h1").first().text();
    const paragraphs = $("p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((text) => text.length > 50)
      .slice(0, 5);

    const content = paragraphs.join("\n\n");

    return {
      title: title.trim(),
      content: content.substring(0, 2000),
      url,
    };
  } catch (error) {
    console.error(`Scraping error for ${url}:`, error);
    return null;
  }
}

async function tryBingSearch(query: string, apiKey: string): Promise<BingSearchResult[]> {
  const response = await fetch(
    `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=5&mkt=en-US`,
    {
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Bing API error: ${response.status}`);
  }

  const data = await response.json();
  return data.webPages?.value || [];
}

export async function performWebSearch(query: string): Promise<string> {
  const keys = [
    process.env.BING_GROUNDING_KEY,
    process.env.BING_GROUNDING_KEY_1,
    process.env.BING_GROUNDING_KEY_2,
  ].filter(Boolean);

  if (keys.length === 0) {
    return "⚠️ Web search is not configured. Please add BING_GROUNDING_KEY to enable web search.";
  }

  let results: BingSearchResult[] = [];
  let lastError: Error | null = null;

  for (const key of keys) {
    try {
      results = await tryBingSearch(query, key!);
      if (results.length > 0) break;
    } catch (error: any) {
      lastError = error;
      console.error(`Bing API failed with key ending in ...${key!.slice(-4)}:`, error.message);
    }
  }

  if (results.length === 0 && lastError) {
    console.log("Falling back to web scraping...");
    return await performWebScraping(query);
  }

  if (results.length === 0) {
    return "🔍 No search results found. Using AI knowledge only.";
  }

  let searchContent = "";
  const sources: string[] = [];

  for (let i = 0; i < Math.min(results.length, 5); i++) {
    const result = results[i];
    const citation = i + 1;
    
    try {
      const domain = new URL(result.url).hostname.replace('www.', '');
      sources.push(
        `> **[${citation}] ${result.name}**\n` +
        `> 🔗 \`${domain}\`\n>\n` +
        `> ${result.snippet}\n>\n` +
        `> [View source →](${result.url})`
      );
    } catch {
      sources.push(
        `> **[${citation}] ${result.name}**\n>\n` +
        `> ${result.snippet}\n>\n` +
        `> [View source →](${result.url})`
      );
    }

    if (i < 2) {
      const scraped = await scrapeWebPage(result.url);
      if (scraped && scraped.content) {
        searchContent += `\n**Content from [${citation}]:**\n${scraped.content.substring(0, 600)}\n`;
      }
    }
  }

  return (
    `## 📚 Sources\n\n` +
    sources.join('\n\n') +
    (searchContent ? `\n\n## 📄 Extracted Content\n${searchContent}` : '')
  );
}

async function performWebScraping(query: string): Promise<string> {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return "🔍 Web scraping failed. Using AI knowledge only.";
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const results: Array<{ title: string; url: string; snippet: string }> = [];

    $(".result").each((i, elem) => {
      if (i >= 5) return;

      const title = $(elem).find(".result__a").text().trim();
      const url = $(elem).find(".result__url").text().trim();
      const snippet = $(elem).find(".result__snippet").text().trim();

      if (title && url) {
        results.push({ title, url: `https://${url}`, snippet });
      }
    });

    if (results.length === 0) {
      return "🔍 No web results found. Using AI knowledge only.";
    }

    let searchContent = "";
    const sources: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const citation = i + 1;
      
      try {
        const domain = new URL(result.url).hostname.replace('www.', '');
        sources.push(
          `> **[${citation}] ${result.title}**\n` +
          `> 🔗 \`${domain}\`\n>\n` +
          `> ${result.snippet}\n>\n` +
          `> [View source →](${result.url})`
        );
      } catch {
        sources.push(
          `> **[${citation}] ${result.title}**\n>\n` +
          `> ${result.snippet}\n>\n` +
          `> [View source →](${result.url})`
        );
      }
    }

    const firstUrl = results[0].url;
    const scraped = await scrapeWebPage(firstUrl);
    if (scraped && scraped.content) {
      searchContent = `\n**Content from [1]:**\n${scraped.content.substring(0, 600)}\n`;
    }

    return (
      `## 📚 Sources\n\n` +
      sources.join('\n\n') +
      (searchContent ? `\n\n## 📄 Extracted Content\n${searchContent}` : '')
    );
  } catch (error) {
    console.error("Web scraping error:", error);
    return "🔍 Web scraping failed. Using AI knowledge only.";
  }
}

export function shouldPerformWebSearch(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  const urlPattern = /\b(?:https?:\/\/)?(?:www\.)?[\w-]+\.(?:com|org|net|io|co|ai|dev|app|info|edu|gov)\b/i;
  if (urlPattern.test(message)) {
    return true;
  }

  const searchTriggers = [
    "search",
    "find",
    "look up",
    "lookup",
    "what is",
    "what are",
    "who is",
    "when did",
    "when was",
    "where is",
    "where can",
    "how to",
    "how do",
    "how does",
    "why is",
    "why did",
    "tell me about",
    "info about",
    "information about",
    "information on",
    "details about",
    "learn about",
    "explain",
    "describe",
    "current",
    "latest",
    "recent",
    "news",
    "today",
    "2024",
    "2025",
    "update",
    "website",
    "company",
    "organization",
    "service",
    "product",
    "compare",
    "difference between",
    "best",
    "top",
    "review",
    "guide",
  ];

  const trimmedMessage = lowerMessage.trim();
  const hasSearchTrigger = searchTriggers.some((trigger) => lowerMessage.includes(trigger));
  
  const questionWords = ["what", "who", "when", "where", "why", "how", "which"];
  const hasQuestionWord = questionWords.some((word) => trimmedMessage.startsWith(word + " ") || trimmedMessage === word);
  
  const hasQuestionMark = lowerMessage.includes("?");
  const isRealQuestion = hasQuestionWord || (hasQuestionMark && trimmedMessage.length >= 10);
  
  const requestPhrases = ["give me", "show me", "can you", "could you", "i want", "i need"];
  const isRequest = requestPhrases.some((phrase) => lowerMessage.includes(phrase));

  return hasSearchTrigger || isRealQuestion || isRequest;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function* streamChatCompletion(
  messages: ChatMessage[],
  performSearch: boolean = false
): AsyncGenerator<string, void, unknown> {
  let searchResults = "";

  if (performSearch && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "user") {
      yield "🔍 **Searching the web...**\n\n";
      searchResults = await performWebSearch(lastMessage.content);
      yield searchResults + "\n\n---\n\n";
    }
  }

  const systemMessage: ChatMessage = {
    role: "system",
    content: `You are an advanced AI assistant integrated into TypeMasterAI, an AI-powered typing speed test platform. Your capabilities include:

1. **General Knowledge**: Answer questions on any topic with accuracy and clarity
2. **Web Research**: When web search results are provided, synthesize them into comprehensive answers with citations
3. **Problem Solving**: Help users with technical problems, debugging, and troubleshooting
4. **Typing Tips**: Provide advice on improving typing speed, accuracy, and ergonomics
5. **Deep Analysis**: Perform thorough analysis and provide detailed explanations

Guidelines:
- Be helpful, accurate, and concise
- Use markdown formatting for better readability (headings, lists, code blocks, etc.)
- Be conversational but professional
${searchResults ? `

**IMPORTANT - WEB SEARCH CITATION GUIDELINES:**
Sources have been provided above from web search. Follow these rules strictly:

1. **Use Inline Citations**: Reference sources using [1], [2], [3] etc. inline with your text
   - Example: "According to research, the average typing speed is 40 WPM [1]."
   
2. **Synthesize Don't Copy**: Write in your own words. Don't copy-paste from sources.

3. **Multiple Sources**: When multiple sources agree, cite them all [1][2][3]

4. **Attribute Properly**: Clearly indicate which information comes from which source

5. **Add Value**: Don't just list what sources say - analyze, compare, and provide insights

6. **Format Your Response**:
   - Start with a clear, direct answer to the user's question
   - Use headings (##, ###) to organize information
   - Use bullet points and numbered lists for clarity
   - Include relevant details from the sources
   - End with a concise summary or key takeaways if appropriate

7. **Be Comprehensive**: Use ALL relevant information from the provided sources to give a complete answer` : ""}`,
  };

  const allMessages = [systemMessage, ...messages];

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: allMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error: any) {
    console.error("OpenAI streaming error:", error);
    throw new Error(`AI service error: ${error.message}`);
  }
}
