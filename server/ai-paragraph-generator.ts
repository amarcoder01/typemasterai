import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// Diverse subtopics for each mode to ensure variety
const MODE_SUBTOPICS: Record<string, string[]> = {
  general: [
    // Technology & Digital Life (Trending 2025)
    "how AI is changing everyday tasks",
    "understanding algorithms and recommendations",
    "digital wellness and screen time balance",
    "online privacy and data protection",
    "how the internet works",
    "social media and mental health",
    "virtual reality and the metaverse",
    "smart homes and IoT devices",
    "cybersecurity basics for everyone",
    "the future of smartphones and gadgets",
    "cloud storage and digital backups",
    "understanding cryptocurrency basics",
    
    // Friendship & Relationships
    "building strong friendships",
    "effective communication in the digital age",
    "active listening skills",
    "resolving conflicts peacefully",
    "supporting friends through challenges",
    "celebrating diversity in friendships",
    "maintaining long-distance relationships",
    "trust and honesty in relationships",
    
    // Personal Growth & Mindset
    "developing good daily habits",
    "time management strategies",
    "setting achievable goals",
    "overcoming procrastination",
    "learning from failure",
    "growth mindset vs fixed mindset",
    "building self-confidence",
    "managing stress effectively",
    "the power of gratitude",
    "developing emotional intelligence",
    
    // Mental Health & Well-Being (High Engagement 2025)
    "understanding anxiety and coping strategies",
    "mindfulness and meditation basics",
    "the importance of sleep",
    "recognizing burnout and recovery",
    "building resilience",
    "positive self-talk techniques",
    "healthy ways to express emotions",
    "dealing with social pressure",
    "the importance of asking for help",
    "self-care routines that work",
    
    // Career & Future Skills (92% value soft skills)
    "teamwork and collaboration",
    "creative problem solving",
    "critical thinking in daily life",
    "public speaking confidence",
    "leadership skills for everyone",
    "adapting to change",
    "continuous learning mindset",
    "work-life balance strategies",
    "networking and building connections",
    "interview skills and preparation",
    
    // Science & Discovery (Sparks Curiosity)
    "how vaccines work",
    "fascinating facts about the human brain",
    "the science of sleep and dreams",
    "climate change explained simply",
    "renewable energy basics",
    "space exploration milestones",
    "how plants communicate",
    "the mystery of black holes",
    "ocean depths and unexplored regions",
    "the science behind emotions",
    
    // Life Skills & Financial Literacy
    "budgeting basics for beginners",
    "understanding credit and debt",
    "smart saving strategies",
    "investing fundamentals",
    "healthy eating on a budget",
    "meal planning and cooking skills",
    "sustainable living choices",
    "first aid essentials",
    "home organization tips",
    
    // Culture, Society & Global Awareness
    "celebrating cultural diversity",
    "famous festivals around the world",
    "how music shapes cultures",
    "art movements that changed history",
    "languages and their evolution",
    "environmental activism",
    "volunteering and community impact",
    "human rights and equality",
    "immigration stories and experiences",
    
    // Entertainment & Creativity
    "the psychology of storytelling",
    "how movies influence society",
    "music and brain development",
    "photography basics and composition",
    "creative writing techniques",
    "the rise of podcasts",
    "gaming and problem-solving skills",
    
    // Current Trends & Innovations
    "electric vehicles and transportation",
    "sustainable fashion movement",
    "urban gardening and farming",
    "the sharing economy",
    "remote work revolution",
    "social entrepreneurship",
    "biotechnology breakthroughs",
    "renewable energy innovations",
    "food delivery and ghost kitchens",
    "personalized medicine advances"
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

// Helper function to count words (used for logging only)
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

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
  
  // Difficulty-specific writing guidelines (no word count limits - focus on complexity)
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
1. Use proper grammar and natural sentence structure appropriate for ${difficulty} level
2. Make it engaging and educational about the topic: "${customPrompt}"${scriptNote}
3. Focus specifically on the user's requested topic: "${customPrompt}"
4. Write ONLY about "${customPrompt}" - do NOT mention typing, keyboards, or practice
5. Write a complete paragraph with natural length based on the content and difficulty level

${difficulty.toUpperCase()} DIFFICULTY GUIDELINES:
${difficultyGuidelines[difficulty]}

Return ONLY the paragraph text, no explanations or meta-commentary.`;
  } else {
    // Standard mode-based content with random subtopic for variety
    const scriptNote = language !== 'en' ? ` Use appropriate script (Devanagari for Hindi/Marathi, Arabic script for Arabic, etc.).` : '';
    
    // Extra guidance for general mode to make content educational and engaging
    const generalModeGuidance = mode === "general" ? `

EDUCATIONAL FOCUS (Important for General Mode):
- Help the reader LEARN something valuable about this topic
- Include practical insights, interesting facts, or useful knowledge
- Make the content relatable and applicable to real life
- Inspire curiosity or provide actionable takeaways
- Write as if teaching a friend something interesting and useful` : '';
    
    prompt = `Write a ${difficulty}-level paragraph in ${languageName} about "${randomSubtopic}" (${mode} category).

CRITICAL REQUIREMENTS:
1. Use proper grammar and natural sentence structure appropriate for ${difficulty} level
2. Make it engaging, informative, and educational about "${randomSubtopic}"${scriptNote}
3. Focus specifically on the subtopic "${randomSubtopic}" - provide interesting facts, insights, or perspectives that help users LEARN
4. Avoid generic content - make it specific, engaging, and valuable about this particular subtopic
5. Write ONLY about "${randomSubtopic}" - do NOT mention typing, keyboards, or practice
6. Write a complete paragraph with natural length based on the content and difficulty level${generalModeGuidance}

${difficulty.toUpperCase()} DIFFICULTY GUIDELINES:
${difficultyGuidelines[difficulty]}

Return ONLY the paragraph text, no explanations or meta-commentary.`;
  }

  // Expert system prompt to prevent typing-related content and emphasize educational value
  const systemPrompt = `You are an expert educator and content writer who creates engaging, valuable paragraphs that help people LEARN while they read.

YOUR MISSION:
- Every paragraph should teach the reader something useful, interesting, or valuable
- Write as if explaining fascinating topics to a curious friend
- Include practical insights, surprising facts, or actionable knowledge
- Make learning enjoyable and relatable to real life

CRITICAL RULES:
1. NEVER mention typing, keyboards, typing practice, typing speed, accuracy, or any typing-related concepts
2. Focus ONLY on the specified topic - write informative, educational content that helps users learn
3. Write naturally as if creating general knowledge content, NOT practice material
4. Use proper grammar and clear sentences suitable for reading
5. Make content engaging, factual, and EDUCATIONAL about the actual subject matter
6. Help readers gain knowledge, insights, or practical understanding

FORBIDDEN WORDS (never use these): typing, keyboard, type, practice, speed, accuracy, WPM, keys, keystroke

Your role is to educate and engage readers with interesting, valuable content about meaningful topics.`;

  const maxRetries = 3;
  let attempt = 0;

  try {
    if (!customPrompt) {
      console.log(`📝 Generating ${languageName}/${mode} paragraph about: "${randomSubtopic}" (${difficulty} difficulty)`);
    }
    
    // Retry loop for content validation (forbidden terms only)
    while (attempt < maxRetries) {
      attempt++;
      console.log(`📝 Generation attempt ${attempt}/${maxRetries} - ${difficulty} difficulty`);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.9,
      });
      
      const content = response.choices[0]?.message?.content?.trim() || "";
      
      if (!content) {
        console.error("Empty content from AI. Full response:", JSON.stringify(response));
        if (attempt === maxRetries) {
          throw new Error("AI generated empty content after all retries");
        }
        continue;
      }

      // Count words for logging
      const wordCount = countWords(content);
      console.log(`📊 Generated content: ${wordCount} words`);

      // Validate content doesn't contain typing-related terms
      const forbiddenTerms = ['typing', 'keyboard', 'type', 'practice', ' wpm', 'keystroke', 'accuracy', 'speed test'];
      const lowerContent = content.toLowerCase();
      const foundTerms = forbiddenTerms.filter(term => lowerContent.includes(term));
      
      if (foundTerms.length > 0) {
        console.warn(`⚠️ AI generated content with forbidden terms: ${foundTerms.join(', ')}`);
        console.warn(`Content: ${content.substring(0, 200)}...`);
        if (attempt === maxRetries) {
          throw new Error(`Generated content contains typing-related terms: ${foundTerms.join(', ')}`);
        }
        continue;
      }

      // Success - content validated
      console.log(`✅ Generated ${wordCount} words for ${languageName}/${mode} (difficulty: ${difficulty})`);
      console.log(`✅ Content validated - no typing-related terms`);
      return content;
    }

    // Should never reach here, but just in case
    throw new Error("Unexpected error in generation loop");
  } catch (error: any) {
    console.error("❌ AI paragraph generation error:", error.message || error);
    if (error.response) {
      console.error("API Error Response:", error.response.data);
    }
    throw error;
  }
}
