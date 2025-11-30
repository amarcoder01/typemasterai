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
  // Increased base line counts for more substantial initial content
  const baseLines = {
    easy: { min: 10, max: 18 },
    medium: { min: 15, max: 25 },
    hard: { min: 20, max: 35 }
  };

  // Adjust based on time limit (0 = no limit, use default)
  // Assume average typing speed of ~30-50 characters per minute for code
  // Average line is ~40 characters
  if (timeLimit === 0) {
    // No limit - use generous size for continuous typing
    return `${baseLines[difficulty].min}-${baseLines[difficulty].max}`;
  }

  // Calculate target based on time - increased multipliers for more content
  // For 15s = moderate, 30s = good amount, 60s = plenty, 120s+ = lots
  let multiplier = 1;
  if (timeLimit <= 15) {
    multiplier = 0.7; // Increased from 0.4
  } else if (timeLimit <= 30) {
    multiplier = 0.9; // Increased from 0.6
  } else if (timeLimit <= 45) {
    multiplier = 1.0; // Increased from 0.8
  } else if (timeLimit <= 60) {
    multiplier = 1.2; // Increased from 1
  } else if (timeLimit <= 120) {
    multiplier = 1.5; // Increased from 1.3
  } else if (timeLimit <= 180) {
    multiplier = 1.8; // Increased from 1.5
  } else if (timeLimit <= 300) {
    multiplier = 2.2; // Increased from 1.8
  } else {
    multiplier = 2.8; // Increased from 2.2
  }

  const minLines = Math.max(8, Math.round(baseLines[difficulty].min * multiplier));
  const maxLines = Math.max(12, Math.round(baseLines[difficulty].max * multiplier));

  return `${minLines}-${maxLines}`;
}

function getTargetCharacterCount(timeLimit: number): string {
  // Estimate: beginner types ~100 chars/min, intermediate ~150, advanced ~200
  // For code typing (special characters), reduce by ~30%
  // Target: provide plenty of content so continuous typing feels smooth
  
  if (timeLimit === 0) {
    return "400-700"; // No limit, generous length for continuous typing
  }
  
  // Calculate based on ~100 chars per minute (increased for more content)
  // We want MORE content than user can type so they always have something
  const charsPerMinute = 120; // Increased from 80
  const targetChars = Math.round((timeLimit / 60) * charsPerMinute);
  
  // Give a range of ±25% with higher minimum
  const minChars = Math.max(150, Math.round(targetChars * 0.9)); // Increased minimum
  const maxChars = Math.round(targetChars * 1.4); // Increased upper range
  
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

  const prompt = `Generate a realistic ${difficulty}-level ${programmingLanguage} code snippet${frameworkNote} for a typing practice test.${customPromptGuidance}

TEST CONFIGURATION:
- Difficulty: ${difficulty.toUpperCase()} - ${difficultyContext}
- Test Mode: ${testMode.toUpperCase()} - ${testModeContext}
- Time Limit: ${timeLimit > 0 ? `${timeLimit} seconds` : 'No limit'}
- Target Length: ${lineCount} lines, approximately ${charCount} characters
${timingGuidance}

CODE REQUIREMENTS:
1. Write ${lineCount} lines of actual, functional ${programmingLanguage} code${frameworkNote}
2. Target approximately ${charCount} total characters
3. Use proper syntax, consistent 2-space indentation
4. Include realistic variable names following ${programmingLanguage} conventions
5. Balance special characters (brackets, operators) appropriate for difficulty level
6. ${testMode === 'master' ? 'CRITICAL: Every character must be precise. No unusual formatting.' : testMode === 'expert' ? 'Ensure clean, unambiguous syntax throughout.' : 'Use standard code patterns.'}
${languageSpecificGuidance}

${framework ? `Framework-specific requirements:
- Use ${framework}-specific syntax and patterns
- Include common ${framework} APIs or functions
- Follow ${framework} best practices and conventions
` : ''}

DIFFICULTY EXAMPLES:
- Easy: Variable declarations, simple functions, basic loops
- Medium: Class methods, array operations, conditionals, error handling
- Hard: Algorithms, design patterns, async/await, complex data transformations

Return the code snippet in this JSON format:
{
  "code": "the actual code here (properly formatted with newlines)",
  "description": "brief 1-sentence description of what this code does"
}

Return ONLY valid JSON, no markdown formatting or extra text.`;

  try {
    console.log(`🔧 Generating ${difficulty} ${programmingLanguage} snippet (${timeLimit}s, ${testMode} mode)`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
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
