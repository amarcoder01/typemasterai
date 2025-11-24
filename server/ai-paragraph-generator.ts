import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export async function generateTypingParagraph(
  language: string,
  mode: string,
  difficulty: "easy" | "medium" | "hard" = "medium"
): Promise<string> {
  const languageNames: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ja: "Japanese",
    zh: "Chinese (Simplified)",
    hi: "Hindi",
    ru: "Russian",
    ar: "Arabic",
    ko: "Korean",
    mr: "Marathi",
    bn: "Bengali",
    ta: "Tamil",
    te: "Telugu",
    vi: "Vietnamese",
    tr: "Turkish",
    pl: "Polish",
    nl: "Dutch",
    sv: "Swedish",
    th: "Thai",
    id: "Indonesian",
  };

  const languageName = languageNames[language] || language;
  const wordCount = difficulty === "easy" ? "25-35" : difficulty === "medium" ? "35-50" : "50-70";

  const prompt = `Generate a ${difficulty}-level typing practice paragraph in ${languageName} language about the topic: "${mode}".

Requirements:
1. Write ${wordCount} words
2. Use proper grammar and natural sentence structure
3. Make it engaging and educational
4. Use only ${languageName} language - no English words
5. Use appropriate script (Devanagari for Hindi/Marathi, Arabic script for Arabic, etc.)
6. Make it suitable for typing practice (clear, well-structured sentences)
7. For technical/programming modes, include relevant terminology in ${languageName}

Topic context:
- general: everyday life, culture, or common knowledge
- entertainment: movies, music, games, pop culture
- technical: technology, science, innovation
- quotes: inspirational sayings or wisdom
- programming: coding concepts, software development
- news: current events style content
- stories: narrative or storytelling
- business: professional, commerce, workplace topics

Return ONLY the paragraph text, no explanations or meta-commentary.`;

  try {
    console.log(`📝 Prompt for ${languageName}/${mode}:`, prompt.substring(0, 200) + "...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using gpt-4o which is well-supported by Replit AI Integrations
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.9,
    });

    console.log(`📦 API Response:`, JSON.stringify(response, null, 2).substring(0, 500));
    
    const content = response.choices[0]?.message?.content?.trim() || "";
    
    if (!content) {
      console.error("Empty content from AI. Full response:", JSON.stringify(response));
      throw new Error("AI generated empty content");
    }

    console.log(`✅ Generated ${content.split(/\s+/).length} words for ${languageName}/${mode}`);
    return content;
  } catch (error: any) {
    console.error("❌ AI paragraph generation error:", error.message || error);
    if (error.response) {
      console.error("API Error Response:", error.response.data);
    }
    throw error;
  }
}
