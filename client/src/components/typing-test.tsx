import { useState, useEffect, useRef, useCallback } from "react";
import { generateText, calculateWPM, calculateAccuracy } from "@/lib/typing-utils";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Zap, Target, Clock, Globe, BookOpen } from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import AuthPromptDialog from "@/components/auth-prompt-dialog";

type TestMode = 15 | 30 | 60 | 120;

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

export default function TypingTest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<TestMode>(30);
  const [language, setLanguage] = useState("en");
  const [paragraphMode, setParagraphMode] = useState<string>("general");
  const [text, setText] = useState("");
  const [userInput, setUserInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(mode);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errors, setErrors] = useState(0);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: languagesData } = useQuery({
    queryKey: ["languages"],
    queryFn: async () => {
      const response = await fetch("/api/typing/languages");
      if (!response.ok) throw new Error("Failed to fetch languages");
      return response.json();
    },
  });

  const { data: modesData } = useQuery({
    queryKey: ["modes"],
    queryFn: async () => {
      const response = await fetch("/api/typing/modes");
      if (!response.ok) throw new Error("Failed to fetch modes");
      return response.json();
    },
  });

  const fetchParagraph = async () => {
    try {
      const response = await fetch(`/api/typing/paragraph?language=${language}&mode=${paragraphMode}`);
      if (!response.ok) {
        throw new Error("Failed to fetch paragraph");
      }
      const data = await response.json();
      setText(data.paragraph.content);
    } catch (error) {
      console.error("Error fetching paragraph:", error);
      setText(generateText(100));
      toast({
        title: "Using fallback text",
        description: "Could not load paragraph from database.",
        variant: "default",
      });
    }
  };

  const saveResultMutation = useMutation({
    mutationFn: async (result: { wpm: number; accuracy: number; mode: number; characters: number; errors: number }) => {
      const response = await fetch("/api/test-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(result),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save test result");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Saved!",
        description: "Your result has been saved to your profile.",
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Could not save your test result. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetTest = useCallback(() => {
    fetchParagraph();
    setUserInput("");
    setStartTime(null);
    setTimeLeft(mode);
    setIsActive(false);
    setIsFinished(false);
    setWpm(0);
    setAccuracy(100);
    setShowAuthPrompt(false);
    inputRef.current?.focus();
  }, [mode, language, paragraphMode]);

  // Initial setup
  useEffect(() => {
    resetTest();
  }, [resetTest]);

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

  const finishTest = () => {
    setIsActive(false);
    setIsFinished(true);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#00FFFF', '#FF00FF']
    });

    if (user) {
      saveResultMutation.mutate({
        wpm,
        accuracy,
        mode,
        characters: userInput.length,
        errors,
      });
    } else {
      setShowAuthPrompt(true);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFinished) return;
    
    const value = e.target.value;
    
    if (!isActive && value.length === 1) {
      setIsActive(true);
      setStartTime(Date.now());
    }

    setUserInput(value);

    // Auto-scroll cursor into view if needed (simplified)
    // Ideally we'd calculate line height and scroll container
  };

  // Focus handling
  useEffect(() => {
    const handleClick = () => inputRef.current?.focus();
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const getCharClass = (index: number) => {
    if (index >= userInput.length) return "text-muted-foreground/40";
    const isCorrect = userInput[index] === text[index];
    return isCorrect ? "text-foreground" : "text-destructive";
  };

  // Render only the visible portion of text to optimize? 
  // For now, render all but maybe slice for extremely long texts if performance issues arise.
  
  const availableLanguages = languagesData?.languages || ["en"];
  const availableModes = modesData?.modes || ["general"];

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
      {/* Language & Mode Selectors */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-secondary text-sm font-medium cursor-pointer border border-border hover:bg-secondary/80 transition-colors"
              data-testid="select-language"
            >
              {availableLanguages.map((lang: string) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_NAMES[lang] || lang}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <select
              value={paragraphMode}
              onChange={(e) => setParagraphMode(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-secondary text-sm font-medium cursor-pointer border border-border hover:bg-secondary/80 transition-colors"
              data-testid="select-mode"
            >
              {availableModes.map((m: string) => (
                <option key={m} value={m}>
                  {MODE_NAMES[m] || m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Time Mode Selector */}
        <div className="flex justify-center gap-4">
          {[15, 30, 60, 120].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m as TestMode)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                mode === m 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
              data-testid={`button-time-${m}`}
            >
              {m}s
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview (Live) */}
      <div className="grid grid-cols-4 gap-4">
         <div className="flex flex-col items-center p-4 rounded-xl bg-card border border-border">
            <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Time</span>
            <span className="text-4xl font-mono font-bold text-primary">{timeLeft}</span>
         </div>
         <div className="flex flex-col items-center p-4 rounded-xl bg-card border border-border">
            <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">WPM</span>
            <span className="text-4xl font-mono font-bold">{wpm}</span>
         </div>
         <div className="flex flex-col items-center p-4 rounded-xl bg-card border border-border">
            <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Accuracy</span>
            <span className="text-4xl font-mono font-bold">{accuracy}%</span>
         </div>
          <div className="flex flex-col items-center p-4 rounded-xl bg-card border border-border">
            <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Status</span>
            <span className={cn("text-4xl font-mono font-bold", isActive ? "text-green-500" : "text-muted-foreground")}>
              {isActive ? "GO" : isFinished ? "DONE" : "READY"}
            </span>
         </div>
      </div>

      {/* Typing Area */}
      <div className="relative min-h-[300px] group">
        {/* Hidden Input */}
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={handleInput}
          className="absolute opacity-0 w-full h-full cursor-default z-0"
          autoFocus
        />

        {/* Visual Text Display */}
        <div 
          ref={containerRef}
          className={cn(
            "w-full h-full p-8 text-2xl md:text-3xl font-mono leading-relaxed break-words outline-none transition-all duration-300",
            !isActive && !isFinished && "blur-[1px] opacity-70 group-hover:blur-0 group-hover:opacity-100"
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {text.split("").map((char, index) => (
            <span key={index} className={cn("relative", getCharClass(index))}>
              {/* Cursor */}
              {index === userInput.length && !isFinished && (
                <span className="absolute -left-[1px] top-1 bottom-1 w-[2px] bg-primary animate-cursor-blink" />
              )}
              {char}
            </span>
          ))}
        </div>
        
        {/* Focus Overlay */}
        {!isActive && !isFinished && userInput.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-muted-foreground/50 text-lg animate-pulse">Click or type to start</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center">
        <button
          onClick={resetTest}
          className="flex items-center gap-2 px-8 py-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-secondary-foreground font-medium"
        >
          <RefreshCw className="w-5 h-5" />
          Restart Test
        </button>
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

              <div className="mt-8 flex gap-3">
                <button
                  onClick={resetTest}
                  className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity"
                >
                  Next Test
                </button>
                <button
                  onClick={() => setIsFinished(false)}
                  className="px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  Close
                </button>
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
    </div>
  );
}
