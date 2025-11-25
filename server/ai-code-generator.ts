import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export async function generateCodeSnippet(
  programmingLanguage: string,
  difficulty: "easy" | "medium" | "hard" = "medium",
  framework?: string
): Promise<{ content: string; description: string }> {
  const lineCount = difficulty === "easy" ? "5-8" : difficulty === "medium" ? "10-15" : "15-25";

  const frameworkNote = framework ? ` using the ${framework} framework` : '';
  
  const difficultyContext = {
    easy: "Basic syntax, simple logic, beginner-friendly concepts",
    medium: "Moderate complexity with common patterns, intermediate concepts",
    hard: "Advanced patterns, complex logic, best practices, and optimization"
  }[difficulty];

  const prompt = `Generate a realistic ${difficulty}-level ${programmingLanguage} code snippet${frameworkNote} for typing practice.

Requirements:
1. Write ${lineCount} lines of actual, functional ${programmingLanguage} code${frameworkNote}
2. Include proper syntax, indentation (2 spaces), and common code patterns
3. Difficulty: ${difficultyContext}
4. Make it realistic code that a ${programmingLanguage} developer would actually write
5. Include a mix of keywords, operators, function calls, and typical constructs
6. Use meaningful variable names and follow ${programmingLanguage} naming conventions
7. Include comments where appropriate (1-2 brief comments)

${framework ? `Framework-specific requirements:
- Use ${framework}-specific syntax and patterns
- Include common ${framework} APIs or functions
- Follow ${framework} best practices and conventions
` : ''}

Examples of good code snippets:
- Easy: Variable declarations, simple functions, basic control flow
- Medium: Class definitions, array/object operations, API calls
- Hard: Complex algorithms, design patterns, async/await logic

Return the code snippet in this JSON format:
{
  "code": "the actual code here (properly formatted with newlines)",
  "description": "brief 1-sentence description of what this code does"
}

Return ONLY valid JSON, no markdown formatting or extra text.`;

  try {
    console.log(`🔧 Generating ${difficulty} ${programmingLanguage} code snippet${frameworkNote}`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.8,
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

    console.log(`✅ Generated ${code.split('\n').length} lines of ${programmingLanguage} code`);
    
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
