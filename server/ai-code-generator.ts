import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

interface GenerateCodeOptions {
  programmingLanguage: string;
  difficulty?: "easy" | "medium" | "hard";
  framework?: string;
  timeLimit?: number;
  testMode?: "normal" | "expert" | "master";
}

function getTargetLineCount(
  difficulty: "easy" | "medium" | "hard",
  timeLimit: number
): string {
  // Large base line counts for substantial initial content
  const baseLines = {
    easy: { min: 20, max: 30 },
    medium: { min: 25, max: 40 },
    hard: { min: 35, max: 55 }
  };

  // Adjust based on time limit (0 = no limit, use default)
  if (timeLimit === 0) {
    // No limit - use generous size for continuous typing
    return `${baseLines[difficulty].min}-${baseLines[difficulty].max}`;
  }

  // Calculate target based on time - high multipliers for lots of content
  let multiplier = 1;
  if (timeLimit <= 15) {
    multiplier = 0.8;
  } else if (timeLimit <= 30) {
    multiplier = 1.0;
  } else if (timeLimit <= 45) {
    multiplier = 1.2;
  } else if (timeLimit <= 60) {
    multiplier = 1.4;
  } else if (timeLimit <= 120) {
    multiplier = 1.8;
  } else if (timeLimit <= 180) {
    multiplier = 2.2;
  } else if (timeLimit <= 300) {
    multiplier = 2.8;
  } else {
    multiplier = 3.5;
  }

  const minLines = Math.max(15, Math.round(baseLines[difficulty].min * multiplier));
  const maxLines = Math.max(20, Math.round(baseLines[difficulty].max * multiplier));

  return `${minLines}-${maxLines}`;
}

function getTargetCharacterCount(timeLimit: number): string {
  // Provide lots of content so users always have plenty to type
  
  if (timeLimit === 0) {
    return "800-1200"; // No limit, lots of content for continuous typing
  }
  
  // Calculate based on ~180 chars per minute (plenty of content)
  // We want MORE content than user can type so they always have something
  const charsPerMinute = 180;
  const targetChars = Math.round((timeLimit / 60) * charsPerMinute);
  
  // Give a generous range with high minimum
  const minChars = Math.max(300, Math.round(targetChars * 1.0));
  const maxChars = Math.max(500, Math.round(targetChars * 1.6));
  
  return `${minChars}-${maxChars}`;
}

export async function generateCodeSnippet(
  programmingLanguage: string,
  difficulty: "easy" | "medium" | "hard" = "medium",
  framework?: string,
  timeLimit: number = 0,
  testMode: "normal" | "expert" | "master" = "normal",
  customPrompt?: string
): Promise<{ content: string; description: string }> {
  const lineCount = getTargetLineCount(difficulty, timeLimit);
  const charCount = getTargetCharacterCount(timeLimit);

  const frameworkNote = framework ? ` using the ${framework} framework` : '';
  
  const difficultyContext = {
    easy: "Basic syntax, simple logic, beginner-friendly concepts. Use common keywords and straightforward patterns.",
    medium: "Moderate complexity with common patterns, intermediate concepts. Include loops, conditions, and function calls.",
    hard: "Advanced patterns, complex logic, algorithms, and optimization. Include nested structures, callbacks, or async patterns."
  }[difficulty];

  // Test mode affects code quality requirements
  const testModeContext = {
    normal: "Standard code with typical patterns. Minor complexity is acceptable.",
    expert: "Clean, well-structured code. Every character must be intentional. No ambiguous syntax.",
    master: "Perfect, production-ready code. Crystal clear syntax, optimal formatting. Zero room for typing ambiguity."
  }[testMode];

  const markupLanguages = ["HTML", "XML", "Markdown", "markup"];
  const dataFormats = ["JSON", "YAML", "TOML", "json", "yaml", "toml"];
  const styleLanguages = ["CSS", "SCSS", "Sass", "Less", "css", "scss", "sass", "less"];
  
  const isMarkup = markupLanguages.some(l => programmingLanguage.toLowerCase().includes(l.toLowerCase()));
  const isDataFormat = dataFormats.some(l => programmingLanguage.toLowerCase().includes(l.toLowerCase()));
  const isStyle = styleLanguages.some(l => programmingLanguage.toLowerCase().includes(l.toLowerCase()));

  let languageSpecificGuidance = "";
  if (isMarkup) {
    languageSpecificGuidance = `
Special guidance for ${programmingLanguage}:
- Focus on proper document structure with well-formed tags/elements
- Include semantic elements and proper nesting
- Use appropriate attributes and values
- Create realistic content structure (forms, lists, sections, etc.)`;
  } else if (isDataFormat) {
    languageSpecificGuidance = `
Special guidance for ${programmingLanguage}:
- Create realistic data structures (configuration, API response, data model)
- Use proper syntax and formatting
- Include nested structures, arrays, and various data types
- Make the data meaningful and realistic`;
  } else if (isStyle) {
    languageSpecificGuidance = `
Special guidance for ${programmingLanguage}:
- Focus on realistic styling rules for common UI components
- Include selectors, properties, and values
- Use modern ${programmingLanguage} features (variables, nesting, mixins as appropriate)
- Create cohesive styling for a realistic component`;
  }

  // Time-specific guidance
  let timingGuidance = "";
  if (timeLimit > 0) {
    if (timeLimit <= 30) {
      timingGuidance = `\nIMPORTANT: This is a SHORT ${timeLimit}-second test. Keep code VERY concise (${charCount} characters). Focus on a single, clear concept.`;
    } else if (timeLimit <= 60) {
      timingGuidance = `\nThis is a ${timeLimit}-second test. Target ${charCount} characters. Keep it focused but complete.`;
    } else if (timeLimit <= 180) {
      timingGuidance = `\nThis is a ${Math.round(timeLimit/60)}-minute test. Target ${charCount} characters. Include a complete, functional code segment.`;
    } else {
      timingGuidance = `\nThis is a longer ${Math.round(timeLimit/60)}-minute test. Target ${charCount} characters. Create a comprehensive code example with multiple concepts.`;
    }
  }

  // Custom prompt from user
  const customPromptGuidance = customPrompt 
    ? `\n\n🎯 USER'S CUSTOM REQUEST:\nThe user specifically wants code about: "${customPrompt}"\nGenerate code that directly addresses this request while maintaining ${programmingLanguage} syntax and the specified difficulty level.`
    : '';

  const prompt = `Generate a ${difficulty}-level ${programmingLanguage} code snippet${frameworkNote} for typing practice.${customPromptGuidance}

⚠️ CRITICAL LENGTH REQUIREMENT - THIS IS MANDATORY:
- You MUST generate AT LEAST ${charCount} characters of code
- You MUST generate AT LEAST ${lineCount} lines of code
- DO NOT generate less than the minimum. If unsure, generate MORE.
- This is a typing test - users need LOTS of code to practice with.

TEST CONFIGURATION:
- Difficulty: ${difficulty.toUpperCase()} - ${difficultyContext}
- Test Mode: ${testMode.toUpperCase()} - ${testModeContext}
- MINIMUM Length: ${lineCount} lines, ${charCount} characters (generate AT LEAST this much)
${timingGuidance}

CODE REQUIREMENTS:
1. Write AT LEAST ${lineCount} lines of actual, functional ${programmingLanguage} code${frameworkNote}
2. Generate AT LEAST ${charCount} total characters - this is the MINIMUM
3. Use proper syntax, consistent 2-space indentation
4. Include realistic variable names following ${programmingLanguage} conventions
5. Create a complete, realistic code example (not just a tiny snippet)
6. ${testMode === 'master' ? 'CRITICAL: Every character must be precise. No unusual formatting.' : testMode === 'expert' ? 'Ensure clean, unambiguous syntax throughout.' : 'Use standard code patterns.'}
${languageSpecificGuidance}

${framework ? `Framework-specific requirements:
- Use ${framework}-specific syntax and patterns
- Include common ${framework} APIs or functions
- Follow ${framework} best practices and conventions
` : ''}

GENERATE A COMPLETE CODE EXAMPLE such as:
- A complete function with multiple operations
- A class with several methods
- Multiple related functions working together
- An algorithm implementation with helper functions

Return the code snippet in this JSON format:
{
  "code": "the actual code here (properly formatted with newlines)",
  "description": "brief 1-sentence description of what this code does"
}

Return ONLY valid JSON. Remember: MINIMUM ${charCount} characters!`;

  try {
    console.log(`🔧 Generating ${difficulty} ${programmingLanguage} snippet (${timeLimit}s, ${testMode} mode) - Target: ${charCount} chars, ${lineCount} lines`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000, // Increased for longer code snippets
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content?.trim() || "";
    
    if (!content) {
      throw new Error("AI generated empty content");
    }

    const parsed = JSON.parse(content);
    const code = parsed.code || parsed.content || "";
    const description = parsed.description || `${programmingLanguage} code snippet`;

    if (!code) {
      throw new Error("No code in AI response");
    }

    const generatedLines = code.split('\n').length;
    const generatedChars = code.length;
    console.log(`✅ Generated ${generatedLines} lines, ${generatedChars} chars of ${programmingLanguage} code`);
    
    return {
      content: code,
      description: description
    };
  } catch (error: any) {
    console.error("❌ AI code generation error:", error.message || error);
    if (error.response) {
      console.error("API Error Response:", error.response.data);
    }
    throw error;
  }
}
