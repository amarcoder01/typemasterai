import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// Diverse subtopics for each mode to ensure variety
const MODE_SUBTOPICS: Record<string, string[]> = {
  general: [
    "daily routines and habits",
    "hobbies and leisure activities", 
    "travel and exploration",
    "food and cooking",
    "health and fitness",
    "education and learning",
    "nature and environment",
    "art and creativity",
    "friendship and relationships",
    "home and lifestyle",
    "sports and recreation",
    "music and dance",
    "books and reading",
    "community and volunteering",
    "celebrations and traditions"
  ],
  entertainment: [
    "streaming services and binge-watching",
    "video games and esports",
    "movies and cinema",
    "music festivals and concerts",
    "social media trends",
    "podcasts and audio content",
    "comedy and standup",
    "theater and performing arts",
    "celebrity culture",
    "animation and cartoons",
    "fan communities",
    "virtual reality entertainment",
    "board games and tabletop gaming",
    "theme parks and attractions",
    "karaoke and singing"
  ],
  technical: [
    "artificial intelligence and machine learning",
    "cloud computing and services",
    "cybersecurity and privacy",
    "internet of things (IoT)",
    "blockchain and cryptocurrency",
    "5G networks and connectivity",
    "quantum computing",
    "renewable energy technology",
    "biotechnology innovations",
    "space exploration technology",
    "robotics and automation",
    "augmented and virtual reality",
    "edge computing and distributed systems",
    "nanotechnology applications",
    "3D printing and additive manufacturing"
  ],
  quotes: [
    "perseverance and determination",
    "creativity and innovation",
    "kindness and compassion",
    "courage and bravery",
    "wisdom and knowledge",
    "success and achievement",
    "happiness and joy",
    "leadership and influence",
    "mindfulness and peace",
    "change and growth",
    "gratitude and appreciation",
    "integrity and honesty",
    "resilience and strength",
    "love and relationships",
    "purpose and meaning"
  ],
  programming: [
    "web development frameworks",
    "mobile app development",
    "database design and optimization",
    "API design and REST principles",
    "version control and Git",
    "testing and quality assurance",
    "agile and scrum methodologies",
    "DevOps and CI/CD",
    "clean code principles",
    "design patterns",
    "microservices architecture",
    "software security best practices",
    "code review and collaboration",
    "performance optimization techniques",
    "containerization and orchestration"
  ],
  news: [
    "climate change initiatives",
    "technological breakthroughs",
    "global health developments",
    "economic trends",
    "education reform",
    "renewable energy progress",
    "space exploration milestones",
    "wildlife conservation",
    "urban development",
    "scientific discoveries",
    "transportation innovations",
    "social movements",
    "cultural heritage preservation",
    "sustainable agriculture",
    "disaster relief and preparedness"
  ],
  stories: [
    "a mysterious discovery",
    "an unexpected journey",
    "overcoming a challenge",
    "a heartwarming encounter",
    "a lesson learned",
    "childhood memories",
    "an adventure in nature",
    "meeting a mentor",
    "solving a puzzle",
    "a day that changed everything",
    "finding hidden talents",
    "a second chance",
    "breaking free from comfort zones",
    "an act of kindness",
    "pursuing a dream"
  ],
  business: [
    "remote work and hybrid models",
    "startup entrepreneurship",
    "digital marketing strategies",
    "customer experience",
    "sustainable business practices",
    "leadership development",
    "project management",
    "workplace diversity and inclusion",
    "business ethics",
    "innovation and disruption",
    "supply chain management",
    "data-driven decision making",
    "corporate social responsibility",
    "employee engagement and retention",
    "strategic planning and execution"
  ]
};

export async function generateTypingParagraph(
  language: string,
  mode: string,
  difficulty: "easy" | "medium" | "hard" = "medium",
  customPrompt?: string
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
  
  // Difficulty-specific writing guidelines
  const difficultyGuidelines: Record<string, string> = {
    easy: `- Use simple, common vocabulary that's easy to understand
- Write short, clear sentences (8-12 words per sentence)
- Focus on basic concepts and straightforward ideas
- Use everyday language without technical jargon
- Structure should be simple: introduce topic, explain briefly, conclude`,
    
    medium: `- Use moderate vocabulary with some varied word choices
- Mix short and medium-length sentences (10-15 words average)
- Include intermediate concepts and some detail
- Occasional specialized terms are okay but explain them
- Structure should be clear: introduce topic, develop ideas, provide examples`,
    
    hard: `- Use advanced, sophisticated vocabulary and precise terminology
- Write complex sentences with varied structure (12-20 words average)
- Include nuanced concepts, technical details, and deeper insights
- Use specialized terminology appropriate to the subject
- Structure should be sophisticated: introduce complex ideas, analyze deeply, draw connections`
  };
  
  // Select a random subtopic for variety
  const subtopics = MODE_SUBTOPICS[mode] || MODE_SUBTOPICS["general"];
  const randomSubtopic = subtopics[Math.floor(Math.random() * subtopics.length)];

  let prompt: string;
  
  if (customPrompt) {
    // Custom user-specified content
    const scriptNote = language !== 'en' ? ` Use appropriate script (Devanagari for Hindi/Marathi, Arabic script for Arabic, etc.).` : '';
    
    prompt = `Write a ${difficulty}-level paragraph about: "${customPrompt}".

CRITICAL REQUIREMENTS:
1. STRICT WORD COUNT: Write EXACTLY ${wordCount} words in ${languageName} - NO MORE, NO LESS
2. Use proper grammar and natural sentence structure appropriate for ${difficulty} level
3. Make it engaging and educational about the topic: "${customPrompt}"${scriptNote}
4. Focus specifically on the user's requested topic: "${customPrompt}"
5. Write ONLY about "${customPrompt}" - do NOT mention typing, keyboards, or practice
6. DO NOT exceed the word limit of ${wordCount.split('-')[1]} words

${difficulty.toUpperCase()} DIFFICULTY GUIDELINES:
${difficultyGuidelines[difficulty]}

Return ONLY the paragraph text, no explanations or meta-commentary.`;
  } else {
    // Standard mode-based content with random subtopic for variety
    const scriptNote = language !== 'en' ? ` Use appropriate script (Devanagari for Hindi/Marathi, Arabic script for Arabic, etc.).` : '';
    
    prompt = `Write a ${difficulty}-level paragraph in ${languageName} about "${randomSubtopic}" (${mode} category).

CRITICAL REQUIREMENTS:
1. STRICT WORD COUNT: Write EXACTLY ${wordCount} words in ${languageName} - NO MORE, NO LESS
2. Use proper grammar and natural sentence structure appropriate for ${difficulty} level
3. Make it engaging, informative, and educational about "${randomSubtopic}"${scriptNote}
4. Focus specifically on the subtopic "${randomSubtopic}" - provide interesting facts, insights, or perspectives
5. Avoid generic content - make it specific and engaging about this particular subtopic
6. Write ONLY about "${randomSubtopic}" - do NOT mention typing, keyboards, or practice
7. DO NOT exceed the word limit of ${wordCount.split('-')[1]} words

${difficulty.toUpperCase()} DIFFICULTY GUIDELINES:
${difficultyGuidelines[difficulty]}

Return ONLY the paragraph text, no explanations or meta-commentary.`;
  }

  try {
    if (!customPrompt) {
      console.log(`📝 Generating ${languageName}/${mode} paragraph about: "${randomSubtopic}"`);
    }
    console.log(`📝 Prompt:`, prompt.substring(0, 200) + "...");
    
    // Expert system prompt to prevent typing-related content
    const systemPrompt = `You are an expert content writer specialized in creating diverse, engaging educational paragraphs.

CRITICAL RULES:
1. NEVER mention typing, keyboards, typing practice, typing speed, accuracy, or any typing-related concepts
2. Focus ONLY on the specified topic - write informative, educational content about that topic
3. Write naturally as if creating general knowledge content, NOT practice material
4. Use proper grammar and clear sentences suitable for reading
5. Make content engaging and factual about the actual subject matter

FORBIDDEN WORDS (never use these): typing, keyboard, type, practice, speed, accuracy, WPM, keys, keystroke

Your role is to educate readers about interesting topics, not to create typing practice material.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.9,
    });

    console.log(`📦 API Response:`, JSON.stringify(response, null, 2).substring(0, 500));
    
    const content = response.choices[0]?.message?.content?.trim() || "";
    
    if (!content) {
      console.error("Empty content from AI. Full response:", JSON.stringify(response));
      throw new Error("AI generated empty content");
    }

    // Validate content doesn't contain typing-related terms
    const forbiddenTerms = ['typing', 'keyboard', 'type', 'practice', ' wpm', 'keystroke', 'accuracy', 'speed test'];
    const lowerContent = content.toLowerCase();
    const foundTerms = forbiddenTerms.filter(term => lowerContent.includes(term));
    
    if (foundTerms.length > 0) {
      console.error(`❌ AI generated content with forbidden terms: ${foundTerms.join(', ')}`);
      console.error(`Content: ${content.substring(0, 200)}...`);
      throw new Error(`Generated content contains typing-related terms: ${foundTerms.join(', ')}`);
    }

    console.log(`✅ Generated ${content.split(/\s+/).length} words for ${languageName}/${mode}`);
    console.log(`✅ Content validated - no typing-related terms found`);
    return content;
  } catch (error: any) {
    console.error("❌ AI paragraph generation error:", error.message || error);
    if (error.response) {
      console.error("API Error Response:", error.response.data);
    }
    throw error;
  }
}
