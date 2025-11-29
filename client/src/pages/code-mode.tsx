import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Code, RotateCcw, Share2, Copy, Facebook, Twitter, Linkedin, MessageCircle, HelpCircle, Zap, Check, Image, Link2, Download, Send, Mail, Award } from "lucide-react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { CodeShareCard } from "@/components/CodeShareCard";
import { CodeCertificate } from "@/components/CodeCertificate";

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
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
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
    setCompletionDialogOpen(true);
    
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
    setCompletionDialogOpen(false);
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
    const langName = PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language;
    const text = `🚀 I just typed ${langName} code at ${wpm} WPM with ${accuracy}% accuracy on TypeMasterAI! 💻 ${codeSnippet.length} characters. Can you code faster?`;
    const url = window.location.origin + "/code-mode";
    const title = `I typed ${langName} code at ${wpm} WPM on TypeMasterAI!`;
    
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(`Code Typing: ${wpm} WPM in ${langName}`)}&summary=${encodeURIComponent(text)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + "\n\n" + url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
      email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + "\n\nTry it yourself: " + url)}`,
    };
    
    if (platform === 'discord') {
      navigator.clipboard.writeText(`${text}\n\n🔗 ${url}`);
      toast({
        title: "Copied for Discord!",
        description: "Paste in any Discord channel or DM to share your achievement!",
      });
      return;
    }
    
    if (urls[platform]) {
      if (platform === 'email') {
        window.location.href = urls[platform];
      } else {
        window.open(urls[platform], "_blank", "width=600,height=400");
      }
    }
  };
  
  const handleNativeShare = async () => {
    const langName = PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language;
    const text = `🚀 I just typed ${langName} code at ${wpm} WPM with ${accuracy}% accuracy on TypeMasterAI! 💻 ${codeSnippet.length} characters. Can you code faster?`;
    const url = window.location.origin + "/code-mode";
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `TypeMasterAI Code Mode - ${wpm} WPM`,
          text: text,
          url: url,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Native share error:', error);
        }
      }
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
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">Mode:</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Mode help">
                        <HelpCircle className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[250px]">
                      <p className="font-medium mb-1">Code Generation Mode</p>
                      <p className="text-xs text-muted-foreground">Choose between AI-generated code snippets or paste your own custom code to practice.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex border rounded-md overflow-hidden">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={mode === "ai" ? "default" : "ghost"}
                        className="rounded-none text-xs px-3 h-8"
                        onClick={() => handleModeSwitch("ai")}
                        disabled={isActive}
                        data-testid="button-mode-ai"
                      >
                        AI Generated
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[220px]">
                      <p className="text-xs">GPT-4 generates unique code snippets tailored to your selected language and difficulty.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={mode === "custom" ? "default" : "ghost"}
                        className="rounded-none text-xs px-3 h-8"
                        onClick={() => handleModeSwitch("custom")}
                        disabled={isActive}
                        data-testid="button-mode-custom"
                      >
                        Custom Code
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[220px]">
                      <p className="text-xs">Paste your own code to practice specific patterns, algorithms, or project code.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">Language:</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Language help">
                        <HelpCircle className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[250px]">
                      <p className="font-medium mb-1">Programming Language</p>
                      <p className="text-xs text-muted-foreground">Select from 50+ languages. AI generates syntax-correct snippets with language-specific patterns.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
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
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">Difficulty:</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Difficulty help">
                        <HelpCircle className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[280px]">
                      <p className="font-medium mb-1">Code Complexity</p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p><span className="text-green-400">Easy:</span> Simple functions, basic syntax</p>
                        <p><span className="text-yellow-400">Medium:</span> Loops, conditions, data structures</p>
                        <p><span className="text-red-400">Hard:</span> Advanced algorithms, complex patterns</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
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
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">Test Mode:</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Test mode help">
                        <HelpCircle className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[280px]">
                      <p className="font-medium mb-1">Challenge Level</p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p><span className="text-blue-400">Normal:</span> Standard practice, errors allowed</p>
                        <p><span className="text-orange-400">Expert:</span> Test fails on any typing error</p>
                        <p><span className="text-red-400">Master:</span> Perfect 100% accuracy required</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
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
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">Time:</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Time limit help">
                        <HelpCircle className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[250px]">
                      <p className="font-medium mb-1">Time Limit</p>
                      <p className="text-xs text-muted-foreground">Set a countdown timer for timed practice. "No Limit" lets you complete the full snippet at your own pace.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
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

          {/* Stats Bar - Monkeytype Style with Tooltips */}
          <div className="grid grid-cols-6 gap-2 mb-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <div tabIndex={0} role="group" aria-label="Time statistic" className="focus:outline-none focus:ring-2 focus:ring-primary rounded-lg">
                  <Card className="p-3 text-center bg-card/50 border-border/50 cursor-help hover:bg-card/70 transition-colors" data-testid="stat-time">
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
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px]">
                <p className="font-medium mb-1">Elapsed Time</p>
                <p className="text-xs text-muted-foreground">
                  {timeLimit > 0 
                    ? "Countdown timer. Test ends when time runs out."
                    : "Total time spent typing. No time pressure."
                  }
                </p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div tabIndex={0} role="group" aria-label="WPM statistic" className="focus:outline-none focus:ring-2 focus:ring-primary rounded-lg">
                  <Card className="p-3 text-center bg-card/50 border-border/50 cursor-help hover:bg-card/70 transition-colors" data-testid="stat-wpm">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">WPM</div>
                    <div className="text-2xl font-mono font-bold">
                      {wpm}
                    </div>
                  </Card>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px]">
                <p className="font-medium mb-1">Net Words Per Minute</p>
                <p className="text-xs text-muted-foreground">Your effective typing speed after subtracting errors. This is your true WPM score.</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">Formula: (characters / 5 - errors) × 60 / time</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div tabIndex={0} role="group" aria-label="Raw WPM statistic" className="focus:outline-none focus:ring-2 focus:ring-primary rounded-lg">
                  <Card className="p-3 text-center bg-card/50 border-border/50 cursor-help hover:bg-card/70 transition-colors" data-testid="stat-raw">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Raw</div>
                    <div className="text-2xl font-mono font-bold">
                      {rawWpm}
                    </div>
                  </Card>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px]">
                <p className="font-medium mb-1">Raw Words Per Minute</p>
                <p className="text-xs text-muted-foreground">Total keystrokes per minute without error penalties. Shows your raw typing speed.</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">Higher than WPM = errors slowing you down</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div tabIndex={0} role="group" aria-label="Accuracy statistic" className="focus:outline-none focus:ring-2 focus:ring-primary rounded-lg">
                  <Card className="p-3 text-center bg-card/50 border-border/50 cursor-help hover:bg-card/70 transition-colors" data-testid="stat-accuracy">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Accuracy</div>
                    <div className="text-2xl font-mono font-bold">
                      {accuracy}%
                    </div>
                  </Card>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px]">
                <p className="font-medium mb-1">Typing Accuracy</p>
                <p className="text-xs text-muted-foreground">Percentage of correctly typed characters. Higher accuracy = better muscle memory.</p>
                <div className="text-[10px] mt-1 space-y-0.5">
                  <p className="text-green-400">98%+ = Excellent</p>
                  <p className="text-yellow-400">95-97% = Good</p>
                  <p className="text-red-400">&lt;95% = Needs practice</p>
                </div>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div tabIndex={0} role="group" aria-label="Consistency statistic" className="focus:outline-none focus:ring-2 focus:ring-primary rounded-lg">
                  <Card className="p-3 text-center bg-card/50 border-border/50 cursor-help hover:bg-card/70 transition-colors" data-testid="stat-consistency">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Consistency</div>
                    <div className="text-2xl font-mono font-bold text-green-500">
                      {consistency}%
                    </div>
                  </Card>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px]">
                <p className="font-medium mb-1">Typing Consistency</p>
                <p className="text-xs text-muted-foreground">How steady your typing speed is. Low variance = consistent rhythm, high flow state.</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">Based on WPM standard deviation over time</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div tabIndex={0} role="group" aria-label="Status indicator" className="focus:outline-none focus:ring-2 focus:ring-primary rounded-lg">
                  <Card className="p-3 text-center bg-card/50 border-border/50 cursor-help hover:bg-card/70 transition-colors" data-testid="stat-status">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</div>
                    <div className={`text-lg font-mono font-bold ${getStatusColor()}`}>
                      {getStatus()}
                    </div>
                  </Card>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px]">
                <p className="font-medium mb-1">Test Status</p>
                <p className="text-xs text-muted-foreground">
                  {isFinished ? "Test completed successfully!" :
                   isFailed ? "Test failed. Try again!" :
                   isActive ? "Currently typing..." :
                   "Ready to start. Click the code area to begin."}
                </p>
              </TooltipContent>
            </Tooltip>
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

          {/* Results Summary Modal */}
          <Dialog open={completionDialogOpen} onOpenChange={setCompletionDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-center">Test Complete!</DialogTitle>
                <DialogDescription className="text-center">
                  Great job! Here are your results for this {PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language} typing test.
                </DialogDescription>
              </DialogHeader>
              
              {/* Main stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center my-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-3 rounded-lg bg-muted/50 cursor-help hover:bg-muted/70 transition-colors">
                      <div className="text-2xl sm:text-3xl font-bold text-primary">{wpm}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Net WPM</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">Your final typing speed after error correction. This is your official score.</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-3 rounded-lg bg-muted/50 cursor-help hover:bg-muted/70 transition-colors">
                      <div className="text-2xl sm:text-3xl font-bold">{rawWpm}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Raw WPM</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">Total keystroke speed without error penalty. Difference from Net WPM shows error impact.</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-3 rounded-lg bg-muted/50 cursor-help hover:bg-muted/70 transition-colors">
                      <div className={`text-2xl sm:text-3xl font-bold ${Number(accuracy) >= 95 ? 'text-green-500' : Number(accuracy) >= 85 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {accuracy}%
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Accuracy</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">Percentage of correct keystrokes. {Number(accuracy) >= 95 ? "Excellent accuracy!" : Number(accuracy) >= 85 ? "Good, aim for 95%+" : "Practice to improve accuracy."}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-3 rounded-lg bg-muted/50 cursor-help hover:bg-muted/70 transition-colors">
                      <div className="text-2xl sm:text-3xl font-bold text-green-500">{consistency}%</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Consistency</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">How steady your typing rhythm was. Higher = more consistent flow throughout the test.</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-3 rounded-lg bg-muted/50 cursor-help hover:bg-muted/70 transition-colors">
                      <div className="text-2xl sm:text-3xl font-bold">{formatTime(elapsedTime)}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Time</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">Total time taken to complete the typing test.</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Detail stats */}
              <div className="grid grid-cols-3 gap-3 text-center text-sm border-t border-border/50 pt-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <span className="text-muted-foreground">Characters: </span>
                      <span className="font-mono font-medium">{codeSnippet.length}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Total characters in the code snippet you typed</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <span className="text-muted-foreground">Errors: </span>
                      <span className={`font-mono font-medium ${errors > 0 ? 'text-red-500' : 'text-green-500'}`}>{errors}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">{errors === 0 ? "Perfect! No typing errors" : `${errors} character${errors > 1 ? 's' : ''} typed incorrectly`}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <span className="text-muted-foreground">Language: </span>
                      <span className="font-medium">{PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">The programming language of this code snippet</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCompletionDialogOpen(false);
                        resetTest();
                      }}
                      disabled={isLoading}
                      className="gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Try Again
                      <kbd className="ml-1 px-1 py-0.5 text-[10px] rounded bg-muted hidden sm:inline">Esc</kbd>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Retry the same code snippet to improve your score</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCompletionDialogOpen(false);
                        fetchCodeSnippet(true);
                      }}
                      disabled={isLoading}
                      className="gap-1.5"
                    >
                      <Zap className="w-4 h-4" />
                      New Snippet
                      <kbd className="ml-1 px-1 py-0.5 text-[10px] rounded bg-muted hidden sm:inline">Tab</kbd>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Generate a fresh AI code snippet to practice</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      onClick={() => {
                        setCompletionDialogOpen(false);
                        setShareDialogOpen(true);
                      }}
                      data-testid="button-share"
                      className="gap-1.5"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Share your achievement with certificate, card, or link</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </DialogContent>
          </Dialog>

          {/* Login prompt */}
          {!user && (
            <Card className="p-4 mt-6 bg-primary/5 border-primary/20">
              <p className="text-center text-sm">
                <a href="/login" className="text-primary hover:underline">Sign in</a> to save your results and compete on the leaderboard!
              </p>
            </Card>
          )}
        </div>

        {/* Share Dialog with Tabs */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Share Your Code Typing Result
              </DialogTitle>
              <DialogDescription>
                Share your {PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name} typing achievement with others!
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="certificate" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="certificate" className="gap-2" data-testid="tab-certificate">
                      <Award className="w-4 h-4" />
                      Certificate
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Professional 1200×675 certificate with verification ID</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="visual" className="gap-2" data-testid="tab-visual-card">
                      <Image className="w-4 h-4" />
                      Card
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Social media optimized image card</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="link" className="gap-2" data-testid="tab-link-sharing">
                      <Link2 className="w-4 h-4" />
                      Link
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Share directly to 8 social platforms</p>
                  </TooltipContent>
                </Tooltip>
              </TabsList>
              
              <TabsContent value="certificate" className="mt-4">
                <CodeCertificate
                  wpm={wpm}
                  rawWpm={rawWpm}
                  accuracy={accuracy}
                  consistency={consistency}
                  language={language}
                  languageName={PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language}
                  difficulty={difficulty}
                  characters={codeSnippet.length}
                  errors={errors}
                  time={formatTime(elapsedTime)}
                  username={user?.username}
                />
              </TabsContent>
              
              <TabsContent value="visual" className="mt-4">
                <CodeShareCard
                  wpm={wpm}
                  rawWpm={rawWpm}
                  accuracy={accuracy}
                  consistency={consistency}
                  language={language}
                  languageName={PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language}
                  difficulty={difficulty}
                  characters={codeSnippet.length}
                  errors={errors}
                  time={formatTime(elapsedTime)}
                  username={user?.username}
                />
              </TabsContent>
              
              <TabsContent value="link" className="mt-4 space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-4xl font-bold text-primary mb-2">{wpm} WPM</div>
                  <div className="text-sm text-muted-foreground">
                    {accuracy}% accuracy • {consistency}% consistency
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {codeSnippet.length} characters • {PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input 
                      value={shareUrl || `${window.location.origin}/code-mode`}
                      readOnly
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      onClick={copyShareLink}
                      variant="outline"
                      size="icon"
                      data-testid="button-copy-link"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <p className="text-xs text-center text-muted-foreground uppercase tracking-wide">Share on Social Media</p>
                  
                  <div className="grid grid-cols-4 gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => shareToSocial("twitter")}
                          className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/20 transition-all"
                          data-testid="share-twitter"
                        >
                          <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                          <span className="text-xs font-medium hidden sm:inline">Twitter</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p className="text-xs">Tweet your achievement</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => shareToSocial("discord")}
                          className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#5865F2]/10 hover:bg-[#5865F2]/25 border border-[#5865F2]/20 transition-all"
                          data-testid="share-discord"
                        >
                          <svg className="w-4 h-4 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                          </svg>
                          <span className="text-xs font-medium hidden sm:inline">Discord</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p className="text-xs">Copy formatted message for Discord</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => shareToSocial("reddit")}
                          className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#FF4500]/10 hover:bg-[#FF4500]/25 border border-[#FF4500]/20 transition-all"
                          data-testid="share-reddit"
                        >
                          <svg className="w-4 h-4 text-[#FF4500]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                          </svg>
                          <span className="text-xs font-medium hidden sm:inline">Reddit</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p className="text-xs">Post to Reddit</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => shareToSocial("whatsapp")}
                          className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/25 border border-[#25D366]/20 transition-all"
                          data-testid="share-whatsapp"
                        >
                          <MessageCircle className="w-4 h-4 text-[#25D366]" />
                          <span className="text-xs font-medium hidden sm:inline">WhatsApp</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p className="text-xs">Send via WhatsApp</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => shareToSocial("telegram")}
                          className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/25 border border-[#0088cc]/20 transition-all"
                          data-testid="share-telegram"
                        >
                          <Send className="w-4 h-4 text-[#0088cc]" />
                          <span className="text-xs font-medium hidden sm:inline">Telegram</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p className="text-xs">Share via Telegram</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => shareToSocial("linkedin")}
                          className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#0A66C2]/10 hover:bg-[#0A66C2]/25 border border-[#0A66C2]/20 transition-all"
                          data-testid="share-linkedin"
                        >
                          <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                          <span className="text-xs font-medium hidden sm:inline">LinkedIn</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p className="text-xs">Post to LinkedIn</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => shareToSocial("facebook")}
                          className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/25 border border-[#1877F2]/20 transition-all"
                          data-testid="share-facebook"
                        >
                          <Facebook className="w-4 h-4 text-[#1877F2]" />
                          <span className="text-xs font-medium hidden sm:inline">Facebook</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p className="text-xs">Share on Facebook</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => shareToSocial("email")}
                          className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-gray-500/10 hover:bg-gray-500/25 border border-gray-500/20 transition-all"
                          data-testid="share-email"
                        >
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-medium hidden sm:inline">Email</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p className="text-xs">Send via Email</p></TooltipContent>
                    </Tooltip>
                  </div>
                  
                  {'share' in navigator && (
                    <Button
                      onClick={handleNativeShare}
                      variant="secondary"
                      className="w-full gap-2"
                      data-testid="button-share-native"
                    >
                      <Share2 className="w-4 h-4" />
                      Share via...
                    </Button>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
