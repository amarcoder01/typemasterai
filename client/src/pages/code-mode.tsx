import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code, Trophy, Zap, Target, RotateCcw, Check } from "lucide-react";
import confetti from "canvas-confetti";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-swift";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-php";
import "prismjs/components/prism-kotlin";
import "prismjs/components/prism-dart";
import "prismjs/components/prism-scala";
import "prismjs/components/prism-r";
import "prismjs/components/prism-powershell";
import "prismjs/components/prism-perl";
import "prismjs/components/prism-lua";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-scss";
import "prismjs/components/prism-sass";
import "prismjs/components/prism-less";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-toml";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-elixir";
import "prismjs/components/prism-haskell";
import "prismjs/components/prism-clojure";
import "prismjs/components/prism-fsharp";
import "prismjs/components/prism-ocaml";
import "prismjs/components/prism-erlang";
import "prismjs/components/prism-objectivec";
import "prismjs/components/prism-groovy";
import "prismjs/components/prism-julia";
import "prismjs/components/prism-nim";
import "prismjs/components/prism-crystal";
import "prismjs/components/prism-d";
import "prismjs/components/prism-scheme";
import "prismjs/components/prism-fortran";
import "prismjs/components/prism-matlab";
import "prismjs/components/prism-solidity";
import "prismjs/components/prism-racket";
import "prismjs/components/prism-lisp";
import "prismjs/components/prism-pascal";
import "prismjs/components/prism-vhdl";

const PROGRAMMING_LANGUAGES = {
  javascript: { name: "JavaScript", prism: "javascript", category: "Popular" },
  typescript: { name: "TypeScript", prism: "typescript", category: "Popular" },
  python: { name: "Python", prism: "python", category: "Popular" },
  java: { name: "Java", prism: "java", category: "Popular" },
  cpp: { name: "C++", prism: "cpp", category: "Popular" },
  csharp: { name: "C#", prism: "csharp", category: "Popular" },
  go: { name: "Go", prism: "go", category: "Popular" },
  rust: { name: "Rust", prism: "rust", category: "Popular" },
  swift: { name: "Swift", prism: "swift", category: "Popular" },
  ruby: { name: "Ruby", prism: "ruby", category: "Popular" },
  
  php: { name: "PHP", prism: "php", category: "Web Development" },
  html: { name: "HTML", prism: "markup", category: "Web Development" },
  css: { name: "CSS", prism: "css", category: "Web Development" },
  scss: { name: "SCSS", prism: "scss", category: "Web Development" },
  sass: { name: "Sass", prism: "sass", category: "Web Development" },
  less: { name: "Less", prism: "less", category: "Web Development" },
  jsx: { name: "JSX", prism: "jsx", category: "Web Development" },
  tsx: { name: "TSX", prism: "tsx", category: "Web Development" },
  
  kotlin: { name: "Kotlin", prism: "kotlin", category: "Mobile & JVM" },
  dart: { name: "Dart", prism: "dart", category: "Mobile & JVM" },
  scala: { name: "Scala", prism: "scala", category: "Mobile & JVM" },
  groovy: { name: "Groovy", prism: "groovy", category: "Mobile & JVM" },
  objectivec: { name: "Objective-C", prism: "objectivec", category: "Mobile & JVM" },
  
  c: { name: "C", prism: "c", category: "Systems Programming" },
  zig: { name: "Zig", prism: "c", category: "Systems Programming" },
  vhdl: { name: "VHDL", prism: "vhdl", category: "Systems Programming" },
  
  r: { name: "R", prism: "r", category: "Data Science" },
  julia: { name: "Julia", prism: "julia", category: "Data Science" },
  matlab: { name: "MATLAB", prism: "matlab", category: "Data Science" },
  
  bash: { name: "Bash/Shell", prism: "bash", category: "Scripting" },
  powershell: { name: "PowerShell", prism: "powershell", category: "Scripting" },
  perl: { name: "Perl", prism: "perl", category: "Scripting" },
  lua: { name: "Lua", prism: "lua", category: "Scripting" },
  
  elixir: { name: "Elixir", prism: "elixir", category: "Functional" },
  haskell: { name: "Haskell", prism: "haskell", category: "Functional" },
  clojure: { name: "Clojure", prism: "clojure", category: "Functional" },
  fsharp: { name: "F#", prism: "fsharp", category: "Functional" },
  ocaml: { name: "OCaml", prism: "ocaml", category: "Functional" },
  erlang: { name: "Erlang", prism: "erlang", category: "Functional" },
  scheme: { name: "Scheme", prism: "scheme", category: "Functional" },
  racket: { name: "Racket", prism: "racket", category: "Functional" },
  lisp: { name: "Lisp", prism: "lisp", category: "Functional" },
  
  sql: { name: "SQL", prism: "sql", category: "Database" },
  
  json: { name: "JSON", prism: "json", category: "Data Formats" },
  yaml: { name: "YAML", prism: "yaml", category: "Data Formats" },
  toml: { name: "TOML", prism: "toml", category: "Data Formats" },
  xml: { name: "XML", prism: "markup", category: "Data Formats" },
  markdown: { name: "Markdown", prism: "markdown", category: "Data Formats" },
  
  fortran: { name: "Fortran", prism: "fortran", category: "Other" },
  nim: { name: "Nim", prism: "nim", category: "Other" },
  crystal: { name: "Crystal", prism: "crystal", category: "Other" },
  d: { name: "D", prism: "d", category: "Other" },
  solidity: { name: "Solidity", prism: "solidity", category: "Other" },
  pascal: { name: "Pascal", prism: "pascal", category: "Other" },
};

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

function calculateWPM(chars: number, seconds: number): number {
  if (seconds === 0) return 0;
  return Math.round((chars / 5) / (seconds / 60));
}

function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}

export default function CodeMode() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [language, setLanguage] = useState("javascript");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [snippetId, setSnippetId] = useState<number | null>(null);
  const [userInput, setUserInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errors, setErrors] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const codeDisplayRef = useRef<HTMLPreElement>(null);

  const fetchCodeSnippet = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/code/snippet?language=${language}&difficulty=${difficulty}&generate=true`);
      if (!response.ok) throw new Error("Failed to fetch code snippet");
      const data = await response.json();
      setCodeSnippet(data.snippet.content);
      setSnippetId(data.snippet.id);
      
      setTimeout(() => {
        if (codeDisplayRef.current) {
          Prism.highlightElement(codeDisplayRef.current);
        }
      }, 100);
    } catch (error) {
      console.error("Error fetching code snippet:", error);
      toast({
        title: "Error",
        description: "Failed to load code snippet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [language, difficulty, toast]);

  useEffect(() => {
    fetchCodeSnippet();
  }, [fetchCodeSnippet]);

  const saveCodeTestMutation = useMutation({
    mutationFn: async (testData: any) => {
      const response = await fetch("/api/code/test-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to save test result");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Saved!",
        description: "Your code typing test result has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["codeStats"] });
      queryClient.invalidateQueries({ queryKey: ["codeLeaderboard"] });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Could not save your test result.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (isActive && startTime) {
      const chars = userInput.length;
      const errorCount = userInput.split("").filter((char, i) => char !== codeSnippet[i]).length;
      const correctChars = chars - errorCount;
      const timeElapsed = (Date.now() - startTime) / 1000;
      
      setWpm(calculateWPM(correctChars, timeElapsed));
      setAccuracy(calculateAccuracy(correctChars, chars));
      setErrors(errorCount);
      
      if (userInput === codeSnippet) {
        finishTest();
      }
    }
  }, [userInput, isActive, startTime, codeSnippet]);

  const finishTest = () => {
    setIsActive(false);
    setIsFinished(true);
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#00FFFF', '#FF00FF']
    });

    if (user && startTime) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      saveCodeTestMutation.mutate({
        codeSnippetId: snippetId,
        programmingLanguage: language,
        wpm,
        accuracy,
        characters: userInput.length,
        errors,
        syntaxErrors: 0,
        duration,
      });
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isFinished) return;
    
    const value = e.target.value;
    
    if (!isActive && value.length > 0) {
      setIsActive(true);
      setStartTime(Date.now());
    }
    
    setUserInput(value);
  };

  const resetTest = () => {
    setUserInput("");
    setStartTime(null);
    setIsActive(false);
    setIsFinished(false);
    setWpm(0);
    setAccuracy(100);
    setErrors(0);
    fetchCodeSnippet();
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const highlightedCode = codeSnippet.split("").map((char, index) => {
    let className = "";
    if (index < userInput.length) {
      className = userInput[index] === char ? "text-green-500" : "text-red-500 bg-red-500/20";
    }
    return (
      <span key={index} className={className}>
        {char === "\n" ? "↵\n" : char}
      </span>
    );
  });

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Code className="w-10 h-10 text-primary" />
          <h1 className="text-4xl font-bold">Code Typing Mode</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Master coding speed and accuracy with real programming syntax
        </p>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-center mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Language:</label>
            <Select value={language} onValueChange={setLanguage} disabled={isActive}>
              <SelectTrigger className="w-[200px]" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[400px]">
                {Object.entries(
                  Object.entries(PROGRAMMING_LANGUAGES).reduce((acc, [key, lang]) => {
                    if (!acc[lang.category]) acc[lang.category] = [];
                    acc[lang.category].push({ key, ...lang });
                    return acc;
                  }, {} as Record<string, Array<{ key: string; name: string; prism: string; category: string }>>)
                ).map(([category, languages]) => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {category}
                    </div>
                    {languages.map(({ key, name }) => (
                      <SelectItem key={key} value={key}>{name}</SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Difficulty:</label>
            <Select value={difficulty} onValueChange={(val) => setDifficulty(val as any)} disabled={isActive}>
              <SelectTrigger className="w-[140px]" data-testid="select-difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={resetTest} 
            variant="outline" 
            data-testid="button-restart"
            disabled={isLoading}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            New Snippet
          </Button>
        </div>

        {!isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Code to Type:</h3>
              <div className="bg-muted rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap" data-testid="code-display">
                  <code className={`language-${PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.prism || 'javascript'}`} ref={codeDisplayRef}>
                    {codeSnippet}
                  </code>
                </pre>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Your Typing:</h3>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={userInput}
                  onChange={handleInput}
                  disabled={isFinished}
                  className="w-full h-96 p-4 bg-background border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary opacity-0 absolute inset-0 z-10"
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  data-testid="input-code"
                />
                <pre className="w-full h-96 p-4 bg-background border rounded-lg font-mono text-sm overflow-auto whitespace-pre-wrap">
                  {highlightedCode}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading code snippet...</p>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center" data-testid="stat-wpm">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-1">
              <Zap className="w-4 h-4" /> WPM
            </div>
            <div className="text-3xl font-bold font-mono text-primary">{wpm}</div>
          </div>
          <div className="text-center" data-testid="stat-accuracy">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-1">
              <Target className="w-4 h-4" /> Accuracy
            </div>
            <div className="text-3xl font-bold font-mono">{accuracy}%</div>
          </div>
          <div className="text-center" data-testid="stat-errors">
            <div className="text-muted-foreground text-sm mb-1">Errors</div>
            <div className="text-3xl font-bold font-mono text-red-500">{errors}</div>
          </div>
          <div className="text-center" data-testid="stat-progress">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-1">
              <Check className="w-4 h-4" /> Progress
            </div>
            <div className="text-3xl font-bold font-mono">{Math.round((userInput.length / codeSnippet.length) * 100)}%</div>
          </div>
        </div>

        {isFinished && (
          <div className="mt-6 text-center">
            <h3 className="text-2xl font-bold mb-4">Test Complete! 🎉</h3>
            <div className="flex gap-4 justify-center">
              <Button onClick={resetTest} data-testid="button-restart-finished">
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/code-leaderboard'} data-testid="button-leaderboard">
                <Trophy className="w-4 h-4 mr-2" />
                View Leaderboard
              </Button>
            </div>
          </div>
        )}
      </Card>

      {!user && (
        <Card className="p-4 mt-6 bg-primary/5 border-primary/20">
          <p className="text-center text-sm">
            <span className="text-muted-foreground">Want to save your progress and compete on leaderboards? </span>
            <a href="/login" className="text-primary hover:underline font-semibold">Sign in</a>
            <span className="text-muted-foreground"> or </span>
            <a href="/register" className="text-primary hover:underline font-semibold">create an account</a>
          </p>
        </Card>
      )}
    </div>
  );
}
