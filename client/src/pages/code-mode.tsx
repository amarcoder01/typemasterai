import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Code, Trophy, Zap, Target, RotateCcw, Check, Share2, Copy, Facebook, Twitter, Linkedin, MessageCircle, HelpCircle, Keyboard, Timer, Award, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import confetti from "canvas-confetti";
import { calculateWPM, calculateAccuracy } from "@/lib/typing-utils";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isComposing, setIsComposing] = useState(false);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [lastKeyCorrect, setLastKeyCorrect] = useState<boolean | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  const fetchCodeSnippet = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/code/snippet?language=${encodeURIComponent(language)}&difficulty=${encodeURIComponent(difficulty)}&generate=true`,
        { signal }
      );
      
      if (signal.aborted) return;
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (signal.aborted) return;
      
      setCodeSnippet(data.snippet.content);
      setSnippetId(data.snippet.id);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      console.error("Error fetching code snippet:", error);
      toast({
        title: "Failed to Load Code Snippet",
        description: error.message?.includes("500") 
          ? "AI service is currently unavailable. Try changing the language or difficulty." 
          : error.message?.includes("Network") || error.message?.includes("fetch")
          ? "Network error. Please check your connection and try again."
          : error.message?.includes("429")
          ? "Too many requests. Please wait a moment before trying again."
          : "Unable to generate code snippet. Press Ctrl+Enter to retry or try a different language.",
        variant: "destructive",
      });
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [language, difficulty, toast]);
  
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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
    
    if (customCode.length > 10000) {
      toast({
        title: "Code Too Long",
        description: "Please use code that is less than 10,000 characters.",
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
      
      const url = `https://typemasterai.com/share/${data.shareId}`;
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
    const langName = PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language;
    const siteUrl = "https://typemasterai.com";
    
    const shareTexts: Record<string, string> = {
      twitter: `⌨️ Just typed ${wpm} WPM with ${accuracy}% accuracy in ${langName} on TypeMasterAI!

💻 Code Typing Test
🏅 Can you beat my score?

#CodingTest #TypeMasterAI #${langName.replace(/[^a-zA-Z]/g, '')}`,
      
      facebook: `⌨️ I just completed a code typing test on TypeMasterAI!

💻 Language: ${langName}
⚡ Speed: ${wpm} WPM
✨ Accuracy: ${accuracy}%

Challenge yourself!`,
      
      linkedin: `Just completed a code typing challenge on TypeMasterAI!

📊 Results:
• Language: ${langName}
• Speed: ${wpm} Words Per Minute
• Accuracy: ${accuracy}%

Improving coding efficiency through practice.

#CodingSkills #TypeMasterAI #Developer`,
      
      whatsapp: `⌨️ Check out my code typing score on TypeMasterAI!

💻 *${langName}*
⚡ *${wpm} WPM* | *${accuracy}% Accuracy*

Can you beat me? Try it here: `,
    };
    
    const text = shareTexts[platform] || shareTexts.twitter;
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(siteUrl);
    
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedText}${encodedUrl}`,
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
    if (isActive && startTime) {
      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(elapsed);
        timerRef.current = requestAnimationFrame(updateTimer);
      };
      timerRef.current = requestAnimationFrame(updateTimer);
    } else if (!isActive) {
      setElapsedTime(0);
    }
    
    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, startTime]);


  const finishTest = () => {
    setIsActive(false);
    setIsFinished(true);
    setShowCompletionOverlay(true);
    
    // Use raw seconds for WPM calculation, rounded for display/storage
    const elapsedSeconds = startTime ? (Date.now() - startTime) / 1000 : 0;
    const duration = Math.round(elapsedSeconds);
    
    // Recalculate final WPM with precise elapsed time
    const chars = userInput.length;
    const errorCount = userInput.split("").filter((char, i) => codeSnippet && char !== codeSnippet[i]).length;
    const correctChars = chars - errorCount;
    const finalWpm = elapsedSeconds > 0 ? calculateWPM(correctChars, elapsedSeconds) : 0;
    const finalAccuracy = calculateAccuracy(correctChars, chars);
    
    setWpm(finalWpm);
    setAccuracy(finalAccuracy);
    setErrors(errorCount);
    
    setCompletedTestData({
      duration,
      wpm: finalWpm,
      accuracy: finalAccuracy,
      errors: errorCount,
      codeContent: codeSnippet,
    });
    
    // Enhanced celebration confetti sequence
    const duration_ms = 3000;
    const animationEnd = Date.now() + duration_ms;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }
      const particleCount = 50 * (timeLeft / duration_ms);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'],
      });
    }, 250);

    // Fireworks burst in the center
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#FFD700', '#00FFFF', '#FF00FF', '#FF6B6B', '#4ECDC4'],
      startVelocity: 45,
      gravity: 0.8,
      scalar: 1.2,
    });

    if (user && startTime) {
      saveCodeTestMutation.mutate({
        codeSnippetId: snippetId,
        programmingLanguage: language,
        wpm: finalWpm,
        accuracy: finalAccuracy,
        characters: userInput.length,
        errors: errorCount,
        syntaxErrors: 0,
        duration,
      });
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;
    processInput(e.target.value);
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    setTimeout(() => {
      if (textareaRef.current) {
        const value = textareaRef.current.value;
        processInput(value);
      }
    }, 0);
  };

  const processInput = (value: string) => {
    if (isFinished || isFailed) return;
    
    if (value.length > codeSnippet.length) {
      if (textareaRef.current) textareaRef.current.value = userInput;
      return;
    }
    
    if (!isActive && value.length > 0) {
      setIsActive(true);
      setStartTime(Date.now());
    }
    
    // Track correct/incorrect for the latest keystroke (for animation feedback)
    if (value.length > userInput.length) {
      const lastTypedChar = value[value.length - 1];
      const expectedChar = codeSnippet[value.length - 1];
      setLastKeyCorrect(lastTypedChar === expectedChar);
      
      // Reset the animation trigger after a short delay
      setTimeout(() => setLastKeyCorrect(null), 200);
    }
    
    if (testMode === "master") {
      const hasErrors = value.split("").some((char, i) => char !== codeSnippet[i]);
      if (hasErrors) {
        if (textareaRef.current) textareaRef.current.value = userInput;
        return;
      }
    } else if (testMode === "expert" && value.length > userInput.length) {
      const lastChar = value[value.length - 1];
      const expectedChar = codeSnippet[value.length - 1];
      
      if (lastChar !== expectedChar) {
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
    }
    
    setUserInput(value);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    toast({
      title: "Paste Disabled",
      description: "Please type manually for accurate results.",
      variant: "destructive",
    });
  };

  const handleCut = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const tabChar = codeSnippet[userInput.length];
      if (tabChar === "\t") {
        const newValue = userInput + "\t";
        setUserInput(newValue);
        if (!isActive) {
          setIsActive(true);
          setStartTime(Date.now());
        }
      }
    }
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
    setShowCompletionOverlay(false);
    setLastKeyCorrect(null);
    
    if (mode === "ai") {
      fetchCodeSnippet();
    } else if (mode === "custom" && customCode) {
      setCodeSnippet(customCode);
      setSnippetId(null);
    }
    
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const lines = useMemo(() => codeSnippet.split("\n"), [codeSnippet]);
  const lineCount = lines.length;
  
  const progressPercentage = useMemo(() => {
    if (!codeSnippet.length) return 0;
    return Math.round((userInput.length / codeSnippet.length) * 100);
  }, [userInput.length, codeSnippet.length]);

  const currentLineIndex = useMemo(() => {
    const typedText = userInput;
    return typedText.split("\n").length - 1;
  }, [userInput]);
  
  const highlightedCode = useMemo(() => {
    return codeSnippet.split("").map((char, index) => {
      let className = "transition-colors duration-75 ";
      
      if (index < userInput.length) {
        const isCorrect = userInput[index] === char;
        className += isCorrect 
          ? "text-green-500" 
          : "text-red-500 bg-red-500/20";
      }
      
      if (index === userInput.length) {
        className += " bg-primary/20";
      }
      
      return (
        <span key={index} className={className}>
          {char}
        </span>
      );
    });
  }, [codeSnippet, userInput]);

  return (
    <TooltipProvider>
      <div className="container mx-auto py-4 sm:py-8 px-2 sm:px-4 max-w-6xl">
        <div className="mb-4 sm:mb-8 text-center">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-4">
            <Code className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            <h1 className="text-2xl sm:text-4xl font-bold">Code Typing Mode</h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-lg">
            Master coding speed and accuracy with real programming syntax
          </p>
        </div>

        {/* Progress Bar */}
        {(isActive || userInput.length > 0) && !isFinished && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Progress</span>
              <span className="text-xs sm:text-sm font-bold text-primary">{progressPercentage}%</span>
            </div>
            <div className="relative">
              <Progress value={progressPercentage} className="h-2 sm:h-3" />
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/50 to-primary rounded-full"
                style={{ width: `${progressPercentage}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>{userInput.length} / {codeSnippet.length} characters</span>
              <span>Line {currentLineIndex + 1} of {lineCount}</span>
            </div>
          </motion.div>
        )}

        <Card className="p-3 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-wrap gap-2 sm:gap-4 items-center justify-center mb-4 sm:mb-6">
            <div className="flex items-center gap-1 sm:gap-2">
              <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                Mode:
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Choose between AI-generated code snippets or paste your own custom code to practice</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <div className="flex border rounded-md overflow-hidden">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={mode === "ai" ? "default" : "ghost"}
                      className="rounded-none text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10"
                      onClick={() => handleModeSwitch("ai")}
                      disabled={isActive}
                      data-testid="button-mode-ai"
                    >
                      AI Generated
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Practice with AI-generated code snippets across 50+ languages</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={mode === "custom" ? "default" : "ghost"}
                      className="rounded-none text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10"
                      onClick={() => handleModeSwitch("custom")}
                      disabled={isActive}
                      data-testid="button-mode-custom"
                    >
                      Custom Code
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Paste your own code to practice typing it</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                Language:
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Select a programming language for AI-generated code snippets</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <Select value={language} onValueChange={setLanguage} disabled={isActive || mode === "custom"}>
                <SelectTrigger className="w-[120px] sm:w-[200px] h-8 sm:h-10 text-xs sm:text-sm" data-testid="select-language">
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

          <div className="flex items-center gap-1 sm:gap-2">
            <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
              Difficulty:
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Control code complexity: Easy (simple syntax), Medium (common patterns), Hard (advanced features)</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <Select value={difficulty} onValueChange={(val) => setDifficulty(val as any)} disabled={isActive || mode === "custom"}>
              <SelectTrigger className="w-[90px] sm:w-[140px] h-8 sm:h-10 text-xs sm:text-sm" data-testid="select-difficulty">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={resetTest} 
                  variant="outline" 
                  data-testid="button-restart"
                  disabled={isLoading}
                  className="h-8 sm:h-10 text-xs sm:text-sm px-2 sm:px-4"
                >
                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">New Snippet</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate a new random code snippet (or press Ctrl+Enter)</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-4 items-center justify-center pb-3 sm:pb-4 border-b">
          <div className="flex items-center gap-1 sm:gap-2">
            <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
              Test Mode:
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Normal: Practice freely • Expert: Test fails on any error • Master: Must type perfectly (no mistakes allowed)</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <Select value={testMode} onValueChange={(val) => setTestMode(val as any)} disabled={isActive}>
              <SelectTrigger className="w-[90px] sm:w-[140px] h-8 sm:h-10 text-xs sm:text-sm" data-testid="select-test-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEST_MODES.map(({ value, label, description }) => (
                  <SelectItem key={value} value={value}>
                    <div>
                      <div>{label}</div>
                      <div className="text-xs text-muted-foreground hidden sm:block">{description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <label className="text-xs sm:text-sm font-medium flex items-center gap-1 hidden sm:flex">
              Font:
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Choose your preferred coding font for comfortable reading</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger className="w-[100px] sm:w-[160px] h-8 sm:h-10 text-xs sm:text-sm" data-testid="select-font">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONTS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <label className="text-xs sm:text-sm font-medium flex items-center gap-1 hidden sm:flex">
              Size:
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Adjust font size for optimal visibility</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <Select value={fontSize} onValueChange={setFontSize}>
              <SelectTrigger className="w-[70px] sm:w-[100px] h-8 sm:h-10 text-xs sm:text-sm" data-testid="select-font-size">
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
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 sm:mb-6 text-center"
              >
                <div className="inline-flex items-center gap-2 bg-primary/10 px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-primary/20">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-primary">{formatTime(elapsedTime)}</span>
                </div>
              </motion.div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
              <div>
                <h3 className="text-xs sm:text-sm font-semibold mb-2 text-muted-foreground flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Code to Type:
                </h3>
              <div className="bg-muted rounded-lg overflow-x-auto max-h-64 sm:max-h-96 overflow-y-auto">
                <div className="flex">
                  <div className="bg-muted/50 px-2 sm:px-3 py-3 sm:py-4 select-none border-r border-border/50">
                    {Array.from({ length: lineCount }, (_, i) => (
                      <div 
                        key={i} 
                        className={`text-muted-foreground/40 text-right font-mono transition-colors ${i === currentLineIndex ? 'text-primary font-bold' : ''}`} 
                        style={{ fontSize: `${Math.max(10, parseInt(fontSize) - 4)}px`, lineHeight: '1.5' }}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <pre className={`flex-1 whitespace-pre-wrap text-foreground px-3 sm:px-4 py-3 sm:py-4 ${getFontClass(fontFamily)}`} style={{ fontSize: `${fontSize}px` }} data-testid="code-display">
                    {codeSnippet}
                  </pre>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs sm:text-sm font-semibold mb-2 text-muted-foreground flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                Your Typing:
              </h3>
              <div ref={scrollContainerRef} className="w-full h-64 sm:h-96 bg-background border rounded-lg overflow-auto relative">
                <div className="flex min-h-full">
                  <div className="bg-background/50 px-2 sm:px-3 py-3 sm:py-4 select-none border-r border-border/50 sticky left-0 z-0">
                    {Array.from({ length: lineCount }, (_, i) => (
                      <div 
                        key={i} 
                        className={`text-muted-foreground/40 text-right font-mono transition-colors ${i === currentLineIndex ? 'text-primary font-bold' : ''}`} 
                        style={{ fontSize: `${Math.max(10, parseInt(fontSize) - 4)}px`, lineHeight: '1.5' }}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={userInput}
                      onChange={handleInput}
                      onCompositionStart={handleCompositionStart}
                      onCompositionEnd={handleCompositionEnd}
                      onPaste={handlePaste}
                      onCut={handleCut}
                      onKeyDown={handleKeyDown}
                      disabled={isFinished}
                      className={`w-full min-h-full resize-none bg-transparent focus:outline-none opacity-0 absolute top-0 left-0 right-0 z-10 px-3 sm:px-4 py-3 sm:py-4 overflow-hidden ${getFontClass(fontFamily)}`}
                      style={{ fontSize: `${fontSize}px` }}
                      spellCheck={false}
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      aria-label="Type the code shown on the left. Your progress and errors will be highlighted in real-time."
                      aria-describedby="typing-stats"
                      role="textbox"
                      data-testid="input-code"
                    />
                    <pre className={`whitespace-pre-wrap px-3 sm:px-4 py-3 sm:py-4 pointer-events-none ${getFontClass(fontFamily)}`} style={{ fontSize: `${fontSize}px` }}>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
              <div>
                <div className="h-5 bg-muted rounded w-32 mb-2"></div>
                <div className="bg-muted/50 rounded-lg p-3 sm:p-4 h-64 sm:h-96 space-y-2 sm:space-y-3 overflow-hidden">
                  {Array.from({ length: 20 }, (_, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="h-3 sm:h-4 bg-muted/70 rounded w-6 sm:w-8 flex-shrink-0"></div>
                      <div 
                        className="h-3 sm:h-4 bg-muted rounded" 
                        style={{ 
                          width: `${Math.random() * 50 + 30}%`,
                          animationDelay: `${i * 0.05}s`
                        }}
                      ></div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="h-5 bg-muted rounded w-32 mb-2"></div>
                <div className="bg-muted/50 rounded-lg p-3 sm:p-4 h-64 sm:h-96 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground text-xs sm:text-sm">Preparing your code...</p>
                  </div>
                </div>
              </div>
            </div>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 sm:mt-6 text-center"
            >
              <div className="inline-flex items-center gap-2 bg-primary/5 px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-primary/20">
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  AI is generating a {PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language} snippet...
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </Card>

      <Card className="p-3 sm:p-6">
        <div id="typing-stats" className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4" role="status" aria-live="polite">
          <motion.div 
            className="text-center p-2 sm:p-3 rounded-lg bg-primary/5" 
            data-testid="stat-wpm"
            animate={{ scale: isActive && wpm > 0 ? [1, 1.02, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2 text-muted-foreground text-xs sm:text-sm mb-1">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" /> WPM
            </div>
            <motion.div 
              className="text-2xl sm:text-3xl font-bold font-mono text-primary"
              key={wpm}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
            >
              {wpm}
            </motion.div>
          </motion.div>
          <motion.div 
            className="text-center p-2 sm:p-3 rounded-lg bg-green-500/5" 
            data-testid="stat-accuracy"
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2 text-muted-foreground text-xs sm:text-sm mb-1">
              <Target className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" /> Accuracy
            </div>
            <div className={`text-2xl sm:text-3xl font-bold font-mono ${accuracy >= 95 ? 'text-green-500' : accuracy >= 80 ? 'text-yellow-500' : 'text-red-500'}`}>
              {accuracy}%
            </div>
          </motion.div>
          <motion.div 
            className="text-center p-2 sm:p-3 rounded-lg bg-red-500/5" 
            data-testid="stat-errors"
            animate={{ 
              scale: lastKeyCorrect === false ? [1, 1.1, 1] : 1,
              backgroundColor: lastKeyCorrect === false ? ['rgba(239,68,68,0.1)', 'rgba(239,68,68,0.2)', 'rgba(239,68,68,0.1)'] : 'rgba(239,68,68,0.05)'
            }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-muted-foreground text-xs sm:text-sm mb-1">Errors</div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-red-500">{errors}</div>
          </motion.div>
          <motion.div 
            className="text-center p-2 sm:p-3 rounded-lg bg-blue-500/5" 
            data-testid="stat-progress"
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2 text-muted-foreground text-xs sm:text-sm mb-1">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" /> Progress
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-blue-500">{progressPercentage}%</div>
          </motion.div>
        </div>

        <AnimatePresence>
          {isFinished && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-4 sm:mt-6 text-center"
            >
              <motion.h3 
                className="text-xl sm:text-2xl font-bold mb-4"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
              >
                Test Complete! 🎉
              </motion.h3>
              <div className="flex gap-2 sm:gap-4 justify-center flex-wrap">
                <Button onClick={resetTest} data-testid="button-restart-finished" className="text-xs sm:text-sm">
                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/code-leaderboard'} data-testid="button-leaderboard" className="text-xs sm:text-sm">
                  <Trophy className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Leaderboard
                </Button>
                {user && (
                  <Button variant="outline" onClick={handleShare} disabled={isSharing} data-testid="button-share" className="text-xs sm:text-sm">
                    <Share2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    {isSharing ? "Creating..." : "Share"}
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Completion Overlay */}
      <AnimatePresence>
        {showCompletionOverlay && completedTestData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCompletionOverlay(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="bg-card border-2 border-primary/20 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <motion.div
                  initial={{ rotate: -10, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", bounce: 0.6 }}
                  className="mb-4"
                >
                  <Award className="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-yellow-500" />
                </motion.div>
                
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl sm:text-3xl font-bold mb-2"
                >
                  Excellent Work!
                </motion.h2>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-muted-foreground mb-6"
                >
                  You completed the {PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language} challenge
                </motion.p>

                <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-primary/10 rounded-xl p-3 sm:p-4"
                  >
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-yellow-500 mb-1" />
                    <div className="text-xl sm:text-2xl font-bold text-primary">{completedTestData.wpm}</div>
                    <div className="text-xs text-muted-foreground">WPM</div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-green-500/10 rounded-xl p-3 sm:p-4"
                  >
                    <Target className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-green-500 mb-1" />
                    <div className="text-xl sm:text-2xl font-bold text-green-500">{completedTestData.accuracy}%</div>
                    <div className="text-xs text-muted-foreground">Accuracy</div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="bg-blue-500/10 rounded-xl p-3 sm:p-4"
                  >
                    <Timer className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-blue-500 mb-1" />
                    <div className="text-xl sm:text-2xl font-bold text-blue-500">{formatTime(completedTestData.duration)}</div>
                    <div className="text-xs text-muted-foreground">Time</div>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="flex gap-2 sm:gap-3 justify-center"
                >
                  <Button 
                    onClick={() => { setShowCompletionOverlay(false); resetTest(); }} 
                    className="flex-1 text-xs sm:text-sm"
                  >
                    <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Try Again
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCompletionOverlay(false)}
                    className="flex-1 text-xs sm:text-sm"
                  >
                    View Stats
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Help */}
      <Card className="p-3 sm:p-4 mt-4 sm:mt-6">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <Keyboard className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Keyboard Shortcuts</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-1 sm:gap-2">
            <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-muted rounded text-[10px] sm:text-xs font-mono whitespace-nowrap">Ctrl+Enter</kbd>
            <span className="text-muted-foreground text-[10px] sm:text-xs">New snippet</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-muted rounded text-[10px] sm:text-xs font-mono">Esc</kbd>
            <span className="text-muted-foreground text-[10px] sm:text-xs">Reset test</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-muted rounded text-[10px] sm:text-xs font-mono">Tab</kbd>
            <span className="text-muted-foreground text-[10px] sm:text-xs">Insert tab</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 col-span-2 lg:col-span-1">
            <span className="text-muted-foreground text-[10px] sm:text-xs">Start typing to begin</span>
          </div>
        </div>
      </Card>

      {/* Shake animation for error feedback */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
      `}</style>

      {!user && (
        <Card className="p-3 sm:p-4 mt-4 sm:mt-6 bg-primary/5 border-primary/20">
          <p className="text-center text-xs sm:text-sm">
            <span className="text-muted-foreground">Want to save your progress and compete on leaderboards? </span>
            <a href="/login" className="text-primary hover:underline font-semibold" data-testid="link-signin">Sign in</a>
            <span className="text-muted-foreground"> or </span>
            <a href="/register" className="text-primary hover:underline font-semibold" data-testid="link-register">create an account</a>
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
    </TooltipProvider>
  );
}
