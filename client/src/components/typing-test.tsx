import { useState, useEffect, useRef, useCallback } from "react";
import { generateText, calculateWPM, calculateAccuracy } from "@/lib/typing-utils";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Zap, Target, Clock, Globe, BookOpen, Sparkles, Award, Share2, Twitter, Facebook, MessageCircle, Copy, Check, Link2, Linkedin, Mail, Send, AlertCircle, Loader2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { KeystrokeTracker } from "@/lib/keystroke-tracker";

type TestMode = 15 | 30 | 45 | 60 | 90 | 120 | 180 | number;

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

export default function TypingTest() {
  const { user } = useAuth();
  const { toast } = useToast();
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
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(mode);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errors, setErrors] = useState(0);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [testCompletionDate, setTestCompletionDate] = useState<Date>(new Date());
  const [showShareModal, setShowShareModal] = useState(false);
  const [lastResultId, setLastResultId] = useState<number | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [smoothCaret, setSmoothCaret] = useState(true);
  const [caretSpeed, setCaretSpeed] = useState<'off' | 'fast' | 'medium' | 'smooth'>('medium');
  const [quickRestart, setQuickRestart] = useState(true);
  const [cursorPosition, setCursorPosition] = useState({ left: 0, top: 0, height: 40 });
  const [isTypingFast, setIsTypingFast] = useState(false);
  const lastKeystrokeTimeRef = useRef<number>(0);
  const [isComposing, setIsComposing] = useState(false);
  const [paragraphError, setParagraphError] = useState<string | null>(null);
  const [fetchRetryCount, setFetchRetryCount] = useState(0);
  const MAX_RETRY_ATTEMPTS = 3;
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const keystrokeTrackerRef = useRef<KeystrokeTracker | null>(null);
  const pendingFetchesRef = useRef(0);
  const latestRequestIdRef = useRef(0);
  const appliedRequestIdRef = useRef(0);
  const [trackingEnabled, setTrackingEnabled] = useState(true);

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
          title: "🤖 Generating New Paragraph...",
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
      
      // Calculate how many words needed for the selected time
      // Average typing speed is ~40 WPM, so multiply mode (seconds) by expected WPM/60
      const wordsNeeded = Math.ceil((mode / 60) * 50); // 50 WPM as baseline
      const currentWords = paragraphText.split(/\s+/).length;
      
      // If paragraph is too short for the time mode, repeat it
      let extendedText = paragraphText;
      if (currentWords < wordsNeeded) {
        const repetitionsNeeded = Math.ceil(wordsNeeded / currentWords);
        extendedText = Array(repetitionsNeeded).fill(paragraphText).join(" ");
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

  const [pendingResult, setPendingResult] = useState<{ wpm: number; accuracy: number; mode: number; characters: number; errors: number } | null>(null);

  const saveResultMutation = useMutation({
    mutationFn: async (result: { wpm: number; accuracy: number; mode: number; characters: number; errors: number }) => {
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
      setPendingResult(null);
      toast({
        title: "Test Saved!",
        description: "Your result has been saved to your profile.",
      });
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

  const resetTest = useCallback(async () => {
    // Reset test state first
    setUserInput("");
    setStartTime(null);
    setTimeLeft(mode);
    setIsActive(false);
    setIsFinished(false);
    setWpm(0);
    setAccuracy(100);
    setShowAuthPrompt(false);
    setShowShareModal(false);
    setShareUrl("");
    setLastResultId(null);
    
    // Clear keystroke tracker to start fresh
    keystrokeTrackerRef.current = null;
    
    // Use fetchParagraph with forceGenerate to centralize counter logic
    await fetchParagraph(false, true);
    
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 100);
  }, [mode, fetchParagraph]);

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
          mode: 'typing-test',
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

  const getPerformanceRating = () => {
    if (wpm >= 100 && accuracy >= 98) return { emoji: "🏆", title: "Legendary Typist", badge: "Diamond" };
    if (wpm >= 80 && accuracy >= 95) return { emoji: "⚡", title: "Speed Demon", badge: "Platinum" };
    if (wpm >= 60 && accuracy >= 90) return { emoji: "🔥", title: "Fast & Accurate", badge: "Gold" };
    if (wpm >= 40 && accuracy >= 85) return { emoji: "💪", title: "Solid Performance", badge: "Silver" };
    return { emoji: "🎯", title: "Rising Star", badge: "Bronze" };
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
      twitter: `${rating.emoji} Just achieved ${wpm} WPM with ${accuracy}% accuracy on TypeMasterAI!

⌨️ ${rating.title} | ${rating.badge} Badge
⏱️ ${modeDisplay} test
🌐 ${LANGUAGE_NAMES[language]}

Think you can beat me? 🎮

#TypingTest #TypeMasterAI #WPM`,
      
      facebook: `${rating.emoji} I just achieved ${wpm} Words Per Minute with ${accuracy}% accuracy on TypeMasterAI!

🏅 ${rating.title} - ${rating.badge} Badge Earned!
⏱️ ${modeDisplay} typing test
🌐 Language: ${LANGUAGE_NAMES[language]}

Challenge yourself and see how fast you can type! 🚀`,
      
      linkedin: `Excited to share my typing achievement! ${rating.emoji}

📊 Performance Stats:
• Speed: ${wpm} Words Per Minute
• Accuracy: ${accuracy}%
• Duration: ${modeDisplay} test
• Rating: ${rating.title} (${rating.badge})

Continuous improvement in professional skills matters. TypeMasterAI helps track and improve typing efficiency.

#ProfessionalDevelopment #Productivity #TypingSkills #TypeMasterAI`,
      
      whatsapp: `${rating.emoji} Check out my typing score on TypeMasterAI!

⌨️ *${wpm} WPM* | *${accuracy}% Accuracy*
🏅 ${rating.title} - ${rating.badge} Badge
⏱️ ${modeDisplay} test

Can you beat my score? Try it here: `,
    };
    
    const shareText = shareTexts[platform] || shareTexts.twitter;
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(siteUrl);
    
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedText}${encodedUrl}`,
    };
    
    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
      trackShare(platform);
    }
  };

  const handleNativeShare = async () => {
    const rating = getPerformanceRating();
    const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
    const shareText = `${rating.emoji} I scored ${wpm} WPM with ${accuracy}% accuracy on TypeMasterAI!\n\n🏅 ${rating.title} - ${rating.badge} Badge\n⏱️ ${modeDisplay} test\n\nCan you beat my score?`;
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

  // Initial setup and when time mode changes
  useEffect(() => {
    fetchParagraph();
    setUserInput("");
    setOriginalText("");
    setStartTime(null);
    setTimeLeft(mode);
    setIsActive(false);
    setIsFinished(false);
    setWpm(0);
    setAccuracy(100);
    // Clear keystroke tracker for new test
    keystrokeTrackerRef.current = null;
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
  }, [mode]);

  // Fetch new paragraph when language, paragraph mode, or difficulty changes
  useEffect(() => {
    if (text) {
      fetchParagraph();
      setUserInput("");
      setOriginalText("");
      setStartTime(null);
      setIsActive(false);
      setIsFinished(false);
      setWpm(0);
      setAccuracy(100);
      // Clear keystroke tracker for new test
      keystrokeTrackerRef.current = null;
    }
  }, [language, paragraphMode, difficulty]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      finishTest();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Calculate live stats
  useEffect(() => {
    if (isActive && startTime) {
      const chars = userInput.length;
      const errorCount = userInput.split("").filter((char, i) => char !== text[i]).length;
      const correctChars = chars - errorCount;
      const timeElapsed = (Date.now() - startTime) / 1000;
      
      setWpm(calculateWPM(correctChars, timeElapsed));
      setAccuracy(calculateAccuracy(correctChars, chars));
      setErrors(errorCount);
    }
  }, [userInput, isActive, startTime, text]);

  const finishTest = (completedNaturally = true) => {
    setIsActive(false);
    setIsFinished(true);
    setTestCompletionDate(new Date());
    
    // For timed tests that complete naturally (timer reaches 0), use the mode duration
    // This ensures WPM matches the standard formula: (chars/5) / minutes
    // Using Date.now() - startTime can drift due to setInterval inaccuracy
    const elapsedSeconds = completedNaturally ? mode : (startTime ? (Date.now() - startTime) / 1000 : mode);
    const chars = userInput.length;
    const errorCount = userInput.split("").filter((char, i) => char !== text[i]).length;
    const correctChars = chars - errorCount;
    const finalWpm = calculateWPM(correctChars, elapsedSeconds);
    const finalAccuracy = calculateAccuracy(correctChars, chars);
    const finalErrors = errorCount;
    
    // Update state with precise final values
    setWpm(finalWpm);
    setAccuracy(finalAccuracy);
    setErrors(finalErrors);
    
    // Safe confetti call with error handling
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
        characters: userInput.length,
        errors: finalErrors,
      };
      
      saveResultMutation.mutate(testData);
      
      // Save keystroke analytics if tracking is enabled
      if (trackingEnabled && keystrokeTrackerRef.current) {
        try {
          const rawWpm = calculateWPM(userInput.length, elapsedSeconds);
          const analytics = keystrokeTrackerRef.current.computeAnalytics(
            finalWpm,
            rawWpm,
            finalAccuracy,
            finalErrors,
            null
          );
          
          // Save analytics to backend
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
  };

  const processInput = (value: string) => {
    if (isFinished) return;
    if (!text) return;
    
    const previousLength = userInput.length;
    const now = Date.now();
    
    // Track typing speed to disable smooth animation during fast typing
    if (value.length > previousLength) {
      const timeSinceLastKeystroke = now - lastKeystrokeTimeRef.current;
      lastKeystrokeTimeRef.current = now;
      
      // If typing faster than 80ms between keystrokes, disable smooth animation temporarily
      if (timeSinceLastKeystroke < 80 && timeSinceLastKeystroke > 0) {
        setIsTypingFast(true);
      } else {
        setIsTypingFast(false);
      }
    }
    
    // Play keyboard sound on keystroke (only when adding characters, not deleting)
    if (value.length > previousLength) {
      import('@/lib/keyboard-sounds')
        .then((module) => {
          if (module.keyboardSound && typeof module.keyboardSound.play === 'function') {
            module.keyboardSound.play();
          }
        })
        .catch((error) => {
          console.warn('Keyboard sound failed to load:', error);
        });
    }
    
    if (!isActive && value.length === 1) {
      setIsActive(true);
      setStartTime(now);
    }

    setUserInput(value);

    // If approaching end of text and time still remaining, extend the paragraph
    if (value.length >= text.length - 20 && timeLeft > 5 && originalText) {
      const newText = text + " " + originalText;
      setText(newText);
      // Update tracker's expected text when paragraph extends
      if (keystrokeTrackerRef.current) {
        keystrokeTrackerRef.current.expectedText = newText;
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isComposing) return;
    processInput(e.target.value);
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false);
    if (e.data && inputRef.current) {
      const newValue = userInput + e.data;
      inputRef.current.value = newValue;
      setTimeout(() => {
        processInput(newValue);
      }, 0);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    toast({
      title: "Paste Disabled",
      description: "Please type manually for accurate results",
      variant: "default",
    });
  };

  const handleCut = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
  };

  // Load typing behavior settings on mount
  useEffect(() => {
    const smoothCaretSetting = localStorage.getItem('smoothCaret');
    const caretSpeedSetting = localStorage.getItem('caretSpeed');
    const quickRestartSetting = localStorage.getItem('quickRestart');
    
    if (smoothCaretSetting !== null) {
      setSmoothCaret(smoothCaretSetting === 'true');
    }
    if (caretSpeedSetting !== null && ['off', 'fast', 'medium', 'smooth'].includes(caretSpeedSetting)) {
      setCaretSpeed(caretSpeedSetting as 'off' | 'fast' | 'medium' | 'smooth');
    }
    if (quickRestartSetting !== null) {
      setQuickRestart(quickRestartSetting === 'true');
    }
  }, []);

  // Update cursor position based on typing progress and layout changes
  const updateCursorPosition = useCallback(() => {
    // Use requestAnimationFrame to ensure DOM has updated before measuring
    requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      
      // Find the character element at current position
      let charElement = document.querySelector(`[data-char-index="${userInput.length}"]`) as HTMLElement;
      
      // If we're at the end of text (all characters typed), position cursor after the last character
      if (!charElement && userInput.length > 0 && text) {
        const lastCharElement = document.querySelector(`[data-char-index="${text.length - 1}"]`) as HTMLElement;
        if (lastCharElement) {
          const containerRect = container.getBoundingClientRect();
          const charRect = lastCharElement.getBoundingClientRect();
          const scrollTop = container.scrollTop;
          
          // Position cursor AFTER the last character (add character width to left position)
          const relativeLeft = charRect.right - containerRect.left;
          const relativeTop = charRect.top - containerRect.top + scrollTop;
          const height = charRect.height || 40;
          
          setCursorPosition(prev => {
            if (prev.left === relativeLeft && prev.top === relativeTop && prev.height === height) {
              return prev;
            }
            return { left: relativeLeft, top: relativeTop, height };
          });
          return;
        }
      }
      
      if (charElement) {
        const charRect = charElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const scrollTop = container.scrollTop;
        
        // Calculate position relative to container, accounting for scroll
        const relativeLeft = charRect.left - containerRect.left;
        const relativeTop = charRect.top - containerRect.top + scrollTop;
        const height = charRect.height || 40;
        
        // Only update if position actually changed (prevents unnecessary re-renders)
        setCursorPosition(prev => {
          if (prev.left === relativeLeft && prev.top === relativeTop && prev.height === height) {
            return prev;
          }
          return { left: relativeLeft, top: relativeTop, height };
        });
        
        // Auto-scroll: Keep cursor in the top third of visible area
        // This ensures user can always see upcoming text below the cursor
        const cursorTopRelative = charRect.top - containerRect.top;
        const containerHeight = container.clientHeight;
        const idealCursorPosition = containerHeight * 0.3; // Keep cursor at 30% from top
        
        // If cursor is below the ideal position, scroll to bring it up
        if (cursorTopRelative > idealCursorPosition) {
          const scrollAmount = cursorTopRelative - idealCursorPosition;
          container.scrollTop = scrollTop + scrollAmount;
        }
        // If cursor is above view (e.g., using backspace), scroll up
        else if (cursorTopRelative < 0) {
          container.scrollTop = scrollTop + cursorTopRelative - 20; // Small padding at top
        }
      } else {
        // No input yet - position at start
        const firstChar = document.querySelector(`[data-char-index="0"]`) as HTMLElement;
        const height = firstChar?.getBoundingClientRect().height || 40;
        setCursorPosition(prev => {
          if (prev.left === 0 && prev.top === 0 && prev.height === height) return prev;
          return { left: 0, top: 0, height };
        });
        // Reset scroll to top when starting fresh
        container.scrollTop = 0;
      }
    });
  }, [userInput.length, text]);

  useEffect(() => {
    updateCursorPosition();
  }, [updateCursorPosition, text]);

  // Recalculate cursor position on resize/layout changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      updateCursorPosition();
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [updateCursorPosition]);

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
      
      // Get the current tracker position (what we're about to type)
      const currentPos = keystrokeTrackerRef.current.currentPosition;
      const expectedKey = text[currentPos] || null;
      const isCorrect = key === expectedKey;
      
      keystrokeTrackerRef.current.onKeyUp(key, e.code, timestamp, isCorrect);
      
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

  // Quick restart with Tab key (only when typing input is focused)
  useEffect(() => {
    if (!quickRestart) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only restart if Tab is pressed, no modifiers, and the typing input is focused
      if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const activeElement = document.activeElement;
        if (activeElement === inputRef.current) {
          e.preventDefault();
          resetTest();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [quickRestart, resetTest]);

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

  // Render only the visible portion of text to optimize? 
  // For now, render all but maybe slice for extremely long texts if performance issues arise.
  
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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
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
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <SearchableSelect
                    value={language}
                    onValueChange={setLanguage}
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
                <div className="relative">
                  <SearchableSelect
                    value={paragraphMode}
                    onValueChange={setParagraphMode}
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
                <div>
                  <SearchableSelect
                    value={difficulty}
                    onValueChange={(val) => setDifficulty(val as "easy" | "medium" | "hard")}
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
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="w-3 h-3" />
                  <span>AI-powered</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>AI automatically generates paragraphs for unsupported combinations and saves them</p>
              </TooltipContent>
            </Tooltip>
          </div>

        {/* Time Mode Selector */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-center gap-2 flex-wrap">
            {TIME_PRESETS.map((preset) => (
              <Tooltip key={preset.value}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setMode(preset.value);
                      setShowCustomInput(false);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all",
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
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
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
                <p>Set your own test duration (5-600 seconds)</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={resetTest}
                  disabled={isGenerating}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                    isGenerating
                      ? "bg-primary/50 text-primary-foreground cursor-not-allowed"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                  data-testid="button-new-paragraph"
                >
                  <RefreshCw className={cn("w-4 h-4", isGenerating && "animate-spin")} />
                  {isGenerating ? "Generating..." : "New Paragraph"}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isGenerating ? "AI is generating fresh content..." : "Get a fresh paragraph without changing settings"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          {showCustomInput && (
            <div className="flex items-center justify-center gap-2">
              <input
                type="number"
                min="5"
                max="600"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                placeholder="Enter seconds (5-600)"
                className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="input-custom-time"
              />
              <button
                onClick={() => {
                  const time = parseInt(customTime);
                  if (time >= 5 && time <= 600) {
                    setMode(time);
                    toast({
                      title: "Custom time set",
                      description: `Test duration: ${time} seconds`,
                    });
                  } else {
                    toast({
                      title: "Invalid time",
                      description: "Please enter a value between 5 and 600 seconds",
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
          )}
          
          {/* AI Custom Prompt */}
          <div className="flex items-center justify-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowCustomPrompt(!showCustomPrompt)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                    showCustomPrompt
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
                <p>Tell AI what kind of paragraph you want (e.g., "about space exploration")</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          {showCustomPrompt && (
            <div className="flex flex-col items-center justify-center gap-2 max-w-2xl mx-auto">
              <div className="flex items-center w-full gap-2">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="E.g., 'about artificial intelligence and future technology'"
                  disabled={isGenerating}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary",
                    isGenerating ? "bg-secondary/50 cursor-not-allowed" : "bg-secondary"
                  )}
                  data-testid="input-custom-prompt"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customPrompt.trim() && !isGenerating) {
                      fetchParagraph(true);
                      setUserInput("");
                      setOriginalText("");
                      setStartTime(null);
                      setIsActive(false);
                      setIsFinished(false);
                      setWpm(0);
                      setAccuracy(100);
                      // Clear keystroke tracker for new test
                      keystrokeTrackerRef.current = null;
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
                      setAccuracy(100);
                      // Clear keystroke tracker for new test
                      keystrokeTrackerRef.current = null;
                    } else {
                      toast({
                        title: "Empty prompt",
                        description: "Please describe what you want the paragraph to be about",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={isGenerating || !customPrompt.trim()}
                  className={cn(
                    "px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all",
                    isGenerating || !customPrompt.trim()
                      ? "bg-primary/50 text-primary-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  data-testid="button-generate-custom"
                >
                  <Sparkles className={cn("w-4 h-4", isGenerating && "animate-spin")} />
                  {isGenerating ? "Generating..." : "Generate"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Describe the topic or theme for your typing test paragraph
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Overview (Live) */}
      <div className="grid grid-cols-4 gap-4">
         <Tooltip>
           <TooltipTrigger asChild>
             <div className="flex flex-col items-center p-4 rounded-xl bg-card border border-border cursor-help">
               <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Time</span>
               <span className="text-4xl font-mono font-bold text-primary">{formatTime(timeLeft)}</span>
             </div>
           </TooltipTrigger>
           <TooltipContent>
             <p>Time remaining in this test</p>
           </TooltipContent>
         </Tooltip>
         <Tooltip>
           <TooltipTrigger asChild>
             <div className="flex flex-col items-center p-4 rounded-xl bg-card border border-border cursor-help">
               <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">WPM</span>
               <span className="text-4xl font-mono font-bold">{wpm}</span>
             </div>
           </TooltipTrigger>
           <TooltipContent>
             <p>Words Per Minute - Your typing speed in real-time</p>
           </TooltipContent>
         </Tooltip>
         <Tooltip>
           <TooltipTrigger asChild>
             <div className="flex flex-col items-center p-4 rounded-xl bg-card border border-border cursor-help">
               <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Accuracy</span>
               <span className="text-4xl font-mono font-bold">{accuracy}%</span>
             </div>
           </TooltipTrigger>
           <TooltipContent>
             <p>Percentage of correctly typed characters</p>
           </TooltipContent>
         </Tooltip>
         <Tooltip>
           <TooltipTrigger asChild>
             <div className="flex flex-col items-center p-4 rounded-xl bg-card border border-border cursor-help">
               <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Status</span>
               <span className={cn("text-4xl font-mono font-bold", isActive ? "text-green-500" : "text-muted-foreground")}>
                 {isActive ? "GO" : isFinished ? "DONE" : "READY"}
               </span>
             </div>
           </TooltipTrigger>
           <TooltipContent>
             <p>Test status: READY → Click to start | GO → Test running | DONE → Test complete</p>
           </TooltipContent>
         </Tooltip>
      </div>

      {/* Typing Area */}
      <div className="relative min-h-[300px] max-h-[400px] overflow-hidden group">
        {/* Error State */}
        {paragraphError && !text && (
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
                }}
                data-testid="button-use-practice-text"
              >
                Use Practice Text
              </Button>
            </div>
          </div>
        )}

        {/* Loading State - only show full overlay if no text exists yet */}
        {isGenerating && !text && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Generating content...</p>
          </div>
        )}
        
        {/* Inline loading indicator when text exists (regenerating) */}
        {isGenerating && text && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full z-10">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs text-primary">Loading new content...</span>
          </div>
        )}

        {/* Hidden Input */}
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={handleInput}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onPaste={handlePaste}
          onCut={handleCut}
          className="absolute opacity-0 w-full h-full cursor-default z-0"
          autoFocus
          disabled={!!paragraphError && !text}
        />

        {/* Visual Text Display */}
        {text && (
          <div 
            ref={containerRef}
            lang={language}
            dir={isRTL ? "rtl" : "ltr"}
            className={cn(
              "w-full h-full max-h-[400px] overflow-y-auto p-8 text-2xl md:text-3xl font-mono leading-relaxed break-words outline-none transition-all duration-300 scroll-smooth",
              !isActive && !isFinished && "blur-[1px] opacity-70 group-hover:blur-0 group-hover:opacity-100"
            )}
            onClick={() => inputRef.current?.focus({ preventScroll: true })}
          >
            {text.split("").map((char, index) => (
              <span 
                key={`${text.length}-${index}`}
                data-char-index={index}
                className={cn("relative", getCharClass(index))}
              >
                {char}
              </span>
            ))}
            {/* Single persistent cursor with smooth transitions - Monkeytype/VSCode style */}
            {!isFinished && (
              <span 
                className={cn(
                  "absolute w-[2.5px] rounded-sm bg-primary pointer-events-none",
                  // Only blink when idle (not typing)
                  !isActive && "animate-caret-blink",
                  // GPU acceleration hints
                  "will-change-transform backface-visibility-hidden"
                )}
                style={{ 
                  transform: `translate3d(${cursorPosition.left}px, ${cursorPosition.top}px, 0)`,
                  height: `${cursorPosition.height}px`,
                  // Transition timing based on settings - disabled during fast typing for responsiveness
                  transition: !smoothCaret || caretSpeed === 'off' || isTypingFast
                    ? 'none'
                    : `transform ${caretSpeed === 'fast' ? '50ms' : caretSpeed === 'medium' ? '100ms' : '150ms'} cubic-bezier(0.22, 1, 0.36, 1)`,
                  // Subtle glow effect
                  boxShadow: '0 0 6px 1px hsl(var(--primary) / 0.4)',
                }}
              />
            )}
          </div>
        )}
        
        {/* Focus Overlay */}
        {!isActive && !isFinished && userInput.length === 0 && text && !isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-muted-foreground/50 text-lg animate-pulse">Click or type to start</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={resetTest}
              className="flex items-center gap-2 px-8 py-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-secondary-foreground font-medium"
            >
              <RefreshCw className="w-5 h-5" />
              Restart Test
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Get a new paragraph and restart the test</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Result Modal / Section */}
      <AnimatePresence>
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          >
            <div className="bg-card border border-border p-8 rounded-2xl shadow-2xl max-w-lg w-full relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-primary animate-gradient" />
              
              <h2 className="text-3xl font-bold mb-8 text-center">Test Complete!</h2>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="flex flex-col items-center p-4 bg-background/50 rounded-xl">
                  <div className="text-muted-foreground text-sm mb-1 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> WPM
                  </div>
                  <div className="text-5xl font-mono font-bold text-primary">{wpm}</div>
                </div>
                <div className="flex flex-col items-center p-4 bg-background/50 rounded-xl">
                  <div className="text-muted-foreground text-sm mb-1 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Accuracy
                  </div>
                  <div className="text-5xl font-mono font-bold">{accuracy}%</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Raw WPM</span>
                  <span className="font-mono text-foreground">{wpm + Math.round((100 - accuracy) / 2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Characters</span>
                  <span className="font-mono text-foreground">{userInput.length}</span>
                </div>
                 <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Time</span>
                  <span className="font-mono text-foreground">{mode}s</span>
                </div>
              </div>

              {/* Celebratory Share Prompt - appears for good performances */}
              {wpm >= 40 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="mb-4 p-4 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-pink-500/10 rounded-xl border border-yellow-500/30 text-center"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">{wpm >= 80 ? "🔥" : wpm >= 60 ? "⚡" : "🎉"}</span>
                    <span className="font-bold text-lg">
                      {wpm >= 80 ? "Amazing Performance!" : wpm >= 60 ? "Great Job!" : "Nice Work!"}
                    </span>
                    <span className="text-2xl">{wpm >= 80 ? "🔥" : wpm >= 60 ? "⚡" : "🎉"}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {wpm >= 80 
                      ? "You're faster than 95% of typists! Share your achievement!" 
                      : wpm >= 60 
                      ? "You're faster than 75% of typists! Challenge your friends!" 
                      : "You're above average! Share and see if your friends can beat you!"}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowShareModal(true)}
                    className="px-6 py-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 text-white font-bold rounded-lg shadow-lg animate-pulse hover:animate-none"
                    data-testid="button-share-celebration"
                  >
                    <Share2 className="w-4 h-4 inline mr-2" />
                    Share & Earn 5 XP
                  </motion.button>
                </motion.div>
              )}

              <div className="mt-4 flex flex-col gap-3">
                {user && (
                  <>
                    <button
                      onClick={() => setShowCertificate(true)}
                      className="w-full py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                      data-testid="button-view-certificate"
                    >
                      <Award className="w-5 h-5" />
                      Get Certificate
                    </button>
                    <button
                      onClick={() => setShowShareModal(true)}
                      disabled={isCreatingShare}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-green-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                      data-testid="button-share-result"
                    >
                      <Share2 className="w-5 h-5" />
                      {isCreatingShare ? "Creating..." : "Share Result"}
                    </button>
                  </>
                )}
                {!user && (
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-green-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    data-testid="button-share-result"
                  >
                    <Share2 className="w-5 h-5" />
                    Share Result
                  </button>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={resetTest}
                    className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity"
                    data-testid="button-next-test"
                  >
                    Next Test
                  </button>
                  <button
                    onClick={resetTest}
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
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">Your Achievement Certificate</DialogTitle>
          </DialogHeader>
          {user && (
            <CertificateGenerator
              username={user.username}
              wpm={wpm}
              accuracy={accuracy}
              mode={mode}
              date={testCompletionDate}
            />
          )}
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
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="quick" data-testid="tab-quick-share">Quick Share</TabsTrigger>
              <TabsTrigger value="card" data-testid="tab-visual-card">Visual Card</TabsTrigger>
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
                      {getPerformanceRating().emoji} I just scored <span className="text-primary font-bold">{wpm} WPM</span> on TypeMasterAI!
                    </p>
                    <p className="text-muted-foreground">
                      ⌨️ <span className="text-foreground">{wpm} WPM</span> | ✨ <span className="text-foreground">{accuracy}% Accuracy</span>
                    </p>
                    <p className="text-muted-foreground">
                      🏅 <span className="text-yellow-400">{getPerformanceRating().title}</span> - {getPerformanceRating().badge} Badge
                    </p>
                    <p className="text-muted-foreground">
                      ⏱️ {mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`} typing test
                    </p>
                    <p className="text-primary/80 text-xs mt-3">
                      Think you can beat my score? Try it now! 🎯
                    </p>
                    <p className="text-xs text-primary mt-2 font-medium">
                      🔗 typemasterai.com
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #TypingTest #TypeMasterAI #WPM
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const rating = getPerformanceRating();
                    const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                    const text = `${rating.emoji} I just scored ${wpm} WPM on TypeMasterAI!\n\n⌨️ ${wpm} WPM | ✨ ${accuracy}% Accuracy\n🏅 ${rating.title} - ${rating.badge} Badge\n⏱️ ${modeDisplay} typing test\n\nThink you can beat my score? Try it now! 🎯\n\n🔗 https://typemasterai.com\n\n#TypingTest #TypeMasterAI #WPM`;
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
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => shareToSocial('twitter')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/20 hover:border-[#1DA1F2]/40 transition-all group"
                  data-testid="button-share-twitter"
                >
                  <Twitter className="w-6 h-6 text-[#1DA1F2]" />
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">Twitter</span>
                </button>
                <button
                  onClick={() => shareToSocial('facebook')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/25 border border-[#1877F2]/20 hover:border-[#1877F2]/40 transition-all group"
                  data-testid="button-share-facebook"
                >
                  <Facebook className="w-6 h-6 text-[#1877F2]" />
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">Facebook</span>
                </button>
                <button
                  onClick={() => shareToSocial('linkedin')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#0A66C2]/10 hover:bg-[#0A66C2]/25 border border-[#0A66C2]/20 hover:border-[#0A66C2]/40 transition-all group"
                  data-testid="button-share-linkedin"
                >
                  <Linkedin className="w-6 h-6 text-[#0A66C2]" />
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">LinkedIn</span>
                </button>
                <button
                  onClick={() => shareToSocial('whatsapp')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/25 border border-[#25D366]/20 hover:border-[#25D366]/40 transition-all group"
                  data-testid="button-share-whatsapp"
                >
                  <MessageCircle className="w-6 h-6 text-[#25D366]" />
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">WhatsApp</span>
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

            {/* Share Certificate Section - Only for logged in users */}
            {user && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center gap-2 justify-center">
                  <Award className="w-4 h-4 text-yellow-400" />
                  <p className="text-xs font-medium text-center text-muted-foreground uppercase tracking-wide">
                    Share Your Certificate
                  </p>
                  <Award className="w-4 h-4 text-yellow-400" />
                </div>
                
                {/* Certificate Share Message */}
                <div className="p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
                  <p className="text-sm text-center text-foreground">
                    🎓 <span className="font-medium">Show off your official TypeMasterAI certificate!</span>
                  </p>
                  <p className="text-xs text-center text-muted-foreground mt-1">
                    Share your {wpm} WPM achievement with friends and colleagues
                  </p>
                </div>

                {/* Certificate Social Share Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => {
                      const rating = getPerformanceRating();
                      const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                      const text = encodeURIComponent(`🎓 I just earned my TypeMasterAI Certificate!\n\n⌨️ ${wpm} WPM | ${accuracy}% Accuracy\n🏅 ${rating.title} - ${rating.badge} Badge\n⏱️ ${modeDisplay} typing test\n\nGet your certificate too!\n\n#TypeMasterAI #TypingCertificate`);
                      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent('https://typemasterai.com')}`, '_blank', 'width=600,height=400');
                    }}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/20 transition-all group"
                    data-testid="button-share-cert-twitter"
                  >
                    <Twitter className="w-5 h-5 text-[#1DA1F2]" />
                    <span className="text-[10px] text-muted-foreground group-hover:text-foreground">Twitter</span>
                  </button>
                  <button
                    onClick={() => {
                      const rating = getPerformanceRating();
                      const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                      const text = encodeURIComponent(`🎓 I just earned my TypeMasterAI Certificate!\n\n🏆 ${wpm} Words Per Minute\n✨ ${accuracy}% Accuracy\n🏅 ${rating.title} - ${rating.badge} Badge\n⏱️ ${modeDisplay} test\n\nTest your typing skills and get certified!`);
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://typemasterai.com')}&quote=${text}`, '_blank', 'width=600,height=400');
                    }}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#1877F2]/10 hover:bg-[#1877F2]/25 border border-[#1877F2]/20 transition-all group"
                    data-testid="button-share-cert-facebook"
                  >
                    <Facebook className="w-5 h-5 text-[#1877F2]" />
                    <span className="text-[10px] text-muted-foreground group-hover:text-foreground">Facebook</span>
                  </button>
                  <button
                    onClick={() => {
                      const rating = getPerformanceRating();
                      const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                      const text = encodeURIComponent(`Proud to share my TypeMasterAI Certificate of Achievement! 🎓\n\n📜 Certification Details:\n• Typing Speed: ${wpm} Words Per Minute\n• Accuracy: ${accuracy}%\n• Performance Rating: ${rating.title} (${rating.badge})\n• Test Duration: ${modeDisplay}\n\nContinuous skill development is key to professional growth.\n\n#Certificate #TypeMasterAI #ProfessionalDevelopment`);
                      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://typemasterai.com')}`, '_blank', 'width=600,height=400');
                    }}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#0A66C2]/10 hover:bg-[#0A66C2]/25 border border-[#0A66C2]/20 transition-all group"
                    data-testid="button-share-cert-linkedin"
                  >
                    <Linkedin className="w-5 h-5 text-[#0A66C2]" />
                    <span className="text-[10px] text-muted-foreground group-hover:text-foreground">LinkedIn</span>
                  </button>
                  <button
                    onClick={() => {
                      const rating = getPerformanceRating();
                      const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
                      const text = encodeURIComponent(`🎓 Check out my TypeMasterAI Certificate!\n\n📜 *Certificate of Achievement*\n⌨️ *${wpm} WPM* | *${accuracy}% Accuracy*\n🏅 ${rating.title} - ${rating.badge} Badge\n⏱️ ${modeDisplay} test\n\nGet your certificate: `);
                      window.open(`https://wa.me/?text=${text}${encodeURIComponent('https://typemasterai.com')}`, '_blank', 'width=600,height=400');
                    }}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/25 border border-[#25D366]/20 transition-all group"
                    data-testid="button-share-cert-whatsapp"
                  >
                    <MessageCircle className="w-5 h-5 text-[#25D366]" />
                    <span className="text-[10px] text-muted-foreground group-hover:text-foreground">WhatsApp</span>
                  </button>
                </div>
                
                <p className="text-xs text-center text-muted-foreground">
                  💡 Tip: View your certificate to download it, then attach it to your post!
                </p>
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

            {/* Visual Card Tab */}
            <TabsContent value="card" className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Create a beautiful visual card to share on social media
                </p>
              </div>
              {isFinished && (
                <ShareCard
                  wpm={wpm}
                  accuracy={accuracy}
                  mode={mode}
                  language={language}
                  username={user?.username}
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
                      const text = encodeURIComponent(`🎯 I CHALLENGE YOU!\n\n${rating.emoji} Can you beat my ${wpm} WPM with ${accuracy}% accuracy?\n\n⏱️ ${modeDisplay} typing test\n🏅 Try to claim my ${rating.badge} Badge!\n\nAccept the challenge now:\n`);
                      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent('https://typemasterai.com')}`, '_blank', 'width=600,height=400');
                      trackShare('challenge_twitter');
                    }}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/20 transition-all"
                    data-testid="button-challenge-twitter"
                  >
                    <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                    <span className="text-xs font-medium">Twitter</span>
                  </button>
                  <button
                    onClick={() => {
                      const rating = getPerformanceRating();
                      const text = encodeURIComponent(`🎯 TYPING CHALLENGE! Can you beat my ${wpm} WPM with ${accuracy}% accuracy? ${rating.emoji}`);
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
                      const fullText = `🎯 *TYPING CHALLENGE*\n\nCan you beat me?\n\n${rating.emoji} *My Score: ${wpm} WPM*\n✨ *Accuracy: ${accuracy}%*\n⏱️ ${modeDisplay} test\n\n🔥 Accept the challenge: https://typemasterai.com`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, '_blank', 'width=600,height=400');
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
                      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
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
      </div>
    </TooltipProvider>
  );
}
