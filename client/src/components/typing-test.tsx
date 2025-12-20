import { useState, useEffect, useRef, useCallback, useMemo, memo, forwardRef, useTransition, useDeferredValue, startTransition } from "react";
import { generateText, calculateWPM, calculateAccuracy } from "@/lib/typing-utils";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Zap, Target, Clock, Globe, BookOpen, Sparkles, Award, Share2, Twitter, Facebook, MessageCircle, Copy, Check, Link2, Linkedin, Mail, Send, AlertCircle, Loader2, HelpCircle, Timer, BarChart3, Eye, EyeOff, PenLine, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import AuthPromptDialog from "@/components/auth-prompt-dialog";
import { SearchableSelect } from "@/components/searchable-select";
import { CertificateGenerator } from "@/components/certificate-generator";
import { ShareCard } from "@/components/share-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader as UIAlertDialogHeader, AlertDialogTitle as UIAlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { KeystrokeTracker } from "@/lib/keystroke-tracker";
import { useAchievementCelebration, type UnlockedAchievement, preWarmAudioContext } from "@/components/achievement-celebration";

type TestMode = 15 | 30 | 45 | 60 | 90 | 120 | 180 | number;

// Unicode-aware grapheme splitter using Intl.Segmenter with a safe fallback
function getGraphemes(str: string): string[] {
  let normalized = str;
  try {
    if (typeof (str as any).normalize === 'function') {
      normalized = str.normalize('NFC');
    }
  } catch { }
  try {
    const AnyIntl: any = Intl as any;
    if (AnyIntl && typeof AnyIntl.Segmenter === 'function') {
      const segmenter = new AnyIntl.Segmenter(undefined, { granularity: 'grapheme' });
      const segments = segmenter.segment(normalized);
      return Array.from(segments, (s: any) => s.segment);
    }
  } catch { }
  // Fallback to code point splitting (handles surrogate pairs but not complex clusters)
  return Array.from(normalized);
}

// Character component with forwardRef for cursor positioning
// Removed memo() to ensure refs stay synchronized with text changes
const CharSpan = forwardRef<HTMLSpanElement, {
  char: string;
  index: number;
  state: 'pending' | 'correct' | 'incorrect';
  typedChar?: string;
}>(({ char, index, state, typedChar }, ref) => {
  const isSpace = char === ' ' || /\s/.test(char);
  const isIncorrectSpace = state === 'incorrect' && isSpace;

  const className = state === 'pending'
    ? "relative inline-block text-muted-foreground/40"
    : state === 'correct'
      ? "relative inline-block text-foreground"
      : isIncorrectSpace
        ? "relative inline-block text-muted-foreground/40 bg-destructive/30 rounded-sm"
        : "relative inline-block text-destructive";

  return (
    <span ref={ref} data-char-index={index} className={className}>
      {char}
    </span>
  );
});
CharSpan.displayName = 'CharSpan';

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  zh: "Chinese",
  hi: "Hindi",
  ru: "Russian",
  ar: "Arabic",
  ko: "Korean",
  mr: "Marathi",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  vi: "Vietnamese",
  tr: "Turkish",
  pl: "Polish",
  nl: "Dutch",
  sv: "Swedish",
  th: "Thai",
  id: "Indonesian",
};

const MODE_NAMES: Record<string, string> = {
  general: "General",
  entertainment: "Entertainment",
  technical: "Technical",
  quotes: "Quotes",
  programming: "Programming",
  news: "News",
  stories: "Stories",
  business: "Business",
};

const TIME_PRESETS = [
  { value: 15, label: "15s" },
  { value: 30, label: "30s" },
  { value: 45, label: "45s" },
  { value: 60, label: "1 min" },
  { value: 90, label: "1.5 min" },
  { value: 120, label: "2 min" },
  { value: 180, label: "3 min" },
];

// Character state interface for Monkeytype-style validation
interface CharState {
  expected: string;
  typed: string | null;
  state: 'pending' | 'correct' | 'incorrect';
}

export default function TypingTest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { celebrateMultiple } = useAchievementCelebration();

  // Toast debouncing to prevent spam - track last toast time per action type
  const lastToastTimeRef = useRef<Record<string, number>>({});
  const showDebouncedToast = useCallback((key: string, title: string, description: string, variant: "default" | "destructive" = "destructive", debounceMs = 2000) => {
    const now = Date.now();
    const lastTime = lastToastTimeRef.current[key] || 0;
    if (now - lastTime > debounceMs) {
      lastToastTimeRef.current[key] = now;
      toast({ title, description, variant });
    }
  }, [toast]);

  const [mode, setMode] = useState<TestMode>(60);
  const [customTime, setCustomTime] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [language, setLanguage] = useState("en");
  const [paragraphMode, setParagraphMode] = useState<string>("general");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [customPrompt, setCustomPrompt] = useState("");
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [text, setText] = useState("");
  const [originalText, setOriginalText] = useState(""); // Store original paragraph for repeating
  const [userInput, setUserInput] = useState("");
  // Monkeytype-style character tracking - persistent state for each character
  const [charStates, setCharStates] = useState<CharState[]>([]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(mode);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [rawWpm, setRawWpm] = useState(0);
  const [consistency, setConsistency] = useState(100);
  const [accuracy, setAccuracy] = useState(100);
  const [errors, setErrors] = useState(0);
  const wpmHistoryRef = useRef<number[]>([]);
  const lastSampleSecondRef = useRef<number>(-1);
  const userInputRef = useRef<string>("");
  const charStatesRef = useRef<CharState[]>([]);
  const freestyleTextRef = useRef<string>("");
  const startTimeRef = useRef<number | null>(null);
  const lastTimeSecondRef = useRef<number>(-1);
  const expectedGRef = useRef<string[]>([]);
  const keyboardLoadedRef = useRef(false);
  const keyboardSoundRef = useRef<{ play: () => void } | null>(null);
  const statsLastUpdateRef = useRef(0);
  const lastCursorUpdateRef = useRef(0);
  const pendingInputValueRef = useRef<string | null>(null);
  const pendingInputRafRef = useRef<number | null>(null);
  const [showChangeConfirm, setShowChangeConfirm] = useState(false);
  const [changeTitle, setChangeTitle] = useState("");
  const [changeDescription, setChangeDescription] = useState("");
  const [changeConfirmLabel, setChangeConfirmLabel] = useState("Change & Reset");
  const pendingChangeRef = useRef<(() => void) | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [testCompletionDate, setTestCompletionDate] = useState<Date>(new Date());
  const [showShareModal, setShowShareModal] = useState(false);
  const [lastResultId, setLastResultId] = useState<number | null>(null);
  const certificateCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSharingCertificate, setIsSharingCertificate] = useState(false);
  const [certificateImageCopied, setCertificateImageCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [smoothCaret, setSmoothCaret] = useState(true);
  const [caretSpeed, setCaretSpeed] = useState<'off' | 'fast' | 'medium' | 'smooth'>('medium');
  const [quickRestart, setQuickRestart] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const [freestyleMode, setFreestyleMode] = useState(false);
  const [freestyleText, setFreestyleText] = useState("");
  const freestyleLastKeystrokeRef = useRef<number>(0);
  const [lastResultSnapshot, setLastResultSnapshot] = useState<{
    wpm: number;
    accuracy: number;
    errors: number;
    characters: number;
    words: number;
    consistency: number;
    freestyle: boolean;
    mode: number;
    completionDate: string; // ISO string to avoid Date serialization issues
    verificationId?: string; // Server-generated certificate verification ID
  } | null>(null);
  const [isTypingFast, setIsTypingFast] = useState(false);
  const lastKeystrokeTimeRef = useRef<number>(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect prefers-reduced-motion for accessibility
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!isActive && !isFinished) {
      setTimeLeft(mode);
    }
  }, [mode, isActive, isFinished]);

  // Guard setting changes while a test is in progress
  const confirmOrRun = useCallback((title: string, description: string, onConfirm: () => void, confirmLabel = "Change & Reset") => {
    const hasTyped = (userInputRef.current?.length ?? 0) > 0;
    const timerStarted = startTimeRef.current !== null && timeLeft < mode;
    const typingInProgress = isActive && !isFinished && (hasTyped || timerStarted);
    if (typingInProgress) {
      pendingChangeRef.current = onConfirm;
      setChangeTitle(title);
      setChangeDescription(description);
      setChangeConfirmLabel(confirmLabel);
      setShowChangeConfirm(true);
    } else {
      onConfirm();
    }
  }, [isActive, isFinished, mode, timeLeft]);

  const handleConfirmChange = useCallback(() => {
    const fn = pendingChangeRef.current;
    setShowChangeConfirm(false);
    pendingChangeRef.current = null;
    if (fn) fn();
  }, []);

  // Sync refs with state for finishTest to avoid recreating callback
  useEffect(() => {
    userInputRef.current = userInput;
  }, [userInput]);

  useEffect(() => {
    charStatesRef.current = charStates;
  }, [charStates]);

  useEffect(() => {
    freestyleTextRef.current = freestyleText;
  }, [freestyleText]);

  useEffect(() => {
    startTimeRef.current = startTime;
  }, [startTime]);

  const [isComposing, setIsComposing] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [paragraphError, setParagraphError] = useState<string | null>(null);
  const [fetchRetryCount, setFetchRetryCount] = useState(0);
  const MAX_RETRY_ATTEMPTS = 3;

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const caretRef = useRef<HTMLDivElement>(null);
  const caretPosRef = useRef({ left: 0, top: 0, height: 40 });
  const keystrokeTrackerRef = useRef<KeystrokeTracker | null>(null);
  const pendingFetchesRef = useRef(0);
  const latestRequestIdRef = useRef(0);
  const appliedRequestIdRef = useRef(0);
  const [trackingEnabled, setTrackingEnabled] = useState(true);

  // PRODUCTION-READY: Capture selection BEFORE it collapses
  const selectionRangeRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  // Track user-initiated scrolling to pause auto-scroll
  const isUserScrollingRef = useRef(false);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Paragraph queue for seamless continuous typing
  interface QueuedParagraph { id: number; content: string; }
  const paragraphQueueRef = useRef<QueuedParagraph[]>([]);
  const usedParagraphIdsRef = useRef<Set<number>>(new Set());
  const isFetchingQueueRef = useRef(false);
  const MIN_QUEUE_SIZE = 3;

  const { data: languagesData, isError: languagesError, isFetching: languagesFetching, refetch: refetchLanguages } = useQuery({
    queryKey: ["languages"],
    queryFn: async () => {
      const response = await fetch("/api/typing/languages");
      if (!response.ok) throw new Error("Failed to fetch languages");
      return response.json();
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  const { data: modesData, isError: modesError, isFetching: modesFetching, refetch: refetchModes } = useQuery({
    queryKey: ["modes"],
    queryFn: async () => {
      const response = await fetch("/api/typing/modes");
      if (!response.ok) throw new Error("Failed to fetch modes");
      return response.json();
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Fast batch fetch for paragraph queue (database only, no AI generation)
  const fillParagraphQueue = useCallback(async () => {
    if (isFetchingQueueRef.current) return;
    if (paragraphQueueRef.current.length >= MIN_QUEUE_SIZE) return;

    isFetchingQueueRef.current = true;
    try {
      const needed = MIN_QUEUE_SIZE - paragraphQueueRef.current.length + 3;
      const url = `/api/typing/paragraphs/batch?language=${language}&mode=${paragraphMode}&difficulty=${difficulty}&count=${needed}&t=${Date.now()}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.paragraphs && data.paragraphs.length > 0) {
          // Filter out already-used paragraphs and add new ones
          const newParagraphs: QueuedParagraph[] = [];
          for (const p of data.paragraphs) {
            if (!usedParagraphIdsRef.current.has(p.id)) {
              newParagraphs.push({ id: p.id, content: p.content });
              usedParagraphIdsRef.current.add(p.id);
            }
          }
          // Atomic update of queue
          paragraphQueueRef.current = [...paragraphQueueRef.current, ...newParagraphs];
        }
      }
    } catch (error) {
      console.error("Queue fetch error:", error);
    } finally {
      isFetchingQueueRef.current = false;
    }
  }, [language, paragraphMode, difficulty]);

  // Get next paragraph from queue (instant) or fetch if empty
  const getNextFromQueue = useCallback((): string | null => {
    if (paragraphQueueRef.current.length > 0) {
      const next = paragraphQueueRef.current.shift()!;
      // Trigger background refill if queue is getting low
      if (paragraphQueueRef.current.length < MIN_QUEUE_SIZE) {
        fillParagraphQueue();
      }
      return next.content;
    }
    return null;
  }, [fillParagraphQueue]);

  const fetchParagraph = useCallback(async (useCustomPrompt = false, forceGenerate = false) => {
    // Increment request ID and capture it for this fetch
    latestRequestIdRef.current++;
    const currentRequestId = latestRequestIdRef.current;

    // Clear any existing error state when starting a new fetch
    setParagraphError(null);

    // Increment pending fetches counter
    pendingFetchesRef.current++;
    setIsGenerating(true);

    try {
      // Show toast notification for custom prompts or force-generate
      if (useCustomPrompt) {
        toast({
          title: "🤖 Generating Custom Content...",
          description: "AI is creating a paragraph based on your request",
        });
      } else if (forceGenerate) {
        toast({
          title: "🤖 Processing New Paragraph...",
          description: "AI is creating fresh content for you",
        });
      }

      // Try with AI generation enabled - add timestamp to prevent caching
      let url = `/api/typing/paragraph?language=${language}&mode=${paragraphMode}&difficulty=${difficulty}&generate=true&t=${Date.now()}`;

      if (forceGenerate) {
        url += `&forceGenerate=true`;
      }

      if (useCustomPrompt && customPrompt.trim()) {
        url += `&customPrompt=${encodeURIComponent(customPrompt.trim())}`;
      }

      const response = await fetch(url, {
        cache: 'no-store', // Prevent browser caching
      });
      if (!response.ok) {
        throw new Error("Failed to fetch paragraph");
      }
      const data = await response.json();
      const paragraphText = data.paragraph.content;

      // Calculate initial text size - cap at ~500 words for performance
      // The queue system will extend text dynamically as user types
      // IMPORTANT: Skip extension for explicitly generated paragraphs to preserve AI content as-is
      let extendedText = paragraphText;

      if (!forceGenerate) {
        // Only extend text for database-fetched paragraphs, not explicit AI generations
        // This ensures AI-generated paragraphs are used as-is when user clicks "New Paragraph"
        const MAX_INITIAL_WORDS = 500; // ~10 minutes of typing at 50 WPM
        const wordsNeeded = Math.min(Math.ceil((mode / 60) * 50), MAX_INITIAL_WORDS);
        const currentWords = paragraphText.split(/\s+/).length;

        // Build initial text, ensuring we don't exceed the word cap
        if (currentWords < wordsNeeded) {
          const repetitionsNeeded = Math.ceil(wordsNeeded / currentWords);
          extendedText = Array(repetitionsNeeded).fill(paragraphText).join(" ");
        }

        // Strictly enforce word cap by slicing to exact limit
        const words = extendedText.split(/\s+/);
        if (words.length > MAX_INITIAL_WORDS) {
          extendedText = words.slice(0, MAX_INITIAL_WORDS).join(" ");
        }
      }

      // Only update state if this is still the latest request (ignore stale responses)
      if (currentRequestId === latestRequestIdRef.current) {
        setText(extendedText);
        setOriginalText(paragraphText);
        setParagraphError(null);
        setFetchRetryCount(0);
        // Mark this request as successfully applied
        appliedRequestIdRef.current = currentRequestId;
        // Clear isGenerating immediately when latest request applies (don't wait for stale fetches)
        setIsGenerating(false);
        setUserInput(""); // Clean slate for new test
        // Add current paragraph ID to used set to prevent duplicates in queue
        if (data.paragraph.id) {
          usedParagraphIdsRef.current.add(data.paragraph.id);
        }
        // Pre-seed paragraph queue for seamless continuous typing
        if (paragraphQueueRef.current.length < MIN_QUEUE_SIZE) {
          fillParagraphQueue();
        }
      } else {
        // Stale response - silently ignore
        return;
      }

      // Notify user based on context (only for latest request)
      if (data.fallbackUsed) {
        const requestedLang = LANGUAGE_NAMES[language] || language;
        const deliveredLang = LANGUAGE_NAMES[data.paragraph.language] || data.paragraph.language;
        const deliveredMode = MODE_NAMES[data.paragraph.mode] || data.paragraph.mode;

        toast({
          title: "Content adjusted",
          description: `${requestedLang} ${MODE_NAMES[paragraphMode] || paragraphMode} not available. Showing ${deliveredLang} ${deliveredMode} instead.`,
          variant: "default",
        });
      } else if (useCustomPrompt) {
        toast({
          title: "✨ Custom Content Ready!",
          description: "AI created your requested paragraph",
        });
      } else if (forceGenerate) {
        toast({
          title: "✨ New Paragraph Ready!",
          description: `Fresh ${difficulty} difficulty content generated`,
        });
      }
    } catch (error) {
      console.error("Error fetching paragraph:", error);

      // Only update state if this is still the latest request
      if (currentRequestId === latestRequestIdRef.current) {
        const newRetryCount = fetchRetryCount + 1;
        setFetchRetryCount(newRetryCount);

        // Check if we've exceeded max retries
        if (newRetryCount >= MAX_RETRY_ATTEMPTS) {
          // Use fallback text after max retries
          const fallbackText = generateText(100);
          setText(fallbackText);
          setOriginalText(fallbackText);
          setParagraphError(null);
          toast({
            title: "Using practice text",
            description: "Unable to connect to server. Using generated text for practice.",
            variant: "default",
          });
        } else {
          // Show error state with retry option
          setParagraphError("Unable to load typing content. Please check your connection.");
          toast({
            title: "Connection issue",
            description: `Failed to load content (attempt ${newRetryCount}/${MAX_RETRY_ATTEMPTS}). Tap retry or we'll use practice text.`,
            variant: "destructive",
          });
        }

        // Mark this request as successfully applied
        appliedRequestIdRef.current = currentRequestId;
        setIsGenerating(false);
        setUserInput("");
      }
    } finally {
      pendingFetchesRef.current = Math.max(0, pendingFetchesRef.current - 1);
    }
  }, [language, paragraphMode, difficulty, customPrompt, mode, toast, fetchRetryCount]);

  const [pendingResult, setPendingResult] = useState<{ wpm: number; accuracy: number; mode: number; characters: number; errors: number; language: string; freestyle?: boolean } | null>(null);

  const saveResultMutation = useMutation({
    mutationFn: async (result: { wpm: number; accuracy: number; mode: number; characters: number; errors: number; language: string; freestyle?: boolean }) => {
      const response = await fetch("/api/test-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(result),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save test result");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data?.id) {
        setLastResultId(data.id);
      }

      // Update snapshot with server-generated verification ID from auto-created certificate
      if (data?.certificate?.verificationId) {
        setLastResultSnapshot(prev => prev ? {
          ...prev,
          verificationId: data.certificate.verificationId,
        } : null);
      }

      setPendingResult(null);
      toast({
        title: "Test Saved!",
        description: "Your result has been saved to your profile.",
      });

      if (data?.newAchievements && data.newAchievements.length > 0) {
        const categoryIcons: Record<string, string> = {
          speed: "⚡",
          accuracy: "🎯",
          streak: "🔥",
          consistency: "📈",
          special: "⭐",
        };

        const formattedAchievements: UnlockedAchievement[] = data.newAchievements.map((a: any) => ({
          id: a.key,
          name: a.name,
          description: a.description,
          icon: categoryIcons[a.category] || "🏆",
          tier: a.tier as UnlockedAchievement["tier"],
          points: a.points,
          category: a.category,
        }));

        celebrateMultiple(formattedAchievements);
      }

      // Show "Almost There" notifications for near-completion achievements (80%+)
      if (data?.nearCompletionAchievements && data.nearCompletionAchievements.length > 0) {
        const categoryIcons: Record<string, string> = {
          speed: "⚡",
          accuracy: "🎯",
          streak: "🔥",
          consistency: "📈",
          special: "⭐",
        };

        // Show only the top 1-2 closest achievements to avoid notification spam
        const topNearAchievements = data.nearCompletionAchievements.slice(0, 2);

        // Delay near-completion toasts to avoid overlap with celebration modal
        setTimeout(() => {
          topNearAchievements.forEach((achievement: any, index: number) => {
            setTimeout(() => {
              const icon = categoryIcons[achievement.category] || "🎯";
              const remaining = Math.max(0, achievement.targetValue - achievement.currentValue);

              let progressMessage = "";
              if (achievement.category === "speed") {
                progressMessage = remaining > 0
                  ? `Just ${remaining} more WPM to go!`
                  : `${achievement.progress}% there!`;
              } else if (achievement.category === "accuracy") {
                const accuracyRemaining = Math.max(0, achievement.targetValue - achievement.currentValue);
                progressMessage = accuracyRemaining > 0
                  ? `Just ${accuracyRemaining.toFixed(1)}% more accuracy needed!`
                  : `${achievement.progress}% there - keep it accurate!`;
              } else if (achievement.category === "streak") {
                progressMessage = remaining > 0
                  ? `${remaining} more day${remaining !== 1 ? 's' : ''} to unlock!`
                  : `${achievement.progress}% there!`;
              } else if (achievement.category === "consistency") {
                progressMessage = remaining > 0
                  ? `${remaining} more test${remaining !== 1 ? 's' : ''} to go!`
                  : `${achievement.progress}% there!`;
              } else {
                progressMessage = `${achievement.progress}% complete!`;
              }

              toast({
                title: `${icon} Almost There: ${achievement.name}`,
                description: progressMessage,
              });
            }, index * 1500);
          });
        }, data.newAchievements?.length > 0 ? 4000 : 500);
      }
    },
    onError: (error, variables) => {
      setPendingResult(variables);
      toast({
        title: "Save Failed",
        description: "Could not save your test result. Use the retry button below.",
        variant: "destructive",
        action: (
          <button
            onClick={() => saveResultMutation.mutate(variables)}
            className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm"
          >
            Retry
          </button>
        ),
      });
    },
    retry: 1,
  });

  const retryPendingResult = useCallback(() => {
    if (pendingResult) {
      saveResultMutation.mutate(pendingResult);
    }
  }, [pendingResult, saveResultMutation]);

  const resetTest = useCallback(async (forceNewParagraph = false) => {
    setUserInput("");
    setFreestyleText("");
    setStartTime(null);
    startTimeRef.current = null;
    setTimeLeft(mode);
    setIsActive(false);
    setIsFinished(false);
    setWpm(0);
    setRawWpm(0);
    setConsistency(100);
    setAccuracy(100);
    setErrors(0);
    setShowAuthPrompt(false);
    setShowShareModal(false);
    setShareUrl("");
    setLastResultId(null);
    setHasInteracted(false);
    setCursorIndex(0);
    setCharStates([]);

    keystrokeTrackerRef.current = null;
    wpmHistoryRef.current = [];
    lastSampleSecondRef.current = -1;
    freestyleLastKeystrokeRef.current = 0;
    lastKeystrokeTimeRef.current = 0;
    setIsTypingFast(false);

    if (!freestyleMode) {
      if (forceNewParagraph) {
        await fetchParagraph(false, true);
      } else {
        const queuedParagraph = getNextFromQueue();
        if (queuedParagraph) {
          setText(queuedParagraph);
          setOriginalText(queuedParagraph);
        } else {
          await fetchParagraph(false, false);
        }
      }
    }

    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }, [mode, fetchParagraph, freestyleMode, getNextFromQueue]);

  const createShareLink = async () => {
    if (!lastResultId) {
      toast({
        title: "Cannot Share",
        description: "Please save your result first by logging in.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingShare(true);
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mode: 'typing',
          resultId: lastResultId,
          isAnonymous: false
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create share link');
      }

      const data = await response.json();
      setShareUrl(data.shareUrl);
      setShowShareModal(true);

      toast({
        title: "Share Link Created!",
        description: "Your result is ready to share with others.",
      });
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: "Share Failed",
        description: "Could not create share link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingShare(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Share link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  // Cleanup any scheduled rAF on unmount
  useEffect(() => {
    return () => {
      if (pendingInputRafRef.current != null) {
        cancelAnimationFrame(pendingInputRafRef.current);
        pendingInputRafRef.current = null;
        pendingInputValueRef.current = null;
      }
    };
  }, []);

  const getPerformanceRating = () => {
    if (wpm >= 100 && accuracy >= 98) return { emoji: "🏆", title: "Legendary Typist", badge: "Diamond" };
    if (wpm >= 80 && accuracy >= 95) return { emoji: "⚡", title: "Speed Demon", badge: "Platinum" };
    if (wpm >= 60 && accuracy >= 90) return { emoji: "🔥", title: "Fast & Accurate", badge: "Gold" };
    if (wpm >= 40 && accuracy >= 85) return { emoji: "💪", title: "Solid Performance", badge: "Silver" };
    return { emoji: "🎯", title: "Rising Star", badge: "Bronze" };
  };

  const getCertificateCanvas = (): HTMLCanvasElement | null => {
    // Try to get the canvas from the CertificateGenerator component
    const canvasElements = document.querySelectorAll('canvas');
    for (const canvas of canvasElements) {
      // Check if it's the certificate canvas (it has specific dimensions)
      if (canvas.width === 1200 && canvas.height === 800) {
        return canvas as HTMLCanvasElement;
      }
    }
    return null;
  };

  const shareCertificateWithImage = async () => {
    const canvas = getCertificateCanvas();
    if (!canvas) {
      toast({
        title: "Certificate Not Ready",
        description: "Please view your certificate first, then try sharing.",
        variant: "destructive",
      });
      return;
    }

    setIsSharingCertificate(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        }, "image/png");
      });

      const rating = getPerformanceRating();
      const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
      const file = new File([blob], `TypeMasterAI_Certificate_${wpm}WPM.png`, { type: "image/png" });

      if ('share' in navigator && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `My TypeMasterAI Certificate | ${wpm} WPM Achievement`,
          text: `🎓 CERTIFICATE EARNED!\n\n⚡ ${wpm} WPM | ✨ ${accuracy}% Accuracy\n🏆 ${rating.title}\n🎯 ${rating.badge} Badge\n⏱️ ${modeDisplay} test\n\nProve your typing skills! Get certified at typemasterai.com 🚀`,
          files: [file],
        });
        trackShare('certificate_image');
        toast({
          title: "Certificate Shared!",
          description: "Your certificate image has been shared successfully!",
        });
      } else {
        // Fallback: download the certificate
        const link = document.createElement("a");
        link.download = `TypeMasterAI_Certificate_${wpm}WPM.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast({
          title: "Download Started",
          description: "Your browser doesn't support sharing. Certificate downloaded instead.",
        });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast({
          title: "Share Cancelled",
          description: "You can still download your certificate.",
        });
      }
    } finally {
      setIsSharingCertificate(false);
    }
  };

  const copyCertificateToClipboard = async () => {
    const canvas = getCertificateCanvas();
    if (!canvas) {
      toast({
        title: "Certificate Not Ready",
        description: "Please view your certificate first, then try copying.",
        variant: "destructive",
      });
      return;
    }

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        }, "image/png");
      });

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob })
      ]);

      setCertificateImageCopied(true);
      setTimeout(() => setCertificateImageCopied(false), 2000);

      toast({
        title: "Certificate Image Copied!",
        description: "Paste directly into Twitter, Discord, LinkedIn, or any social media!",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Your browser doesn't support image copying. Please download instead.",
        variant: "destructive",
      });
    }
  };

  const trackShare = async (platform: string) => {
    if (!user) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/share/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platform, resultId: lastResultId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        toast({
          title: `+${data.bonusXP} XP Earned!`,
          description: data.totalShares === 1
            ? "First share bonus! Keep sharing to unlock achievements."
            : `Total shares: ${data.totalShares}. Share more to level up!`,
        });
      } else {
        console.warn(`Share tracking failed: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Share tracking timed out');
      } else {
        console.error('Share tracking error:', error);
      }
    }
  };

  const shareToSocial = (platform: string) => {
    const rating = getPerformanceRating();
    const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
    const siteUrl = "https://typemasterai.com";

    const shareTexts: Record<string, string> = {
      twitter: `${rating.emoji} Just hit ${wpm} WPM with ${accuracy}% accuracy! ${rating.badge} Badge unlocked 🎯

Can you beat this?

#TypeMasterAI #TypingSpeed`,

      facebook: `${rating.emoji} Just crushed my typing test!

I hit ${wpm} WPM with ${accuracy}% accuracy on TypeMasterAI! This feels amazing! 🎯

✨ What I unlocked:
• ${rating.title} performance level
• ${rating.badge} Badge
• Completed ${modeDisplay} in ${LANGUAGE_NAMES[language]}

Honestly, I never thought I'd get this fast. If you've ever wondered how quick you type, this is your sign to test yourself!

Think you can beat my score? I dare you to try! 😏🚀`,

      linkedin: `Achieved ${wpm} WPM | ${accuracy}% Accuracy

Just completed a typing assessment on TypeMasterAI that highlights the importance of efficient communication skills in today's digital workspace.

Results:
▸ Typing Speed: ${wpm} Words Per Minute
▸ Accuracy Rate: ${accuracy}%
▸ Performance Level: ${rating.title} (${rating.badge})
▸ Assessment Duration: ${modeDisplay}
▸ Language: ${LANGUAGE_NAMES[language]}

In our fast-paced work environment, typing efficiency directly impacts productivity. Small improvements in foundational skills like typing can compound into significant time savings.

What's your typing speed? Worth measuring!

#ProfessionalDevelopment #Productivity`,

      whatsapp: `${rating.emoji} *TypeMasterAI Result*

⚡ *${wpm} WPM* | ✨ *${accuracy}% Accurate*
🏆 ${rating.title}
🎯 ${rating.badge} Badge
⏱️ ${modeDisplay} test

Think you can beat this? 😏
Test yourself: `,
    };

    const shareText = shareTexts[platform] || shareTexts.twitter;
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(siteUrl);
    const whatsappText = `*TypeMasterAI Result*\n\nSpeed: *${wpm} WPM*\nAccuracy: *${accuracy}%*\nPerformance: ${rating.title}\nBadge: ${rating.badge}\nDuration: ${modeDisplay} test\n\nTry it: ${siteUrl}`;

    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(whatsappText)}`,
    };

    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
      trackShare(platform);
    }
  };

  const handleNativeShare = async () => {
    const rating = getPerformanceRating();
    const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
    const shareText = `${rating.emoji} Just hit ${wpm} WPM with ${accuracy}% accuracy! ${rating.badge} Badge unlocked 🎯\n\nCan you beat this?`;
    const shareUrl = 'https://typemasterai.com';

    if ('share' in navigator && typeof navigator.canShare === 'function') {
      try {
        await navigator.share({
          title: 'TypeMasterAI - My Typing Result',
          text: shareText,
          url: shareUrl,
        });
        trackShare('native');
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            return;
          }
          if (error.name === 'NotAllowedError') {
            toast({
              title: "Share Blocked",
              description: "Browser denied share request. Try copying the link instead.",
              variant: "default",
            });
            return;
          }
        }
        copyToClipboardFallback(`${shareText}\n${shareUrl}`);
      }
    } else {
      copyToClipboardFallback(`${shareText}\n${shareUrl}`);
    }
  };

  const copyToClipboardFallback = async (text: string) => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        toast({
          title: "Copied!",
          description: "Text copied to clipboard. Paste to share!",
        });
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (success) {
          toast({
            title: "Copied!",
            description: "Text copied to clipboard. Paste to share!",
          });
        } else {
          toast({
            title: "Copy Failed",
            description: "Please manually select and copy the text.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const finishTest = useCallback((completedNaturally = true) => {
    setIsActive(false);
    setIsFinished(true);
    setTestCompletionDate(new Date());

    let elapsedSeconds: number;

    if (completedNaturally) {
      elapsedSeconds = mode;
    } else if (freestyleMode && startTimeRef.current && freestyleLastKeystrokeRef.current > 0) {
      elapsedSeconds = (freestyleLastKeystrokeRef.current - startTimeRef.current) / 1000;
    } else {
      elapsedSeconds = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : mode;
    }

    const typedText = freestyleMode ? freestyleTextRef.current : userInputRef.current;
    const chars = getGraphemes(typedText).length;

    const wordCount = freestyleMode
      ? typedText.trim().split(/\s+/).filter(w => w.length > 0).length
      : Math.floor(chars / 5);

    if (chars === 0) {
      setWpm(0);
      setRawWpm(0);
      setAccuracy(freestyleMode ? 100 : 0);
      setErrors(0);

      if (freestyleMode) {
        toast({
          title: "No Text Typed",
          description: "You didn't type anything during the test. Try again!",
          variant: "default",
        });
      }
      return;
    }

    let errorCount = 0;
    let correctChars = chars;

    if (!freestyleMode) {
      errorCount = charStatesRef.current.slice(0, chars).filter((s) => s?.state === 'incorrect').length;
      correctChars = chars - errorCount;
    }

    const safeElapsedSeconds = Math.max(elapsedSeconds, 1);

    const rawFinalWpm = calculateWPM(correctChars, safeElapsedSeconds);
    const finalWpm = Math.min(Math.max(rawFinalWpm, 0), 300);
    const finalAccuracy = freestyleMode ? 100 : calculateAccuracy(correctChars, chars);
    const finalErrors = errorCount;

    let finalConsistency = 100;
    if (wpmHistoryRef.current.length >= 3) {
      const avg = wpmHistoryRef.current.reduce((a, b) => a + b, 0) / wpmHistoryRef.current.length;
      const variance = wpmHistoryRef.current.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / wpmHistoryRef.current.length;
      const stdDev = Math.sqrt(variance);
      finalConsistency = avg > 0 ? Math.max(0, Math.min(100, Math.round(100 - (stdDev / avg * 100)))) : 100;
    }

    setWpm(finalWpm);
    setAccuracy(finalAccuracy);
    setErrors(finalErrors);
    setConsistency(finalConsistency);

    setLastResultSnapshot({
      wpm: finalWpm,
      accuracy: finalAccuracy,
      errors: finalErrors,
      characters: chars,
      words: wordCount,
      consistency: finalConsistency,
      freestyle: freestyleMode,
      mode,
      completionDate: new Date().toISOString(),
    });

    try {
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#00FFFF', '#FF00FF']
        });
      }
    } catch (error) {
      console.warn('Confetti animation failed:', error);
    }

    if (user) {
      const testData = {
        wpm: finalWpm,
        accuracy: finalAccuracy,
        mode,
        characters: chars,
        errors: finalErrors,
        freestyle: freestyleMode,
        language: language,
      };

      saveResultMutation.mutate(testData);

      if (!freestyleMode && trackingEnabled && keystrokeTrackerRef.current) {
        try {
          const rawWpm = calculateWPM(chars, elapsedSeconds);
          const analytics = keystrokeTrackerRef.current.computeAnalytics(
            finalWpm,
            rawWpm,
            finalAccuracy,
            finalErrors,
            null
          );

          fetch('/api/analytics/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              analytics,
              keystrokeEvents: keystrokeTrackerRef.current.getEvents(),
            }),
          }).catch(err => console.error('Failed to save keystroke analytics:', err));
        } catch (error) {
          console.error('Error computing keystroke analytics:', error);
        }
      }
    } else {
      setShowAuthPrompt(true);
    }
  }, [user, saveResultMutation, mode, freestyleMode, toast, language, trackingEnabled]);

  // Initialize character states when text changes (Monkeytype-style validation)
  useEffect(() => {
    if (text) {
      setCharStates(prevStates => {
        const newG = getGraphemes(text);
        expectedGRef.current = newG;
        const prevLength = prevStates.length;

        // Text extended during test (continuous typing) - preserve existing states
        if (newG.length > prevLength && prevLength > 0) {
          // Keep all existing character states (including errors!)
          // Only append new pending states for the new characters
          const appendedStates: CharState[] = newG.slice(prevLength).map((char: string) => ({
            expected: char,
            typed: null,
            state: 'pending' as const
          }));
          return [...prevStates, ...appendedStates];
        } else {
          // New paragraph or reset - replace all states
          const initialStates: CharState[] = newG.map((char: string) => ({
            expected: char,
            typed: null,
            state: 'pending' as const
          }));
          // Only reset cursor on full replacement, not extension
          setCursorIndex(0);
          return initialStates;
        }
      });
    }
  }, [text]);

  useEffect(() => {
    fetchParagraph();
    setUserInput("");
    setOriginalText("");
    setStartTime(null);
    startTimeRef.current = null;
    setTimeLeft(mode);
    setIsActive(false);
    setIsFinished(false);
    setWpm(0);
    setRawWpm(0);
    setConsistency(100);
    setAccuracy(100);
    setErrors(0);
    keystrokeTrackerRef.current = null;
    wpmHistoryRef.current = [];
    lastSampleSecondRef.current = -1;
    paragraphQueueRef.current = [];
    usedParagraphIdsRef.current = new Set();
    setCursorIndex(0);
    lastKeystrokeTimeRef.current = 0;
    setIsTypingFast(false);
    freestyleLastKeystrokeRef.current = 0;

    const focusTimer = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
    return () => clearTimeout(focusTimer);
  }, [mode]);

  useEffect(() => {
    if (text) {
      fetchParagraph();
      setUserInput("");
      setOriginalText("");
      setStartTime(null);
      startTimeRef.current = null;
      setIsActive(false);
      setIsFinished(false);
      setWpm(0);
      setRawWpm(0);
      setConsistency(100);
      setAccuracy(100);
      setErrors(0);
      keystrokeTrackerRef.current = null;
      wpmHistoryRef.current = [];
      lastSampleSecondRef.current = -1;
      paragraphQueueRef.current = [];
      usedParagraphIdsRef.current = new Set();
      setCursorIndex(0);
      lastKeystrokeTimeRef.current = 0;
      setIsTypingFast(false);
      freestyleLastKeystrokeRef.current = 0;
    }
  }, [language, paragraphMode, difficulty]);

  useEffect(() => {
    // Animation-frame based timer tied to startTime; only update when the displayed second changes
    if (!isActive || isFinished) return;

    let rafId: number;
    const tick = () => {
      const st = startTimeRef.current;
      if (st) {
        const elapsedSec = Math.floor((Date.now() - st) / 1000);
        const remaining = Math.max(0, mode - elapsedSec);
        if (lastTimeSecondRef.current !== remaining) {
          lastTimeSecondRef.current = remaining;
          setTimeLeft(remaining);
          if (remaining <= 0) {
            finishTest();
            return; // stop loop
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    // Initialize
    lastTimeSecondRef.current = -1;
    tick();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isActive, isFinished, mode, finishTest]);

  // Calculate live stats with Raw WPM and Consistency tracking
  useEffect(() => {
    if (isActive && startTime) {
      // Throttle heavy stats work to ~12 FPS to avoid UI stalls during extreme bursts
      const nowMs = Date.now();
      if (nowMs - statsLastUpdateRef.current < 80) return;
      statsLastUpdateRef.current = nowMs;
      const chars = getGraphemes(userInput).length;
      // Use persistent charStates for correctness to avoid drift with backspaces
      const errorCount = charStates.slice(0, chars).filter((s: CharState) => s?.state === 'incorrect').length;
      const correctChars = chars - errorCount;
      const timeElapsed = (Date.now() - startTime) / 1000;

      // Net WPM (adjusted for errors) - standard metric
      const netWpm = calculateWPM(correctChars, timeElapsed);
      // Raw WPM (pure speed, no error penalty)
      const rawWpmValue = calculateWPM(chars, timeElapsed);

      setWpm(netWpm);
      setRawWpm(rawWpmValue);
      setAccuracy(calculateAccuracy(correctChars, chars));
      setErrors(errorCount);

      // Track WPM history for consistency calculation (sample once per second)
      const currentSecond = Math.floor(timeElapsed);
      if (currentSecond > 0 && currentSecond !== lastSampleSecondRef.current) {
        lastSampleSecondRef.current = currentSecond;
        wpmHistoryRef.current.push(netWpm);

        // Calculate consistency (lower standard deviation = higher consistency)
        if (wpmHistoryRef.current.length >= 3) {
          const avg = wpmHistoryRef.current.reduce((a: number, b: number) => a + b, 0) / wpmHistoryRef.current.length;
          const variance = wpmHistoryRef.current.reduce((sum: number, val: number) => sum + Math.pow(val - avg, 2), 0) / wpmHistoryRef.current.length;
          const stdDev = Math.sqrt(variance);
          // Coefficient of Variation (CV) converted to consistency percentage
          // Lower CV = higher consistency. Formula: 100 - (CV * 100)
          const consistencyScore = avg > 0 ? Math.max(0, Math.min(100, Math.round(100 - (stdDev / avg * 100)))) : 100;
          setConsistency(consistencyScore);
        }
      }

      // Adaptive cursor: detect fast typing (>80 WPM or <150ms between keystrokes)
      const now = Date.now();
      if (lastKeystrokeTimeRef.current > 0) {
        const timeSinceLastKeystroke = now - lastKeystrokeTimeRef.current;
        setIsTypingFast(timeSinceLastKeystroke < 150 || rawWpmValue > 80);
      }
      lastKeystrokeTimeRef.current = now;
    }
  }, [userInput, isActive, startTime, text, charStates]);

  const processInput = (value: string) => {
    if (isFinished) {
      return;
    }
    if (!text) {
      showDebouncedToast('no-text', 'No Text Available', 'Waiting for paragraph to load...');
      return;
    }
    if (typeof value !== 'string') return;

    const typedG = getGraphemes(value);
    const expectedG = expectedGRef.current.length ? expectedGRef.current : getGraphemes(text);

    if (typedG.length > expectedG.length) {
      if (inputRef.current) inputRef.current.value = userInput;
      return;
    }

    const previousLength = getGraphemes(userInput).length;
    const now = Date.now();
    const isForwardTyping = typedG.length > previousLength;

    // Track typing speed to disable smooth animation during fast typing
    if (isForwardTyping) {
      const timeSinceLastKeystroke = now - lastKeystrokeTimeRef.current;
      lastKeystrokeTimeRef.current = now;

      if (timeSinceLastKeystroke < 80 && timeSinceLastKeystroke > 0) {
        setIsTypingFast(true);
      } else {
        setIsTypingFast(false);
      }

      // Play keyboard sound (load once, then reuse to avoid micro-stalls)
      if (!keyboardLoadedRef.current) {
        keyboardLoadedRef.current = true;
        import('@/lib/keyboard-sounds')
          .then((module) => {
            if (module.keyboardSound && typeof module.keyboardSound.play === 'function') {
              keyboardSoundRef.current = module.keyboardSound;
              module.keyboardSound.play();
            }
          })
          .catch((error) => {
            console.warn('Keyboard sound failed to load:', error);
          });
      } else {
        try {
          keyboardSoundRef.current?.play?.();
        } catch { }
      }
    }

    // Start timer on first input (supports IME/composition inserting multiple graphemes)
    if (!isActive && typedG.length > 0) {
      setIsActive(true);
      startTimeRef.current = now; // ensure timer reads immediately
      setStartTime(now);
      preWarmAudioContext();
    }

    const newStates: CharState[] = [];

    for (let i = 0; i < expectedG.length; i++) {
      const expectedChar = expectedG[i];

      if (i < typedG.length) {
        const typedChar = typedG[i];
        const isCorrect = typedChar === expectedChar;

        newStates[i] = {
          expected: expectedChar,
          typed: typedChar,
          state: isCorrect ? 'correct' : 'incorrect'
        };
      } else {
        newStates[i] = {
          expected: expectedChar,
          typed: '',
          state: 'pending'
        };
      }
    }

    startTransition(() => {
      setCharStates(newStates);
    });
    setCursorIndex(typedG.length);
    setUserInput(value);

    if (!freestyleMode && timeLeft > 0 && typedG.length >= expectedG.length - 100 && timeLeft > 5) {
      const nextParagraph = getNextFromQueue();
      if (nextParagraph) {
        setText(prevText => {
          const newText = prevText + " " + nextParagraph;
          if (keystrokeTrackerRef.current) {
            keystrokeTrackerRef.current.expectedText = newText;
          }
          return newText;
        });
      } else if (originalText) {
        setText(prevText => {
          const newText = prevText + " " + originalText;
          if (keystrokeTrackerRef.current) {
            keystrokeTrackerRef.current.expectedText = newText;
          }
          return newText;
        });
      }
    }
  };

  // PRODUCTION-READY INPUT VALIDATION - Block invalid inputs BEFORE they happen
  const handleBeforeInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;
    const nativeEvent = e.nativeEvent as InputEvent;
    if (nativeEvent.inputType === 'insertLineBreak' || (nativeEvent as any).inputType === 'insertParagraph') {
      e.preventDefault();
      showDebouncedToast('line-break', 'Line Breaks Disabled', 'Type continuously without pressing Enter');
      return;
    }

    // Capture selection for anti-cheat detection
    if (inputRef.current) {
      selectionRangeRef.current = {
        start: inputRef.current.selectionStart ?? 0,
        end: inputRef.current.selectionEnd ?? 0
      };
    }

    // Block any selection-based manipulation
    const { start: selectionStart, end: selectionEnd } = selectionRangeRef.current;
    if (selectionStart !== selectionEnd) {
      e.preventDefault();
      toast({
        title: "Selection Disabled",
        description: "Please type character-by-character for accurate results",
        variant: "destructive",
      });
      return;
    }

    if (!text || isFinished) return;

    const currentPosition = getGraphemes(userInput).length;
    const inputData = nativeEvent.data;

    if (nativeEvent.inputType === 'deleteContentBackward') {
      if (currentPosition === 0) {
        e.preventDefault();
        toast({
          title: "Cannot Backspace",
          description: "Already at the beginning",
          variant: "destructive",
        });
        return;
      }
      return;
    }

    if (nativeEvent.inputType === 'deleteContentForward') {
      e.preventDefault();
      showDebouncedToast('delete-forward', 'Forward Delete Disabled', 'Use Backspace to correct mistakes');
      return;
    }

    // Handle character input: allow any character to be entered so errors can be marked red and typing can continue
    if (inputData && inputData.length > 0) {
      const expectedG = getGraphemes(text);
      const expectedChar = expectedG[currentPosition];
      if (!expectedChar) {
        // Already at end of text - block to prevent overflow beyond available text
        e.preventDefault();
        showDebouncedToast('text-overflow', 'End of Text Reached', 'You\'ve typed all available characters');
        return;
      }
      // Do not block spaces or advance-on-error; we intentionally allow typing ahead
      // Validation and error marking is handled in processInput
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;
    const value = e.target.value;
    if (typeof value !== 'string') return;

    // Coalesce rapid key repeats (e.g., holding a key) into a single rAF tick
    pendingInputValueRef.current = value;
    if (pendingInputRafRef.current == null) {
      pendingInputRafRef.current = requestAnimationFrame(() => {
        const v = pendingInputValueRef.current ?? '';
        pendingInputValueRef.current = null;
        pendingInputRafRef.current = null;
        processInput(v);
        if (inputRef.current && v.length >= 0) {
          const cursorPos = Math.min(v.length, v.length);
          inputRef.current.setSelectionRange(cursorPos, cursorPos);
        }
      });
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    if (isFinished || !text) return;

    if (e.data && inputRef.current && typeof e.data === 'string') {
      const composedGraphemes = getGraphemes(e.data);
      const currentGraphemes = getGraphemes(userInput);
      const expectedGraphemes = getGraphemes(text);

      if (currentGraphemes.length + composedGraphemes.length > expectedGraphemes.length) {
        return;
      }

      const newValue = userInput + e.data;
      inputRef.current.value = newValue;

      requestAnimationFrame(() => {
        processInput(newValue);
        if (inputRef.current) {
          const cursorPos = newValue.length;
          inputRef.current.setSelectionRange(cursorPos, cursorPos);
        }
      });
    }
  };

  // Handle keyboard events with strict validation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // CRITICAL: Skip IME composition events (keyCode 229)
    // Per MDN: compositionstart may fire after keydown, compositionend may fire before keydown
    // keyCode 229 indicates IME is processing - must check even when isComposing is false
    if (e.nativeEvent.isComposing || (e.nativeEvent as any).keyCode === 229) {
      return;
    }

    // Block Ctrl+A (select all) - anti-cheat measure
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      showDebouncedToast('ctrl-a', 'Select All Disabled', 'Type character-by-character for accurate results');
      return;
    }

    // Block other keyboard shortcuts for copying
    if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      const action = e.key.toLowerCase() === 'c' ? 'Copy' : e.key.toLowerCase() === 'x' ? 'Cut' : 'Paste';
      showDebouncedToast('copy-shortcuts', `${action} Disabled`, 'Type manually for accurate results');
      return;
    }

    // STRICT VALIDATION: Block arrow keys (prevent cursor manipulation)
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      showDebouncedToast('arrow-keys', 'Arrow Keys Disabled', 'Use Backspace to correct mistakes, not arrow keys');
      return;
    }

    // STRICT VALIDATION: Block Home, End, PageUp, PageDown (prevent jumping)
    if (['Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
      e.preventDefault();
      showDebouncedToast('navigation-keys', 'Navigation Keys Disabled', 'Type from your current position only');
      return;
    }

    // STRICT VALIDATION: Block Delete key (forward delete not allowed)
    if (e.key === 'Delete') {
      e.preventDefault();
      showDebouncedToast('delete-key', 'Delete Key Disabled', 'Use Backspace to correct mistakes');
      return;
    }

    // Keyboard shortcuts for test control handled by global listener
    // (Tab/Escape handled in useEffect below - don't block them here)

    // Allow Shift+Enter to finish early
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      if (isActive && !isFinished) {
        finishTest();
      }
      return;
    }

    // Capture selection before any key press (for anti-cheat detection)
    if (inputRef.current) {
      selectionRangeRef.current = {
        start: inputRef.current.selectionStart ?? 0,
        end: inputRef.current.selectionEnd ?? 0
      };
    }

    // Robust timer start: start on first valid keydown as well (handles cases where onChange is delayed)
    if (!isActive && !isFinished && text) {
      const isCharacterKey = (e.key && e.key.length === 1) || e.code === 'Space' || e.key === ' ';
      if (isCharacterKey) {
        const nowTs = Date.now();
        startTimeRef.current = nowTs;
        setStartTime(nowTs);
        setIsActive(true);
        preWarmAudioContext();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    toast({
      title: "Paste Disabled",
      description: "Please type manually for accurate results",
      variant: "default",
    });
  };

  const handleCut = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    showDebouncedToast('cut-disabled', 'Cut Disabled', 'Type manually for accurate results');
  };

  // Load typing behavior settings on mount
  useEffect(() => {
    const smoothCaretSetting = localStorage.getItem('smoothCaret');
    const caretSpeedSetting = localStorage.getItem('caretSpeed');
    const quickRestartSetting = localStorage.getItem('quickRestart');
    const zenModeSetting = localStorage.getItem('zenMode');

    if (smoothCaretSetting !== null) {
      setSmoothCaret(smoothCaretSetting === 'true');
    }
    if (caretSpeedSetting !== null && ['off', 'fast', 'medium', 'smooth'].includes(caretSpeedSetting)) {
      setCaretSpeed(caretSpeedSetting as 'off' | 'fast' | 'medium' | 'smooth');
    }
    if (quickRestartSetting !== null) {
      setQuickRestart(quickRestartSetting === 'true');
    }
    if (zenModeSetting !== null) {
      setZenMode(zenModeSetting === 'true');
    }
  }, []);

  // Track if cursor update is from keystroke (for auto-scroll gating)
  const lastCursorIndexRef = useRef(0);

  // Update cursor position based on typing progress and layout changes
  const updateCursorPosition = useCallback((fromKeystroke = false) => {
    // Throttle during very fast typing to avoid layout thrashing
    if (fromKeystroke && isTypingFast) {
      const now = performance.now();
      if (now - lastCursorUpdateRef.current < 32) return; // ~30 FPS cap during bursts
      lastCursorUpdateRef.current = now;
    }

    // Use requestAnimationFrame to ensure DOM has updated before measuring
    requestAnimationFrame(() => {
      const container = containerRef.current;
      const caretEl = caretRef.current;
      if (!container || !caretEl) return;

      // Find the character element at current position using refs
      const targetIndex = lastCursorIndexRef.current;
      let charEl = charRefs.current[targetIndex] || null;

      let left = 0;
      let top = 0;
      let height = 40;
      const rtl = language === 'ar' || language === 'he';

      // Compute using precise geometry relative to the scrollable container
      const containerRect = container.getBoundingClientRect();

      // Fallback when at index 0 but ref not yet populated
      if (!charEl && targetIndex === 0 && charRefs.current[0]) {
        charEl = charRefs.current[0];
      }

      if (!charEl && targetIndex > 0) {
        const prevEl = charRefs.current[targetIndex - 1];
        if (prevEl) {
          const prevRect = prevEl.getBoundingClientRect();
          top = (prevRect.top - containerRect.top);
          left = rtl
            ? (prevRect.left - containerRect.left)
            : (prevRect.right - containerRect.left);
          height = Math.max(1, prevRect.height);
        }
      } else if (charEl) {
        const rect = charEl.getBoundingClientRect();
        top = (rect.top - containerRect.top);
        left = rtl
          ? (rect.right - containerRect.left)
          : (rect.left - containerRect.left);
        height = Math.max(1, rect.height);
      } else {
        // No characters rendered yet
        top = 0;
        left = 0;
        height = 40;
      }

      // Only mutate DOM if changed (rounded to whole pixels for crispness)
      const last = caretPosRef.current;
      const rLeft = Math.round(left);
      const rTop = Math.round(top);
      if (last.left !== rLeft || last.top !== rTop) {
        caretEl.style.transform = `translate3d(${rLeft}px, ${rTop}px, 0)`;
        caretPosRef.current = { left: rLeft, top: rTop, height };
      }
      // Ensure height is up-to-date
      if (parseFloat(caretEl.style.height || '0') !== height) {
        caretEl.style.height = `${height}px`;
      }

      // Auto-scroll using container metrics only when triggered by keystroke and not during manual scroll
      if (fromKeystroke && !isUserScrollingRef.current) {
        const cursorTopRelative = top - container.scrollTop;
        const containerHeight = container.clientHeight;
        const idealCursorPosition = containerHeight * 0.3; // Keep cursor at 30% from top
        if (cursorTopRelative > idealCursorPosition) {
          const delta = cursorTopRelative - idealCursorPosition;
          container.scrollTop = container.scrollTop + delta;
        } else if (cursorTopRelative < 0) {
          container.scrollTop = container.scrollTop + cursorTopRelative - 20; // Small padding at top
        }
      }
    });
  }, [text, language, isTypingFast]);

  // Only update cursor position on keystroke changes (not on every layout change)
  useEffect(() => {
    const cursorIndex = getGraphemes(userInput).length;
    const wasKeystroke = cursorIndex !== lastCursorIndexRef.current;
    lastCursorIndexRef.current = cursorIndex;

    // Pass fromKeystroke=true only when cursor actually moved from typing
    updateCursorPosition(wasKeystroke);
  }, [userInput, updateCursorPosition]);

  // Recalculate cursor position on resize/layout changes (but don't auto-scroll)
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      updateCursorPosition(false); // false = not from keystroke, don't auto-scroll
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [updateCursorPosition]);

  // Re-position caret on window resize and zoom changes
  useEffect(() => {
    const onResize = () => updateCursorPosition(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateCursorPosition]);

  // Position caret when text loads or changes (initial render and paragraph switches)
  useEffect(() => {
    if (!text) return;
    updateCursorPosition(false);
  }, [text, updateCursorPosition]);

  // Apply GPU-accelerated transform transitions to caret and respect motion preferences
  useEffect(() => {
    const el = caretRef.current;
    if (!el) return;
    const duration = (prefersReducedMotion || caretSpeed === 'off' || isTypingFast)
      ? 0
      : (caretSpeed === 'smooth' ? 120 : caretSpeed === 'fast' ? 40 : 80);
    el.style.willChange = 'transform';
    el.style.transition = duration ? `transform ${duration}ms ease-out` : 'none';
  }, [prefersReducedMotion, isTypingFast, caretSpeed]);

  // Initialize keystroke tracker when test is ready (before first keystroke)
  useEffect(() => {
    if (text && trackingEnabled && !isActive) {
      // Create fresh tracker when text loads for new test (not during active test/extension)
      keystrokeTrackerRef.current = new KeystrokeTracker(text);
    }
  }, [text, trackingEnabled, isActive]);

  // Keystroke tracking event handlers
  useEffect(() => {
    if (!trackingEnabled || !keystrokeTrackerRef.current || !inputRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip special keys except space and backspace
      if (e.key.length > 1 && e.key !== 'Backspace' && e.key !== ' ') return;

      const timestamp = Date.now();
      const key = e.key === ' ' ? ' ' : e.key;
      keystrokeTrackerRef.current?.onKeyDown(key, e.code, timestamp);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!keystrokeTrackerRef.current || !inputRef.current) return;

      // Skip special keys except space and backspace
      if (e.key.length > 1 && e.key !== 'Backspace' && e.key !== ' ') return;

      const timestamp = Date.now();
      const key = e.key === ' ' ? ' ' : e.key;

      // For backspace, decrement position and mark as deletion
      if (e.key === 'Backspace') {
        keystrokeTrackerRef.current.currentPosition = Math.max(0, keystrokeTrackerRef.current.currentPosition - 1);
        keystrokeTrackerRef.current.onKeyUp(key, e.code, timestamp, true);
        return;
      }

      // Grapheme-aware expected key and position
      const expectedG = getGraphemes(text);
      const currentPos = keystrokeTrackerRef.current.currentPosition;
      const expectedKey = expectedG[currentPos] || null;
      const isCorrect = key === expectedKey;

      keystrokeTrackerRef.current.onKeyUp(key, e.code, timestamp, isCorrect, expectedKey, currentPos);

      // Always increment position after tracking the keystroke
      keystrokeTrackerRef.current.currentPosition++;
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [trackingEnabled, text]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isTypingInputFocused = activeElement === inputRef.current;

      if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && quickRestart) {
        if (isTypingInputFocused) {
          e.preventDefault();
          resetTest();
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        resetTest();
      }

      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        if (isActive && userInput.length > 0 && !isFinished) {
          finishTest(false);
          toast({
            title: "Test Finished",
            description: "You ended the test early with Shift+Enter.",
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [quickRestart, resetTest, isActive, userInput.length, isFinished, finishTest, toast]);

  // Focus handling - only focus when clicking on the typing area
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't focus if clicking on interactive elements
      if (target.tagName === 'SELECT' || target.tagName === 'OPTION' || target.tagName === 'BUTTON' || target.tagName === 'INPUT') {
        return;
      }
      // Don't focus if clicking inside interactive elements
      if (target.closest('select') || target.closest('button') || target.closest('input')) {
        return;
      }
      inputRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const getCharClass = (index: number) => {
    if (index >= userInput.length) return "text-muted-foreground/40";
    const isCorrect = userInput[index] === text[index];
    return isCorrect ? "text-green-500" : "text-destructive";
  };

  // Memoize the characters array to avoid recreating on every render
  const characters = useMemo(() => {
    // Ensure charRefs array length matches text length to prevent stale refs
    const g = getGraphemes(text);
    charRefs.current.length = g.length;
    return g;
  }, [text]);

  const availableLanguages = languagesData?.languages || ["en"];
  const availableModes = modesData?.modes || ["general"];

  // RTL languages that need right-to-left direction
  const rtlLanguages = ["ar", "he"];
  const isRTL = rtlLanguages.includes(language);

  // Format time display (e.g., 60s → 1:00, 90s → 1:30)
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-4 md:gap-8 px-2 sm:px-0">
        {/* API Error Banner - only show when there's an error and not currently fetching */}
        {((languagesError && !languagesFetching) || (modesError && !modesFetching)) && (
          <div className="flex items-center justify-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>Some options may be limited. </span>
            <button
              onClick={() => {
                if (languagesError && !languagesFetching) refetchLanguages();
                if (modesError && !modesFetching) refetchModes();
              }}
              className="underline hover:no-underline"
              disabled={languagesFetching || modesFetching}
            >
              {languagesFetching || modesFetching ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        )}

        {/* Language & Mode Selectors */}
        <div className="flex flex-col gap-3 md:gap-4 transition-opacity duration-300">
          <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <SearchableSelect
                      value={language}
                      onValueChange={(val) => {
                        const newVal = val as string;
                        if (newVal === language) return;
                        confirmOrRun(
                          "Change Language?",
                          "Switching language will reset your current test and load language-specific content.",
                          () => setLanguage(newVal)
                        );
                      }}
                      options={availableLanguages.map((lang: string) => ({
                        value: lang,
                        label: LANGUAGE_NAMES[lang] || lang,
                      }))}
                      placeholder="Select language"
                      searchPlaceholder="Search languages..."
                      emptyText="No language found."
                      icon={<Globe className="w-4 h-4" />}
                    />
                    {languagesError && !languagesFetching && !languagesData && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive" title="Failed to load languages" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-popover text-popover-foreground border shadow-lg p-3">
                  <p className="font-medium mb-1">Language Selection</p>
                  <p className="text-xs opacity-80">Practice typing in your preferred language. Supports 23+ languages including English, Spanish, Hindi, Japanese, Arabic, and more. Great for learning new languages!</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors" aria-label="Language help">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px]">
                  <p className="font-medium mb-1">Typing Language</p>
                  <p className="text-xs text-muted-foreground">Select from 23+ languages with native script support. Perfect for practicing multilingual typing or learning new languages through muscle memory!</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <SearchableSelect
                      value={paragraphMode}
                      onValueChange={(val) => {
                        const newVal = val as string;
                        if (newVal === paragraphMode) return;
                        confirmOrRun(
                          "Change Topic?",
                          "Switching content topic will reset the current test and fetch new paragraphs.",
                          () => setParagraphMode(newVal)
                        );
                      }}
                      options={availableModes.map((m: string) => ({
                        value: m,
                        label: MODE_NAMES[m] || m,
                      }))}
                      placeholder="Select mode"
                      searchPlaceholder="Search modes..."
                      emptyText="No mode found."
                      icon={<BookOpen className="w-4 h-4" />}
                    />
                    {modesError && !modesFetching && !modesData && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive" title="Failed to load modes" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-popover text-popover-foreground border shadow-lg p-3">
                  <p className="font-medium mb-1">Paragraph Topic</p>
                  <p className="text-xs opacity-80">Choose what you want to type about. General for everyday text, Programming for code terms, Business for professional vocabulary, News for current events style, and more!</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors" aria-label="Topic help">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px]">
                  <p className="font-medium mb-1">Content Topic</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><span className="text-blue-400">General:</span> Everyday topics and common text</p>
                    <p><span className="text-green-400">Programming:</span> Code-related terminology</p>
                    <p><span className="text-purple-400">Business:</span> Professional vocabulary</p>
                    <p><span className="text-orange-400">News:</span> Current events style</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <SearchableSelect
                      value={difficulty}
                      onValueChange={(val) => {
                        const newVal = val as "easy" | "medium" | "hard";
                        if (newVal === difficulty) return;
                        confirmOrRun(
                          "Change Difficulty?",
                          "Switching difficulty will reset your current test and adjust text complexity.",
                          () => setDifficulty(newVal)
                        );
                      }}
                      options={[
                        { value: "easy", label: "Easy" },
                        { value: "medium", label: "Medium" },
                        { value: "hard", label: "Hard" },
                      ]}
                      placeholder="Select difficulty"
                      searchPlaceholder="Search difficulty..."
                      emptyText="No difficulty found."
                      icon={<Target className="w-4 h-4" />}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-popover text-popover-foreground border shadow-lg p-3">
                  <p className="font-medium mb-2">Difficulty Level</p>
                  <p className="text-xs opacity-90 mb-1"><span className="text-green-400 font-semibold">Easy:</span> Short sentences, common words - perfect for beginners</p>
                  <p className="text-xs opacity-90 mb-1"><span className="text-yellow-400 font-semibold">Medium:</span> Standard paragraphs with varied vocabulary</p>
                  <p className="text-xs opacity-90"><span className="text-orange-400 font-semibold">Hard:</span> Complex sentences, advanced vocabulary, punctuation</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors" aria-label="Difficulty help">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px]">
                  <p className="font-medium mb-1">Text Complexity</p>
                  <p className="text-xs text-muted-foreground">Controls word length, sentence complexity, and punctuation frequency. Start with Easy and gradually increase as your speed improves!</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Time Mode Selector */}
          <div className="flex flex-col gap-2 md:gap-3">
            <div className="flex justify-center items-center gap-1.5 md:gap-2 flex-wrap">
              <div className="flex items-center gap-1 md:gap-1.5 mr-0.5 md:mr-1">
                <Timer className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
                <span className="text-[10px] md:text-xs text-muted-foreground font-medium">Duration:</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors" aria-label="Duration help">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[280px]">
                    <p className="font-medium mb-1">Test Duration</p>
                    <p className="text-xs text-muted-foreground mb-2">Choose how long you want to type. Shorter tests (15-30s) measure burst speed, while longer tests (1-5 min) measure sustained speed and endurance.</p>
                    <p className="text-xs text-muted-foreground"><span className="text-blue-400">Tip:</span> Use Custom for marathon sessions up to 4 hours!</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {TIME_PRESETS.map((preset) => (
                <Tooltip key={preset.value}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() =>
                        confirmOrRun(
                          "Change Duration?",
                          `Switching to ${preset.label} will reset the current test.`,
                          () => {
                            setMode(preset.value);
                            setShowCustomInput(false);
                            // Fully reset first, then apply the new timeLeft so it can't be overwritten by resetTest's internal setTimeLeft(mode)
                            resetTest();
                            setTimeLeft(preset.value);
                          }
                        )
                      }
                      className={cn(
                        "px-2.5 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all",
                        mode === preset.value && !showCustomInput
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                      data-testid={`button-time-${preset.value}`}
                    >
                      {preset.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Test your typing speed for {preset.label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowCustomInput(!showCustomInput)}
                    className={cn(
                      "px-2.5 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all",
                      showCustomInput
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                    data-testid="button-custom-time"
                  >
                    Custom
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Set your own test duration (up to 4 hours)</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() =>
                      confirmOrRun(
                        "New Paragraph?",
                        "This will reset your current test and load a fresh paragraph.",
                        () => resetTest(true),
                        "New Paragraph"
                      )
                    }
                    disabled={isGenerating || freestyleMode}
                    className={cn(
                      "px-2.5 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all flex items-center gap-1.5 md:gap-2",
                      isGenerating
                        ? "bg-primary/50 text-primary-foreground cursor-not-allowed"
                        : freestyleMode
                          ? "bg-secondary/50 text-muted-foreground/50 cursor-not-allowed"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                    data-testid="button-new-paragraph"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5 md:w-4 md:h-4", isGenerating && "animate-spin")} />
                    <span className="hidden sm:inline">{isGenerating ? "Processing..." : "New Paragraph"}</span>
                    <span className="sm:hidden">{isGenerating ? "..." : "New"}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{freestyleMode ? "Disabled in Freestyle mode" : isGenerating ? "AI is processing fresh content..." : "Get a fresh paragraph without changing settings"}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() =>
                      confirmOrRun(
                        freestyleMode ? "Exit Freestyle?" : "Enable Freestyle?",
                        freestyleMode
                          ? "Exiting will reset your current test and switch back to standard mode."
                          : "Enabling Freestyle will reset your current test and let you type anything.",
                        () => {
                          const newValue = !freestyleMode;
                          setFreestyleMode(newValue);
                          setFreestyleText("");
                          setUserInput("");
                          setIsActive(false);
                          setIsFinished(false);
                          setTimeLeft(mode);
                          setWpm(0);
                          setRawWpm(0);
                          setAccuracy(100);
                          setErrors(0);
                          setConsistency(100);
                          setStartTime(null);
                          setCursorIndex(0);
                          setCharStates([]);
                          keystrokeTrackerRef.current = null;
                          wpmHistoryRef.current = [];
                          lastSampleSecondRef.current = -1;
                          lastKeystrokeTimeRef.current = 0;
                          freestyleLastKeystrokeRef.current = 0;
                          setIsTypingFast(false);
                          // Close custom prompt when entering freestyle mode
                          if (newValue && showCustomPrompt) {
                            setShowCustomPrompt(false);
                          }
                          toast({
                            title: newValue ? "Freestyle Mode" : "Standard Mode",
                            description: newValue
                              ? "Type anything you want! WPM will be tracked."
                              : "Switched back to standard typing test.",
                          });
                        },
                        freestyleMode ? "Exit & Reset" : "Enable & Reset"
                      )
                    }
                    className={cn(
                      "px-2.5 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all flex items-center gap-1.5 md:gap-2",
                      freestyleMode
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                    data-testid="button-freestyle"
                  >
                    <PenLine className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Freestyle</span>
                    <span className="sm:hidden">Free</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px]">
                  <p className="font-medium mb-1">{freestyleMode ? "Exit Freestyle Mode" : "Freestyle Mode"}</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    {freestyleMode
                      ? "Return to standard typing test with AI-generated paragraphs"
                      : "Type anything you want without a pre-defined paragraph. Perfect for practice notes, creative writing, or just flowing thoughts."
                    }
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {!freestyleMode && (
                      <>
                        <p><span className="text-purple-400">Timer:</span> Uses your selected duration</p>
                        <p><span className="text-pink-400">WPM:</span> Tracked in real-time</p>
                        <p><span className="text-green-400">Accuracy:</span> Always 100% (no reference text)</p>
                      </>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>

            {showCustomInput && (
              <div className="flex flex-col items-center gap-3">
                {/* Quick Duration Presets */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="text-xs text-muted-foreground mr-1">Quick:</span>
                  {[
                    { value: 300, label: "5 min" },
                    { value: 600, label: "10 min" },
                    { value: 900, label: "15 min" },
                    { value: 1800, label: "30 min" },
                    { value: 3600, label: "1 hr" },
                    { value: 7200, label: "2 hr" },
                    { value: 10800, label: "3 hr" },
                    { value: 14400, label: "4 hr" },
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() =>
                        confirmOrRun(
                          "Change Duration?",
                          `Test duration: ${preset.label}. This will reset your current test.`,
                          () => {
                            setMode(preset.value);
                            setCustomTime(preset.value.toString());
                            setShowCustomInput(false);
                            // Fully reset first, then apply the new timeLeft so it can't be overwritten by resetTest's internal setTimeLeft(mode)
                            resetTest();
                            setTimeLeft(preset.value);
                            toast({ title: "Duration set", description: `Test duration: ${preset.label}` });
                          },
                          "Change & Reset"
                        )
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                        mode === preset.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      )}
                      data-testid={`button-preset-${preset.value}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="14400"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    placeholder="Seconds (5-14400)"
                    className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm w-36 focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="input-custom-time"
                  />
                  <span className="text-xs text-muted-foreground">
                    {customTime && parseInt(customTime) > 0 ? (
                      (() => {
                        const t = parseInt(customTime);
                        const h = Math.floor(t / 3600);
                        const m = Math.floor((t % 3600) / 60);
                        const s = t % 60;
                        if (h > 0) return `= ${h}h ${m}m ${s}s`;
                        if (m > 0) return `= ${m}m ${s}s`;
                        return `= ${s}s`;
                      })()
                    ) : ""}
                  </span>
                  <button
                    onClick={() => {
                      const time = parseInt(customTime);
                      if (time >= 5 && time <= 14400) {
                        const hours = Math.floor(time / 3600);
                        const mins = Math.floor((time % 3600) / 60);
                        const secs = time % 60;
                        let formatted = '';
                        if (hours > 0) {
                          formatted = `${hours} hour${hours > 1 ? 's' : ''}`;
                          if (mins > 0) formatted += ` ${mins} min`;
                        } else if (mins > 0) {
                          formatted = `${mins} min${mins > 1 ? 's' : ''}`;
                          if (secs > 0) formatted += ` ${secs}s`;
                        } else {
                          formatted = `${secs} seconds`;
                        }
                        confirmOrRun(
                          "Change Duration?",
                          `Test duration: ${formatted}. This will reset your current test.`,
                          () => {
                            setMode(time);
                            setShowCustomInput(false);
                            // Fully reset first, then apply the new timeLeft so it can't be overwritten by resetTest's internal setTimeLeft(mode)
                            resetTest();
                            setTimeLeft(time);
                            toast({ title: "Custom time set", description: `Test duration: ${formatted}` });
                          }
                        );
                      } else {
                        toast({
                          title: "Invalid time",
                          description: "Please enter a value between 5 seconds and 4 hours",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                    data-testid="button-set-custom-time"
                  >
                    Set
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter any duration from 5 seconds to 4 hours
                </p>
              </div>
            )}

            {/* AI Custom Prompt */}
            <div className="flex items-center justify-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !freestyleMode && setShowCustomPrompt(!showCustomPrompt)}
                    disabled={freestyleMode}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                      freestyleMode
                        ? "bg-secondary/50 text-muted-foreground/50 cursor-not-allowed"
                        : showCustomPrompt
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                    data-testid="button-toggle-custom-prompt"
                  >
                    <Sparkles className="w-4 h-4" />
                    AI Custom Content
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{freestyleMode ? "Disabled in Freestyle mode - you type your own content" : "Tell AI what kind of paragraph you want (e.g., \"about space exploration\")"}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {showCustomPrompt && !freestyleMode && (
              <div className="flex flex-col items-center justify-center gap-2 max-w-2xl mx-auto">
                <div className="flex items-center w-full gap-2">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="E.g., 'about artificial intelligence and future technology'"
                    disabled={isGenerating || freestyleMode}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-lg text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary",
                      isGenerating || freestyleMode ? "bg-secondary/50 cursor-not-allowed" : "bg-secondary"
                    )}
                    data-testid="input-custom-prompt"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customPrompt.trim() && !isGenerating && !freestyleMode) {
                        fetchParagraph(true);
                        setUserInput("");
                        setOriginalText("");
                        setStartTime(null);
                        setIsActive(false);
                        setIsFinished(false);
                        setWpm(0);
                        setRawWpm(0);
                        setConsistency(100);
                        setAccuracy(100);
                        setErrors(0);
                        setCursorIndex(0);
                        setCharStates([]);
                        keystrokeTrackerRef.current = null;
                        wpmHistoryRef.current = [];
                        lastKeystrokeTimeRef.current = 0;
                        setIsTypingFast(false);
                        freestyleLastKeystrokeRef.current = 0;
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (customPrompt.trim()) {
                        fetchParagraph(true);
                        setUserInput("");
                        setOriginalText("");
                        setStartTime(null);
                        setIsActive(false);
                        setIsFinished(false);
                        setWpm(0);
                        setRawWpm(0);
                        setConsistency(100);
                        setAccuracy(100);
                        setErrors(0);
                        setCursorIndex(0);
                        setCharStates([]);
                        keystrokeTrackerRef.current = null;
                        wpmHistoryRef.current = [];
                        lastSampleSecondRef.current = -1;
                        lastKeystrokeTimeRef.current = 0;
                        setIsTypingFast(false);
                        freestyleLastKeystrokeRef.current = 0;
                      } else {
                        toast({
                          title: "Empty prompt",
                          description: "Please describe what you want the paragraph to be about",
                          variant: "destructive",
                        });
                      }
                    }}
                    disabled={isGenerating || !customPrompt.trim() || freestyleMode}
                    className={cn(
                      "px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all",
                      isGenerating || !customPrompt.trim() || freestyleMode
                        ? "bg-primary/50 text-primary-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                    data-testid="button-generate-custom"
                  >
                    <Sparkles className={cn("w-4 h-4", isGenerating && "animate-spin")} />
                    {isGenerating ? "Processing..." : "Generate"}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Describe the topic or theme for your typing test paragraph
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Overview (Live) - 6 metrics like Monkeytype (or 8 for Freestyle) */}
        <div className={cn(
          "grid gap-2 md:gap-3 transition-opacity duration-300",
          freestyleMode ? "grid-cols-4 md:grid-cols-8" : "grid-cols-3 md:grid-cols-6"
        )}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center p-2 md:p-3 rounded-lg md:rounded-xl bg-card border border-border cursor-help">
                <span className="text-muted-foreground text-[9px] md:text-[10px] uppercase tracking-wider mb-0.5 md:mb-1">Time</span>
                <span className="text-xl md:text-3xl font-mono font-bold text-primary" data-testid="text-time-left">{formatTime(timeLeft)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[220px]">
              <p className="font-medium mb-1">Time Remaining</p>
              <p className="text-xs text-muted-foreground">Countdown timer showing how much time is left in your test. Timer starts when you begin typing.</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center p-2 md:p-3 rounded-lg md:rounded-xl bg-card border border-border cursor-help">
                <span className="text-muted-foreground text-[9px] md:text-[10px] uppercase tracking-wider mb-0.5 md:mb-1">WPM</span>
                <span className="text-xl md:text-3xl font-mono font-bold" data-testid="text-wpm">{wpm}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px]">
              <p className="font-medium mb-1">Words Per Minute (Net)</p>
              <p className="text-xs text-muted-foreground mb-1">Your effective typing speed accounting for errors. This is the standard WPM used in typing tests.</p>
              <p className="text-xs text-muted-foreground"><span className="text-green-400">40+ WPM:</span> Good | <span className="text-blue-400">60+ WPM:</span> Fast | <span className="text-purple-400">80+ WPM:</span> Expert</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center p-2 md:p-3 rounded-lg md:rounded-xl bg-card border border-border cursor-help">
                <span className="text-muted-foreground text-[9px] md:text-[10px] uppercase tracking-wider mb-0.5 md:mb-1">Raw</span>
                <span className="text-xl md:text-3xl font-mono font-bold text-muted-foreground" data-testid="text-raw-wpm">{rawWpm}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px]">
              <p className="font-medium mb-1">Raw Speed (Uncorrected)</p>
              <p className="text-xs text-muted-foreground">Your total typing speed including errors. Compare Raw with WPM to see how much mistakes affect your final score.</p>
            </TooltipContent>
          </Tooltip>
          {/* Hide Accuracy in Freestyle mode - no reference text to compare */}
          {!freestyleMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center p-2 md:p-3 rounded-lg md:rounded-xl bg-card border border-border cursor-help">
                  <span className="text-muted-foreground text-[9px] md:text-[10px] uppercase tracking-wider mb-0.5 md:mb-1">Accuracy</span>
                  <span className="text-xl md:text-3xl font-mono font-bold" data-testid="text-accuracy">{accuracy}%</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[240px]">
                <p className="font-medium mb-1">Typing Accuracy</p>
                <p className="text-xs text-muted-foreground mb-1">Percentage of characters typed correctly. Higher accuracy = fewer mistakes.</p>
                <p className="text-xs text-muted-foreground"><span className="text-yellow-400">Tip:</span> Aim for 95%+ accuracy before focusing on speed!</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center p-2 md:p-3 rounded-lg md:rounded-xl bg-card border border-border cursor-help">
                <span className="text-muted-foreground text-[9px] md:text-[10px] uppercase tracking-wider mb-0.5 md:mb-1">Consistency</span>
                <span className={cn("text-xl md:text-3xl font-mono font-bold",
                  consistency >= 80 ? "text-green-500" : consistency >= 60 ? "text-yellow-500" : "text-orange-500"
                )} data-testid="text-consistency">{consistency}%</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px]">
              <p className="font-medium mb-1">Typing Consistency</p>
              <p className="text-xs text-muted-foreground mb-1">Measures how steady your typing rhythm is. Higher = more uniform keystrokes.</p>
              <p className="text-xs text-muted-foreground"><span className="text-green-400">80%+:</span> Excellent | <span className="text-yellow-400">60-79%:</span> Good | <span className="text-orange-400">&lt;60%:</span> Practice rhythm</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center p-2 md:p-3 rounded-lg md:rounded-xl bg-card border border-border cursor-help">
                <span className="text-muted-foreground text-[9px] md:text-[10px] uppercase tracking-wider mb-0.5 md:mb-1">Status</span>
                <span className={cn("text-xl md:text-3xl font-mono font-bold", isActive ? "text-green-500" : "text-muted-foreground")} data-testid="text-status">
                  {isActive ? "GO" : isFinished ? "DONE" : "READY"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[220px]">
              <p className="font-medium mb-1">Test Status</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><span className="text-muted-foreground">READY:</span> Waiting for you to start typing</p>
                <p><span className="text-green-400">GO:</span> Test in progress, keep typing!</p>
                <p><span className="text-blue-400">DONE:</span> Test complete, results displayed</p>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Freestyle Mode Extra Stats */}
          {freestyleMode && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center p-2 md:p-3 rounded-lg md:rounded-xl bg-card border border-purple-500/20 cursor-help">
                    <span className="text-muted-foreground text-[9px] md:text-[10px] uppercase tracking-wider mb-0.5 md:mb-1">Words</span>
                    <span className="text-xl md:text-3xl font-mono font-bold text-purple-400" data-testid="text-freestyle-words">
                      {freestyleText.trim().split(/\s+/).filter(w => w.length > 0).length}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium mb-1">Words Typed</p>
                  <p className="text-xs text-muted-foreground">Total words you've typed in Freestyle mode (space-separated count)</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center p-2 md:p-3 rounded-lg md:rounded-xl bg-card border border-pink-500/20 cursor-help">
                    <span className="text-muted-foreground text-[9px] md:text-[10px] uppercase tracking-wider mb-0.5 md:mb-1">Chars</span>
                    <span className="text-xl md:text-3xl font-mono font-bold text-pink-400" data-testid="text-freestyle-chars">
                      {freestyleText.length}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium mb-1">Characters Typed</p>
                  <p className="text-xs text-muted-foreground">Total characters including spaces (used for WPM: chars ÷ 5)</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* Freestyle Mode Notice */}
        {freestyleMode && (
          <div className="mb-3 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-start gap-2" data-testid="notice-freestyle-leaderboard">
            <Info className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-purple-300">
              <span className="font-medium">Practice Mode:</span> Freestyle test results are excluded from all leaderboards and competitive statistics.
            </p>
            <div className="ml-auto">
              <button
                onClick={() =>
                  confirmOrRun(
                    "Exit Freestyle?",
                    "Exiting will reset your current test and switch back to standard mode.",
                    () => {
                      setFreestyleMode(false);
                      setFreestyleText("");
                      setUserInput("");
                      setIsActive(false);
                      setIsFinished(false);
                      setTimeLeft(mode);
                      setWpm(0);
                      setRawWpm(0);
                      setAccuracy(100);
                      setErrors(0);
                      setConsistency(100);
                      setStartTime(null);
                      setCursorIndex(0);
                      setCharStates([]);
                      keystrokeTrackerRef.current = null;
                      wpmHistoryRef.current = [];
                      lastSampleSecondRef.current = -1;
                      lastKeystrokeTimeRef.current = 0;
                      freestyleLastKeystrokeRef.current = 0;
                      setIsTypingFast(false);
                      toast({
                        title: "Exited Freestyle Mode",
                        description: "Switched back to standard typing test.",
                      });
                    },
                    "Exit & Reset"
                  )
                }
                className="px-2 py-1 text-xs rounded-md border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 transition-colors"
                data-testid="button-exit-freestyle"
              >
                Exit Freestyle
              </button>
            </div>
          </div>
        )}

        {/* Typing Area */}
        <div className="relative min-h-[200px] md:min-h-[300px] max-h-[300px] md:max-h-[400px] overflow-hidden group">

          {/* Freestyle Mode Interface */}
          {freestyleMode && (
            <div className="w-full h-full min-h-[200px] md:min-h-[300px] flex flex-col relative">
              <textarea
                value={freestyleText}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                inputMode="text"
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
                data-1p-ignore
                data-lpignore="true"
                onChange={(e) => {
                  const newText = e.target.value;

                  // Prevent changes if test is finished
                  if (isFinished) return;

                  // Track last keystroke time for idle time handling
                  freestyleLastKeystrokeRef.current = Date.now();

                  setFreestyleText(newText);

                  // Start timer on first keystroke (handle edge case of paste)
                  if (!isActive && !isFinished && newText.length > 0 && freestyleText.length === 0) {
                    setIsActive(true);
                    setStartTime(Date.now());
                    setHasInteracted(true);
                    freestyleLastKeystrokeRef.current = Date.now();
                  }

                  // Calculate WPM in real-time for free type with edge case handling
                  if (isActive && startTime) {
                    const elapsedMs = Date.now() - startTime;
                    const elapsedMinutes = elapsedMs / 60000;
                    const elapsedSeconds = elapsedMs / 1000;

                    // Prevent division by zero and handle very short typing sessions
                    if (elapsedMinutes > 0.0167) { // At least 1 second
                      const charCount = newText.length;
                      // Use character-based WPM (standard: 5 chars = 1 word)
                      const charBasedWpm = Math.round((charCount / 5) / elapsedMinutes);
                      // Cap WPM at reasonable max to handle edge cases (prevent unrealistic values)
                      const cappedWpm = Math.min(Math.max(charBasedWpm, 0), 300);
                      setWpm(cappedWpm);
                      setRawWpm(cappedWpm);

                      // Track WPM history for consistency calculation (sample once per second)
                      const currentSecond = Math.floor(elapsedSeconds);
                      if (currentSecond > 0 && currentSecond !== lastSampleSecondRef.current) {
                        lastSampleSecondRef.current = currentSecond;
                        wpmHistoryRef.current.push(cappedWpm);

                        // Calculate consistency (lower standard deviation = higher consistency)
                        if (wpmHistoryRef.current.length >= 3) {
                          const avg = wpmHistoryRef.current.reduce((a, b) => a + b, 0) / wpmHistoryRef.current.length;
                          const variance = wpmHistoryRef.current.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / wpmHistoryRef.current.length;
                          const stdDev = Math.sqrt(variance);
                          // Coefficient of Variation (CV) converted to consistency percentage
                          // Lower CV = higher consistency. Formula: 100 - (CV * 100)
                          const consistencyScore = avg > 0 ? Math.max(0, Math.min(100, Math.round(100 - (stdDev / avg * 100)))) : 100;
                          setConsistency(consistencyScore);
                        }
                      }
                    }
                  }
                }}
                onKeyDown={(e) => {
                  // Shift+Enter to finish test early (like Monkeytype)
                  if (e.shiftKey && e.key === 'Enter') {
                    e.preventDefault();
                    if (isActive && freestyleText.length > 0) {
                      finishTest(false); // Pass false since user ended manually
                      toast({
                        title: "Test Finished",
                        description: "You ended the test early with Shift+Enter.",
                      });
                    } else if (!isActive && freestyleText.length === 0) {
                      toast({
                        title: "Nothing to Save",
                        description: "Start typing first, then use Shift+Enter to finish.",
                        variant: "default",
                      });
                    }
                  }

                  // Escape to exit freestyle mode
                  if (e.key === 'Escape') {
                    if (!isActive || isFinished) {
                      setFreestyleMode(false);
                      setFreestyleText("");
                      setIsActive(false);
                      setIsFinished(false);
                      setTimeLeft(mode);
                      toast({
                        title: "Exited Freestyle Mode",
                        description: "Switched back to standard typing test.",
                      });
                    }
                  }
                }}
                onPaste={(e) => {
                  // Prevent pasting in Freestyle mode - only typing allowed
                  e.preventDefault();
                  toast({
                    title: "Pasting Not Allowed",
                    description: "Please type the text yourself to get accurate WPM metrics.",
                    variant: "destructive",
                  });
                }}
                onCut={(e) => {
                  // Prevent cutting text
                  e.preventDefault();
                  showDebouncedToast('cut-disabled', 'Cut Disabled', 'Type manually for accurate results');
                }}
                onDrop={(e) => {
                  // Prevent drag-and-drop text
                  e.preventDefault();
                  toast({
                    title: "Drag & Drop Not Allowed",
                    description: "Please type the text yourself for accurate results.",
                    variant: "destructive",
                  });
                }}
                onDragOver={(e) => {
                  // Prevent drag-over visual feedback
                  e.preventDefault();
                }}
                onBeforeInput={(e: any) => {
                  // Block mobile long-press paste and autocomplete insertions
                  if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') {
                    e.preventDefault();
                    toast({
                      title: "Pasting Not Allowed",
                      description: "Please type the text yourself to get accurate WPM metrics.",
                      variant: "destructive",
                    });
                  }
                }}
                placeholder="Start typing anything you want... Your WPM will be tracked in real-time!"
                disabled={isFinished}
                autoFocus
                aria-label="Free type text area - type anything you want"
                aria-describedby="freestyle-instructions"
                className={cn(
                  "w-full h-full min-h-[200px] md:min-h-[300px] p-4 md:p-8 text-lg sm:text-xl md:text-2xl font-mono leading-relaxed",
                  "bg-transparent border-none outline-none resize-none",
                  "placeholder:text-muted-foreground/50",
                  "focus:ring-0 focus:outline-none",
                  "caret-primary",
                  isFinished && "opacity-60 cursor-not-allowed"
                )}
                data-testid="textarea-freestyle"
              />

              {/* Keyboard shortcut hint */}
              {isActive && !isFinished && freestyleText.length > 0 && (
                <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4 text-xs text-muted-foreground/60 hidden md:block" id="freestyle-instructions">
                  <kbd className="px-1.5 py-0.5 bg-secondary/50 rounded text-[10px] font-mono">Shift</kbd>
                  <span className="mx-0.5">+</span>
                  <kbd className="px-1.5 py-0.5 bg-secondary/50 rounded text-[10px] font-mono">Enter</kbd>
                  <span className="ml-1">to finish early</span>
                </div>
              )}

              {/* Initial State Overlay */}
              {!isActive && !isFinished && freestyleText.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="flex flex-col items-center gap-3 text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <PenLine className="w-8 h-8 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-foreground">Freestyle Mode</p>
                      <p className="text-sm text-muted-foreground mt-1">Type anything - practice notes, thoughts, or random words</p>
                      <p className="text-xs text-muted-foreground/70 mt-2">Timer starts when you begin typing</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Finished State Overlay */}
              {isFinished && freestyleText.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="flex flex-col items-center gap-3 text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-foreground">No Text Typed</p>
                      <p className="text-sm text-muted-foreground mt-1">Time ran out before you started typing</p>
                      <p className="text-xs text-muted-foreground/70 mt-2">Click "Restart" to try again</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Finished with content */}
              {isFinished && freestyleText.length > 0 && (
                <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/20">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-xs md:text-sm text-green-500 font-medium">Test Complete</span>
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {!freestyleMode && paragraphError && !text && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Unable to Load Content</h3>
              <p className="text-muted-foreground mb-4 max-w-md">{paragraphError}</p>
              <div className="flex gap-3">
                <Button
                  variant="default"
                  onClick={() => {
                    setParagraphError(null);
                    fetchParagraph();
                  }}
                  disabled={isGenerating}
                  data-testid="button-retry-paragraph"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const fallbackText = generateText(100);
                    setText(fallbackText);
                    setOriginalText(fallbackText);
                    setParagraphError(null);
                    setFetchRetryCount(0);
                    setUserInput("");
                    setStartTime(null);
                    setIsActive(false);
                    setIsFinished(false);
                    setWpm(0);
                    setRawWpm(0);
                    setConsistency(100);
                    setAccuracy(100);
                    setErrors(0);
                    setCursorIndex(0);
                    setCharStates([]);
                    keystrokeTrackerRef.current = null;
                    wpmHistoryRef.current = [];
                    lastSampleSecondRef.current = -1;
                    lastKeystrokeTimeRef.current = 0;
                    setIsTypingFast(false);
                    freestyleLastKeystrokeRef.current = 0;
                  }}
                  data-testid="button-use-practice-text"
                >
                  Use Practice Text
                </Button>
              </div>
            </div>
          )}

          {/* Loading State - only show full overlay if no text exists yet */}
          {!freestyleMode && isGenerating && !text && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Processing content...</p>
            </div>
          )}

          {/* Inline loading indicator when text exists (regenerating) */}
          {!freestyleMode && isGenerating && text && (
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full z-10">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs text-primary">Loading new content...</span>
            </div>
          )}

          {/* Hidden Textarea */}
          {!freestyleMode && (
            <textarea
              ref={inputRef}
              value={userInput}
              onBeforeInput={handleBeforeInput}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onPaste={handlePaste}
              onCut={handleCut}
              onDragStart={(e) => {
                e.preventDefault();
                showDebouncedToast('drag-disabled', 'Drag Disabled', 'Type manually for accurate results');
              }}
              onDrop={(e) => {
                e.preventDefault();
                showDebouncedToast('drop-disabled', 'Drop Disabled', 'Type manually for accurate results');
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                showDebouncedToast('context-menu', 'Right-Click Disabled', 'Focus on typing to improve your speed');
              }}
              onSelect={(e) => {
                if (inputRef.current) {
                  const pos = userInput.length;
                  inputRef.current.setSelectionRange(pos, pos);
                }
              }}
              className="absolute opacity-0 w-0 h-0 top-0 left-0 resize-none cursor-default z-0"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode="text"
              enterKeyHint="done"
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
              data-1p-ignore
              data-lpignore="true"
              disabled={!!paragraphError && !text}
              aria-label="Typing input area"
              role="textbox"
              aria-multiline="false"
            />
          )}

          {/* Visual Text Display */}
          {!freestyleMode && text && (
            <div
              ref={containerRef}
              lang={language}
              dir={isRTL ? "rtl" : "ltr"}
              data-testid="text-paragraph"
              data-paragraph-text={text}
              data-original-paragraph={originalText}
              className={cn(
                "relative w-full h-full max-h-[300px] md:max-h-[400px] overflow-y-auto p-4 md:p-8 text-lg sm:text-xl md:text-3xl font-mono leading-relaxed whitespace-pre-wrap break-words outline-none transition-all duration-300 scroll-smooth select-none",
                !isActive && !isFinished && !hasInteracted && "blur-[2px] opacity-60 group-hover:blur-0 group-hover:opacity-100"
              )}
              onClick={() => {
                setHasInteracted(true);
                inputRef.current?.focus({ preventScroll: true });
              }}
              onMouseDown={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              onScroll={() => {
                // Detect manual user scrolling
                isUserScrollingRef.current = true;

                // CRITICAL: Recalculate cursor position SYNCHRONOUSLY during scroll
                // This keeps cursor aligned with character without React state lag
                updateCursorPosition(false);

                // Clear any existing timeout
                if (userScrollTimeoutRef.current) {
                  clearTimeout(userScrollTimeoutRef.current);
                }

                // Resume auto-scroll after user stops scrolling for 150ms
                userScrollTimeoutRef.current = setTimeout(() => {
                  isUserScrollingRef.current = false;
                }, 150);
              }}
            >
              {characters.map((char: string, index: number) => {
                // MONKEYTYPE-STYLE VALIDATION: Use persistent character states
                // Characters remain in 'incorrect' (red) state even after backspace
                const charState = charStates[index];
                const state = charState ? charState.state : 'pending';
                const typedChar = charState?.typed || undefined;

                return (
                  <CharSpan
                    key={index}
                    ref={(el) => {
                      charRefs.current[index] = el;
                    }}
                    char={char}
                    index={index}
                    state={state}
                    typedChar={typedChar}
                  />
                );
              })}

              {/* GPU-accelerated caret */}
              {!isFinished && (
                <div
                  ref={caretRef}
                  className={cn(
                    "absolute left-0 top-0 w-0.5 bg-primary pointer-events-none z-10",
                    !isTypingFast && "animate-pulse"
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
          )}

          {/* Focus Overlay - Professional Monkeytype-style hint */}
          {!freestyleMode && !isActive && !isFinished && !hasInteracted && userInput.length === 0 && text && !isGenerating && (
            <div
              className="absolute inset-0 flex items-center justify-center cursor-text transition-opacity duration-200"
              onClick={() => {
                setHasInteracted(true);
                inputRef.current?.focus({ preventScroll: true });
              }}
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-card/80 backdrop-blur-sm border border-border/50 rounded-md shadow-sm">
                <span className="text-muted-foreground text-base font-medium tracking-wide">
                  Click here or start typing
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2 md:gap-3 transition-opacity duration-300">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() =>
                  confirmOrRun(
                    "Restart Test?",
                    "This will reset your current progress and restart the test.",
                    () => resetTest(),
                    "Restart"
                  )
                }
                className="flex items-center gap-1.5 md:gap-2 px-4 md:px-8 py-2 md:py-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-secondary-foreground font-medium text-sm md:text-base"
                data-testid="button-restart-test"
              >
                <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Restart Test</span>
                <span className="sm:hidden">Restart</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Get a new paragraph and restart the test</p>
            </TooltipContent>
          </Tooltip>

          {/* Zen Mode button hidden for now
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  const newValue = !zenMode;
                  setZenMode(newValue);
                  localStorage.setItem('zenMode', String(newValue));
                  toast({
                    title: newValue ? "Zen Mode Enabled" : "Zen Mode Disabled",
                    description: newValue 
                      ? "Stats and controls will be hidden during typing" 
                      : "Stats and controls will remain visible",
                  });
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium",
                  zenMode 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                )}
                data-testid="button-zen-mode"
              >
                {zenMode ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                Zen
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{zenMode ? "Disable Zen Mode - show stats while typing" : "Enable Zen Mode - hide stats while typing"}</p>
            </TooltipContent>
          </Tooltip>
*/}
        </div>

        {/* Result Modal / Section */}
        <AnimatePresence>
          {isFinished && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-2 sm:p-4"
            >
              <div className="bg-card border border-border p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-2xl max-w-lg w-full relative overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-primary animate-gradient" />

                <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 md:mb-8 text-center">Test Complete!</h2>

                <div className={cn(
                  "grid gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8",
                  freestyleMode ? "grid-cols-1" : "grid-cols-2"
                )}>
                  <div className="flex flex-col items-center p-3 sm:p-4 bg-background/50 rounded-lg sm:rounded-xl">
                    <div className="text-muted-foreground text-xs sm:text-sm mb-1 flex items-center gap-1.5 sm:gap-2">
                      <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> WPM
                    </div>
                    <div className="text-3xl sm:text-4xl md:text-5xl font-mono font-bold text-primary">{wpm}</div>
                  </div>
                  {/* Hide Accuracy in Freestyle mode */}
                  {!freestyleMode && (
                    <div className="flex flex-col items-center p-3 sm:p-4 bg-background/50 rounded-lg sm:rounded-xl">
                      <div className="text-muted-foreground text-xs sm:text-sm mb-1 flex items-center gap-1.5 sm:gap-2">
                        <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Accuracy
                      </div>
                      <div className="text-3xl sm:text-4xl md:text-5xl font-mono font-bold">{accuracy}%</div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 sm:space-y-3 md:space-y-4">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Raw WPM</span>
                    <span className="font-mono text-foreground">{wpm + Math.round((100 - accuracy) / 2)}</span>
                  </div>
                  {!freestyleMode && (
                    <>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Errors</span>
                        <span className="font-mono text-foreground">{errors}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Consistency</span>
                        <span className="font-mono text-foreground">{consistency}%</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Characters</span>
                    <span className="font-mono text-foreground">{freestyleMode ? freestyleText.length : userInput.length}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Time</span>
                    <span className="font-mono text-foreground">{mode}s</span>
                  </div>
                </div>

                {/* Celebratory Share Prompt - always visible */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="mb-4 p-4 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-pink-500/10 rounded-xl border border-yellow-500/30 text-center"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">{wpm >= 80 ? "🔥" : wpm >= 60 ? "⚡" : wpm >= 40 ? "🎉" : "🌟"}</span>
                    <span className="font-bold text-lg">
                      {wpm >= 80 ? "Amazing Performance!" : wpm >= 60 ? "Great Job!" : wpm >= 40 ? "Nice Work!" : "Test Complete!"}
                    </span>
                    <span className="text-2xl">{wpm >= 80 ? "🔥" : wpm >= 60 ? "⚡" : wpm >= 40 ? "🎉" : "🌟"}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {wpm >= 80
                      ? "You're faster than 95% of typists! Share your achievement!"
                      : wpm >= 60
                        ? "You're faster than 75% of typists! Challenge your friends!"
                        : wpm >= 40
                          ? "You're above average! Share and see if your friends can beat you!"
                          : "Share your results and challenge your friends to beat your score!"}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowShareModal(true)}
                    className="group inline-flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-white font-semibold shadow-lg hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 transition-all"
                    aria-label="Share your result and earn 5 XP"
                    data-testid="button-share-celebration"
                  >
                    <Share2 className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    Share Result • +5 XP
                  </motion.button>
                </motion.div>

                <div className="mt-4 flex flex-col gap-3">
                  {user && (
                    <button
                      onClick={() => setShowCertificate(true)}
                      className="w-full py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                      data-testid="button-view-certificate"
                    >
                      <Award className="w-5 h-5" />
                      Get Certificate
                    </button>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => resetTest()}
                      className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity"
                      data-testid="button-next-test"
                    >
                      Next Test
                    </button>
                    <button
                      onClick={() => resetTest()}
                      className="px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors"
                      data-testid="button-close-results"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auth Prompt Dialog */}
        <AuthPromptDialog
          open={showAuthPrompt}
          onOpenChange={setShowAuthPrompt}
          title="Save Your Progress"
          description={`Great job! You scored ${wpm} WPM with ${accuracy}% accuracy. Create an account to save your results and track your progress over time!`}
        />

        {/* Certificate Dialog */}
        <Dialog open={showCertificate} onOpenChange={setShowCertificate}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center">Your Achievement Certificate</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center">
              {user && lastResultSnapshot && (
                <CertificateGenerator
                  username={user.username}
                  wpm={lastResultSnapshot.wpm}
                  accuracy={lastResultSnapshot.accuracy}
                  mode={lastResultSnapshot.mode}
                  date={new Date(lastResultSnapshot.completionDate)}
                  freestyle={lastResultSnapshot.freestyle}
                  characters={lastResultSnapshot.characters}
                  words={lastResultSnapshot.words}
                  consistency={lastResultSnapshot.consistency}
                  verificationId={lastResultSnapshot.verificationId}
                />
              )}
              <div className="mt-6 w-full flex justify-center">
                <Button
                  onClick={() => setShowCertificate(false)}
                  variant="outline"
                  className="min-w-[150px]"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Share Modal */}
        <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Share2 className="w-5 h-5 text-primary" />
                Share Your Achievement
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="quick" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="quick" data-testid="tab-quick-share">Quick Share</TabsTrigger>
                <TabsTrigger value="card" data-testid="tab-visual-card">Visual Card</TabsTrigger>
                {user && <TabsTrigger value="certificate" data-testid="tab-certificate">Certificate</TabsTrigger>}
                <TabsTrigger value="challenge" data-testid="tab-challenge">Challenge</TabsTrigger>
              </TabsList>

              {/* Quick Share Tab */}
              <TabsContent value="quick" className="space-y-4">
                {/* Pre-composed Share Message Preview */}
                <div className="relative">
                  <div className="absolute -top-2 left-3 px-2 bg-background text-xs font-medium text-muted-foreground">
                    Your Share Message
                  </div>
                  <div className="p-4 bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-xl border border-primary/20 text-sm leading-relaxed">
                    <div className="space-y-2">
                      <p className="text-base font-medium">
                        {getPerformanceRating().emoji} New Record: <span className="text-primary font-bold">{wpm} WPM</span>!
                      </p>
                      <p className="text-muted-foreground">
                        ⚡ Speed: <span className="text-foreground font-semibold">{wpm} Words Per Minute</span>
                      </p>
                      <p className="text-muted-foreground">
                        ✨ Accuracy: <span className="text-foreground font-semibold">{accuracy}%</span>
                      </p>
                      <p className="text-muted-foreground">
                        🏆 Level: <span className="text-yellow-400 font-semibold">{getPerformanceRating().title}</span>
                      </p>
                      <p className="text-muted-foreground">
                        🎯 Badge: <span className="text-foreground font-semibold">{getPerformanceRating().badge}</span>
                      </p>
                      <p className="text-muted-foreground">
                        ⏱️ Time: <span className="text-foreground font-semibold">{mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`}</span>
                      </p>
                      <p className="text-muted-foreground">
                        🌐 Language: <span className="text-foreground font-semibold">{LANGUAGE_NAMES[language]}</span>
                      </p>
                      <p className="text-primary/80 text-xs mt-3 font-medium">
                        Can you beat this score? Take the challenge! 🚀
                      </p>
                      <p className="text-xs text-primary mt-2 font-medium">
                        👉 https://typemasterai.com
                      </p>
                      <p className="text-xs text-muted-foreground">
                        #TypingSpeed #TypeMasterAI #ProductivitySkills #WPM
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const rating = getPerformanceRating();
                      const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                      const text = `${rating.emoji} New Record: ${wpm} WPM!\n\n⚡ Speed: ${wpm} Words Per Minute\n✨ Accuracy: ${accuracy}%\n🏆 Level: ${rating.title}\n🎯 Badge: ${rating.badge}\n⏱️ Time: ${modeDisplay}\n🌐 Language: ${LANGUAGE_NAMES[language]}\n\nCan you beat this score? Take the challenge! 🚀\n\n👉 https://typemasterai.com\n\n#TypingSpeed #TypeMasterAI #ProductivitySkills #WPM`;
                      navigator.clipboard.writeText(text);
                      toast({ title: "Message Copied!", description: "Share message copied to clipboard" });
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 transition-colors"
                    data-testid="button-copy-message"
                  >
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>

                {/* Quick Share Buttons - One Click Share */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-center text-muted-foreground uppercase tracking-wide">
                    Click to Share Instantly
                  </p>
                  <div className="grid grid-cols-3 gap-2">
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
                      onClick={() => {
                        const rating = getPerformanceRating();
                        const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                        const title = encodeURIComponent(`${rating.emoji} Hit ${wpm} WPM with ${accuracy}% accuracy on TypeMasterAI - What's your typing speed?`);
                        window.open(`https://www.reddit.com/submit?url=${encodeURIComponent('https://typemasterai.com')}&title=${title}`, '_blank', 'width=600,height=600');
                        trackShare('quick_reddit');
                      }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#FF4500]/10 hover:bg-[#FF4500]/25 border border-[#FF4500]/20 transition-all group"
                      data-testid="button-share-reddit"
                    >
                      <svg className="w-4 h-4 text-[#FF4500]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                      </svg>
                      <span className="text-xs font-medium">Reddit</span>
                    </button>
                    <button
                      onClick={() => {
                        const rating = getPerformanceRating();
                        const text = `${rating.emoji} Just hit ${wpm} WPM (${accuracy}% accuracy) on TypeMasterAI!\n\n🏆 ${rating.title} | ${rating.badge} Badge\n\nCan you beat it? 🎯`;
                        window.open(`https://t.me/share/url?url=${encodeURIComponent('https://typemasterai.com')}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
                        trackShare('quick_telegram');
                      }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/25 border border-[#0088cc]/20 transition-all group"
                      data-testid="button-share-telegram"
                    >
                      <Send className="w-4 h-4 text-[#0088cc]" />
                      <span className="text-xs font-medium">Telegram</span>
                    </button>
                    <button
                      onClick={() => {
                        const rating = getPerformanceRating();
                        const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                        const subject = encodeURIComponent(`${rating.emoji} My TypeMasterAI Result: ${wpm} WPM!`);
                        const body = encodeURIComponent(`Hi there!\n\nI just completed a typing test on TypeMasterAI and wanted to share my results with you:\n\n📊 MY RESULTS:\n━━━━━━━━━━━━━━━\n⚡ Typing Speed: ${wpm} Words Per Minute\n✨ Accuracy: ${accuracy}%\n🏆 Performance Level: ${rating.title}\n🎯 Badge Earned: ${rating.badge}\n⏱️ Test Duration: ${modeDisplay}\n🌐 Language: ${LANGUAGE_NAMES[language]}\n\nWant to test your typing speed? It's fun and you might be surprised by your results!\n\n👉 Try it here: https://typemasterai.com\n\nCheers!`);
                        window.open(`mailto:?subject=${subject}&body=${body}`);
                        trackShare('quick_email');
                      }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-500/10 hover:bg-gray-500/25 border border-gray-500/20 transition-all group"
                      data-testid="button-share-email"
                    >
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-medium">Email</span>
                    </button>
                  </div>
                </div>

                {/* Shareable Link for logged in users */}
                {user && lastResultId && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-center text-muted-foreground uppercase tracking-wide">
                      Permanent Link
                    </p>
                    {!shareUrl ? (
                      <button
                        onClick={createShareLink}
                        disabled={isCreatingShare}
                        className="w-full py-2.5 bg-primary/10 text-primary font-medium rounded-lg hover:bg-primary/20 transition-colors flex items-center justify-center gap-2 border border-primary/20"
                        data-testid="button-create-share-link"
                      >
                        <Link2 className="w-4 h-4" />
                        {isCreatingShare ? "Creating..." : "Create Shareable Link"}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={shareUrl}
                          readOnly
                          className="flex-1 px-3 py-2 bg-muted/50 border rounded-lg text-sm font-mono"
                          data-testid="input-share-url"
                        />
                        <button
                          onClick={copyShareLink}
                          className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                          data-testid="button-copy-link"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Native Share - More Options */}
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

              {/* Certificate Tab - Only for logged in users */}
              {user && (
                <TabsContent value="certificate" className="space-y-4">
                  <div className="text-center space-y-2 mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/30 mb-2">
                      <Award className="w-8 h-8 text-yellow-400" />
                    </div>
                    <h3 className="text-lg font-bold">Share Your Certificate</h3>
                    <p className="text-sm text-muted-foreground">
                      Show off your official TypeMasterAI Certificate of Achievement!
                    </p>
                  </div>

                  {/* Certificate Stats Preview */}
                  <div className="p-4 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-purple-500/10 rounded-xl border border-yellow-500/20">
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
                        <p className="text-sm font-bold text-yellow-400">{getPerformanceRating().badge}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Duration</p>
                        <p className="text-sm font-bold">{mode >= 60 ? `${Math.floor(mode / 60)} min` : `${mode}s`}</p>
                      </div>
                    </div>
                  </div>

                  {/* Hidden pre-rendered certificate to enable sharing without viewing */}
                  {user && lastResultSnapshot && (
                    <div className="absolute -z-50 w-0 h-0 overflow-hidden opacity-0 pointer-events-none" aria-hidden="true">
                      <CertificateGenerator
                        username={user.username}
                        wpm={lastResultSnapshot.wpm}
                        accuracy={lastResultSnapshot.accuracy}
                        mode={lastResultSnapshot.mode}
                        date={new Date(lastResultSnapshot.completionDate)}
                        freestyle={lastResultSnapshot.freestyle}
                        characters={lastResultSnapshot.characters}
                        words={lastResultSnapshot.words}
                        consistency={lastResultSnapshot.consistency}
                        verificationId={lastResultSnapshot.verificationId}
                      />
                    </div>
                  )}

                  {/* View & Share Certificate Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowCertificate(true)}
                      className="py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
                      data-testid="button-view-certificate-share"
                    >
                      <Award className="w-5 h-5" />
                      View Certificate
                    </button>
                    <button
                      onClick={copyCertificateToClipboard}
                      className="py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-green-500/25"
                      data-testid="button-copy-certificate-image"
                    >
                      {certificateImageCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      {certificateImageCopied ? "Copied!" : "Copy Image"}
                    </button>
                  </div>

                  {/* Share Certificate with Image Button */}
                  {'share' in navigator && (
                    <button
                      onClick={shareCertificateWithImage}
                      disabled={isSharingCertificate}
                      className="w-full py-4 bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="button-share-certificate-with-image"
                    >
                      <Share2 className="w-5 h-5" />
                      {isSharingCertificate ? "Preparing..." : "Share Certificate with Image"}
                    </button>
                  )}

                  {/* Certificate Share Message Preview */}
                  <div className="relative">
                    <div className="absolute -top-2 left-3 px-2 bg-background text-xs font-medium text-muted-foreground">
                      Certificate Share Message
                    </div>
                    <div className="p-4 bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-xl border border-yellow-500/20 text-sm leading-relaxed">
                      <div className="space-y-2">
                        <p className="text-base font-medium">
                          🎓 <span className="text-yellow-400 font-bold">CERTIFIED: {wpm} WPM Achievement!</span>
                        </p>
                        <p className="text-muted-foreground">
                          ⚡ Speed: <span className="text-foreground font-semibold">{wpm} WPM</span>
                        </p>
                        <p className="text-muted-foreground">
                          ✨ Accuracy: <span className="text-foreground font-semibold">{accuracy}%</span>
                        </p>
                        <p className="text-muted-foreground">
                          🏆 Level: <span className="text-yellow-400 font-semibold">{getPerformanceRating().title}</span>
                        </p>
                        <p className="text-muted-foreground">
                          🎯 Badge: <span className="text-foreground font-semibold">{getPerformanceRating().badge}</span>
                        </p>
                        <p className="text-muted-foreground">
                          ⏱️ Test: <span className="text-foreground font-semibold">{mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`}</span>
                        </p>
                        <p className="text-primary/80 text-xs mt-3 font-medium">
                          Official typing certificate earned! Get yours 👇
                        </p>
                        <p className="text-xs text-primary mt-2 font-medium">
                          🔗 https://typemasterai.com
                        </p>
                        <p className="text-xs text-muted-foreground">
                          #TypeMasterAI #TypingCertificate #DigitalSkills #Certified
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const rating = getPerformanceRating();
                        const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                        const text = `🎓 Just earned my TypeMasterAI Certificate! ${wpm} WPM with ${accuracy}% accuracy 🎯

Official certificate unlocked!

🔗 https://typemasterai.com

#TypeMasterAI #Certified`;
                        navigator.clipboard.writeText(text);
                        toast({ title: "Certificate Message Copied!", description: "Paste into your social media post" });
                      }}
                      className="absolute top-3 right-3 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 transition-colors"
                      data-testid="button-copy-cert-message"
                    >
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Certificate Social Share Buttons */}
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-center text-muted-foreground uppercase tracking-wide">
                      Share Certificate On
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          const rating = getPerformanceRating();
                          const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                          const text = encodeURIComponent(`🎓 Just earned my TypeMasterAI Certificate! ${wpm} WPM with ${accuracy}% accuracy 🎯

Official certificate unlocked!

#TypeMasterAI #Certified`);
                          window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent('https://typemasterai.com')}`, '_blank', 'width=600,height=400');
                          trackShare('certificate_twitter');
                        }}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/20 transition-all"
                        data-testid="button-cert-share-twitter"
                      >
                        <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                        <span className="text-xs font-medium">X (Twitter)</span>
                      </button>
                      <button
                        onClick={() => {
                          const rating = getPerformanceRating();
                          const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                          const text = encodeURIComponent(`🎓 I just earned my official TypeMasterAI Certificate!

Achieved ${wpm} WPM with ${accuracy}% accuracy! This is such a proud moment. 🎯

📜 What I certified:
• ${rating.title} performance level
• ${rating.badge} Badge earned
• Completed ${modeDisplay} assessment

I never thought I'd get an official certificate for typing, but here we are! If you've been putting off testing your skills, this is your sign to try it.

Ready to earn yours? 🚀`);
                          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://typemasterai.com')}&quote=${text}`, '_blank', 'width=600,height=400');
                          trackShare('certificate_facebook');
                        }}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/25 border border-[#1877F2]/20 transition-all"
                        data-testid="button-cert-share-facebook"
                      >
                        <Facebook className="w-4 h-4 text-[#1877F2]" />
                        <span className="text-xs font-medium">Facebook</span>
                      </button>
                      <button
                        onClick={() => {
                          const rating = getPerformanceRating();
                          const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                          const text = encodeURIComponent(`Professional Typing Certification Achieved

Excited to share that I've earned an official TypeMasterAI Certificate of Achievement, validating my typing proficiency and digital communication skills.

Certification Metrics:
▸ Typing Speed: ${wpm} Words Per Minute
▸ Accuracy Rate: ${accuracy}%
▸ Performance Level: ${rating.title}
▸ Achievement Badge: ${rating.badge}
▸ Assessment Duration: ${modeDisplay}
▸ Certification Date: ${new Date().toLocaleDateString()}

In today's digital workplace, typing efficiency is a foundational productivity skill. This certification demonstrates measurable proficiency in written communication speed and accuracy—skills that directly impact daily work effectiveness.

Investing time in foundational skills often yields the highest returns in productivity gains.

#ProfessionalDevelopment #Productivity`);
                          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://typemasterai.com')}`, '_blank', 'width=600,height=400');
                          trackShare('certificate_linkedin');
                        }}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0A66C2]/10 hover:bg-[#0A66C2]/25 border border-[#0A66C2]/20 transition-all"
                        data-testid="button-cert-share-linkedin"
                      >
                        <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                        <span className="text-xs font-medium">LinkedIn</span>
                      </button>
                      <button
                        onClick={() => {
                          const rating = getPerformanceRating();
                          const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                          const waText = `*TypeMasterAI Certificate*\n\nSpeed: *${wpm} WPM*\nAccuracy: *${accuracy}%*\nLevel: ${rating.title}\nBadge: ${rating.badge}\nDuration: ${modeDisplay} test\n\nGet yours: https://typemasterai.com`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank', 'width=600,height=400');
                          trackShare('certificate_whatsapp');
                        }}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/25 border border-[#25D366]/20 transition-all"
                        data-testid="button-cert-share-whatsapp"
                      >
                        <MessageCircle className="w-4 h-4 text-[#25D366]" />
                        <span className="text-xs font-medium">WhatsApp</span>
                      </button>
                      <button
                        onClick={() => {
                          const rating = getPerformanceRating();
                          const text = `🎓 CERTIFIED!\n\n⚡ ${wpm} WPM | ✨ ${accuracy}% Accuracy\n🏆 ${rating.title} | 🎯 ${rating.badge} Badge\n\nJust earned my official TypeMasterAI Certificate! Can you beat it? 😎`;
                          window.open(`https://t.me/share/url?url=${encodeURIComponent('https://typemasterai.com')}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
                          trackShare('certificate_telegram');
                        }}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/25 border border-[#0088cc]/20 transition-all"
                        data-testid="button-cert-share-telegram"
                      >
                        <Send className="w-4 h-4 text-[#0088cc]" />
                        <span className="text-xs font-medium">Telegram</span>
                      </button>
                      <button
                        onClick={() => {
                          const rating = getPerformanceRating();
                          const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                          const subject = encodeURIComponent(`🎓 TypeMasterAI Certificate Earned | ${wpm} WPM Achievement`);
                          const body = encodeURIComponent(`Hello!\n\nI'm excited to share that I've earned an official TypeMasterAI Certificate of Achievement!\n\n📜 CERTIFICATE DETAILS:\n━━━━━━━━━━━━━━━━━━━━\n⚡ Typing Speed: ${wpm} Words Per Minute\n✨ Accuracy Rate: ${accuracy}%\n🏆 Performance Level: ${rating.title}\n🎯 Badge Earned: ${rating.badge}\n⏱️ Test Duration: ${modeDisplay}\n📅 Date: ${new Date().toLocaleDateString()}\n\nThis certification validates my typing proficiency and demonstrates measurable skill development. TypeMasterAI provides comprehensive typing assessments with official certificates for achieved milestones.\n\nInterested in testing your own typing speed? You might be surprised by your results!\n\n👉 Get certified: https://typemasterai.com\n\nBest regards!`);
                          window.open(`mailto:?subject=${subject}&body=${body}`);
                          trackShare('certificate_email');
                        }}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-500/10 hover:bg-gray-500/25 border border-gray-500/20 transition-all"
                        data-testid="button-cert-share-email"
                      >
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-medium">Email</span>
                      </button>
                    </div>
                  </div>

                  {/* Certificate Sharing Tips */}
                  <div className="space-y-2">
                    <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                      <p className="text-xs text-center text-muted-foreground">
                        📱 <span className="font-medium text-foreground">Mobile:</span> Use "Share Certificate with Image" to attach the certificate directly!
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
                      <p className="text-xs text-center text-muted-foreground">
                        💻 <span className="font-medium text-foreground">Desktop:</span> Use "Copy Image" then paste directly into Twitter, LinkedIn, Discord, or any social media!
                      </p>
                    </div>
                  </div>
                </TabsContent>
              )}

              {/* Visual Card Tab */}
              <TabsContent value="card" className="space-y-4">
                {isFinished && lastResultSnapshot && (
                  <ShareCard
                    wpm={lastResultSnapshot.wpm}
                    accuracy={lastResultSnapshot.accuracy}
                    mode={lastResultSnapshot.mode}
                    language={language}
                    username={user?.username}
                    freestyle={lastResultSnapshot.freestyle}
                    consistency={lastResultSnapshot.consistency}
                    words={lastResultSnapshot.words}
                    characters={lastResultSnapshot.characters}
                    onShareTracked={trackShare}
                  />
                )}
              </TabsContent>

              {/* Challenge Tab */}
              <TabsContent value="challenge" className="space-y-4">
                <div className="text-center space-y-2 mb-4">
                  <div className="text-4xl">🎯</div>
                  <h3 className="text-lg font-bold">Challenge a Friend</h3>
                  <p className="text-sm text-muted-foreground">
                    Send a personalized challenge and see if they can beat your score!
                  </p>
                </div>

                {/* Challenge Link Generator */}
                <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Your Score to Beat:</span>
                      <span className="text-lg font-bold text-primary">{wpm} WPM</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Accuracy Target:</span>
                      <span className="text-lg font-bold text-green-400">{accuracy}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Test Duration:</span>
                      <span className="text-lg font-bold text-purple-400">
                        {mode >= 60 ? `${Math.floor(mode / 60)} min` : `${mode}s`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Challenge Share Buttons */}
                <div className="space-y-2">
                  <p className="text-xs text-center text-muted-foreground uppercase tracking-wide">
                    Send Challenge Via
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        const rating = getPerformanceRating();
                        const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                        const text = encodeURIComponent(`${rating.emoji} I just hit ${wpm} WPM! Can you beat my score? 🎯

Challenge accepted?

#TypeMasterAI #Challenge`);
                        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent('https://typemasterai.com')}`, '_blank', 'width=600,height=400');
                        trackShare('challenge_twitter');
                      }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/20 transition-all"
                      data-testid="button-challenge-twitter"
                    >
                      <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                      <span className="text-xs font-medium">X (Twitter)</span>
                    </button>
                    <button
                      onClick={() => {
                        const rating = getPerformanceRating();
                        const text = encodeURIComponent(`🎯 Typing Challenge Alert!

I just scored ${wpm} WPM with ${accuracy}% accuracy on TypeMasterAI! ${rating.emoji}

I'm challenging YOU! Think you can type faster than me? There's only one way to find out...

Do you accept the challenge? 😏🔥`);
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://typemasterai.com')}&quote=${text}`, '_blank', 'width=600,height=400');
                        trackShare('challenge_facebook');
                      }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/25 border border-[#1877F2]/20 transition-all"
                      data-testid="button-challenge-facebook"
                    >
                      <Facebook className="w-4 h-4 text-[#1877F2]" />
                      <span className="text-xs font-medium">Facebook</span>
                    </button>
                    <button
                      onClick={() => {
                        const rating = getPerformanceRating();
                        const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                        const text = encodeURIComponent(`Typing Speed Benchmark Challenge

I recently completed a typing assessment achieving ${wpm} WPM with ${accuracy}% accuracy (${rating.title} level).

Interested in comparing your typing speed? This quick assessment provides objective metrics on typing efficiency—a useful baseline for anyone looking to improve their digital communication productivity.

Test duration: ${modeDisplay}

#ProfessionalDevelopment #Productivity`);
                        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://typemasterai.com')}`, '_blank', 'width=600,height=400');
                        trackShare('challenge_linkedin');
                      }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0A66C2]/10 hover:bg-[#0A66C2]/25 border border-[#0A66C2]/20 transition-all"
                      data-testid="button-challenge-linkedin"
                    >
                      <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                      <span className="text-xs font-medium">LinkedIn</span>
                    </button>
                    <button
                      onClick={() => {
                        const rating = getPerformanceRating();
                        const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                        const waChallenge = `*TypeMasterAI Challenge*\n\nMy Score: *${wpm} WPM*\nAccuracy: *${accuracy}%*\nDuration: ${modeDisplay} test\nBadge: ${rating.badge}\n\nBeat my score: https://typemasterai.com`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(waChallenge)}`, '_blank', 'width=600,height=400');
                        trackShare('challenge_whatsapp');
                      }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/25 border border-[#25D366]/20 transition-all"
                      data-testid="button-challenge-whatsapp"
                    >
                      <MessageCircle className="w-4 h-4 text-[#25D366]" />
                      <span className="text-xs font-medium">WhatsApp</span>
                    </button>
                    <button
                      onClick={() => {
                        const title = encodeURIComponent(`I challenge you to beat my ${wpm} WPM typing score!`);
                        window.open(`https://www.reddit.com/submit?url=${encodeURIComponent('https://typemasterai.com')}&title=${title}`, '_blank', 'width=600,height=600');
                        trackShare('challenge_reddit');
                      }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#FF4500]/10 hover:bg-[#FF4500]/25 border border-[#FF4500]/20 transition-all"
                      data-testid="button-challenge-reddit"
                    >
                      <svg className="w-4 h-4 text-[#FF4500]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                      </svg>
                      <span className="text-xs font-medium">Reddit</span>
                    </button>
                    <button
                      onClick={() => {
                        const rating = getPerformanceRating();
                        const text = `🎯 TYPING CHALLENGE!\n\n${rating.emoji} Can you beat my ${wpm} WPM with ${accuracy}% accuracy?\n\nAccept the challenge:`;
                        window.open(`https://t.me/share/url?url=${encodeURIComponent('https://typemasterai.com')}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
                        trackShare('challenge_telegram');
                      }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/25 border border-[#0088cc]/20 transition-all"
                      data-testid="button-challenge-telegram"
                    >
                      <Send className="w-4 h-4 text-[#0088cc]" />
                      <span className="text-xs font-medium">Telegram</span>
                    </button>
                    <button
                      onClick={() => {
                        const rating = getPerformanceRating();
                        const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                        const subject = encodeURIComponent(`🎯 Typing Challenge: Can you beat my ${wpm} WPM?`);
                        const body = encodeURIComponent(`Hey!\n\n🎯 I CHALLENGE YOU!\n\n${rating.emoji} Can you beat my typing score?\n\n⌨️ My Score: ${wpm} WPM\n✨ Accuracy: ${accuracy}%\n⏱️ ${modeDisplay} test\n🏅 ${rating.badge} Badge\n\nAccept the challenge and prove your typing skills!\n\n🔗 https://typemasterai.com\n\nGood luck! 🎯`);
                        window.open(`mailto:?subject=${subject}&body=${body}`);
                        trackShare('challenge_email');
                      }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-500/10 hover:bg-gray-500/25 border border-gray-500/20 transition-all"
                      data-testid="button-challenge-email"
                    >
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-medium">Email</span>
                    </button>
                  </div>

                  {/* Copy Challenge Link */}
                  <button
                    onClick={() => {
                      const rating = getPerformanceRating();
                      const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                      const text = `🎯 TYPING CHALLENGE!\n\nCan you beat my score?\n\n${rating.emoji} My Score: ${wpm} WPM\n✨ Accuracy: ${accuracy}%\n⏱️ ${modeDisplay} test\n\n🏅 Beat me to claim the ${rating.badge} Badge!\n\n🔗 Accept the challenge: https://typemasterai.com`;
                      navigator.clipboard.writeText(text);
                      toast({ title: "Challenge Copied!", description: "Send it to your friends!" });
                      trackShare('challenge_copy');
                    }}
                    className="w-full py-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 text-foreground font-medium rounded-xl hover:from-yellow-500/20 hover:to-orange-500/20 transition-all flex items-center justify-center gap-2 border border-yellow-500/20"
                    data-testid="button-copy-challenge"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Challenge Message
                  </button>
                </div>

                {/* Fun Stats */}
                <div className="pt-3 border-t border-border/50 text-center">
                  <p className="text-xs text-muted-foreground">
                    {wpm >= 80 ? "🔥 That's faster than 95% of typists!" :
                      wpm >= 60 ? "💪 That's faster than 75% of typists!" :
                        wpm >= 40 ? "⚡ You're above average!" :
                          "🌱 Keep practicing to improve!"}
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Change Confirmation Dialog */}
        <AlertDialog open={showChangeConfirm} onOpenChange={setShowChangeConfirm}>
          <AlertDialogContent>
            <UIAlertDialogHeader>
              <UIAlertDialogTitle>{changeTitle}</UIAlertDialogTitle>
              <AlertDialogDescription>
                {changeDescription}
              </AlertDialogDescription>
            </UIAlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmChange}>{changeConfirmLabel}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
