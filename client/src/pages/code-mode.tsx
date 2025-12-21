import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Code, RotateCcw, Share2, Copy, Facebook, Twitter, Linkedin, MessageCircle, HelpCircle, Zap, Check, Image, Link2, Download, Send, Mail, Award, X, Infinity, Sparkles, Settings, Volume2, VolumeX, Eye, EyeOff, Terminal, Upload, Trash2, AlertTriangle, FileCode } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { CodeShareCard } from "@/components/CodeShareCard";
import { CodeCertificate } from "@/components/CodeCertificate";
import { keyboardSound } from "@/lib/keyboard-sounds";
import { getCodePerformanceRating } from "@/lib/share-utils";

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
  { value: 45, label: "45s" },
  { value: 60, label: "1:00" },
  { value: 90, label: "1:30" },
  { value: 120, label: "2:00" },
  { value: 180, label: "3:00" },
  { value: 300, label: "5:00" },
  { value: 600, label: "10:00" },
  { value: 900, label: "15:00" },
  { value: 1200, label: "20:00" },
  { value: 1800, label: "30:00" },
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Custom code limits
const CUSTOM_CODE_LIMITS = {
  MIN_LENGTH: 10,          // Minimum 10 characters for meaningful practice
  MAX_LENGTH: 50000,       // 50KB max to prevent performance issues
  MAX_LINE_LENGTH: 500,    // Truncate extremely long lines
  MAX_LINES: 1000,         // Maximum 1000 lines
  WARN_LENGTH: 10000,      // Show warning above 10KB
};

// Normalize code snippets: comprehensive sanitization for typing practice
function normalizeCodeSnippet(code: string): string {
  let normalized = code
    // Normalize line endings (Windows, old Mac, Unix -> Unix)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove null bytes and other control characters (except \n and \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize Unicode spaces to regular spaces
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
    // Remove trailing whitespace from each line (common in pasted code)
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    // Remove leading/trailing empty lines
    .trim();
  
  return normalized;
}

// Validate custom code and return validation result
interface CodeValidation {
  isValid: boolean;
  error?: string;
  warning?: string;
  stats: {
    characters: number;
    lines: number;
    longestLine: number;
  };
}

function validateCustomCode(code: string): CodeValidation {
  const trimmed = code.trim();
  const lines = trimmed.split('\n');
  const longestLine = Math.max(...lines.map(l => l.length));
  
  const stats = {
    characters: trimmed.length,
    lines: lines.length,
    longestLine,
  };
  
  // Check minimum length
  if (trimmed.length < CUSTOM_CODE_LIMITS.MIN_LENGTH) {
    return {
      isValid: false,
      error: `Code must be at least ${CUSTOM_CODE_LIMITS.MIN_LENGTH} characters. Currently: ${trimmed.length}`,
      stats,
    };
  }
  
  // Check maximum length
  if (trimmed.length > CUSTOM_CODE_LIMITS.MAX_LENGTH) {
    return {
      isValid: false,
      error: `Code exceeds maximum limit of ${(CUSTOM_CODE_LIMITS.MAX_LENGTH / 1000).toFixed(0)}KB. Please use a shorter snippet.`,
      stats,
    };
  }
  
  // Check maximum lines
  if (lines.length > CUSTOM_CODE_LIMITS.MAX_LINES) {
    return {
      isValid: false,
      error: `Code exceeds ${CUSTOM_CODE_LIMITS.MAX_LINES} lines limit. Please use a shorter snippet.`,
      stats,
    };
  }
  
  // Check if it's only whitespace or special characters
  const printableContent = trimmed.replace(/\s/g, '');
  if (printableContent.length < 5) {
    return {
      isValid: false,
      error: "Code must contain meaningful content to practice typing.",
      stats,
    };
  }
  
  // Generate warnings
  let warning: string | undefined;
  
  if (trimmed.length > CUSTOM_CODE_LIMITS.WARN_LENGTH) {
    warning = `Large code snippet (${(trimmed.length / 1000).toFixed(1)}KB). This may take a while to complete.`;
  } else if (longestLine > CUSTOM_CODE_LIMITS.MAX_LINE_LENGTH) {
    warning = `Some lines are very long (${longestLine} chars). Long lines may be harder to type.`;
  }
  
  return {
    isValid: true,
    warning,
    stats,
  };
}

// Get celebratory message based on performance (matches share-utils.ts thresholds)
function getCelebratoryMessage(wpm: number, accuracy: number) {
  if (wpm >= 80 && accuracy >= 98) {
    return "You're in the top 1% of code typists! Legendary performance!";
  }
  if (wpm >= 60 && accuracy >= 95) {
    return "Blazing fast! You code faster than 95% of developers!";
  }
  if (wpm >= 45 && accuracy >= 90) {
    return "Impressive speed! You're faster than most professional coders!";
  }
  if (wpm >= 30 && accuracy >= 85) {
    return "Great job! Your code typing skills are above average!";
  }
  return "Keep practicing! Every keystroke makes you faster!";
}

export default function CodeMode() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [language, setLanguage] = useState("javascript");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [mode, setMode] = useState<"ai" | "custom">("ai");
  const [testMode, setTestMode] = useState<"normal" | "expert" | "master">("normal");
  const [timeLimit, setTimeLimit] = useState(60); // Default 1 minute
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
  const [customPrompt, setCustomPrompt] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [infiniteMode, setInfiniteMode] = useState(false);
  const [showCustomAI, setShowCustomAI] = useState(false);

  // Advanced settings
  const [caretStyle, setCaretStyle] = useState<"line" | "block" | "underline">("line");
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showIndentGuides, setShowIndentGuides] = useState(true);
  const [smoothCaret, setSmoothCaret] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => keyboardSound.getSettings().enabled);

  // Confirmation dialog state for setting changes during active typing
  const [showChangeConfirm, setShowChangeConfirm] = useState(false);
  const [changeTitle, setChangeTitle] = useState("");
  const [changeDescription, setChangeDescription] = useState("");
  const [changeConfirmLabel, setChangeConfirmLabel] = useState("Change & Reset");
  const pendingChangeRef = useRef<(() => void) | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const codeDisplayRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const wpmHistoryRef = useRef<number[]>([]);
  const infiniteAbortRef = useRef<AbortController | null>(null);
  const pendingInputValueRef = useRef<string | null>(null);
  const pendingInputRafRef = useRef<number | null>(null);
  const lastCodeScrollTsRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const lastElapsedSecondRef = useRef<number>(-1);
  const statsLastUpdateRef = useRef<number>(0);
  const userInputRef = useRef<string>("");
  const codeSnippetRef = useRef<string>("");
  const timeLimitRef = useRef<number>(timeLimit);
  const timerRafRef = useRef<number | null>(null);
  const finishTestRef = useRef<() => void>(() => { });

  // Advanced edge case handling refs
  const lastKeystrokeTimeRef = useRef<number>(0);
  const keystrokeTimesRef = useRef<number[]>([]);
  const suspiciousActivityCountRef = useRef<number>(0);
  const tabHiddenTimeRef = useRef<number | null>(null);
  const isOnlineRef = useRef<boolean>(navigator.onLine);
  const testStartedWhileOfflineRef = useRef<boolean>(false);
  const lastFetchTimeRef = useRef<number>(0);

  // Anti-cheat constants
  const MIN_KEYSTROKE_INTERVAL_MS = 20; // Humanly impossible to type faster than 50 chars/second
  const MAX_SUSPICIOUS_EVENTS = 10; // Flag after 10 suspicious rapid keystrokes
  const MIN_TEST_DURATION_MS = 3000; // Minimum 3 seconds for valid test
  const MAX_CHARS_PER_SECOND = 25; // ~300 WPM max realistic speed
  const FETCH_DEBOUNCE_MS = 1000; // Minimum 1 second between fetch requests

  // Guard function to prevent setting changes during active typing
  const confirmOrRun = useCallback((title: string, description: string, onConfirm: () => void, confirmLabel = "Change & Reset") => {
    const hasTyped = userInput.length > 0;
    const timerStarted = startTime !== null;
    const typingInProgress = isActive && !isFinished && !isFailed && (hasTyped || timerStarted);

    if (typingInProgress) {
      pendingChangeRef.current = onConfirm;
      setChangeTitle(title);
      setChangeDescription(description);
      setChangeConfirmLabel(confirmLabel);
      setShowChangeConfirm(true);

      toast({
        title: "⚠️ Test in Progress",
        description: "You have an active typing session. Confirm to reset and apply changes.",
        variant: "destructive",
      });
    } else {
      onConfirm();
    }
  }, [isActive, isFinished, isFailed, userInput.length, startTime, toast]);

  const handleConfirmChange = useCallback(() => {
    const fn = pendingChangeRef.current;
    setShowChangeConfirm(false);
    pendingChangeRef.current = null;
    if (fn) {
      fn();
      toast({
        title: "✓ Settings Updated",
        description: "Your changes have been applied and the test has been reset.",
      });
    }
  }, [toast]);

  const fetchCodeSnippet = useCallback(async (forceNew = true, isRetry = false) => {
    // Debounce protection - prevent rapid-fire API calls
    const now = Date.now();
    if (!isRetry && now - lastFetchTimeRef.current < FETCH_DEBOUNCE_MS) {
      return;
    }
    lastFetchTimeRef.current = now;

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
      const promptParam = customPrompt ? `&customPrompt=${encodeURIComponent(customPrompt)}` : '';
      const response = await fetch(
        `/api/code/snippet?language=${encodeURIComponent(language)}&difficulty=${encodeURIComponent(difficulty)}&timeLimit=${timeLimit}&testMode=${testMode}&generate=true&forceNew=${forceNew}${promptParam}`,
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
      // Normalize snippet to remove Windows line endings and trailing whitespace
      setCodeSnippet(normalizeCodeSnippet(data.snippet.content));
      setSnippetId(data.snippet.id);
      setErrorState({ type: null, message: '', canRetry: false });
      setRetryCount(0);

      // Show success notification


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
  }, [language, difficulty, timeLimit, testMode, customPrompt, toast, retryCount]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (timerRafRef.current != null) {
        cancelAnimationFrame(timerRafRef.current);
        timerRafRef.current = null;
      }
      if (pendingInputRafRef.current != null) {
        cancelAnimationFrame(pendingInputRafRef.current);
        pendingInputRafRef.current = null;
        pendingInputValueRef.current = null;
      }
      // Cleanup infinite mode fetch controller
      if (infiniteAbortRef.current) {
        infiniteAbortRef.current.abort();
        infiniteAbortRef.current = null;
      }
    };
  }, []);

  // Tab visibility change detection - warn user if they switch tabs during timed test
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden
        if (isActive && !isFinished && timeLimit > 0) {
          tabHiddenTimeRef.current = Date.now();
        }
      } else {
        // Tab became visible again
        if (tabHiddenTimeRef.current && isActive && !isFinished) {
          const hiddenDuration = Date.now() - tabHiddenTimeRef.current;
          // If hidden for more than 5 seconds during a timed test, warn user
          if (hiddenDuration > 5000 && timeLimit > 0) {
            toast({
              title: "⚠️ Tab Switch Detected",
              description: `You were away for ${Math.round(hiddenDuration / 1000)}s. Timer continued running.`,
              variant: "destructive",
            });
          }
          tabHiddenTimeRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive, isFinished, timeLimit, toast]);

  // Network status detection - warn user if they go offline
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      if (testStartedWhileOfflineRef.current) {
        toast({
          title: "📶 Back Online",
          description: "Connection restored. Your results can now be saved.",
        });
        testStartedWhileOfflineRef.current = false;
      }
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      if (isActive && !isFinished) {
        testStartedWhileOfflineRef.current = true;
        toast({
          title: "📵 You're Offline",
          description: "Continue typing - results will save when you reconnect.",
          variant: "destructive",
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isActive, isFinished, toast]);

  useEffect(() => {
    if (mode === "ai" && !codeSnippet && !isLoading) {
      fetchCodeSnippet(false); // Use cached on initial load
    }
  }, [mode, codeSnippet, isLoading, fetchCodeSnippet]);

  useEffect(() => {
    if (!isActive || !startTime || isFinished) return;
    startTimeRef.current = startTime;

    let rafId: number;
    const tick = () => {
      const st = startTimeRef.current;
      if (!st) {
        rafId = requestAnimationFrame(tick);
        timerRafRef.current = rafId;
        return;
      }
      const now = Date.now();
      const elapsedMs = now - st;
      const elapsedSec = Math.floor(elapsedMs / 1000);

      if (elapsedSec !== lastElapsedSecondRef.current) {
        lastElapsedSecondRef.current = elapsedSec;
        setElapsedTime(elapsedSec);
      }

      const tl = timeLimitRef.current;
      if (tl > 0 && elapsedSec >= tl) {
        if (finishTestRef.current) finishTestRef.current();
        return; // stop loop
      }

      if (now - statsLastUpdateRef.current >= 80) {
        statsLastUpdateRef.current = now;
        const ui = userInputRef.current;
        const code = codeSnippetRef.current;
        const minutes = elapsedMs / 60000;
        if (minutes > 0 && ui.length > 0) {
          let correctChars = 0;
          for (let i = 0; i < ui.length; i++) {
            if (ui[i] === code[i]) correctChars++;
          }
          const currentRawWpm = Math.round((ui.length / 5) / minutes);
          const currentWpm = Math.round((correctChars / 5) / minutes);
          setWpm(Math.max(0, currentWpm));
          setRawWpm(Math.max(0, currentRawWpm));
          const currentAccuracy = Math.round((correctChars / ui.length) * 100);
          setAccuracy(currentAccuracy);

          // Sample every 500ms
          const sampleIndex = Math.floor(elapsedMs / 500);
          if (wpmHistoryRef.current.length < sampleIndex && currentWpm > 0) {
            wpmHistoryRef.current.push(currentWpm);
          }

          if (wpmHistoryRef.current.length >= 4) {
            const samples = wpmHistoryRef.current.slice(2);
            const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
            if (mean > 0) {
              const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
              const stdDev = Math.sqrt(variance);
              const cv = (stdDev / mean) * 100;
              const consistencyScore = Math.max(0, Math.min(100, 100 - (cv * 1.5)));
              setConsistency(Math.round(consistencyScore));
            }
          } else if (wpmHistoryRef.current.length >= 2) {
            const samples = wpmHistoryRef.current;
            const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
            if (mean > 0) {
              const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
              const stdDev = Math.sqrt(variance);
              const cv = (stdDev / mean) * 100;
              const consistencyScore = Math.max(0, Math.min(100, 100 - (cv * 1.5)));
              setConsistency(Math.round(consistencyScore));
            }
          }
        }
      }

      rafId = requestAnimationFrame(tick);
      timerRafRef.current = rafId;
    };

    lastElapsedSecondRef.current = -1;
    rafId = requestAnimationFrame(tick);
    timerRafRef.current = rafId;

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (timerRafRef.current != null) {
        cancelAnimationFrame(timerRafRef.current);
        timerRafRef.current = null;
      }
    };
  }, [isActive, startTime, isFinished]);

  // Completion logic:
  // - For timed tests (timeLimit > 0): ONLY finish when timer expires (handled in timer effect)
  //   When user completes current snippet, fetchMoreContent() is called to add more code
  // - For "No Limit" mode (timeLimit === 0): Finish when user completes the snippet
  useEffect(() => {
    if (isActive && startTime && codeSnippet.length > 0) {
      // For "No Limit" mode only
      if (timeLimit === 0) {
        // Master mode requires exact match (100% accuracy)
        if (testMode === "master") {
          if (userInput === codeSnippet) {
            finishTest();
          }
        } else {
          // Normal/Expert mode: finish when user types to the end (regardless of accuracy)
          // This allows the test to complete and show accuracy results
          // Handle snippets with trailing whitespace by comparing trimmed lengths
          const trimmedSnippetLength = codeSnippet.trimEnd().length;
          if (userInput.length >= codeSnippet.length ||
            (userInput.length >= trimmedSnippetLength && trimmedSnippetLength > 0)) {
            finishTest();
          }
        }
      }
      // For timed tests, the continuous fetching effect will handle adding more content
      // If we're loading more content, just wait; timer will finish the test
    }
  }, [userInput, isActive, startTime, codeSnippet, timeLimit, testMode]);

  interface CodeTestResult {
    codeSnippetId: number | null;
    programmingLanguage: string;
    wpm: number;
    accuracy: number;
    characters: number;
    errors: number;
    syntaxErrors: number;
    duration: number;
  }

  const saveCodeTestMutation = useMutation({
    mutationFn: async (testData: CodeTestResult) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      try {
        const response = await fetch("/api/code/test-results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testData),
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to save test");
        }
        return response.json();
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error("Request timed out. Your result may not have been saved.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code/test-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/code/leaderboard"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Could not save your test result. Please try again.",
        variant: "destructive",
      });
    },
  });

  const finishTest = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (timerRafRef.current != null) {
      cancelAnimationFrame(timerRafRef.current);
      timerRafRef.current = null;
    }

    // Use precise milliseconds for accurate calculation
    const durationMs = (startTimeRef.current ?? startTime) ? Date.now() - (startTimeRef.current ?? (startTime as number)) : 0;
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
    // Uses Net WPM samples, skipping warm-up period for accuracy
    let finalConsistency = 100;
    if (wpmHistoryRef.current.length >= 4) {
      // Skip first 2 samples (first second) for warm-up
      const samples = wpmHistoryRef.current.slice(2);
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      if (mean > 0) {
        const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
        const stdDev = Math.sqrt(variance);
        const cv = (stdDev / mean) * 100;
        // Scale CV to be more meaningful
        finalConsistency = Math.max(0, Math.min(100, Math.round(100 - (cv * 1.5))));
      }
    } else if (wpmHistoryRef.current.length >= 2) {
      // Fallback for shorter tests
      const samples = wpmHistoryRef.current;
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      if (mean > 0) {
        const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
        const stdDev = Math.sqrt(variance);
        const cv = (stdDev / mean) * 100;
        finalConsistency = Math.max(0, Math.min(100, Math.round(100 - (cv * 1.5))));
      }
    }

    // Clamp WPM to realistic bounds (0-300 WPM)
    const clampedWpm = Math.max(0, Math.min(300, finalWpm));
    const clampedRawWpm = Math.max(0, Math.min(300, finalRawWpm));

    // Validate minimum test duration (anti-cheat)
    const isValidDuration = durationMs >= MIN_TEST_DURATION_MS;

    // Check for suspicious activity flags
    const hasSuspiciousActivity = suspiciousActivityCountRef.current >= MAX_SUSPICIOUS_EVENTS;

    // Calculate characters per second for additional validation
    const charsPerSecond = durationMs > 0 ? (userInput.length / durationMs) * 1000 : 0;
    const isRealisticSpeed = charsPerSecond <= MAX_CHARS_PER_SECOND;

    // Determine if result should be flagged
    const isFlagged = !isValidDuration || hasSuspiciousActivity || !isRealisticSpeed;

    if (isFlagged && !isValidDuration) {
      toast({
        title: "⚠️ Test Too Short",
        description: "Test must be at least 3 seconds for valid results.",
        variant: "destructive",
      });
    }

    setWpm(clampedWpm);
    setRawWpm(clampedRawWpm);
    setAccuracy(finalAccuracy);
    setConsistency(finalConsistency);
    setErrors(errorCount);
    setIsFinished(true);
    setIsActive(false);
    setCompletionDialogOpen(true);

    // Celebration confetti (reduced for flagged results)
    confetti({
      particleCount: isFlagged ? 30 : 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: isFlagged ? ['#94a3b8'] : ['#22c55e', '#3b82f6', '#f59e0b'],
    });

    // Only save valid, non-flagged results for logged-in users
    if (user && startTime && isValidDuration && !isFlagged) {
      saveCodeTestMutation.mutate({
        codeSnippetId: snippetId,
        programmingLanguage: language,
        wpm: clampedWpm,
        accuracy: finalAccuracy,
        characters: userInput.length,
        errors: errorCount,
        syntaxErrors: 0,
        duration,
      });
    } else if (user && isFlagged) {
      toast({
        title: "Result Not Saved",
        description: "This result was flagged and won't be saved to your profile.",
        variant: "destructive",
      });
    }

    // Reset anti-cheat counters
    suspiciousActivityCountRef.current = 0;
    keystrokeTimesRef.current = [];
  }, [userInput, codeSnippet, startTime, user, snippetId, language, saveCodeTestMutation, toast]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;
    const value = e.target.value;
    // Coalesce rapid input changes (e.g., held key) into a single rAF tick to avoid update storms
    pendingInputValueRef.current = value;
    if (pendingInputRafRef.current == null) {
      pendingInputRafRef.current = requestAnimationFrame(() => {
        const v = pendingInputValueRef.current ?? "";
        pendingInputValueRef.current = null;
        pendingInputRafRef.current = null;
        processInput(v);
      });
    }
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

    // Guard against empty or invalid code snippet
    if (!codeSnippet || codeSnippet.length === 0) {
      return;
    }

    if (value.length > codeSnippet.length) {
      if (textareaRef.current) textareaRef.current.value = userInput;
      return;
    }

    // Anti-cheat: Detect impossibly fast typing (bot detection)
    const now = Date.now();
    if (value.length > userInput.length) {
      const timeSinceLastKeystroke = now - lastKeystrokeTimeRef.current;

      // Track keystroke timing for analysis
      if (lastKeystrokeTimeRef.current > 0) {
        keystrokeTimesRef.current.push(timeSinceLastKeystroke);
        // Keep only last 20 samples
        if (keystrokeTimesRef.current.length > 20) {
          keystrokeTimesRef.current.shift();
        }

        // Check for suspiciously fast typing
        if (timeSinceLastKeystroke < MIN_KEYSTROKE_INTERVAL_MS) {
          suspiciousActivityCountRef.current++;

          // Warn after multiple suspicious events
          if (suspiciousActivityCountRef.current === MAX_SUSPICIOUS_EVENTS) {
            toast({
              title: "⚠️ Unusual Typing Pattern",
              description: "Your typing speed seems unusually fast. Results may be flagged.",
              variant: "destructive",
            });
          }
        }
      }

      lastKeystrokeTimeRef.current = now;

      // Play keyboard sound when typing (uses global sound settings)
      keyboardSound.play();
    }

    if (!isActive && value.length > 0) {
      setIsActive(true);
      startTimeRef.current = now;
      setStartTime(now);
      wpmHistoryRef.current = [];
      keystrokeTimesRef.current = [];
      suspiciousActivityCountRef.current = 0;
      lastKeystrokeTimeRef.current = now;
      lastElapsedSecondRef.current = -1;
      statsLastUpdateRef.current = 0;
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
          resetTest(true);
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
          const now = Date.now();
          startTimeRef.current = now;
          setStartTime(now);
        }
      }
    }

    // Escape to reset/restart
    if (e.key === "Escape") {
      resetTest(true); // Escape restarts current test (standard behavior)
    }
  };

  const resetTest = useCallback((keepSnippet: boolean = false) => {
    setCompletionDialogOpen(false);
    setUserInput("");
    setStartTime(null);
    startTimeRef.current = null;
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
    lastElapsedSecondRef.current = -1;
    statsLastUpdateRef.current = 0;

    // Reset anti-cheat counters
    lastKeystrokeTimeRef.current = 0;
    keystrokeTimesRef.current = [];
    suspiciousActivityCountRef.current = 0;
    tabHiddenTimeRef.current = null;

    if (mode === "ai") {
      if (!keepSnippet) {
        fetchCodeSnippet(true); // Force new snippet
      } else {
        // Just refocus if extending/retrying same snippet
        // Optional: toast to confirm reset
        toast({
          title: "Test Reset",
          description: "Restarting with the same code snippet.",
        });
      }
    } else if (mode === "custom" && customCode) {
      setCodeSnippet(normalizeCodeSnippet(customCode));
      setSnippetId(null);
    }

    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [mode, customCode, fetchCodeSnippet, toast]);

  // Keep refs synced for rAF timer loop
  useEffect(() => { userInputRef.current = userInput; }, [userInput]);
  useEffect(() => { codeSnippetRef.current = codeSnippet; }, [codeSnippet]);
  useEffect(() => { timeLimitRef.current = timeLimit; }, [timeLimit]);
  useEffect(() => { finishTestRef.current = finishTest; }, [finishTest]);
  useEffect(() => { if (startTime != null) startTimeRef.current = startTime; }, [startTime]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const typingInProgress = isActive && !isFinished && !isFailed && userInput.length > 0;
      if (typingInProgress) {
        e.preventDefault();
        e.returnValue = 'You have an active typing test. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isActive, isFinished, isFailed, userInput.length]);

  // Global keyboard shortcuts - respects test state
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      // Skip if typing in any input field (custom prompt, custom code, etc.)
      if (target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable) {
        // Only allow Escape to work in inputs
        if (e.key === "Escape") {
          e.preventDefault();
          (target as HTMLElement).blur();
          resetTest();
        }
        return;
      }

      // Only handle when not focused on typing textarea
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

    confirmOrRun(
      "Switch Mode?",
      `Changing from ${mode === "ai" ? "AI Generated" : "Custom Code"} to ${newMode === "ai" ? "AI Generated" : "Custom Code"} will reset your current test and clear progress.`,
      () => {
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
        toast({
          title: "Mode Changed",
          description: `Switched to ${newMode === "ai" ? "AI Generated" : "Custom Code"} mode.`,
        });
      },
      "Switch Mode"
    );
  };

  // Reset error state when language or difficulty changes
  useEffect(() => {
    if (mode === "ai") {
      setErrorState({ type: null, message: '', canRetry: false });
      setRetryCount(0);
    }
  }, [language, difficulty, timeLimit, testMode]);


  // Fetch more content for continuous typing (works for both timed and unlimited modes)
  const fetchMoreContent = useCallback(async () => {
    // Prevent duplicate fetches
    if (isLoadingMore) return;

    if (infiniteAbortRef.current) {
      infiniteAbortRef.current.abort();
    }

    infiniteAbortRef.current = new AbortController();
    const signal = infiniteAbortRef.current.signal;

    setIsLoadingMore(true);

    try {
      const promptParam = customPrompt ? `&customPrompt=${encodeURIComponent(customPrompt)}` : '';
      const response = await fetch(
        `/api/code/snippet?language=${encodeURIComponent(language)}&difficulty=${encodeURIComponent(difficulty)}&timeLimit=0&testMode=${testMode}&generate=true&forceNew=true${promptParam}`,
        { signal, cache: 'no-store' }
      );

      if (signal.aborted) return;

      if (response.ok) {
        const data = await response.json();
        if (data.snippet?.content) {
          // Append new content with a newline separator (normalized)
          const normalizedContent = normalizeCodeSnippet(data.snippet.content);
          setCodeSnippet(prev => prev + "\n\n" + normalizedContent);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Error fetching more content:", error);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [language, difficulty, testMode, customPrompt, isLoadingMore]);

  // Check if user is near the end of content - fetch more for continuous typing
  // ONLY for timed tests (timeLimit > 0) - keeps content flowing until timer ends
  // For "No Limit" mode (timeLimit === 0), the completion effect handles finishing
  useEffect(() => {
    // Only fetch more content for timed tests
    if (timeLimit === 0 || !isActive || isFinished || isLoadingMore) return;

    const remainingChars = codeSnippet.length - userInput.length;
    // When 100 characters or less remaining, fetch more code for timed tests
    if (remainingChars <= 100 && codeSnippet.length > 0) {
      fetchMoreContent();
    }
  }, [userInput.length, codeSnippet.length, isActive, isFinished, isLoadingMore, fetchMoreContent, timeLimit]);

  // Auto-scroll to keep current line visible
  useEffect(() => {
    if (!codeDisplayRef.current || !codeSnippet) return;
    // Throttle auto-scroll during rapid input to avoid layout thrash
    const now = performance.now();
    if (now - lastCodeScrollTsRef.current < 32) return; // ~30 FPS
    lastCodeScrollTsRef.current = now;

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
    // Validate the custom code
    const validation = validateCustomCode(customCode);
    
    if (!validation.isValid) {
      toast({
        title: "Invalid Code",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    const applyCode = () => {
      const normalized = normalizeCodeSnippet(customCode);
      setCodeSnippet(normalized);
      setSnippetId(null);
      setUserInput("");
      setIsActive(false);
      setIsFinished(false);
      
      // Show success with stats
      const lines = normalized.split('\n').length;
      const chars = normalized.length;
      
      toast({
        title: "Custom Code Loaded ✓",
        description: `${lines} lines, ${chars.toLocaleString()} characters ready for practice.`,
      });
      
      // Show warning if applicable
      if (validation.warning) {
        setTimeout(() => {
          toast({
            title: "⚠️ Note",
            description: validation.warning,
          });
        }, 500);
      }
      
      setTimeout(() => textareaRef.current?.focus(), 0);
    };

    if (isActive && !isFinished && userInput.length > 0) {
      confirmOrRun(
        "Load Custom Code?",
        "Loading new custom code will reset your current typing test and discard progress.",
        applyCode,
        "Load Code"
      );
    } else {
      applyCode();
    }
  };

  // Handle file upload for custom code
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 100KB for safety)
    if (file.size > 100 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 100KB.",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }
    
    // Check file type
    const validExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.go', '.rs', '.rb', '.php', '.html', '.css', '.scss', '.sql', '.sh', '.bash', '.json', '.yaml', '.yml', '.xml', '.md', '.txt'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      toast({
        title: "Unsupported File Type",
        description: "Please upload a code or text file (.js, .py, .java, etc.)",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCustomCode(content);
        toast({
          title: "File Loaded",
          description: `${file.name} loaded. Click "Start Typing" to begin.`,
        });
      }
    };
    reader.onerror = () => {
      toast({
        title: "Error Reading File",
        description: "Could not read the file. Please try again.",
        variant: "destructive",
      });
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input to allow re-uploading same file
  };

  // Clear custom code
  const clearCustomCode = () => {
    setCustomCode("");
    setCodeSnippet("");
    toast({
      title: "Code Cleared",
      description: "Paste new code or upload a file to start.",
    });
  };

  // Edit loaded code (go back to input mode)
  const editLoadedCode = () => {
    if (isActive && userInput.length > 0) {
      confirmOrRun(
        "Edit Code?",
        "Editing the code will reset your current typing progress.",
        () => {
          setCustomCode(codeSnippet);
          setCodeSnippet("");
          setUserInput("");
          setIsActive(false);
        },
        "Edit Code"
      );
    } else {
      setCustomCode(codeSnippet);
      setCodeSnippet("");
      setUserInput("");
      setIsActive(false);
    }
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

  // Calculate current cursor line for active line highlighting
  const currentCursorLine = useMemo(() => {
    if (!codeSnippet) return 0;
    const textBeforeCursor = codeSnippet.substring(0, userInput.length);
    return textBeforeCursor.split('\n').length;
  }, [codeSnippet, userInput.length]);

  // Caret component based on style setting
  const renderCaret = (style: "line" | "block" | "underline") => {
    const baseClass = smoothCaret ? "animate-caret-smooth" : "animate-caret-blink";

    if (style === "block") {
      return (
        <span className={`absolute left-0 top-0 w-[0.6em] h-[1.2em] bg-primary/30 rounded-sm ${baseClass}`} />
      );
    }
    if (style === "underline") {
      return (
        <span className={`absolute left-0 bottom-0 w-[0.6em] h-[2px] bg-primary rounded-full ${baseClass} shadow-[0_0_6px_rgba(var(--primary),0.5)]`} />
      );
    }
    // Default: line
    return (
      <span className={`absolute left-0 top-0 w-[2px] h-[1.2em] bg-primary rounded-full ${baseClass} shadow-[0_0_8px_rgba(var(--primary),0.5)]`} />
    );
  };

  const highlightedCode = useMemo(() => {
    if (!codeSnippet) return null;

    const lines = codeSnippet.split("\n");
    let charIndex = 0;

    return lines.map((line, lineIndex) => {
      const isActiveLine = lineIndex + 1 === currentCursorLine;

      // Calculate indentation level for guides
      const indentMatch = line.match(/^(\s*)/);
      const indentLevel = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0;

      const lineContent = line.split("").map((char, i) => {
        const currentCharIndex = charIndex + i;
        const isCurrent = currentCharIndex === userInput.length;
        const isTyped = currentCharIndex < userInput.length;
        const isCorrect = isTyped && userInput[currentCharIndex] === char;
        const isError = isTyped && !isCorrect;

        // Enhanced character styling
        let charClassName = "transition-all duration-75 ";

        if (isError) {
          // Error: red text with underline instead of background
          charClassName += "text-red-400 decoration-red-500 underline decoration-wavy decoration-2 ";
        } else if (isTyped) {
          // Correct: bright text with subtle glow
          charClassName += "text-foreground ";
        } else if (isCurrent) {
          // Current position
          charClassName += "relative text-muted-foreground/80 ";
        } else {
          // Untyped: dimmed
          charClassName += focusMode ? "text-muted-foreground/20" : "text-muted-foreground/40 ";
        }

        // Handle spaces with visible dots for untyped
        if (char === " " && !isTyped && !isCurrent) {
          return (
            <span key={currentCharIndex} className={charClassName + "relative"}>
              <span className="opacity-20">·</span>
            </span>
          );
        }

        // Handle tabs
        if (char === "\t") {
          return (
            <span key={currentCharIndex} className={charClassName}>
              {"    "}
              {isCurrent && !isFinished && !isFailed && renderCaret(caretStyle)}
            </span>
          );
        }

        return (
          <span key={currentCharIndex} className={charClassName}>
            {isCurrent && !isFinished && !isFailed && renderCaret(caretStyle)}
            {char}
          </span>
        );
      });

      // Check if cursor is at end of this line (at newline position)
      const newlineIndex = charIndex + line.length;
      const isCursorAtNewline = newlineIndex === userInput.length;

      // Update charIndex for next line
      charIndex += line.length + 1;

      return (
        <div
          key={lineIndex}
          className={`flex group transition-colors duration-150 ${isActiveLine && !focusMode ? "bg-primary/5 -mx-2 px-2 rounded" : ""
            }`}
          data-line={lineIndex + 1}
        >
          {/* Line number gutter */}
          {showLineNumbers && (
            <span className={`select-none w-10 text-right pr-3 text-xs font-mono transition-colors ${isActiveLine
              ? "text-primary font-medium"
              : "text-muted-foreground/30 group-hover:text-muted-foreground/50"
              }`}>
              {lineIndex + 1}
            </span>
          )}

          {/* Indentation guides */}
          {showIndentGuides && (
            <span className="relative">
              {indentLevel > 0 && Array.from({ length: indentLevel }).map((_, idx) => (
                <span
                  key={idx}
                  className={`absolute top-0 bottom-0 w-px ${isActiveLine ? "bg-primary/20" : "bg-muted-foreground/10"
                    }`}
                  style={{ left: `${idx * 16}px` }}
                />
              ))}
            </span>
          )}

          {/* Line content */}
          <span className="flex-1 whitespace-pre-wrap break-words">
            {lineContent}
            {isCursorAtNewline && !isFinished && !isFailed && lineIndex < lines.length - 1 && (
              <span className="relative">
                {renderCaret(caretStyle)}
              </span>
            )}
            {/* Newline indicator */}
            {lineIndex < lines.length - 1 && !focusMode && (
              <span className={`ml-1 text-xs ${newlineIndex < userInput.length
                ? "text-green-500/40"
                : "text-muted-foreground/15"
                }`}>↵</span>
            )}
          </span>
        </div>
      );
    });
  }, [codeSnippet, userInput, isFinished, isFailed, currentCursorLine, caretStyle, smoothCaret, showLineNumbers, showIndentGuides, focusMode]);

  const shareToSocial = (platform: string) => {
    const langName = PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language;
    const twitterText = `🚀 Just coded ${langName} at ${wpm} WPM! ${codeSnippet.length} chars with ${accuracy}% accuracy 💻

Can you beat it?

#TypeMasterAI #Code`;
    const facebookText = `🚀 I just finished a coding speed test!

Typed ${codeSnippet.length} characters of ${langName} code at ${wpm} WPM with ${accuracy}% accuracy! This feels amazing! 💻🔥

Honestly, I didn't realize how fast (or slow) I typed code until now. It's wild seeing the actual numbers!

If you've ever wondered about your coding speed, TypeMasterAI has a Code Mode that's pretty eye-opening.

Think you can code faster? 😏`;
    const linkedinText = `Code Typing Assessment: ${wpm} WPM in ${langName}

Completed a specialized typing assessment focused on programming syntax and code structure.

Results:
▸ Language: ${langName}
▸ Typing Speed: ${wpm} Words Per Minute
▸ Accuracy: ${accuracy}%
▸ Characters Typed: ${codeSnippet.length}

For developers, typing speed in actual code (not prose) is a distinct skill. Code involves more special characters, indentation, and syntax patterns that differ from natural language typing.

Understanding your baseline code typing speed can help identify opportunities for workflow optimization.

#SoftwareDevelopment #Productivity`;
    const url = window.location.origin + "/code-mode";
    const title = `I typed ${langName} code at ${wpm} WPM on TypeMasterAI!`;

    // WhatsApp: use ASCII-safe multi-line template to avoid replacement characters and preserve formatting
    const waText = `*TypeMasterAI Code Result*\n\nLanguage: ${langName}\nSpeed: *${wpm} WPM*\nAccuracy: *${accuracy}%*\nCharacters: ${codeSnippet.length}\n\nTry it: ${url}`;

    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(facebookText)}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(`Code Typing: ${wpm} WPM in ${langName}`)}&summary=${encodeURIComponent(linkedinText)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(waText)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(twitterText)}`,
      reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
      email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(facebookText + "\n\nTry it yourself: " + url)}`,
    };

    if (platform === 'discord') {
      navigator.clipboard.writeText(`${twitterText}\n\n🔗 ${url}`);
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
    const text = `🚀 Just coded ${langName} at ${wpm} WPM! ${codeSnippet.length} chars with ${accuracy}% accuracy 💻\n\nCan you beat it?`;
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
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 sm:gap-3 cursor-help">
                  <Code className="w-6 sm:w-8 h-6 sm:h-8 text-primary" />
                  <h1 className="text-xl sm:text-2xl font-bold">Code Mode</h1>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[280px]">
                <p className="font-medium mb-1">Code Typing Practice</p>
                <p className="text-xs text-muted-foreground">Master typing in 50+ programming languages with AI-generated snippets. Improve your coding speed and accuracy.</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Controls Bar */}
          <Card className="p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center justify-center">
              <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-medium">Mode:</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Mode help">
                        <HelpCircle className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[250px]">
                      <p className="font-medium mb-1">Code Generation Mode</p>
                      <p className="text-xs text-muted-foreground">Choose between AI-generated code or paste your own custom code to practice.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex border rounded-md overflow-hidden">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={mode === "ai" ? "default" : "ghost"}
                        className="rounded-none text-xs px-3 h-8"
                        onClick={() => {
                          if (isActive) {
                            toast({
                              title: "Test in Progress",
                              description: "Finish or reset your current test before switching modes.",
                              variant: "destructive",
                            });
                            return;
                          }
                          handleModeSwitch("ai");
                        }}
                        disabled={isActive}
                        data-testid="button-mode-ai"
                      >
                        Standard
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[220px]">
                      <p className="text-xs">AI generates unique code tailored to your selected language and difficulty.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={mode === "custom" ? "default" : "ghost"}
                        className="rounded-none text-xs px-3 h-8"
                        onClick={() => {
                          if (isActive) {
                            toast({
                              title: "Test in Progress",
                              description: "Finish or reset your current test before switching modes.",
                              variant: "destructive",
                            });
                            return;
                          }
                          handleModeSwitch("custom");
                        }}
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

              <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-medium">Language:</span>
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
                <Select value={language} onValueChange={(val) => {
                  if (val === language) return;
                  confirmOrRun(
                    "Change Language?",
                    `Switching from ${PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language} to ${PROGRAMMING_LANGUAGES[val as keyof typeof PROGRAMMING_LANGUAGES]?.name || val} will reset your current test and load new code.`,
                    () => {
                      setLanguage(val);
                      toast({
                        title: "Language Changed",
                        description: `Now using ${PROGRAMMING_LANGUAGES[val as keyof typeof PROGRAMMING_LANGUAGES]?.name || val}.`,
                      });
                    }
                  );
                }} disabled={isActive || mode === "custom"}>
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

              <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-medium">Difficulty:</span>
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
                <Select value={difficulty} onValueChange={(val) => {
                  if (val === difficulty) return;
                  confirmOrRun(
                    "Change Difficulty?",
                    `Switching from ${difficulty} to ${val} difficulty will reset your current test and load new code with different complexity.`,
                    () => {
                      setDifficulty(val as any);
                      toast({
                        title: "Difficulty Changed",
                        description: `Now using ${val} difficulty level.`,
                      });
                    }
                  );
                }} disabled={isActive || mode === "custom"}>
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

              <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-medium">Test Mode:</span>
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
                <Select value={testMode} onValueChange={(val) => {
                  if (val === testMode) return;
                  confirmOrRun(
                    "Change Test Mode?",
                    `Switching from ${testMode} to ${val} mode will reset your current test. Different modes have different error tolerance rules.`,
                    () => {
                      setTestMode(val as any);
                      toast({
                        title: "Test Mode Changed",
                        description: `Now using ${val} mode.`,
                      });
                    }
                  );
                }} disabled={isActive}>
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

              <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-medium">Time:</span>
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
                <Select value={timeLimit.toString()} onValueChange={(val) => {
                  const newTimeLimit = parseInt(val);
                  if (newTimeLimit === timeLimit) return;
                  confirmOrRun(
                    "Change Time Limit?",
                    `Switching from ${timeLimit === 0 ? "No Limit" : `${timeLimit}s`} to ${newTimeLimit === 0 ? "No Limit" : `${newTimeLimit}s`} will reset your current test.`,
                    () => {
                      setTimeLimit(newTimeLimit);
                      toast({
                        title: "Time Limit Changed",
                        description: `Now using ${newTimeLimit === 0 ? "No Limit" : `${newTimeLimit} seconds`}.`,
                      });
                    }
                  );
                }} disabled={isActive}>
                  <SelectTrigger className="w-[90px] h-8 text-xs" data-testid="select-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {TIME_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value.toString()}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>



              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default" // Changed to default for emphasis on "New" action
                    size="sm"
                    onClick={() => {
                      if (isActive && !isFinished && userInput.length > 0) {
                        confirmOrRun(
                          "New Code?",
                          "This will discard your current progress and load new code.",
                          () => resetTest(false),
                          "New Code"
                        );
                      } else {
                        resetTest(false);
                      }
                    }}
                    disabled={isLoading}
                    data-testid="button-new-snippet"
                  >

                    {mode === "ai" ? "New Code" : "New Test"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Load new code (Tab)</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* AI Custom Content & Settings Row */}
            {mode === "ai" && !isActive && (
              <>
                {!showCustomAI ? (
                  <div className="mt-2 flex justify-center items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCustomAI(true)}
                          className="gap-1.5 px-3 h-7 text-xs text-muted-foreground hover:text-primary"
                          data-testid="button-open-custom-ai"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Ask AI for specific code</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Request specific code like "React hooks" or "sorting algorithm"</p>
                      </TooltipContent>
                    </Tooltip>

                    <span className="text-muted-foreground/30">|</span>

                    {/* Settings Popover */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 px-2 h-7 text-xs text-muted-foreground hover:text-primary"
                          data-testid="button-settings"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Settings</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-4" align="center">
                        <div className="space-y-4">
                          <h4 className="font-medium text-sm flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Typing Settings
                          </h4>

                          {/* Caret Style */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-1">
                              <Label className="text-xs text-muted-foreground">Caret Style</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground">
                                    <HelpCircle className="w-3 h-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-[180px]">
                                  <p className="text-xs">Choose cursor style: thin line, solid block, or underline</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="flex gap-1">
                              {(["line", "block", "underline"] as const).map((style) => (
                                <Tooltip key={style}>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => setCaretStyle(style)}
                                      className={`flex-1 py-1.5 px-2 text-xs rounded-md border transition-colors ${caretStyle === style
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-muted/50 border-border hover:bg-muted"
                                        }`}
                                      data-testid={`button-caret-${style}`}
                                    >
                                      {style.charAt(0).toUpperCase() + style.slice(1)}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">
                                      {style === "line" && "Thin vertical line cursor"}
                                      {style === "block" && "Solid block cursor like terminals"}
                                      {style === "underline" && "Underline cursor style"}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          </div>

                          {/* Toggles */}
                          <div className="space-y-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-between cursor-help">
                                  <Label htmlFor="smooth-caret" className="text-xs flex items-center gap-2 cursor-pointer">
                                    <Eye className="w-3.5 h-3.5" />
                                    Smooth Caret
                                  </Label>
                                  <Switch
                                    id="smooth-caret"
                                    checked={smoothCaret}
                                    onCheckedChange={setSmoothCaret}
                                    data-testid="switch-smooth-caret"
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                <p className="text-xs">Smooth glowing animation instead of blinking</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-between cursor-help">
                                  <Label htmlFor="line-numbers" className="text-xs flex items-center gap-2 cursor-pointer">
                                    <Code className="w-3.5 h-3.5" />
                                    Line Numbers
                                  </Label>
                                  <Switch
                                    id="line-numbers"
                                    checked={showLineNumbers}
                                    onCheckedChange={setShowLineNumbers}
                                    data-testid="switch-line-numbers"
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                <p className="text-xs">Show line numbers in the code gutter</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-between cursor-help">
                                  <Label htmlFor="indent-guides" className="text-xs flex items-center gap-2 cursor-pointer">
                                    <Code className="w-3.5 h-3.5" />
                                    Indent Guides
                                  </Label>
                                  <Switch
                                    id="indent-guides"
                                    checked={showIndentGuides}
                                    onCheckedChange={setShowIndentGuides}
                                    data-testid="switch-indent-guides"
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                <p className="text-xs">Vertical lines showing indentation levels</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-between cursor-help">
                                  <Label htmlFor="focus-mode" className="text-xs flex items-center gap-2 cursor-pointer">
                                    {focusMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    Focus Mode
                                  </Label>
                                  <Switch
                                    id="focus-mode"
                                    checked={focusMode}
                                    onCheckedChange={setFocusMode}
                                    data-testid="switch-focus-mode"
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                <p className="text-xs">Dim untyped code for better concentration</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-between cursor-help">
                                  <Label htmlFor="sound-enabled" className="text-xs flex items-center gap-2 cursor-pointer">
                                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                                    Typing Sounds
                                  </Label>
                                  <Switch
                                    id="sound-enabled"
                                    checked={soundEnabled}
                                    onCheckedChange={(enabled) => {
                                      setSoundEnabled(enabled);
                                      keyboardSound.setEnabled(enabled);
                                      if (enabled) keyboardSound.play();
                                    }}
                                    data-testid="switch-sound"
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                <p className="text-xs">Play keyboard sounds while typing</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>

                          <p className="text-[10px] text-muted-foreground/60 text-center">
                            Sound type can be changed in global Settings
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  <div className="mt-2 p-2 bg-card/50 rounded-lg border border-border/50 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Sparkles className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-primary shrink-0" />
                      <input
                        type="text"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && customPrompt.trim()) {
                            toast({
                              title: "Generating...",
                              description: `Creating ${customPrompt} code`,
                            });
                            fetchCodeSnippet(true);
                            setShowCustomAI(false);
                            setCustomPrompt("");
                          }
                          if (e.key === "Escape") {
                            setShowCustomAI(false);
                            setCustomPrompt("");
                          }
                        }}
                        placeholder="What code do you want?"
                        className="flex-1 h-8 px-2 sm:px-3 text-xs sm:text-sm bg-background border border-border/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                        disabled={isActive}
                        autoFocus
                        data-testid="input-custom-prompt"
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (!customPrompt.trim()) {
                                toast({
                                  title: "Enter a prompt",
                                  description: "Type what code you want, e.g., 'React hooks' or 'sorting algorithm'",
                                });
                                return;
                              }
                              toast({
                                title: "Generating...",
                                description: `Creating ${customPrompt} code`,
                              });
                              fetchCodeSnippet(true);
                              setShowCustomAI(false);
                              setCustomPrompt("");
                            }}
                            disabled={isLoading}
                            className="h-8 px-3 shrink-0"
                            data-testid="button-generate-custom"
                          >
                            {isLoading ? (
                              <div className="w-3.5 h-3.5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                            ) : (
                              <Zap className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Generate code with AI (Enter)</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => {
                              setShowCustomAI(false);
                              setCustomPrompt("");
                            }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            data-testid="button-close-custom-ai"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Close (Esc)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5 mt-2 flex-wrap">
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground/60 mr-0.5 sm:mr-1">Quick:</span>
                      {[
                        { label: "Hooks", tip: "React useState, useEffect patterns" },
                        { label: "API", tip: "REST API calls and fetch examples" },
                        { label: "Sort", tip: "Sorting algorithms (bubble, quick, merge)" },
                        { label: "Class", tip: "Object-oriented class definitions" },
                        { label: "Async", tip: "Async/await and Promise patterns" }
                      ].map(({ label, tip }) => (
                        <Tooltip key={label}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => {
                                setCustomPrompt(label);
                                setTimeout(() => {
                                  fetchCodeSnippet(true);
                                  setShowCustomAI(false);
                                }, 50);
                              }}
                              disabled={isLoading}
                              className="px-2 py-0.5 text-[10px] bg-background hover:bg-primary/10 border border-border/40 hover:border-primary/40 rounded transition-all text-muted-foreground hover:text-foreground disabled:opacity-50"
                              data-testid={`suggestion-${label.toLowerCase()}`}
                            >
                              {label}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{tip}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {mode === "custom" && !codeSnippet && (
              <div className="mt-4 space-y-3">
                {/* Header with help and file upload */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Paste Your Code:</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Custom code help">
                          <HelpCircle className="w-3 h-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[280px]">
                        <p className="font-medium mb-1">Custom Code Practice</p>
                        <p className="text-xs text-muted-foreground mb-2">Paste any code snippet you want to practice typing. Works with any programming language.</p>
                        <div className="text-[10px] text-muted-foreground/70 space-y-0.5">
                          <p>• Min: {CUSTOM_CODE_LIMITS.MIN_LENGTH} characters</p>
                          <p>• Max: {(CUSTOM_CODE_LIMITS.MAX_LENGTH / 1000).toFixed(0)}KB / {CUSTOM_CODE_LIMITS.MAX_LINES} lines</p>
                          <p>• Supports file upload (.js, .py, .java, etc.)</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* File Upload Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-muted/50 hover:bg-muted border border-border/50 hover:border-primary/30 rounded-md transition-all">
                          <Upload className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Upload File</span>
                          <input
                            type="file"
                            accept=".js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.cs,.go,.rs,.rb,.php,.html,.css,.scss,.sql,.sh,.bash,.json,.yaml,.yml,.xml,.md,.txt"
                            onChange={handleFileUpload}
                            className="hidden"
                            data-testid="input-file-upload"
                          />
                        </label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Upload a code file (max 100KB)</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    {/* Clear Button - only show if there's content */}
                    {customCode.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={clearCustomCode}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive bg-muted/30 hover:bg-destructive/10 border border-border/30 hover:border-destructive/30 rounded-md transition-all"
                            data-testid="button-clear-code"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Clear</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Clear all code</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
                
                {/* Textarea with character count */}
                <div className="relative">
                  <textarea
                    value={customCode}
                    onChange={(e) => {
                      // Limit input to max length + some buffer for UX
                      if (e.target.value.length <= CUSTOM_CODE_LIMITS.MAX_LENGTH + 1000) {
                        setCustomCode(e.target.value);
                      }
                    }}
                    className={`w-full h-40 sm:h-48 p-3 bg-background border rounded-lg font-mono text-xs sm:text-sm resize-none focus:outline-none focus:ring-2 transition-colors ${
                      customCode.length > CUSTOM_CODE_LIMITS.MAX_LENGTH 
                        ? 'border-destructive focus:ring-destructive/50' 
                        : customCode.length > CUSTOM_CODE_LIMITS.WARN_LENGTH 
                          ? 'border-yellow-500 focus:ring-yellow-500/50' 
                          : 'focus:ring-primary'
                    }`}
                    placeholder="// Paste your code here...&#10;&#10;function example() {&#10;  console.log('Hello, World!');&#10;}&#10;&#10;// Or upload a code file using the button above"
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    data-testid="textarea-custom-code"
                  />
                  
                  {/* Character count and stats overlay */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md border border-border/30">
                    {customCode.length > 0 && (
                      <>
                        <span>{customCode.split('\n').length} lines</span>
                        <span className="text-muted-foreground/50">•</span>
                      </>
                    )}
                    <span className={
                      customCode.length > CUSTOM_CODE_LIMITS.MAX_LENGTH 
                        ? 'text-destructive font-medium' 
                        : customCode.length > CUSTOM_CODE_LIMITS.WARN_LENGTH 
                          ? 'text-yellow-500' 
                          : ''
                    }>
                      {customCode.length.toLocaleString()} / {CUSTOM_CODE_LIMITS.MAX_LENGTH.toLocaleString()}
                    </span>
                  </div>
                </div>
                
                {/* Validation warnings/errors */}
                {customCode.length > 0 && (
                  <>
                    {customCode.length > CUSTOM_CODE_LIMITS.MAX_LENGTH && (
                      <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/30 rounded-md text-xs text-destructive">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Code exceeds maximum limit. Please remove {(customCode.length - CUSTOM_CODE_LIMITS.MAX_LENGTH).toLocaleString()} characters.</span>
                      </div>
                    )}
                    {customCode.length <= CUSTOM_CODE_LIMITS.MAX_LENGTH && customCode.length > CUSTOM_CODE_LIMITS.WARN_LENGTH && (
                      <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-xs text-yellow-600 dark:text-yellow-400">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Large code snippet ({(customCode.length / 1000).toFixed(1)}KB). This may take a while to complete.</span>
                      </div>
                    )}
                    {customCode.trim().length > 0 && customCode.trim().length < CUSTOM_CODE_LIMITS.MIN_LENGTH && (
                      <div className="flex items-center gap-2 p-2 bg-muted/50 border border-border/50 rounded-md text-xs text-muted-foreground">
                        <HelpCircle className="w-4 h-4 shrink-0" />
                        <span>Add at least {CUSTOM_CODE_LIMITS.MIN_LENGTH - customCode.trim().length} more characters to start.</span>
                      </div>
                    )}
                  </>
                )}
                
                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={applyCustomCode} 
                        disabled={customCode.trim().length < CUSTOM_CODE_LIMITS.MIN_LENGTH || customCode.length > CUSTOM_CODE_LIMITS.MAX_LENGTH}
                        className="gap-2"
                        data-testid="button-apply-custom"
                      >
                        <Zap className="w-4 h-4" />
                        Start Typing
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="text-xs">Load your code and begin the typing test</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {customCode.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Ready: {customCode.split('\n').length} lines, {customCode.trim().length.toLocaleString()} chars
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* Show edit button when code is loaded in custom mode */}
            {mode === "custom" && codeSnippet && !isActive && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={editLoadedCode}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/50 border border-border/30 rounded-md transition-all"
                      data-testid="button-edit-code"
                    >
                      <Code className="w-3.5 h-3.5" />
                      Edit Code
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Modify the loaded code snippet</p>
                  </TooltipContent>
                </Tooltip>
                <span className="text-[10px] text-muted-foreground/60">
                  {codeSnippet.split('\n').length} lines • {codeSnippet.length.toLocaleString()} chars
                </span>
              </div>
            )}
          </Card>

          {/* Stats Bar - Monkeytype Style with Tooltips */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4 sm:mb-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <div tabIndex={0} role="group" aria-label="Time statistic" className="focus:outline-none focus:ring-2 focus:ring-primary rounded-lg">
                  <Card className="p-2 sm:p-3 text-center bg-card/50 border-border/50 cursor-help hover:bg-card/70 transition-colors" data-testid="stat-time">
                    <div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 sm:mb-1">
                      {timeLimit > 0 ? "Time Left" : "Time"}
                    </div>
                    <div className={`text-lg sm:text-2xl font-mono font-bold ${timeLimit > 0 && (timeLimit - elapsedTime) <= 10
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
                  <Card className="p-2 sm:p-3 text-center bg-card/50 border-border/50 cursor-help hover:bg-card/70 transition-colors" data-testid="stat-wpm">
                    <div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 sm:mb-1">WPM</div>
                    <div className="text-lg sm:text-2xl font-mono font-bold">
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
                  <Card className="p-2 sm:p-3 text-center bg-card/50 border-border/50 cursor-help hover:bg-card/70 transition-colors" data-testid="stat-raw">
                    <div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 sm:mb-1">Raw</div>
                    <div className="text-lg sm:text-2xl font-mono font-bold">
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
                  <Card className="p-2 sm:p-3 text-center bg-card/50 border-border/50 cursor-help hover:bg-card/70 transition-colors" data-testid="stat-accuracy">
                    <div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 sm:mb-1">Accuracy</div>
                    <div className="text-lg sm:text-2xl font-mono font-bold">
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
                  <Card className="p-2 sm:p-3 text-center bg-card/50 border-border/50 cursor-help hover:bg-card/70 transition-colors" data-testid="stat-consistency">
                    <div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 sm:mb-1">Consistency</div>
                    <div className="text-lg sm:text-2xl font-mono font-bold text-green-500">
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
                  <Card className="p-2 sm:p-3 text-center bg-card/50 border-border/50 cursor-help hover:bg-card/70 transition-colors" data-testid="stat-status">
                    <div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 sm:mb-1">Status</div>
                    <div className={`text-sm sm:text-lg font-mono font-bold ${getStatusColor()}`}>
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
            className={`relative rounded-lg sm:rounded-xl min-h-[200px] sm:min-h-[300px] cursor-text transition-all duration-300 overflow-hidden ${isFocused
              ? "ring-2 ring-primary/30 shadow-lg shadow-primary/5"
              : "ring-1 ring-border/30 hover:ring-border/50"
              }`}
            data-testid="typing-container"
            style={{
              background: 'linear-gradient(180deg, hsl(var(--card)/0.6) 0%, hsl(var(--card)/0.3) 100%)'
            }}
          >
            {/* Code editor header bar */}
            <div className="flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 border-b border-border/20 bg-card/40">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-muted/50">
                  <Terminal className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-primary/70" />
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground/60 font-mono">
                  {PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language}
                  {!isLoading && codeSnippet && (
                    <span className="hidden sm:inline ml-2 text-muted-foreground/40">
                      • {codeSnippet.split('\n').length} lines • {codeSnippet.length} chars
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => resetTest(true)}
                      disabled={isLoading}
                      data-testid="button-reset-header"
                    >
                      Reset
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="text-xs">Reset Test (Esc)</p>
                  </TooltipContent>
                </Tooltip>
                {isActive && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] sm:text-xs text-green-500/80 font-mono">typing</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 sm:p-5">
              {isLoading ? (
                <div className="h-48 sm:h-64 space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="text-xs text-muted-foreground">
                      Generating {PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name} code...
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {[3 / 4, 1 / 2, 5 / 6, 2 / 3, 4 / 5, 1 / 3, 3 / 5].map((w, i) => (
                      <div
                        key={i}
                        className="h-5 bg-gradient-to-r from-muted/40 to-muted/20 rounded-md animate-pulse"
                        style={{ width: `${w * 100}%`, animationDelay: `${i * 0.08}s` }}
                      />
                    ))}
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
                    className="absolute opacity-0 w-0 h-0 top-0 left-0 resize-none"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-testid="input-code-typing"
                    disabled={isFinished || isFailed}
                    aria-label="Code typing input"
                  />

                  {/* Displayed code with highlighting and line numbers */}
                  <div
                    className="font-mono text-[12px] sm:text-[15px] leading-[1.5] sm:leading-[1.65] select-none overflow-y-auto overflow-x-auto max-h-[280px] sm:max-h-[400px] scroll-smooth scrollbar-thin scrollbar-thumb-muted/30 scrollbar-track-transparent"
                    ref={codeDisplayRef}
                    role="textbox"
                    aria-readonly="true"
                    aria-label="Code display area"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(100,100,100,0.3) transparent' }}
                  >
                    {highlightedCode}
                  </div>

                  {/* Progress indicator at bottom */}
                  {isActive && codeSnippet && (
                    <div className="mt-4 pt-3 border-t border-border/10">
                      <div className="flex items-center justify-between text-xs text-muted-foreground/60 mb-1.5">
                        <span>{userInput.length} / {codeSnippet.length} characters</span>
                        <span>{Math.round((userInput.length / codeSnippet.length) * 100)}%</span>
                      </div>
                      <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-150 ease-out"
                          style={{ width: `${Math.min((userInput.length / codeSnippet.length) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Click to start overlay */}
                  {!isActive && !isFinished && userInput.length === 0 && !isFocused && (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px] cursor-text transition-opacity duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        textareaRef.current?.focus();
                      }}
                    >
                      <div className="text-center pointer-events-none px-4">
                        <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-card/95 border border-border shadow-xl mb-2 sm:mb-3">
                          <span className="text-lg sm:text-xl">⌨️</span>
                          <span className="text-sm sm:text-base text-foreground font-medium">Tap to start typing</span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground bg-card/80 px-2 sm:px-3 py-1 rounded-full">
                          {timeLimit === 0 ? "Infinite mode" : `${timeLimit}s time limit`}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : errorState.type ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className={`text-center p-4 rounded-lg ${errorState.type === 'network' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                    errorState.type === 'timeout' ? 'bg-orange-500/10 border border-orange-500/30' :
                      'bg-red-500/10 border border-red-500/30'
                    }`}>
                    <div className={`text-lg font-medium mb-2 ${errorState.type === 'network' ? 'text-yellow-500' :
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
                  <div className="text-muted-foreground">No code available</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchCodeSnippet(true)}
                    disabled={isLoading}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Generate Code
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Progress indicator with keyboard shortcuts */}
          {codeSnippet && !isFinished && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-4 cursor-help">
                    <span className="font-mono">{userInput.length} / {codeSnippet.length}</span>
                    <span className="text-xs">({Math.round((userInput.length / codeSnippet.length) * 100)}% complete)</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p className="font-medium mb-1">Progress</p>
                  <p className="text-xs text-muted-foreground">Characters typed out of total. Keep going!</p>
                </TooltipContent>
              </Tooltip>
              <div className="hidden sm:flex items-center gap-3 text-xs">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 cursor-help">
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border text-muted-foreground">Esc</kbd>
                      <span>restart</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Press Escape to restart the same code</p>
                  </TooltipContent>
                </Tooltip>
                <span className="text-muted-foreground/50">•</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 cursor-help">
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border text-muted-foreground">Tab</kbd>
                      <span>new code</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Press Tab to generate fresh code</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}

          {/* Results Modal - Full Screen Overlay */}
          <AnimatePresence>
            {isFinished && completionDialogOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-2 sm:p-4"
                onClick={() => setCompletionDialogOpen(false)}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="bg-card border border-border p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-2xl max-w-lg w-full relative overflow-hidden max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Animated gradient bar at top */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-cyan-500 animate-gradient" />

                  {/* Close button */}
                  <button
                    onClick={() => setCompletionDialogOpen(false)}
                    className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>

                  <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-center">Test Complete!</h2>
                  <p className="text-center text-muted-foreground text-sm mb-6">
                    {PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language} • {difficulty} difficulty
                  </p>

                  {/* Main Stats - Large WPM and Accuracy */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="flex flex-col items-center p-3 sm:p-4 bg-background/50 rounded-lg sm:rounded-xl">
                      <div className="text-muted-foreground text-[10px] sm:text-sm mb-0.5 sm:mb-1 flex items-center gap-1.5 sm:gap-2">
                        <Zap className="w-3 sm:w-4 h-3 sm:h-4" /> WPM
                      </div>
                      <div className="text-3xl sm:text-5xl font-mono font-bold text-primary">{wpm}</div>
                    </div>
                    <div className="flex flex-col items-center p-3 sm:p-4 bg-background/50 rounded-lg sm:rounded-xl">
                      <div className="text-muted-foreground text-[10px] sm:text-sm mb-0.5 sm:mb-1 flex items-center gap-1.5 sm:gap-2">
                        <Code className="w-3 sm:w-4 h-3 sm:h-4" /> Accuracy
                      </div>
                      <div className={`text-3xl sm:text-5xl font-mono font-bold ${accuracy >= 95 ? 'text-green-500' : accuracy >= 85 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {accuracy}%
                      </div>
                    </div>
                  </div>

                  {/* Secondary Stats */}
                  <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
                    <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
                      <span>Raw WPM</span>
                      <span className="font-mono text-foreground">{rawWpm}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
                      <span>Consistency</span>
                      <span className="font-mono text-foreground">{consistency}%</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
                      <span>Errors</span>
                      <span className={`font-mono ${errors > 0 ? 'text-red-500' : 'text-green-500'}`}>{errors}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
                      <span>Characters</span>
                      <span className="font-mono text-foreground">{userInput.length}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
                      <span>Time</span>
                      <span className="font-mono text-foreground">{formatTime(elapsedTime)}</span>
                    </div>
                  </div>

                  {/* Celebratory Share Prompt */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-pink-500/10 rounded-lg sm:rounded-xl border border-yellow-500/30 text-center"
                  >
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                      <span className="text-xl sm:text-2xl">{getCodePerformanceRating(wpm, accuracy).emoji}</span>
                      <span className="font-bold text-base sm:text-lg">{getCodePerformanceRating(wpm, accuracy).title}!</span>
                      <span className="text-xl sm:text-2xl">{getCodePerformanceRating(wpm, accuracy).emoji}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                      {getCelebratoryMessage(wpm, accuracy)}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setCompletionDialogOpen(false);
                        setShareDialogOpen(true);
                      }}
                      className="group inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-white text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 transition-all"
                      data-testid="button-share-celebration"
                    >
                      <Share2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                      Share Result
                    </motion.button>
                  </motion.div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 sm:gap-3">
                    {user && (
                      <button
                        onClick={() => {
                          setCompletionDialogOpen(false);
                          setShareDialogOpen(true);
                        }}
                        className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-sm sm:text-base font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        data-testid="button-get-certificate"
                      >
                        <Award className="w-4 sm:w-5 h-4 sm:h-5" />
                        Get Certificate
                      </button>
                    )}
                    <div className="flex gap-2 sm:gap-3">
                      <button
                        onClick={() => {
                          setCompletionDialogOpen(false);
                          fetchCodeSnippet(true);
                        }}
                        disabled={isLoading}
                        className="flex-1 py-2.5 sm:py-3 bg-primary text-primary-foreground text-sm sm:text-base font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50"
                        data-testid="button-new-snippet"
                      >
                        <Zap className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                        <span className="hidden xs:inline">New</span> Snippet
                      </button>
                      <button
                        onClick={() => {
                          setCompletionDialogOpen(false);
                          resetTest();
                        }}
                        className="px-4 sm:px-6 py-2.5 sm:py-3 border border-border text-sm sm:text-base rounded-lg hover:bg-accent transition-colors flex items-center justify-center gap-1.5 sm:gap-2"
                        data-testid="button-try-again"
                      >
                        <RotateCcw className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                        Retry
                      </button>
                    </div>
                  </div>

                  {/* Performance Badge */}
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50 text-center">
                    <span
                      className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium"
                      style={{
                        backgroundColor: `${getCodePerformanceRating(wpm, accuracy).color}20`,
                        color: getCodePerformanceRating(wpm, accuracy).color,
                        borderColor: getCodePerformanceRating(wpm, accuracy).color,
                        borderWidth: 1
                      }}
                    >
                      {getCodePerformanceRating(wpm, accuracy).emoji} {getCodePerformanceRating(wpm, accuracy).badge} Tier
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login prompt */}
          {!user && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="p-3 sm:p-4 mt-4 sm:mt-6 bg-primary/5 border-primary/20 cursor-help">
                  <p className="text-center text-xs sm:text-sm">
                    <a href="/login" className="text-primary hover:underline">Sign in</a> to save your results and compete on the leaderboard!
                  </p>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px]">
                <p className="font-medium mb-1">Create Your Profile</p>
                <p className="text-xs text-muted-foreground">Track your progress, earn achievements, and compete with other coders on the global leaderboard.</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Share Dialog with Tabs */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="w-[95vw] max-w-[650px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Share2 className="w-4 sm:w-5 h-4 sm:h-5" />
                Share Your Result
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Share your {PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name} typing achievement!
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="quick" className="w-full">
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 mb-3 sm:mb-4 h-auto">
                <TabsTrigger value="quick" className="text-[10px] sm:text-sm py-1.5 sm:py-2" data-testid="tab-quick-share">Share</TabsTrigger>
                <TabsTrigger value="visual" className="text-[10px] sm:text-sm py-1.5 sm:py-2" data-testid="tab-visual-card">Card</TabsTrigger>
                {user && <TabsTrigger value="certificate" className="text-[10px] sm:text-sm py-1.5 sm:py-2 hidden sm:flex" data-testid="tab-certificate">Certificate</TabsTrigger>}
                <TabsTrigger value="challenge" className="text-[10px] sm:text-sm py-1.5 sm:py-2" data-testid="tab-challenge">Challenge</TabsTrigger>
              </TabsList>

              {/* Quick Share Tab */}
              <TabsContent value="quick" className="space-y-3 sm:space-y-4">
                {/* Pre-composed Share Message Preview */}
                <div className="relative">
                  <div className="absolute -top-2 left-3 px-2 bg-background text-[10px] sm:text-xs font-medium text-muted-foreground">
                    Your Share Message
                  </div>
                  <div className="p-3 sm:p-4 bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-lg sm:rounded-xl border border-primary/20 text-xs sm:text-sm leading-relaxed">
                    <div className="space-y-2">
                      <p className="text-base font-medium">
                        {getCodePerformanceRating(wpm, accuracy).emoji} Code Typing: <span className="text-primary font-bold">{wpm} WPM</span>!
                      </p>
                      <p className="text-muted-foreground">
                        💻 Language: <span className="text-foreground font-semibold">{PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language}</span>
                      </p>
                      <p className="text-muted-foreground">
                        ⚡ Speed: <span className="text-foreground font-semibold">{wpm} Words Per Minute</span>
                      </p>
                      <p className="text-muted-foreground">
                        ✨ Accuracy: <span className="text-foreground font-semibold">{accuracy}%</span>
                      </p>
                      <p className="text-muted-foreground">
                        🏆 Level: <span className="text-yellow-400 font-semibold">{getCodePerformanceRating(wpm, accuracy).title}</span>
                      </p>
                      <p className="text-muted-foreground">
                        🎯 Badge: <span className="text-foreground font-semibold">{getCodePerformanceRating(wpm, accuracy).badge}</span>
                      </p>
                      <p className="text-muted-foreground">
                        📊 Difficulty: <span className="text-foreground font-semibold">{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</span>
                      </p>
                      <p className="text-primary/80 text-xs mt-3 font-medium">
                        Can you code faster? Take the challenge! 🚀
                      </p>
                      <p className="text-xs text-primary mt-2 font-medium">
                        👉 https://typemasterai.com/code-mode
                      </p>
                      <p className="text-xs text-muted-foreground">
                        #CodeTyping #TypeMasterAI #Developer #WPM
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const rating = getCodePerformanceRating(wpm, accuracy);
                      const langName = PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language;
                      const text = `${rating.emoji} Code Typing: ${wpm} WPM!\n\n💻 Language: ${langName}\n⚡ Speed: ${wpm} Words Per Minute\n✨ Accuracy: ${accuracy}%\n🏆 Level: ${rating.title}\n🎯 Badge: ${rating.badge}\n📊 Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}\n\nCan you code faster? Take the challenge! 🚀\n\n👉 https://typemasterai.com/code-mode\n\n#CodeTyping #TypeMasterAI #Developer #WPM`;
                      navigator.clipboard.writeText(text);
                      toast({ title: "Message Copied!", description: "Share message copied to clipboard" });
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 transition-colors"
                    data-testid="button-copy-message"
                  >
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>

                {/* Quick Share Buttons */}
                <div className="space-y-2 sm:space-y-3">
                  <p className="text-[10px] sm:text-xs font-medium text-center text-muted-foreground uppercase tracking-wide">
                    Click to Share
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    <button
                      onClick={() => shareToSocial('twitter')}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/20 transition-all group"
                      data-testid="button-share-twitter"
                    >
                      <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                      <span className="text-xs font-medium">X (Twitter)</span>
                    </button>
                    <button
                      onClick={() => shareToSocial('facebook')}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/25 border border-[#1877F2]/20 transition-all group"
                      data-testid="button-share-facebook"
                    >
                      <Facebook className="w-4 h-4 text-[#1877F2]" />
                      <span className="text-xs font-medium">Facebook</span>
                    </button>
                    <button
                      onClick={() => shareToSocial('linkedin')}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0A66C2]/10 hover:bg-[#0A66C2]/25 border border-[#0A66C2]/20 transition-all group"
                      data-testid="button-share-linkedin"
                    >
                      <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                      <span className="text-xs font-medium">LinkedIn</span>
                    </button>
                    <button
                      onClick={() => shareToSocial('whatsapp')}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/25 border border-[#25D366]/20 transition-all group"
                      data-testid="button-share-whatsapp"
                    >
                      <MessageCircle className="w-4 h-4 text-[#25D366]" />
                      <span className="text-xs font-medium">WhatsApp</span>
                    </button>
                    <button
                      onClick={() => shareToSocial('discord')}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#5865F2]/10 hover:bg-[#5865F2]/25 border border-[#5865F2]/20 transition-all group"
                      data-testid="button-share-discord"
                    >
                      <svg className="w-4 h-4 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                      </svg>
                      <span className="text-xs font-medium">Discord</span>
                    </button>
                    <button
                      onClick={() => shareToSocial('telegram')}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/25 border border-[#0088cc]/20 transition-all group"
                      data-testid="button-share-telegram"
                    >
                      <Send className="w-4 h-4 text-[#0088cc]" />
                      <span className="text-xs font-medium">Telegram</span>
                    </button>
                  </div>
                </div>

                {/* Native Share */}
                {'share' in navigator && (
                  <button
                    onClick={handleNativeShare}
                    className="w-full py-3 bg-gradient-to-r from-primary/10 to-purple-500/10 text-foreground font-medium rounded-xl hover:from-primary/20 hover:to-purple-500/20 transition-all flex items-center justify-center gap-2 border border-primary/20"
                    data-testid="button-native-share"
                  >
                    <Share2 className="w-4 h-4" />
                    More Sharing Options
                  </button>
                )}
              </TabsContent>

              {/* Visual Card Tab */}
              <TabsContent value="visual" className="mt-4">
                <CodeShareCard
                  wpm={wpm}
                  rawWpm={rawWpm}
                  accuracy={accuracy}
                  consistency={consistency}
                  language={language}
                  languageName={PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language}
                  difficulty={difficulty}
                  characters={userInput.length}
                  errors={errors}
                  time={formatTime(elapsedTime)}
                  username={user?.username}
                />
              </TabsContent>

              {/* Certificate Tab - Only for logged in users */}
              {user && (
                <TabsContent value="certificate" className="mt-4">
                  <div className="text-center space-y-2 mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/30 mb-2">
                      <Award className="w-8 h-8 text-yellow-400" />
                    </div>
                    <h3 className="text-lg font-bold">Your Code Typing Certificate</h3>
                    <p className="text-sm text-muted-foreground">
                      A professional certificate showcasing your {PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name} typing skills
                    </p>
                  </div>

                  {/* Certificate Stats Preview */}
                  <div className="p-4 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-purple-500/10 rounded-xl border border-yellow-500/20 mb-4">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Typing Speed</p>
                        <p className="text-2xl font-bold text-primary">{wpm} WPM</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
                        <p className="text-2xl font-bold text-green-400">{accuracy}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Performance</p>
                        <p className="text-sm font-bold text-yellow-400">{getCodePerformanceRating(wpm, accuracy).badge}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Language</p>
                        <p className="text-sm font-bold">{PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name}</p>
                      </div>
                    </div>
                  </div>
                  <CodeCertificate
                    wpm={wpm}
                    rawWpm={rawWpm}
                    accuracy={accuracy}
                    consistency={consistency}
                    language={language}
                    languageName={PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language}
                    difficulty={difficulty}
                    characters={userInput.length}
                    errors={errors}
                    time={formatTime(elapsedTime)}
                    username={user?.username}
                  />
                </TabsContent>
              )}

              {/* Challenge Tab */}
              <TabsContent value="challenge" className="mt-4 space-y-4">
                {/* Challenge Header */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 border-2 border-orange-500/30 mb-2">
                    <Zap className="w-7 h-7 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-bold">Challenge Your Friends!</h3>
                  <p className="text-sm text-muted-foreground">
                    Think you're fast? Challenge your friends to beat your score!
                  </p>
                </div>

                {/* Your Score to Beat */}
                <div className="p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">Score to Beat</span>
                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-medium rounded-full">
                      {getCodePerformanceRating(wpm, accuracy).badge}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">{wpm}</div>
                      <div className="text-xs text-muted-foreground">WPM</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-400">{accuracy}%</div>
                      <div className="text-xs text-muted-foreground">Accuracy</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name}</div>
                      <div className="text-xs text-muted-foreground">Language</div>
                    </div>
                  </div>
                </div>

                {/* Challenge Link */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-center">
                    Share Challenge Link
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={shareUrl || `${window.location.origin}/code-mode?challenge=${wpm}`}
                      readOnly
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      onClick={() => {
                        const url = shareUrl || `${window.location.origin}/code-mode?challenge=${wpm}`;
                        navigator.clipboard.writeText(url);
                        toast({ title: "Challenge Link Copied!", description: "Send it to your friends!" });
                      }}
                      variant="outline"
                      size="icon"
                      data-testid="button-copy-challenge-link"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Challenge Message */}
                <div className="relative">
                  <div className="absolute -top-2 left-3 px-2 bg-background text-xs font-medium text-muted-foreground">
                    Challenge Message
                  </div>
                  <div className="p-4 bg-gradient-to-br from-orange-500/5 to-red-500/5 rounded-xl border border-orange-500/20 text-sm">
                    <p className="mb-2">🔥 <span className="font-bold">I challenge you to beat my score!</span></p>
                    <p className="text-muted-foreground mb-2">
                      I just typed {PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name} code at <span className="text-primary font-bold">{wpm} WPM</span> with {accuracy}% accuracy!
                    </p>
                    <p className="text-muted-foreground">Think you can code faster? Prove it! 💻⚡</p>
                    <p className="text-primary/80 text-xs mt-3">👉 https://typemasterai.com/code-mode</p>
                  </div>
                  <button
                    onClick={() => {
                      const langName = PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language;
                      const text = `🔥 I challenge you to beat my score!\n\nI just typed ${langName} code at ${wpm} WPM with ${accuracy}% accuracy!\n\nThink you can code faster? Prove it! 💻⚡\n\n👉 https://typemasterai.com/code-mode`;
                      navigator.clipboard.writeText(text);
                      toast({ title: "Challenge Copied!", description: "Now send it to your friends!" });
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 transition-colors"
                    data-testid="button-copy-challenge-message"
                  >
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>

                {/* Quick Challenge Share */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const langName = PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language;
                      const text = `🔥 I challenge you! I just typed ${langName} code at ${wpm} WPM with ${accuracy}% accuracy on @TypeMasterAI! Can you beat me? 💻⚡`;
                      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://typemasterai.com/code-mode')}`;
                      window.open(url, '_blank');
                    }}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/20 transition-all"
                    data-testid="button-challenge-twitter"
                  >
                    <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                    <span className="text-sm font-medium">Challenge on X</span>
                  </button>
                  <button
                    onClick={() => {
                      const langName = PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language;
                      const text = `🔥 I challenge you! I just typed ${langName} code at ${wpm} WPM with ${accuracy}% accuracy! Can you beat me? 💻⚡ https://typemasterai.com/code-mode`;
                      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                      window.open(url, '_blank');
                    }}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/25 border border-[#25D366]/20 transition-all"
                    data-testid="button-challenge-whatsapp"
                  >
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                    <span className="text-sm font-medium">Challenge on WhatsApp</span>
                  </button>
                </div>

                {'share' in navigator && (
                  <button
                    onClick={() => {
                      const langName = PROGRAMMING_LANGUAGES[language as keyof typeof PROGRAMMING_LANGUAGES]?.name || language;
                      navigator.share({
                        title: '🔥 Code Typing Challenge!',
                        text: `I challenge you! I just typed ${langName} code at ${wpm} WPM with ${accuracy}% accuracy! Can you beat me? 💻⚡`,
                        url: 'https://typemasterai.com/code-mode'
                      }).catch(() => { });
                    }}
                    className="w-full py-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 text-foreground font-medium rounded-xl hover:from-orange-500/20 hover:to-red-500/20 transition-all flex items-center justify-center gap-2 border border-orange-500/20"
                    data-testid="button-challenge-native"
                  >
                    <Share2 className="w-4 h-4" />
                    More Sharing Options
                  </button>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog for Setting Changes During Active Typing */}
        <AlertDialog open={showChangeConfirm} onOpenChange={setShowChangeConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{changeTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {changeDescription}
                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                  <p className="text-sm text-foreground font-medium flex items-center gap-2">
                    <span className="text-yellow-500">⚠️</span>
                    Warning: Your current progress will be lost
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You have typed {userInput.length} characters. This action will reset the test and you'll need to start over.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowChangeConfirm(false);
                pendingChangeRef.current = null;
                toast({
                  title: "Change Cancelled",
                  description: "Your typing session continues. No changes were made.",
                });
              }}>
                Cancel & Continue Typing
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmChange} className="bg-primary">
                {changeConfirmLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider >
  );
}
