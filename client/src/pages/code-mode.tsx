import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Code, Trophy, Zap, Target, RotateCcw, Check, Share2, Copy, Facebook, Twitter, Linkedin, MessageCircle } from "lucide-react";
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

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function CodeMode() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [completedTestData, setCompletedTestData] = useState<{
    duration: number;
    wpm: number;
    accuracy: number;
    errors: number;
    codeContent: string;
  } | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchCodeSnippet = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/code/snippet?language=${language}&difficulty=${difficulty}&generate=true`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Server error: ${response.status}`);
      }
      const data = await response.json();
      setCodeSnippet(data.snippet.content);
      setSnippetId(data.snippet.id);
    } catch (error: any) {
      console.error("Error fetching code snippet:", error);
      toast({
        title: "Failed to Load Code Snippet",
        description: error.message?.includes("500") 
          ? "AI service is currently unavailable. Try changing the language or difficulty." 
          : error.message?.includes("Network") 
          ? "Network error. Please check your connection and try again."
          : "Unable to generate code snippet. Press Ctrl+Enter to retry or try a different language.",
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
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Saved!",
        description: "Your code typing test result has been saved to your profile.",
      });
      queryClient.invalidateQueries({ queryKey: ["codeStats"] });
      queryClient.invalidateQueries({ queryKey: ["codeLeaderboard"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Save Test",
        description: error.message?.includes("401") 
          ? "Please log in to save your test results."
          : error.message?.includes("Network")
          ? "Network error. Your result wasn't saved. Please check your connection."
          : "Could not save your test result. Your stats are still visible above.",
        variant: "destructive",
      });
    },
  });

  const handleShare = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to share your results.",
        variant: "destructive",
      });
      return;
    }

    if (!completedTestData) {
      toast({
        title: "No Test Data",
        description: "Complete a test first to share your results.",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);
    try {
      const response = await fetch("/api/code/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programmingLanguage: language,
          framework: null,
          difficulty,
          testMode,
          wpm: completedTestData.wpm,
          accuracy: completedTestData.accuracy,
          errors: completedTestData.errors,
          syntaxErrors: 0,
          duration: completedTestData.duration,
          codeContent: completedTestData.codeContent,
        }),
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to create share");
      const data = await response.json();
      
      const url = `${window.location.origin}/share/${data.shareId}`;
      setShareUrl(url);
      setShareDialogOpen(true);
      
      toast({
        title: "Share Created!",
        description: "Your result is ready to share.",
      });
    } catch (error: any) {
      console.error("Share error:", error);
      toast({
        title: "Share Failed",
        description: error.message?.includes("401")
          ? "Please log in to share your results."
          : error.message?.includes("Network")
          ? "Network error. Please check your connection and try again."
          : error.message?.includes("Validation")
          ? "Invalid test data. Please complete another test and try again."
          : "Could not create share link. Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Copied!",
      description: "Share link copied to clipboard.",
    });
  };

  const shareToSocial = (platform: string) => {
    const text = `I just typed ${wpm} WPM with ${accuracy}% accuracy in ${PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language}! Can you beat my score?`;
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(shareUrl);
    
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    };
    
    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

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

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (shareDialogOpen) return;
      
      if (e.key === "Escape" && !isActive && !isFinished) {
        resetTest();
        toast({
          title: "Test Reset",
          description: "Press any key to start typing.",
        });
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !isActive && mode === "ai") {
        e.preventDefault();
        fetchCodeSnippet();
        toast({
          title: "New Snippet",
          description: "Loading a new code snippet...",
        });
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [isActive, isFinished, mode, shareDialogOpen, fetchCodeSnippet, toast]);

  useEffect(() => {
    if (codeSnippet && !isActive && !isFinished && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [codeSnippet, isActive, isFinished]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 100);
    } else if (!isActive) {
      setElapsedTime(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, startTime]);


  const finishTest = () => {
    setIsActive(false);
    setIsFinished(true);
    
    const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    
    setCompletedTestData({
      duration,
      wpm,
      accuracy,
      errors,
      codeContent: codeSnippet,
    });
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#00FFFF', '#FF00FF']
    });

    if (user && startTime) {
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
    setCompletedTestData(null);
    
    if (mode === "ai") {
      fetchCodeSnippet();
    } else if (mode === "custom" && customCode) {
      setCodeSnippet(customCode);
      setSnippetId(null);
    }
    
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const lines = codeSnippet.split("\n");
  const lineCount = lines.length;
  
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
          <>
            {isActive && (
              <div className="mb-6 text-center">
                <div className="inline-flex items-center gap-2 bg-primary/10 px-6 py-3 rounded-full border border-primary/20">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-3xl font-bold font-mono text-primary">{formatTime(elapsedTime)}</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Code to Type:</h3>
              <div className="bg-muted rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
                <div className="flex">
                  <div className="bg-muted/50 px-3 py-4 select-none border-r border-border/50">
                    {Array.from({ length: lineCount }, (_, i) => (
                      <div key={i} className="text-muted-foreground/40 text-right font-mono" style={{ fontSize: `${fontSize}px`, lineHeight: '1.5' }}>
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <pre className={`flex-1 whitespace-pre-wrap text-foreground px-4 py-4 ${getFontClass(fontFamily)}`} style={{ fontSize: `${fontSize}px` }} data-testid="code-display">
                    {codeSnippet}
                  </pre>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Your Typing:</h3>
              <div ref={scrollContainerRef} className="w-full h-96 bg-background border rounded-lg overflow-auto relative">
                <div className="flex min-h-full">
                  <div className="bg-background/50 px-3 py-4 select-none border-r border-border/50 sticky left-0 z-0">
                    {Array.from({ length: lineCount }, (_, i) => (
                      <div key={i} className="text-muted-foreground/40 text-right font-mono" style={{ fontSize: `${fontSize}px`, lineHeight: '1.5' }}>
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={userInput}
                      onChange={handleInput}
                      disabled={isFinished}
                      className={`w-full min-h-full resize-none bg-transparent focus:outline-none opacity-0 absolute top-0 left-0 right-0 z-10 px-4 py-4 overflow-hidden ${getFontClass(fontFamily)}`}
                      style={{ fontSize: `${fontSize}px` }}
                      spellCheck={false}
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      data-testid="input-code"
                    />
                    <pre className={`whitespace-pre-wrap px-4 py-4 pointer-events-none ${getFontClass(fontFamily)}`} style={{ fontSize: `${fontSize}px` }}>
                      {highlightedCode}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </>
        ) : (
          <div className="animate-pulse">
            <div className="mb-6 text-center">
              <div className="h-8 bg-muted rounded w-64 mx-auto mb-2"></div>
              <div className="h-4 bg-muted rounded w-48 mx-auto"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="h-5 bg-muted rounded w-32 mb-2"></div>
                <div className="bg-muted/50 rounded-lg p-4 h-96 space-y-3">
                  {Array.from({ length: 15 }, (_, i) => (
                    <div key={i} className="h-4 bg-muted rounded" style={{ width: `${Math.random() * 40 + 60}%` }}></div>
                  ))}
                </div>
              </div>
              <div>
                <div className="h-5 bg-muted rounded w-32 mb-2"></div>
                <div className="bg-muted/50 rounded-lg p-4 h-96"></div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                Generating code snippet with AI...
              </p>
            </div>
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
            <div className="flex gap-4 justify-center flex-wrap">
              <Button onClick={resetTest} data-testid="button-restart-finished">
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/code-leaderboard'} data-testid="button-leaderboard">
                <Trophy className="w-4 h-4 mr-2" />
                View Leaderboard
              </Button>
              {user && (
                <Button variant="outline" onClick={handleShare} disabled={isSharing} data-testid="button-share">
                  <Share2 className="w-4 h-4 mr-2" />
                  {isSharing ? "Creating..." : "Share Result"}
                </Button>
              )}
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

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Your Result 🎉</DialogTitle>
            <DialogDescription>
              Share your amazing typing speed with friends!
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-center mb-3">
                <div className="text-4xl font-bold text-primary mb-1">{wpm} WPM</div>
                <div className="text-sm text-muted-foreground">
                  {accuracy}% accuracy • {PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Share Link</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={shareUrl} 
                  readOnly 
                  className="flex-1 px-3 py-2 bg-background border rounded-md text-sm"
                  data-testid="input-share-url"
                />
                <Button onClick={copyShareLink} variant="outline" data-testid="button-copy-link">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Share on Social Media</label>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => shareToSocial('twitter')} variant="outline" className="w-full" data-testid="button-share-twitter">
                  <Twitter className="w-4 h-4 mr-2" />
                  Twitter
                </Button>
                <Button onClick={() => shareToSocial('facebook')} variant="outline" className="w-full" data-testid="button-share-facebook">
                  <Facebook className="w-4 h-4 mr-2" />
                  Facebook
                </Button>
                <Button onClick={() => shareToSocial('linkedin')} variant="outline" className="w-full" data-testid="button-share-linkedin">
                  <Linkedin className="w-4 h-4 mr-2" />
                  LinkedIn
                </Button>
                <Button onClick={() => shareToSocial('whatsapp')} variant="outline" className="w-full" data-testid="button-share-whatsapp">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
