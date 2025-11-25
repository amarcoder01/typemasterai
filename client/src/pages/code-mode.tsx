import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Code, Trophy, Zap, Target, RotateCcw, Check, Settings as SettingsIcon, X } from "lucide-react";
import confetti from "canvas-confetti";

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

const TEST_MODES = [
  { value: "normal", label: "Normal", description: "Standard practice mode" },
  { value: "expert", label: "Expert", description: "Fail on any error" },
  { value: "master", label: "Master", description: "100% accuracy required" },
];

const FONTS = [
  { value: "mono", label: "JetBrains Mono" },
  { value: "fira", label: "Fira Code" },
  { value: "source", label: "Source Code Pro" },
  { value: "consolas", label: "Consolas" },
  { value: "monaco", label: "Monaco" },
];

const FONT_SIZES = [
  { value: "12", label: "12px" },
  { value: "14", label: "14px" },
  { value: "16", label: "16px" },
  { value: "18", label: "18px" },
  { value: "20", label: "20px" },
];

function calculateWPM(chars: number, seconds: number): number {
  if (seconds === 0) return 0;
  return Math.round((chars / 5) / (seconds / 60));
}

function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}

function getFontClass(font: string): string {
  const fonts: Record<string, string> = {
    mono: 'font-["JetBrains_Mono"]',
    fira: 'font-["Fira_Code"]',
    source: 'font-["Source_Code_Pro"]',
    consolas: 'font-["Consolas"]',
    monaco: 'font-["Monaco"]',
  };
  return fonts[font] || fonts.mono;
}

export default function CodeMode() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [viewMode, setViewMode] = useState<"full" | "focus">("focus");
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState("javascript");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [mode, setMode] = useState<"ai" | "custom">("ai");
  const [testMode, setTestMode] = useState<"normal" | "expert" | "master">("normal");
  const [fontFamily, setFontFamily] = useState("mono");
  const [fontSize, setFontSize] = useState("18");
  const [customCode, setCustomCode] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [snippetId, setSnippetId] = useState<number | null>(null);
  const [userInput, setUserInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errors, setErrors] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchCodeSnippet = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/code/snippet?language=${language}&difficulty=${difficulty}&generate=true`);
      if (!response.ok) throw new Error("Failed to fetch code snippet");
      const data = await response.json();
      setCodeSnippet(data.snippet.content);
      setSnippetId(data.snippet.id);
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
    if (mode === "ai") {
      fetchCodeSnippet();
    }
  }, [fetchCodeSnippet, mode]);

  const handleModeSwitch = (newMode: "ai" | "custom") => {
    if (isActive) return;
    setMode(newMode);
    setUserInput("");
    setStartTime(null);
    setIsActive(false);
    setIsFinished(false);
    setWpm(0);
    setAccuracy(100);
    setErrors(0);
    
    if (newMode === "custom") {
      if (customCode) {
        setCodeSnippet(customCode);
        setSnippetId(null);
      } else {
        setCodeSnippet("");
        setSnippetId(null);
      }
    }
  };

  const applyCustomCode = () => {
    if (!customCode.trim()) {
      toast({
        title: "Empty Code",
        description: "Please paste some code to practice with.",
        variant: "destructive",
      });
      return;
    }
    setCodeSnippet(customCode);
    setSnippetId(null);
    toast({
      title: "Custom Code Loaded!",
      description: "Start typing to practice with your code.",
    });
  };

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
    if (isFinished || isFailed) return;
    
    const value = e.target.value;
    
    if (!isActive && value.length > 0) {
      setIsActive(true);
      setStartTime(Date.now());
    }
    
    const lastChar = value[value.length - 1];
    const expectedChar = codeSnippet[value.length - 1];
    
    if (testMode === "expert" && lastChar !== expectedChar && value.length > userInput.length) {
      setIsFailed(true);
      setIsActive(false);
      toast({
        title: "Expert Mode Failed!",
        description: "You made an error. The test has been reset.",
        variant: "destructive",
      });
      setTimeout(() => {
        resetTest();
        setIsFailed(false);
      }, 1500);
      return;
    }
    
    if (testMode === "master") {
      const currentErrors = value.split("").filter((char, i) => char !== codeSnippet[i]).length;
      if (currentErrors > 0) {
        return;
      }
    }
    
    setUserInput(value);
  };

  const resetTest = () => {
    setUserInput("");
    setStartTime(null);
    setIsActive(false);
    setIsFinished(false);
    setIsFailed(false);
    setWpm(0);
    setAccuracy(100);
    setErrors(0);
    
    if (mode === "ai") {
      fetchCodeSnippet();
    } else if (mode === "custom" && customCode) {
      setCodeSnippet(customCode);
      setSnippetId(null);
    }
    
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

  if (viewMode === "focus") {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center p-8 z-[100]">
        {isLoading ? (
          <div className="text-muted-foreground text-lg">Loading code snippet...</div>
        ) : !codeSnippet ? (
          <div className="text-muted-foreground text-lg">No code available</div>
        ) : (
          <>
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={handleInput}
              disabled={isFinished || isFailed}
              className="absolute inset-0 w-full h-full opacity-0 z-50"
              style={{ cursor: isActive ? "default" : "text" }}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              data-testid="input-code-focus"
            />
            
            {!isActive && !isFinished && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <p className="text-muted-foreground text-lg">Click or type to start</p>
              </div>
            )}

            <div className="max-w-4xl w-full mx-auto relative">
              <pre className={`whitespace-pre text-left ${getFontClass(fontFamily)} text-muted-foreground/30 select-none`} style={{ fontSize: `${fontSize}px`, lineHeight: "1.8" }}>
                {codeSnippet}
              </pre>
              
              <pre className={`whitespace-pre text-left ${getFontClass(fontFamily)} absolute inset-0 pointer-events-none`} style={{ fontSize: `${fontSize}px`, lineHeight: "1.8" }}>
                {codeSnippet.split("").map((char, index) => {
                  if (index >= userInput.length) {
                    return <span key={index} className="opacity-0">{char}</span>;
                  }
                  const isCorrect = userInput[index] === char;
                  return (
                    <span key={index} className={isCorrect ? "text-green-500" : "text-red-500 bg-red-500/20"}>
                      {char}
                    </span>
                  );
                })}
              </pre>
            </div>

            {(isActive || isFinished) && (
              <div className="fixed bottom-8 right-8 flex gap-4 text-sm z-20">
                <div className="bg-background/80 backdrop-blur px-3 py-1 rounded-md border">
                  <span className="text-primary font-bold">{wpm}</span> <span className="text-muted-foreground">WPM</span>
                </div>
                <div className="bg-background/80 backdrop-blur px-3 py-1 rounded-md border">
                  <span className="text-primary font-bold">{accuracy}%</span> <span className="text-muted-foreground">ACC</span>
                </div>
              </div>
            )}

            {isFinished && (
              <div className="fixed inset-0 bg-background/95 backdrop-blur flex items-center justify-center z-40">
                <Card className="p-8 text-center max-w-md">
                  <h3 className="text-3xl font-bold mb-6">Test Complete! 🎉</h3>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-muted-foreground text-sm mb-1">WPM</div>
                      <div className="text-4xl font-bold text-primary">{wpm}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground text-sm mb-1">Accuracy</div>
                      <div className="text-4xl font-bold">{accuracy}%</div>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={resetTest} data-testid="button-restart-focus">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                    <Button variant="outline" onClick={() => setViewMode("full")}>
                      Full View
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            <Sheet open={showSettings} onOpenChange={setShowSettings}>
              <Button 
                variant="outline" 
                size="sm" 
                className="fixed top-4 right-4"
                onClick={() => setShowSettings(true)}
                data-testid="button-settings-focus"
              >
                <SettingsIcon className="w-4 h-4 mr-2" />
                Settings
              </Button>
              
              <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Code Typing Settings</SheetTitle>
                  <SheetDescription>
                    Configure your code typing test preferences
                  </SheetDescription>
                </SheetHeader>
                
                <div className="space-y-6 mt-6">
                  {/* Mode Selection */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Mode</label>
                    <div className="flex border rounded-md overflow-hidden">
                      <Button
                        variant={mode === "ai" ? "default" : "ghost"}
                        className="rounded-none flex-1"
                        onClick={() => handleModeSwitch("ai")}
                        disabled={isActive}
                        data-testid="button-mode-ai-drawer"
                      >
                        AI Generated
                      </Button>
                      <Button
                        variant={mode === "custom" ? "default" : "ghost"}
                        className="rounded-none flex-1"
                        onClick={() => handleModeSwitch("custom")}
                        disabled={isActive}
                        data-testid="button-mode-custom-drawer"
                      >
                        Custom Code
                      </Button>
                    </div>
                  </div>

                  {/* Language Selection (AI Mode) */}
                  {mode === "ai" && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Programming Language</label>
                      <Select value={language} onValueChange={setLanguage} disabled={isActive}>
                        <SelectTrigger data-testid="select-language-drawer">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
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
                  )}

                  {/* Difficulty (AI Mode) */}
                  {mode === "ai" && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Difficulty</label>
                      <Select value={difficulty} onValueChange={(val) => setDifficulty(val as any)} disabled={isActive}>
                        <SelectTrigger data-testid="select-difficulty-drawer">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Custom Code Input */}
                  {mode === "custom" && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Your Code</label>
                      <Textarea
                        placeholder="Paste your code here..."
                        value={customCode}
                        onChange={(e) => setCustomCode(e.target.value)}
                        className="font-mono text-sm min-h-[200px]"
                        disabled={isActive}
                        data-testid="textarea-custom-code-drawer"
                      />
                      <Button 
                        onClick={applyCustomCode} 
                        className="mt-2 w-full"
                        disabled={isActive}
                        data-testid="button-apply-custom-drawer"
                      >
                        Apply Custom Code
                      </Button>
                    </div>
                  )}

                  {/* Test Mode */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Test Mode</label>
                    <Select value={testMode} onValueChange={(val) => setTestMode(val as any)} disabled={isActive}>
                      <SelectTrigger data-testid="select-test-mode-drawer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            <span>Normal</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="expert">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4" />
                            <span>Expert (Fail on Error)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="master">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            <span>Master (100% Accuracy)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Font Family</label>
                    <Select value={fontFamily} onValueChange={setFontFamily} disabled={isActive}>
                      <SelectTrigger data-testid="select-font-family-drawer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mono">JetBrains Mono</SelectItem>
                        <SelectItem value="fira">Fira Code</SelectItem>
                        <SelectItem value="source">Source Code Pro</SelectItem>
                        <SelectItem value="consolas">Consolas</SelectItem>
                        <SelectItem value="monaco">Monaco</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Font Size */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Font Size</label>
                    <Select value={fontSize} onValueChange={setFontSize} disabled={isActive}>
                      <SelectTrigger data-testid="select-font-size-drawer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12px</SelectItem>
                        <SelectItem value="14">14px</SelectItem>
                        <SelectItem value="16">16px</SelectItem>
                        <SelectItem value="18">18px</SelectItem>
                        <SelectItem value="20">20px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* View Mode Switch */}
                  <div className="pt-4 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setViewMode("full");
                        setShowSettings(false);
                      }}
                      data-testid="button-switch-full-mode"
                    >
                      Switch to Full Mode
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8 text-center relative">
        <Button 
          variant="outline" 
          size="sm" 
          className="absolute right-0 top-0"
          onClick={() => setViewMode("focus")}
          data-testid="button-focus-view"
        >
          Focus Mode
        </Button>
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
            <label className="text-sm font-medium">Mode:</label>
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={mode === "ai" ? "default" : "ghost"}
                className="rounded-none"
                onClick={() => handleModeSwitch("ai")}
                disabled={isActive}
                data-testid="button-mode-ai"
              >
                AI Generated
              </Button>
              <Button
                variant={mode === "custom" ? "default" : "ghost"}
                className="rounded-none"
                onClick={() => handleModeSwitch("custom")}
                disabled={isActive}
                data-testid="button-mode-custom"
              >
                Custom Code
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Language:</label>
            <Select value={language} onValueChange={setLanguage} disabled={isActive || mode === "custom"}>
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
            <Select value={difficulty} onValueChange={(val) => setDifficulty(val as any)} disabled={isActive || mode === "custom"}>
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

          {mode === "ai" && (
            <Button 
              onClick={resetTest} 
              variant="outline" 
              data-testid="button-restart"
              disabled={isLoading}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              New Snippet
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-center pb-4 border-b">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Test Mode:</label>
            <Select value={testMode} onValueChange={(val) => setTestMode(val as any)} disabled={isActive}>
              <SelectTrigger className="w-[140px]" data-testid="select-test-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEST_MODES.map(({ value, label, description }) => (
                  <SelectItem key={value} value={value}>
                    <div>
                      <div>{label}</div>
                      <div className="text-xs text-muted-foreground">{description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Font:</label>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger className="w-[160px]" data-testid="select-font">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONTS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Size:</label>
            <Select value={fontSize} onValueChange={setFontSize}>
              <SelectTrigger className="w-[100px]" data-testid="select-font-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_SIZES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {mode === "custom" && !codeSnippet && (
          <div className="mb-6">
            <label className="text-sm font-semibold mb-2 block">Paste Your Code:</label>
            <textarea
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              className="w-full h-64 p-4 bg-background border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Paste your code here to practice typing it..."
              spellCheck={false}
              autoComplete="off"
              data-testid="textarea-custom-code"
            />
            <div className="mt-2 flex gap-2 justify-end">
              <Button onClick={applyCustomCode} data-testid="button-apply-custom">
                Load Code
              </Button>
            </div>
          </div>
        )}

        {mode === "custom" && codeSnippet && (
          <div className="mb-4 flex justify-end">
            <Button 
              onClick={() => {
                setCodeSnippet("");
                setUserInput("");
                setIsActive(false);
                setIsFinished(false);
              }} 
              variant="outline" 
              size="sm"
              data-testid="button-change-custom"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Change Code
            </Button>
          </div>
        )}

        {!isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Code to Type:</h3>
              <div className="bg-muted rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto">
                <pre className={`whitespace-pre-wrap text-foreground ${getFontClass(fontFamily)}`} style={{ fontSize: `${fontSize}px` }} data-testid="code-display">
                  {codeSnippet}
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
                  className={`w-full h-96 p-4 bg-background border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary opacity-0 absolute inset-0 z-10 ${getFontClass(fontFamily)}`}
                  style={{ fontSize: `${fontSize}px` }}
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  data-testid="input-code"
                />
                <pre className={`w-full h-96 p-4 bg-background border rounded-lg overflow-auto whitespace-pre-wrap ${getFontClass(fontFamily)}`} style={{ fontSize: `${fontSize}px` }}>
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
