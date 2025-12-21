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

// Comprehensive code topics from basic to advanced - each request gets a random topic
const CODE_TOPICS = {
  // BASIC CONCEPTS
  basics: [
    "variable declarations and types", "conditional statements", "loop iterations",
    "function definitions", "array operations", "object manipulation", "string operations",
    "basic math operations", "type conversions", "boolean logic", "switch statements",
    "ternary operators", "template literals", "destructuring assignment", "spread operator"
  ],
  
  // DATA STRUCTURES
  dataStructures: [
    "array methods implementation", "linked list operations", "stack implementation",
    "queue operations", "hash table/map", "binary tree operations", "graph representation",
    "heap implementation", "set operations", "priority queue", "circular buffer",
    "trie implementation", "doubly linked list", "skip list", "disjoint set union"
  ],
  
  // ALGORITHMS - Sorting
  sortingAlgorithms: [
    "bubble sort", "selection sort", "insertion sort", "merge sort", "quick sort",
    "heap sort", "counting sort", "radix sort", "bucket sort", "shell sort",
    "tim sort implementation", "cocktail shaker sort"
  ],
  
  // ALGORITHMS - Searching
  searchingAlgorithms: [
    "linear search", "binary search", "jump search", "interpolation search",
    "exponential search", "fibonacci search", "ternary search", "depth-first search",
    "breadth-first search", "A* pathfinding", "dijkstra algorithm", "bellman-ford algorithm"
  ],
  
  // ALGORITHMS - Advanced
  advancedAlgorithms: [
    "dynamic programming solution", "greedy algorithm", "backtracking algorithm",
    "divide and conquer", "sliding window technique", "two pointer technique",
    "recursion with memoization", "topological sort", "kruskal algorithm",
    "prim algorithm", "floyd warshall", "knapsack problem", "longest common subsequence",
    "matrix chain multiplication", "coin change problem", "edit distance algorithm"
  ],
  
  // STRING ALGORITHMS
  stringAlgorithms: [
    "string reversal", "palindrome checker", "anagram detector", "string compression",
    "pattern matching", "KMP algorithm", "rabin-karp algorithm", "longest palindromic substring",
    "string permutations", "word frequency counter", "text justification", "regex parser"
  ],
  
  // MATH & NUMBERS
  mathOperations: [
    "prime number generator", "factorial calculator", "fibonacci sequence",
    "greatest common divisor", "least common multiple", "power function",
    "matrix multiplication", "number to words converter", "roman numeral converter",
    "base converter", "fraction operations", "complex number operations",
    "statistical calculations", "random number generator", "big integer operations"
  ],
  
  // OBJECT-ORIENTED PROGRAMMING
  oopConcepts: [
    "class with inheritance", "interface implementation", "abstract class",
    "encapsulation example", "polymorphism demonstration", "composition over inheritance",
    "method overloading", "method overriding", "static methods and properties",
    "getters and setters", "constructor patterns", "prototype chain", "mixins"
  ],
  
  // DESIGN PATTERNS - Creational
  creationalPatterns: [
    "factory pattern", "abstract factory", "builder pattern", "prototype pattern",
    "singleton pattern", "object pool pattern", "lazy initialization"
  ],
  
  // DESIGN PATTERNS - Structural
  structuralPatterns: [
    "adapter pattern", "bridge pattern", "composite pattern", "decorator pattern",
    "facade pattern", "flyweight pattern", "proxy pattern", "module pattern"
  ],
  
  // DESIGN PATTERNS - Behavioral
  behavioralPatterns: [
    "chain of responsibility", "command pattern", "iterator pattern", "mediator pattern",
    "memento pattern", "observer pattern", "state pattern", "strategy pattern",
    "template method", "visitor pattern", "null object pattern", "specification pattern"
  ],
  
  // FUNCTIONAL PROGRAMMING
  functionalProgramming: [
    "pure functions", "higher-order functions", "currying implementation",
    "function composition", "partial application", "immutable data operations",
    "map reduce filter", "fold/reduce implementation", "lazy evaluation",
    "functor implementation", "monad example", "pipe and compose utilities"
  ],
  
  // ASYNC PROGRAMMING
  asyncProgramming: [
    "promise implementation", "async/await patterns", "callback handling",
    "promise chaining", "parallel async operations", "sequential async execution",
    "race conditions handling", "debounce function", "throttle function",
    "retry with backoff", "timeout wrapper", "cancellable promise", "async queue"
  ],
  
  // ERROR HANDLING
  errorHandling: [
    "try-catch patterns", "custom error classes", "error boundary",
    "graceful degradation", "error logging utility", "validation error handling",
    "async error handling", "error recovery mechanism", "circuit breaker pattern"
  ],
  
  // DATA VALIDATION
  dataValidation: [
    "email validator", "password strength checker", "phone number validator",
    "credit card validator", "URL validator", "date validator", "form validation",
    "schema validator", "input sanitizer", "type guard functions", "JSON schema validator"
  ],
  
  // DATA TRANSFORMATION
  dataTransformation: [
    "object mapper", "data normalizer", "array flattener", "deep clone utility",
    "object diff calculator", "data aggregator", "pivot table generator",
    "group by implementation", "data denormalizer", "tree to flat converter"
  ],
  
  // PARSING & SERIALIZATION
  parsingAndSerialization: [
    "JSON parser", "CSV parser", "XML parser", "YAML parser", "markdown parser",
    "query string parser", "command line argument parser", "expression parser",
    "tokenizer/lexer", "simple compiler", "template engine", "INI file parser"
  ],
  
  // FILE & I/O OPERATIONS
  fileOperations: [
    "file reader utility", "file writer utility", "directory walker",
    "file watcher", "stream processor", "buffer operations", "binary file handler",
    "file compression utility", "file encryption", "temp file manager"
  ],
  
  // NETWORKING
  networking: [
    "HTTP client", "REST API wrapper", "WebSocket client", "GraphQL client",
    "request interceptor", "response handler", "API rate limiter",
    "connection pool manager", "request queue", "fetch wrapper with retry"
  ],
  
  // CACHING
  caching: [
    "LRU cache", "LFU cache", "TTL cache", "memoization utility",
    "cache invalidation", "write-through cache", "cache decorator",
    "distributed cache interface", "in-memory cache", "persistent cache"
  ],
  
  // SECURITY
  security: [
    "password hasher", "token generator", "encryption utility", "decryption utility",
    "HMAC generator", "digital signature", "secure random generator",
    "XSS sanitizer", "SQL injection preventer", "CSRF token handler", "rate limiter"
  ],
  
  // AUTHENTICATION & AUTHORIZATION
  authPatterns: [
    "JWT token handler", "OAuth flow handler", "session manager",
    "role-based access control", "permission checker", "API key validator",
    "refresh token handler", "multi-factor auth", "password reset flow"
  ],
  
  // STATE MANAGEMENT
  stateManagement: [
    "state container", "store implementation", "reducer pattern",
    "action creator", "middleware chain", "state selector", "computed properties",
    "undo/redo manager", "history state manager", "reactive state"
  ],
  
  // EVENT HANDLING
  eventHandling: [
    "event emitter", "event bus", "pub/sub system", "event aggregator",
    "event sourcing", "event replay", "event queue", "event dispatcher",
    "custom event system", "event delegation handler"
  ],
  
  // SCHEDULING & TIMING
  scheduling: [
    "task scheduler", "cron job parser", "interval manager", "timeout manager",
    "rate limiter", "job queue", "priority scheduler", "deadline scheduler",
    "recurring task handler", "batch processor"
  ],
  
  // LOGGING & MONITORING
  loggingMonitoring: [
    "logger utility", "log formatter", "log rotator", "performance monitor",
    "metrics collector", "health checker", "tracing utility", "debug helper",
    "profiler", "memory usage tracker"
  ],
  
  // TESTING UTILITIES
  testingUtilities: [
    "test runner", "assertion library", "mock generator", "spy utility",
    "fixture factory", "snapshot comparator", "coverage calculator",
    "test data generator", "fake data factory", "stub creator"
  ],
  
  // CLI UTILITIES
  cliUtilities: [
    "command parser", "argument validator", "interactive prompt",
    "progress bar", "spinner animation", "table formatter", "color output",
    "menu system", "autocomplete handler", "command history"
  ],
  
  // DATE & TIME
  dateTimeUtilities: [
    "date formatter", "date parser", "timezone converter", "duration calculator",
    "date range generator", "calendar utility", "relative time formatter",
    "business days calculator", "recurring date generator", "countdown timer"
  ],
  
  // COLLECTIONS & ITERATORS
  collectionsIterators: [
    "custom iterator", "generator function", "lazy sequence", "range generator",
    "zip utility", "chunk splitter", "window slider", "unique filter",
    "intersection finder", "difference calculator", "cartesian product"
  ],
  
  // TEXT PROCESSING
  textProcessing: [
    "text formatter", "word counter", "sentence tokenizer", "slug generator",
    "case converter", "text truncator", "search highlighter", "diff generator",
    "fuzzy matcher", "autocorrect", "spell checker", "text summarizer"
  ],
  
  // GEOMETRY & GRAPHICS
  geometryGraphics: [
    "point operations", "line intersection", "polygon area calculator",
    "distance calculator", "bounding box", "collision detection",
    "shape renderer", "color converter", "image resizer", "canvas utilities"
  ],
  
  // GAME DEVELOPMENT
  gameDevelopment: [
    "game loop", "entity component system", "collision system", "physics engine",
    "particle system", "animation controller", "input handler", "scene manager",
    "pathfinding AI", "inventory system", "save/load system", "leaderboard"
  ],
  
  // DATABASE PATTERNS
  databasePatterns: [
    "query builder", "ORM implementation", "repository pattern", "unit of work",
    "data mapper", "active record", "connection manager", "migration runner",
    "seed data generator", "transaction handler"
  ],
  
  // API DESIGN
  apiDesign: [
    "REST controller", "middleware handler", "route handler", "request validator",
    "response formatter", "pagination helper", "sorting utility", "filter parser",
    "versioning handler", "documentation generator"
  ],
  
  // REAL-TIME FEATURES
  realTimeFeatures: [
    "chat message handler", "presence tracker", "live notification",
    "real-time sync", "collaborative editing", "live cursor", "typing indicator",
    "online status manager", "broadcast channel", "room manager"
  ],
  
  // E-COMMERCE
  ecommerce: [
    "shopping cart", "price calculator", "discount engine", "tax calculator",
    "inventory manager", "order processor", "payment handler", "shipping calculator",
    "wishlist manager", "product recommender", "review system"
  ],
  
  // SOCIAL FEATURES
  socialFeatures: [
    "follow system", "like/reaction handler", "comment system", "share handler",
    "feed generator", "notification system", "mention parser", "hashtag extractor",
    "activity tracker", "privacy settings"
  ],
  
  // CONTENT MANAGEMENT
  contentManagement: [
    "content editor", "version control", "draft manager", "publish scheduler",
    "media library", "tag manager", "category handler", "SEO optimizer",
    "sitemap generator", "RSS feed generator"
  ],
  
  // UTILITY PATTERNS
  utilityPatterns: [
    "dependency injection container", "service locator", "plugin system",
    "hook system", "middleware pipeline", "interceptor chain", "feature flag",
    "configuration manager", "environment handler", "localization utility"
  ]
};

// Get a random topic for variety
function getRandomTopic(): string {
  const categories = Object.values(CODE_TOPICS);
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const randomTopic = randomCategory[Math.floor(Math.random() * randomCategory.length)];
  return randomTopic;
}

// Get multiple random topics to suggest variety
function getTopicSuggestions(count: number = 3): string[] {
  const allTopics = Object.values(CODE_TOPICS).flat();
  const shuffled = [...allTopics].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
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

  // Generate variety by suggesting a random topic when no custom prompt
  const randomTopic = getRandomTopic();
  const topicSuggestions = getTopicSuggestions(5);
  const varietyGuidance = !customPrompt ? `
🎲 VARIETY REQUIREMENT - CRITICAL:
- Generate code about: "${randomTopic}" (or pick from: ${topicSuggestions.join(", ")})
- DO NOT generate common examples like "hello world", "calculator", "fibonacci", or basic CRUD operations
- Each generation should be UNIQUE and CREATIVE
- Pick a DIFFERENT topic, domain, or use case than typical examples
- Create something interesting: real-world utilities, clever algorithms, practical features
- Avoid repetitive patterns - surprise the user with fresh, educational content!
` : '';

  const prompt = `Generate a ${difficulty}-level ${programmingLanguage} code snippet${frameworkNote} for typing practice.${customPromptGuidance}${varietyGuidance}

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

GENERATE A COMPLETE CODE EXAMPLE - BE CREATIVE AND UNIQUE:
- A complete function with multiple operations (NOT hello world or basic math)
- A class with several methods (for real-world use cases)
- Multiple related functions working together (practical utilities)
- An algorithm implementation with helper functions (educational value)
- API clients, data processors, validators, utilities, handlers, managers
- Game logic, UI helpers, formatting tools, parsers, converters

Return the code snippet in this JSON format:
{
  "code": "the actual code here (properly formatted with newlines)",
  "description": "brief 1-sentence description of what this code does"
}

Return ONLY valid JSON. Remember: MINIMUM ${charCount} characters!`;

  try {
    const topicInfo = customPrompt ? `custom: "${customPrompt}"` : `suggested: "${randomTopic}"`;
    console.log(`🔧 Generating ${difficulty} ${programmingLanguage} snippet (${timeLimit}s, ${testMode} mode) - Target: ${charCount} chars, ${lineCount} lines - Topic: ${topicInfo}`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000, // Increased for longer code snippets
      temperature: 0.9, // Higher temperature for more variety in topics
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
