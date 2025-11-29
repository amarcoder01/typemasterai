import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Code, RotateCcw, Share2, Copy, Facebook, Twitter, Linkedin, MessageCircle, HelpCircle, Zap } from "lucide-react";
import confetti from "canvas-confetti";
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

const TIME_OPTIONS = [
  { value: 0, label: "No Limit" },
  { value: 15, label: "15s" },
  { value: 30, label: "30s" },
  { value: 60, label: "1:00" },
  { value: 120, label: "2:00" },
  { value: 300, label: "5:00" },
];

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
  const [timeLimit, setTimeLimit] = useState(0); // 0 = no limit
  const [customCode, setCustomCode] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [snippetId, setSnippetId] = useState<number | null>(null);
  const [userInput, setUserInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [rawWpm, setRawWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [consistency, setConsistency] = useState(100);
  const [errors, setErrors] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [errorState, setErrorState] = useState<{
    type: 'network' | 'server' | 'generation' | 'timeout' | null;
    message: string;
    canRetry: boolean;
  }>({ type: null, message: '', canRetry: false });
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const codeDisplayRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const wpmHistoryRef = useRef<number[]>([]);

  const fetchCodeSnippet = useCallback(async (forceNew = true, isRetry = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    setIsLoading(true);
    setErrorState({ type: null, message: '', canRetry: false });
    
    // Set timeout for the request (30 seconds)
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, 30000);
    
    try {
      const response = await fetch(
        `/api/code/snippet?language=${encodeURIComponent(language)}&difficulty=${encodeURIComponent(difficulty)}&generate=true&forceNew=${forceNew}`,
        { signal, cache: 'no-store' }
      );
      
      clearTimeout(timeoutId);
      
      if (signal.aborted) return;
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const status = response.status;
        
        // Handle specific HTTP error codes
        if (status === 429) {
          throw { type: 'server', message: 'Too many requests. Please wait a moment before trying again.', canRetry: true };
        } else if (status === 503 || status === 502) {
          throw { type: 'server', message: 'AI service is temporarily unavailable. Please try again.', canRetry: true };
        } else if (status === 500) {
          throw { type: 'generation', message: 'Failed to generate code. Try a different language or difficulty.', canRetry: true };
        } else if (status === 404) {
          throw { type: 'generation', message: 'No snippets available for this language. Try another one.', canRetry: false };
        } else {
          throw { type: 'server', message: errorData.message || `Server error (${status})`, canRetry: true };
        }
      }
      
      const data = await response.json();
      
      if (signal.aborted) return;
      
      // Validate response data
      if (!data.snippet || !data.snippet.content) {
        throw { type: 'generation', message: 'Received empty code snippet. Please try again.', canRetry: true };
      }
      
      // Success - clear error state and retry count
      setCodeSnippet(data.snippet.content);
      setSnippetId(data.snippet.id);
      setErrorState({ type: null, message: '', canRetry: false });
      setRetryCount(0);
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        // Check if it was a timeout
        if (!signal.aborted) {
          setErrorState({ 
            type: 'timeout', 
            message: 'Request timed out. The AI might be busy. Please try again.', 
            canRetry: true 
          });
        }
        return;
      }
      
      console.error("Error fetching code snippet:", error);
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setErrorState({ 
          type: 'network', 
          message: 'Network error. Please check your connection and try again.', 
          canRetry: true 
        });
      } else if (error.type) {
        // Custom error object
        setErrorState({ 
          type: error.type, 
          message: error.message, 
          canRetry: error.canRetry 
        });
      } else {
        setErrorState({ 
          type: 'server', 
          message: error.message || 'An unexpected error occurred.', 
          canRetry: true 
        });
      }
      
      // Auto-retry logic for retryable errors
      if (!isRetry && retryCount < MAX_RETRIES && (error.canRetry !== false)) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchCodeSnippet(forceNew, true);
        }, 2000 * (retryCount + 1)); // Exponential backoff
      } else {
        toast({
          title: "Failed to Load Code Snippet",
          description: error.message || "Unable to generate code snippet. Try a different language.",
          variant: "destructive",
        });
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [language, difficulty, toast, retryCount]);
  
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (mode === "ai" && !codeSnippet && !isLoading) {
      fetchCodeSnippet(false); // Use cached on initial load
    }
  }, [mode, codeSnippet, isLoading, fetchCodeSnippet]);

  useEffect(() => {
    if (isActive && startTime && !isFinished) {
      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const elapsedMs = now - startTime;
        const elapsed = Math.floor(elapsedMs / 1000);
        setElapsedTime(elapsed);
        
        // Check if time limit reached
        if (timeLimit > 0 && elapsed >= timeLimit) {
          finishTest();
          return;
        }
        
        // Calculate real-time stats using industry-standard formulas
        const minutes = elapsedMs / 60000; // Use milliseconds for precision
        if (minutes > 0 && userInput.length > 0) {
          // Count correct and incorrect characters
          let correctChars = 0;
          let errorChars = 0;
          for (let i = 0; i < userInput.length; i++) {
            if (userInput[i] === codeSnippet[i]) {
              correctChars++;
            } else {
              errorChars++;
            }
          }
          
          // Raw WPM (Gross WPM) = (Total Characters / 5) / Minutes
          // Industry standard: 1 word = 5 characters
          const currentRawWpm = Math.round((userInput.length / 5) / minutes);
          
          // Net WPM = (Correct Characters / 5) / Minutes
          // This is the effective typing speed accounting for errors
          const currentWpm = Math.round((correctChars / 5) / minutes);
          
          setWpm(Math.max(0, currentWpm));
          setRawWpm(Math.max(0, currentRawWpm));
          
          // Accuracy = (Correct Characters / Total Characters) × 100
          const currentAccuracy = Math.round((correctChars / userInput.length) * 100);
          setAccuracy(currentAccuracy);
          
          // Track Raw WPM history for consistency calculation
          // Sample every second (when elapsed changes)
          if (wpmHistoryRef.current.length < elapsed) {
            wpmHistoryRef.current.push(currentRawWpm);
          }
          
          // Consistency = based on Coefficient of Variation (CV)
          // CV = (Standard Deviation / Mean) × 100
          // Consistency Score = 100 - CV (higher is more consistent)
          if (wpmHistoryRef.current.length >= 2) {
            const samples = wpmHistoryRef.current;
            const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
            if (mean > 0) {
              const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
              const stdDev = Math.sqrt(variance);
              const cv = (stdDev / mean) * 100; // Coefficient of variation
              const consistencyScore = Math.max(0, Math.min(100, 100 - cv));
              setConsistency(Math.round(consistencyScore));
            }
          }
        }
      }, 100); // 100ms intervals for smooth updates
      
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isActive, startTime, isFinished, userInput, codeSnippet, timeLimit]);

  useEffect(() => {
    if (isActive && startTime && userInput === codeSnippet && codeSnippet.length > 0) {
      finishTest();
    }
  }, [userInput, isActive, startTime, codeSnippet]);

  const saveCodeTestMutation = useMutation({
    mutationFn: async (testData: any) => {
      const response = await fetch("/api/code/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to save test");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code/tests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/code/leaderboard"] });
    },
  });

  const finishTest = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Use precise milliseconds for accurate calculation
    const durationMs = startTime ? Date.now() - startTime : 0;
    const duration = Math.floor(durationMs / 1000);
    const minutes = durationMs / 60000; // Use milliseconds for precision
    
    // Count correct and incorrect characters
    let correctChars = 0;
    let errorCount = 0;
    for (let i = 0; i < userInput.length; i++) {
      if (userInput[i] === codeSnippet[i]) {
        correctChars++;
      } else {
        errorCount++;
      }
    }
    
    // Industry-standard formulas:
    // Raw WPM (Gross WPM) = (Total Characters / 5) / Minutes
    const finalRawWpm = minutes > 0 ? Math.round((userInput.length / 5) / minutes) : 0;
    
    // Net WPM = (Correct Characters / 5) / Minutes
    const finalWpm = minutes > 0 ? Math.round((correctChars / 5) / minutes) : 0;
    
    // Accuracy = (Correct Characters / Total Characters) × 100
    const finalAccuracy = userInput.length > 0 ? Math.round((correctChars / userInput.length) * 100) : 100;
    
    // Calculate final consistency from WPM history
    let finalConsistency = 100;
    if (wpmHistoryRef.current.length >= 2) {
      const samples = wpmHistoryRef.current;
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      if (mean > 0) {
        const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
        const stdDev = Math.sqrt(variance);
        const cv = (stdDev / mean) * 100;
        finalConsistency = Math.max(0, Math.min(100, Math.round(100 - cv)));
      }
    }
    
    setWpm(Math.max(0, finalWpm));
    setRawWpm(Math.max(0, finalRawWpm));
    setAccuracy(finalAccuracy);
    setConsistency(finalConsistency);
    setErrors(errorCount);
    setIsFinished(true);
    setIsActive(false);
    
    // Celebration confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#3b82f6', '#f59e0b'],
    });

    if (user && startTime) {
      saveCodeTestMutation.mutate({
        codeSnippetId: snippetId,
        programmingLanguage: language,
        wpm: Math.max(0, finalWpm),
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
        processInput(textareaRef.current.value);
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
      wpmHistoryRef.current = [];
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab key - either insert tab or get new snippet if finished/empty
    if (e.key === "Tab") {
      e.preventDefault();
      
      // If test is finished or no input, Tab gets new snippet
      if (isFinished || isFailed || (!isActive && userInput.length === 0)) {
        fetchCodeSnippet(true);
        return;
      }
      
      // Otherwise, insert tab character if expected
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
    
    // Escape to reset/restart
    if (e.key === "Escape") {
      resetTest();
    }
  };
  
  const resetTest = useCallback(() => {
    setUserInput("");
    setStartTime(null);
    setIsActive(false);
    setIsFinished(false);
    setIsFailed(false);
    setWpm(0);
    setRawWpm(0);
    setAccuracy(100);
    setConsistency(100);
    setErrors(0);
    setElapsedTime(0);
    wpmHistoryRef.current = [];
    
    if (mode === "ai") {
      fetchCodeSnippet(true); // Force new snippet
    } else if (mode === "custom" && customCode) {
      setCodeSnippet(customCode);
      setSnippetId(null);
    }
    
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [mode, customCode, fetchCodeSnippet]);
  
  // Global keyboard shortcuts - respects test state
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle when not focused on textarea
      if (document.activeElement === textareaRef.current) return;
      
      // Tab to get new snippet - only when test is not active or is finished
      if (e.key === "Tab" && (!isActive || isFinished || isFailed)) {
        e.preventDefault();
        fetchCodeSnippet(true);
      }
      
      // Escape to reset - always allowed
      if (e.key === "Escape") {
        e.preventDefault();
        resetTest();
      }
      
      // Any printable key focuses and starts typing (only if test not finished)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !isFinished && !isFailed) {
        textareaRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [fetchCodeSnippet, resetTest, isActive, isFinished, isFailed]);

  const handleModeSwitch = (newMode: "ai" | "custom") => {
    if (newMode === mode) return;
    setMode(newMode);
    setCodeSnippet("");
    setUserInput("");
    setIsActive(false);
    setIsFinished(false);
    setErrorState({ type: null, message: '', canRetry: false });
    setRetryCount(0);
    if (newMode === "ai") {
      fetchCodeSnippet(true);
    }
  };
  
  // Reset error state when language or difficulty changes
  useEffect(() => {
    if (mode === "ai") {
      setErrorState({ type: null, message: '', canRetry: false });
      setRetryCount(0);
    }
  }, [language, difficulty]);
  
  // Auto-scroll to keep current line visible
  useEffect(() => {
    if (!codeDisplayRef.current || !codeSnippet) return;
    
    // Calculate which line the cursor is on
    const textBeforeCursor = codeSnippet.substring(0, userInput.length);
    const currentLine = textBeforeCursor.split('\n').length;
    
    // Find the line element and scroll into view
    const lineElement = codeDisplayRef.current.querySelector(`[data-line="${currentLine}"]`);
    if (lineElement) {
      lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [userInput.length, codeSnippet]);

  const applyCustomCode = () => {
    if (!customCode.trim()) {
      toast({
        title: "No Code Entered",
        description: "Please paste some code to practice typing.",
        variant: "destructive",
      });
      return;
    }
    setCodeSnippet(customCode);
    setSnippetId(null);
    setUserInput("");
    setIsActive(false);
    setIsFinished(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleContainerClick = () => {
    textareaRef.current?.focus();
    setIsFocused(true);
  };

  const getStatus = () => {
    if (isLoading) return "LOADING";
    if (isFinished) return "COMPLETE";
    if (isFailed) return "FAILED";
    if (isActive) return "TYPING";
    return "READY";
  };

  const getStatusColor = () => {
    if (isFinished) return "text-green-500";
    if (isFailed) return "text-red-500";
    if (isActive) return "text-yellow-500";
    return "text-muted-foreground";
  };

  const highlightedCode = useMemo(() => {
    if (!codeSnippet) return null;
    
    const lines = codeSnippet.split("\n");
    let charIndex = 0;
    
    return lines.map((line, lineIndex) => {
      const lineContent = line.split("").map((char, i) => {
        const currentCharIndex = charIndex + i;
        let className = "";
        const isCurrent = currentCharIndex === userInput.length;
        
        if (currentCharIndex < userInput.length) {
          const isCorrect = userInput[currentCharIndex] === char;
          className = isCorrect 
            ? "text-green-500" 
            : "text-red-500 bg-red-500/20";
        } else if (isCurrent) {
          className = "relative";
        } else {
          className = "text-muted-foreground/60";
        }
        
        // Handle tabs - show visible indicator
        if (char === "\t") {
          return (
            <span key={currentCharIndex} className={className}>
              {"    "}
              {isCurrent && !isFinished && (
                <span className="absolute left-0 top-0 w-0.5 h-full bg-primary animate-pulse" />
              )}
            </span>
          );
        }
        
        return (
          <span key={currentCharIndex} className={className}>
            {isCurrent && !isFinished && (
              <span className="absolute left-0 top-0 w-0.5 h-full bg-primary animate-pulse" />
            )}
            {char}
          </span>
        );
      });
      
      // Check if cursor is at end of this line (at newline position)
      const newlineIndex = charIndex + line.length;
      const isCursorAtNewline = newlineIndex === userInput.length;
      
      // Update charIndex for next line (add line content + newline char)
      charIndex += line.length + 1;
      
      return (
        <div key={lineIndex} className="flex" data-line={lineIndex + 1}>
          <span className="select-none w-8 text-right pr-4 text-muted-foreground/40 text-sm">
            {lineIndex + 1}
          </span>
          <span className="flex-1">
            {lineContent}
            {isCursorAtNewline && !isFinished && lineIndex < lines.length - 1 && (
              <span className="relative">
                <span className="absolute left-0 top-0 w-0.5 h-full bg-primary animate-pulse" />
              </span>
            )}
            {lineIndex < lines.length - 1 && (
              <span className={
                newlineIndex < userInput.length 
                  ? "text-green-500/30" 
                  : "text-muted-foreground/20"
              }>↵</span>
            )}
          </span>
        </div>
      );
    });
  }, [codeSnippet, userInput, isFinished]);

  const shareToSocial = (platform: string) => {
    const text = `I just typed ${codeSnippet.length} characters of ${PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language} code at ${wpm} WPM with ${accuracy}% accuracy on TypeMasterAI! 🚀`;
    const url = window.location.origin + "/code-mode";
    
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent("Code Typing Result")}&summary=${encodeURIComponent(text)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
    };
    
    if (urls[platform]) {
      window.open(urls[platform], "_blank", "width=600,height=400");
    }
  };

  const copyShareLink = async () => {
    const text = `I typed ${codeSnippet.length} chars of ${language} at ${wpm} WPM (${accuracy}% accuracy) on TypeMasterAI! ${window.location.origin}/code-mode`;
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Share link copied to clipboard.",
    });
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-4 sm:py-8 px-2 sm:px-4 max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <Code className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Code Mode</h1>
          </div>

          {/* Controls Bar */}
          <Card className="p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center justify-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Mode:</label>
                <div className="flex border rounded-md overflow-hidden">
                  <Button
                    variant={mode === "ai" ? "default" : "ghost"}
                    className="rounded-none text-xs px-3 h-8"
                    onClick={() => handleModeSwitch("ai")}
                    disabled={isActive}
                    data-testid="button-mode-ai"
                  >
                    AI Generated
                  </Button>
                  <Button
                    variant={mode === "custom" ? "default" : "ghost"}
                    className="rounded-none text-xs px-3 h-8"
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
                  <SelectTrigger className="w-[140px] h-8 text-xs" data-testid="select-language">
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
                  <SelectTrigger className="w-[100px] h-8 text-xs" data-testid="select-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Test Mode:</label>
                <Select value={testMode} onValueChange={(val) => setTestMode(val as any)} disabled={isActive}>
                  <SelectTrigger className="w-[100px] h-8 text-xs" data-testid="select-test-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEST_MODES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Time:</label>
                <Select value={timeLimit.toString()} onValueChange={(val) => setTimeLimit(parseInt(val))} disabled={isActive}>
                  <SelectTrigger className="w-[90px] h-8 text-xs" data-testid="select-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value.toString()}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetTest}
                    disabled={isLoading}
                    data-testid="button-restart"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    {mode === "ai" ? "New Snippet" : "Restart"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Press Escape to restart</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {mode === "custom" && !codeSnippet && (
              <div className="mt-4">
                <label className="text-sm font-medium mb-2 block">Paste Your Code:</label>
                <textarea
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  className="w-full h-32 p-3 bg-background border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Paste your code here..."
                  spellCheck={false}
                  data-testid="textarea-custom-code"
                />
                <Button onClick={applyCustomCode} className="mt-2" data-testid="button-apply-custom">
                  Start Typing
                </Button>
              </div>
            )}
          </Card>

          {/* Stats Bar - Monkeytype Style */}
          <div className="grid grid-cols-6 gap-2 mb-6">
            <Card className="p-3 text-center bg-card/50 border-border/50">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                {timeLimit > 0 ? "Time Left" : "Time"}
              </div>
              <div className={`text-2xl font-mono font-bold ${
                timeLimit > 0 && (timeLimit - elapsedTime) <= 10 
                  ? "text-red-500 animate-pulse" 
                  : "text-yellow-500"
              }`}>
                {timeLimit > 0 
                  ? formatTime(Math.max(0, timeLimit - elapsedTime))
                  : formatTime(elapsedTime)
                }
              </div>
            </Card>
            <Card className="p-3 text-center bg-card/50 border-border/50">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">WPM</div>
              <div className="text-2xl font-mono font-bold">
                {wpm}
              </div>
            </Card>
            <Card className="p-3 text-center bg-card/50 border-border/50">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Raw</div>
              <div className="text-2xl font-mono font-bold">
                {rawWpm}
              </div>
            </Card>
            <Card className="p-3 text-center bg-card/50 border-border/50">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Accuracy</div>
              <div className="text-2xl font-mono font-bold">
                {accuracy}%
              </div>
            </Card>
            <Card className="p-3 text-center bg-card/50 border-border/50">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Consistency</div>
              <div className="text-2xl font-mono font-bold text-green-500">
                {consistency}%
              </div>
            </Card>
            <Card className="p-3 text-center bg-card/50 border-border/50">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</div>
              <div className={`text-lg font-mono font-bold ${getStatusColor()}`}>
                {getStatus()}
              </div>
            </Card>
          </div>

          {/* Main Typing Area - Monkeytype Style */}
          <div
            ref={containerRef}
            onClick={handleContainerClick}
            className={`relative bg-card/30 rounded-lg p-6 min-h-[300px] cursor-text transition-all ${
              isFocused ? "ring-2 ring-primary/20" : ""
            }`}
            data-testid="typing-container"
          >
            {isLoading ? (
              <div className="h-64 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500/50 animate-pulse" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50 animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-3 h-3 rounded-full bg-green-500/50 animate-pulse" style={{ animationDelay: '0.4s' }} />
                  <span className="text-xs text-muted-foreground ml-2">
                    Generating {PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name} snippet...
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted/30 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-muted/30 rounded animate-pulse w-1/2" style={{ animationDelay: '0.1s' }} />
                  <div className="h-4 bg-muted/30 rounded animate-pulse w-5/6" style={{ animationDelay: '0.2s' }} />
                  <div className="h-4 bg-muted/30 rounded animate-pulse w-2/3" style={{ animationDelay: '0.3s' }} />
                  <div className="h-4 bg-muted/30 rounded animate-pulse w-4/5" style={{ animationDelay: '0.4s' }} />
                  <div className="h-4 bg-muted/30 rounded animate-pulse w-1/3" style={{ animationDelay: '0.5s' }} />
                  <div className="h-4 bg-muted/30 rounded animate-pulse w-3/5" style={{ animationDelay: '0.6s' }} />
                </div>
              </div>
            ) : codeSnippet ? (
              <>
                {/* Hidden textarea for input capture */}
                <textarea
                  ref={textareaRef}
                  value={userInput}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  onCompositionStart={handleCompositionStart}
                  onCompositionEnd={handleCompositionEnd}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="absolute opacity-0 w-full h-full top-0 left-0 resize-none cursor-text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-testid="input-code-typing"
                  disabled={isFinished || isFailed}
                />
                
                {/* Displayed code with highlighting and line numbers */}
                <div 
                  className="font-mono text-lg leading-relaxed select-none overflow-auto max-h-[400px] scroll-smooth"
                  ref={codeDisplayRef}
                >
                  {highlightedCode}
                </div>

                {/* Click to start overlay */}
                {!isActive && !isFinished && userInput.length === 0 && !isFocused && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg cursor-text"
                    onClick={(e) => {
                      e.stopPropagation();
                      textareaRef.current?.focus();
                    }}
                  >
                    <div className="text-muted-foreground text-lg pointer-events-none">
                      Click here or start typing
                    </div>
                  </div>
                )}
              </>
            ) : errorState.type ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className={`text-center p-4 rounded-lg ${
                  errorState.type === 'network' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                  errorState.type === 'timeout' ? 'bg-orange-500/10 border border-orange-500/30' :
                  'bg-red-500/10 border border-red-500/30'
                }`}>
                  <div className={`text-lg font-medium mb-2 ${
                    errorState.type === 'network' ? 'text-yellow-500' :
                    errorState.type === 'timeout' ? 'text-orange-500' :
                    'text-red-500'
                  }`}>
                    {errorState.type === 'network' ? '🌐 Network Error' :
                     errorState.type === 'timeout' ? '⏱️ Request Timeout' :
                     errorState.type === 'generation' ? '⚠️ Generation Failed' :
                     '❌ Server Error'}
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">{errorState.message}</p>
                  {retryCount > 0 && retryCount < MAX_RETRIES && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Auto-retrying... (Attempt {retryCount + 1}/{MAX_RETRIES})
                    </p>
                  )}
                  {errorState.canRetry && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRetryCount(0);
                        fetchCodeSnippet(true);
                      }}
                      disabled={isLoading}
                      data-testid="button-retry"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Or try a different language/difficulty above
                </div>
              </div>
            ) : mode === "custom" ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Select "Custom Code" mode and paste your code above
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="text-muted-foreground">No code snippet available</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchCodeSnippet(true)}
                  disabled={isLoading}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Generate Snippet
                </Button>
              </div>
            )}
          </div>

          {/* Progress indicator with keyboard shortcuts */}
          {codeSnippet && !isFinished && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="font-mono">{userInput.length} / {codeSnippet.length}</span>
                <span className="text-xs">({Math.round((userInput.length / codeSnippet.length) * 100)}% complete)</span>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-xs">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-muted-foreground">Esc</kbd>
                <span>restart</span>
                <span className="text-muted-foreground/50">•</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-muted-foreground">Tab</kbd>
                <span>new snippet</span>
              </div>
            </div>
          )}

          {/* Results Summary */}
          <AnimatePresence>
            {isFinished && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="mt-6 p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                  {/* Header with title and action buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                    <h3 className="text-xl font-bold">Test Complete!</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetTest}
                        disabled={isLoading}
                        className="gap-1.5"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Try Again
                        <kbd className="ml-1 px-1 py-0.5 text-[10px] rounded bg-muted hidden sm:inline">Esc</kbd>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchCodeSnippet(true)}
                        disabled={isLoading}
                        className="gap-1.5"
                      >
                        <Zap className="w-4 h-4" />
                        New Snippet
                        <kbd className="ml-1 px-1 py-0.5 text-[10px] rounded bg-muted hidden sm:inline">Tab</kbd>
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShareDialogOpen(true)}
                        data-testid="button-share"
                        className="gap-1.5"
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </Button>
                    </div>
                  </div>
                  
                  {/* Main stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center mb-6">
                    <div className="p-3 rounded-lg bg-background/50">
                      <div className="text-3xl font-bold text-primary">{wpm}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Net WPM</div>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50">
                      <div className="text-3xl font-bold">{rawWpm}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Raw WPM</div>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50">
                      <div className={`text-3xl font-bold ${Number(accuracy) >= 95 ? 'text-green-500' : Number(accuracy) >= 85 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {accuracy}%
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Accuracy</div>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50">
                      <div className="text-3xl font-bold text-green-500">{consistency}%</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Consistency</div>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50">
                      <div className="text-3xl font-bold">{formatTime(elapsedTime)}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Time</div>
                    </div>
                  </div>

                  {/* Detail stats */}
                  <div className="grid grid-cols-3 gap-4 text-center text-sm border-t border-border/50 pt-4">
                    <div>
                      <span className="text-muted-foreground">Characters: </span>
                      <span className="font-mono font-medium">{codeSnippet.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Errors: </span>
                      <span className={`font-mono font-medium ${errors > 0 ? 'text-red-500' : 'text-green-500'}`}>{errors}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Language: </span>
                      <span className="font-medium">{PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language}</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login prompt */}
          {!user && (
            <Card className="p-4 mt-6 bg-primary/5 border-primary/20">
              <p className="text-center text-sm">
                <a href="/login" className="text-primary hover:underline">Sign in</a> to save your results and compete on the leaderboard!
              </p>
            </Card>
          )}
        </div>

        {/* Share Dialog */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Your Result</DialogTitle>
              <DialogDescription>
                Share your code typing achievement with others!
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-muted/50 rounded-lg p-4 mb-4 text-center">
                <div className="text-3xl font-bold text-primary mb-1">{wpm} WPM</div>
                <div className="text-sm text-muted-foreground">
                  {accuracy}% accuracy • {codeSnippet.length} characters • {PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name}
                </div>
              </div>
              <div className="flex justify-center gap-3">
                <Button variant="outline" size="icon" onClick={() => shareToSocial("twitter")} data-testid="share-twitter">
                  <Twitter className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => shareToSocial("facebook")} data-testid="share-facebook">
                  <Facebook className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => shareToSocial("linkedin")} data-testid="share-linkedin">
                  <Linkedin className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => shareToSocial("whatsapp")} data-testid="share-whatsapp">
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={copyShareLink} data-testid="share-copy">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
