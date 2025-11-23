import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface BingSearchResult {
  name: string;
  url: string;
  snippet: string;
}

export async function performWebSearch(query: string): Promise<string> {
  if (!process.env.BING_GROUNDING_KEY) {
    return "Web search is not configured. Please add BING_GROUNDING_KEY to enable web search.";
  }

  try {
    const response = await fetch(
      `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BING_GROUNDING_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Bing API error: ${response.status}`);
    }

    const data = await response.json();
    const results: BingSearchResult[] = data.webPages?.value || [];

    if (results.length === 0) {
      return "No web search results found.";
    }

    let searchSummary = "**Web Search Results:**\n\n";
    results.forEach((result, index) => {
      searchSummary += `${index + 1}. **${result.name}**\n   ${result.snippet}\n   Source: ${result.url}\n\n`;
    });

    return searchSummary;
  } catch (error) {
    console.error("Web search error:", error);
    return "Web search failed. Using AI knowledge only.";
  }
}

export function shouldPerformWebSearch(message: string): boolean {
  const searchTriggers = [
    "search",
    "find",
    "look up",
    "what is",
    "who is",
    "when did",
    "how to",
    "current",
    "latest",
    "recent",
    "news",
    "today",
    "2024",
    "2025",
  ];

  const lowerMessage = message.toLowerCase();
  return searchTriggers.some((trigger) => lowerMessage.includes(trigger));
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
      yield "🔍 Searching the web...\n\n";
      searchResults = await performWebSearch(lastMessage.content);
      yield searchResults + "\n\n---\n\n";
    }
  }

  const systemMessage: ChatMessage = {
    role: "system",
    content: `You are an advanced AI assistant integrated into TypeFlow, a typing speed test platform. Your capabilities include:

1. **General Knowledge**: Answer questions on any topic with accuracy and clarity
2. **Web Research**: When web search results are provided, synthesize them into comprehensive answers with citations
3. **Problem Solving**: Help users with technical problems, debugging, and troubleshooting
4. **Typing Tips**: Provide advice on improving typing speed, accuracy, and ergonomics
5. **Deep Analysis**: Perform thorough analysis and provide detailed explanations

Guidelines:
- Be helpful, accurate, and concise
- When web search results are provided, cite your sources
- Use markdown formatting for better readability
- If you don't know something current, acknowledge it
- Be conversational but professional
${searchResults ? `\n\nWeb search results have been provided above. Use them to answer the user's question with proper citations.` : ""}`,
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
