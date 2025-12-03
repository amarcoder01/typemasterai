import { useState, useEffect, useRef, useCallback, useMemo, memo, useLayoutEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, Zap, Skull, Trophy, Eye, Volume2, VolumeX, AlertTriangle, HelpCircle, Clock, Target, Flame, XCircle, Timer, BarChart3, RefreshCw, Home, Info, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { calculateWPM, calculateAccuracy } from '@/lib/typing-utils';
import { useAuth } from '@/lib/auth-context';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Difficulty = 'beginner' | 'intermediate' | 'expert' | 'nightmare' | 'impossible';

interface StressEffects {
  screenShake: boolean;
  distractions: boolean;
  sounds: boolean;
  speedIncrease: boolean;
  limitedVisibility: boolean;
  colorShift: boolean;
  gravity: boolean;
  rotation: boolean;
  glitch: boolean;
  textFade: boolean;
  reverseText: boolean;
  randomJumps: boolean;
  screenInvert: boolean;
  zoomChaos: boolean;
  screenFlip: boolean;
}

const EFFECT_DESCRIPTIONS: Record<keyof StressEffects, string> = {
  screenShake: 'Screen vibrates and shakes during typing',
  distractions: 'Random emoji particles explode on screen',
  sounds: 'Chaotic sound effects play during the test',
  speedIncrease: 'Effects intensify as time progresses',
  limitedVisibility: 'Text becomes blurry making it harder to read',
  colorShift: 'Text and UI colors change randomly',
  gravity: 'Text bounces and floats unpredictably',
  rotation: 'Screen tilts and rotates during typing',
  glitch: 'Visual glitch effects distort the screen',
  textFade: 'Text opacity fluctuates making it hard to see',
  reverseText: 'Text temporarily reverses direction',
  randomJumps: 'Text teleports to random positions',
  screenInvert: 'Screen colors invert unexpectedly',
  zoomChaos: 'Screen zooms in and out randomly',
  screenFlip: 'Screen flips upside down periodically',
};

const DIFFICULTY_CONFIGS: Record<Difficulty, {
  name: string;
  description: string;
  effects: StressEffects;
  duration: number;
  icon: string;
  color: string;
  baseShakeIntensity: number;
  particleFrequency: number;
  multiplier: number;
  difficulty: string;
}> = {
  beginner: {
    name: 'Warm-Up Chaos',
    description: 'Gentle introduction with light effects',
    effects: {
      screenShake: true,
      distractions: true,
      sounds: true,
      speedIncrease: false,
      limitedVisibility: false,
      colorShift: false,
      gravity: false,
      rotation: false,
      glitch: false,
      textFade: false,
      reverseText: false,
      randomJumps: false,
      screenInvert: false,
      zoomChaos: false,
      screenFlip: false,
    },
    duration: 30,
    icon: '🔥',
    color: 'from-amber-500/20 to-orange-500/20',
    baseShakeIntensity: 3,
    particleFrequency: 0.15,
    multiplier: 1,
    difficulty: 'Easy',
  },
  intermediate: {
    name: 'Mind Scrambler',
    description: 'Progressive chaos - effects intensify as you type',
    effects: {
      screenShake: true,
      distractions: true,
      sounds: true,
      speedIncrease: true,
      limitedVisibility: false,
      colorShift: true,
      gravity: true,
      rotation: true,
      glitch: false,
      textFade: false,
      reverseText: false,
      randomJumps: false,
      screenInvert: true,
      zoomChaos: true,
      screenFlip: false,
    },
    duration: 45,
    icon: '⚡',
    color: 'from-purple-500/20 to-pink-500/20',
    baseShakeIntensity: 8,
    particleFrequency: 0.3,
    multiplier: 2,
    difficulty: 'Medium - Build your focus',
  },
  expert: {
    name: 'Absolute Mayhem',
    description: 'Screen flips upside down, glitches, complete chaos',
    effects: {
      screenShake: true,
      distractions: true,
      sounds: true,
      speedIncrease: true,
      limitedVisibility: true,
      colorShift: true,
      gravity: true,
      rotation: true,
      glitch: true,
      textFade: true,
      reverseText: false,
      randomJumps: false,
      screenInvert: true,
      zoomChaos: true,
      screenFlip: true,
    },
    duration: 60,
    icon: '💀',
    color: 'from-red-500/20 to-orange-500/20',
    baseShakeIntensity: 25,
    particleFrequency: 0.7,
    multiplier: 3,
    difficulty: 'Hard - Not for the faint of heart',
  },
  nightmare: {
    name: 'Nightmare Realm',
    description: 'Text reverses, screen inverts/flips, reality collapses.',
    effects: {
      screenShake: true,
      distractions: true,
      sounds: true,
      speedIncrease: true,
      limitedVisibility: true,
      colorShift: true,
      gravity: true,
      rotation: true,
      glitch: true,
      textFade: true,
      reverseText: true,
      randomJumps: false,
      screenInvert: true,
      zoomChaos: true,
      screenFlip: true,
    },
    duration: 90,
    icon: '☠️',
    color: 'from-black/40 to-red-900/40',
    baseShakeIntensity: 40,
    particleFrequency: 0.85,
    multiplier: 4,
    difficulty: 'Extreme - Reality bends around you',
  },
  impossible: {
    name: 'IMPOSSIBLE',
    description: 'Text teleports, ALL effects active, reality ceases to exist.',
    effects: {
      screenShake: true,
      distractions: true,
      sounds: true,
      speedIncrease: true,
      limitedVisibility: true,
      colorShift: true,
      gravity: true,
      rotation: true,
      glitch: true,
      textFade: true,
      reverseText: true,
      randomJumps: true,
      screenInvert: true,
      zoomChaos: true,
      screenFlip: true,
    },
    duration: 120,
    icon: '🌀',
    color: 'from-purple-900/60 to-black/60',
    baseShakeIntensity: 60,
    particleFrequency: 0.95,
    multiplier: 5,
    difficulty: 'Legendary - Only 1% survive',
  },
};

const SAMPLE_TEXTS = [
  "The quick brown fox jumps over the lazy dog while the world shakes violently around you.",
  "In the midst of chaos, only the focused mind prevails against impossible odds.",
  "Type through the storm, embrace the madness, and prove your worth.",
  "Your fingers dance on keys while reality itself trembles and distorts.",
  "Focus is everything when the screen becomes your worst enemy.",
  "When the world falls apart around you, let your fingers find their rhythm in the chaos.",
  "Every keystroke is a victory against the madness that surrounds your screen.",
  "The storm rages but your hands remain steady on the keyboard.",
  "Through glitch and shake, through flash and fade, the typist perseveres.",
  "Master the chaos or be consumed by it - there is no middle ground here.",
  "Concentration is your shield against the visual assault of the stress test.",
  "Let the screen shake, let the colors shift - your typing will not falter.",
];

const MAX_PARTICLES = 20;

interface ParticleData {
  id: number;
  x: number;
  y: number;
  emoji: string;
  speed: number;
}

const Particle = memo(({ particle }: { particle: ParticleData }) => (
  <div
    className="fixed pointer-events-none text-4xl animate-ping z-50"
    style={{
      left: `${particle.x}%`,
      top: `${particle.y}%`,
      animationDuration: `${particle.speed}s`,
    }}
    aria-hidden="true"
  >
    {particle.emoji}
  </div>
));

Particle.displayName = 'Particle';

let globalAudioContext: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  try {
    if (!globalAudioContext || globalAudioContext.state === 'closed') {
      globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (globalAudioContext.state === 'suspended') {
      globalAudioContext.resume();
    }
    return globalAudioContext;
  } catch {
    return null;
  }
}

export default function StressTest() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [currentText, setCurrentText] = useState('');
  const [errors, setErrors] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const [currentColor, setCurrentColor] = useState('hsl(0, 0%, 100%)');
  const [blur, setBlur] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [gravityOffset, setGravityOffset] = useState(0);
  const [glitchActive, setGlitchActive] = useState(false);
  const [textOpacity, setTextOpacity] = useState(1);
  const [textReversed, setTextReversed] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [backgroundFlash, setBackgroundFlash] = useState(false);
  const [stressLevel, setStressLevel] = useState(0);
  const [screenInverted, setScreenInverted] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [screenFlipped, setScreenFlipped] = useState(false);
  const [comboExplosion, setComboExplosion] = useState(false);
  
  const [finalResults, setFinalResults] = useState<{
    survivalTime: number;
    wpm: number;
    accuracy: number;
    completionRate: number;
    stressScore: number;
    completed: boolean;
  } | null>(null);
  
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useLayoutEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const pendingTimeoutsRef = useRef<Map<ReturnType<typeof setTimeout>, boolean>>(new Map());
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const effectsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shakeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const testSessionRef = useRef<number>(0);
  const isTestActiveRef = useRef<boolean>(false);
  const particleIdRef = useRef<number>(0);
  const finishTestRef = useRef<(completed: boolean) => void>(() => {});
  const maxComboRef = useRef<number>(0);
  const typedTextRef = useRef<string>('');
  const currentTextRef = useRef<string>('');
  const errorsRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const selectedDifficultyRef = useRef<Difficulty | null>(null);
  const completedRef = useRef<boolean>(false);

  const config = selectedDifficulty ? DIFFICULTY_CONFIGS[selectedDifficulty] : null;

  const safeTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      pendingTimeoutsRef.current.delete(timeoutId);
      if (isTestActiveRef.current) {
        callback();
      }
    }, delay);
    pendingTimeoutsRef.current.set(timeoutId, true);
    return timeoutId;
  }, []);

  const clearAllTimers = useCallback(() => {
    pendingTimeoutsRef.current.forEach((_, id) => clearTimeout(id));
    pendingTimeoutsRef.current.clear();
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (effectsIntervalRef.current) {
      clearInterval(effectsIntervalRef.current);
      effectsIntervalRef.current = null;
    }
    if (shakeIntervalRef.current) {
      clearInterval(shakeIntervalRef.current);
      shakeIntervalRef.current = null;
    }
    if (stressIntervalRef.current) {
      clearInterval(stressIntervalRef.current);
      stressIntervalRef.current = null;
    }
  }, []);

  const resetVisualStates = useCallback(() => {
    setShakeIntensity(0);
    setParticles([]);
    setCurrentColor('hsl(0, 0%, 100%)');
    setBlur(0);
    setRotation(0);
    setGravityOffset(0);
    setGlitchActive(false);
    setTextOpacity(1);
    setTextReversed(false);
    setTextPosition({ x: 0, y: 0 });
    setScreenInverted(false);
    setZoomScale(1);
    setScreenFlipped(false);
    setComboExplosion(false);
    setBackgroundFlash(false);
    setStressLevel(0);
  }, []);

  const playSound = useCallback((type: 'type' | 'error' | 'combo' | 'complete' | 'warning' | 'chaos') => {
    if (!soundEnabled) return;
    
    const audioContext = getSharedAudioContext();
    if (!audioContext) return;
    
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      switch (type) {
        case 'type':
          oscillator.frequency.value = 800 + Math.random() * 200;
          gainNode.gain.value = 0.08;
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.03);
          break;
        case 'error':
          oscillator.frequency.value = 150;
          oscillator.type = 'sawtooth';
          gainNode.gain.value = 0.4;
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.2);
          break;
        case 'combo':
          oscillator.frequency.value = 1500;
          gainNode.gain.value = 0.15;
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.08);
          break;
        case 'complete':
          oscillator.frequency.value = 2000;
          gainNode.gain.value = 0.3;
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.5);
          break;
        case 'warning':
          oscillator.frequency.value = 400;
          oscillator.type = 'triangle';
          gainNode.gain.value = 0.3;
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.15);
          break;
        case 'chaos':
          oscillator.frequency.value = 100 + Math.random() * 500;
          oscillator.type = 'square';
          gainNode.gain.value = 0.2;
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.1);
          break;
      }
    } catch {
      // Silently fail
    }
  }, [soundEnabled]);

  useEffect(() => {
    return () => {
      clearAllTimers();
      isTestActiveRef.current = false;
    };
  }, [clearAllTimers]);

  const saveResultMutation = useMutation({
    mutationFn: async (data: {
      difficulty: Difficulty;
      enabledEffects: StressEffects;
      wpm: number;
      accuracy: number;
      errors: number;
      maxCombo: number;
      totalCharacters: number;
      duration: number;
      survivalTime: number;
      completionRate: number;
      stressScore: number;
    }) => {
      const res = await fetch('/api/stress-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Save stress test error:', res.status, errorData);
        throw new Error(errorData.message || 'Failed to save result');
      }
      return res.json();
    },
    retry: 2,
    retryDelay: 1000,
    onSuccess: (data) => {
      if (data?.isNewPersonalBest) {
        toast({
          title: "🏆 New Personal Best!",
          description: "You've set a new record for this difficulty level!",
        });
      } else if (data?.isLeaderboardEntry) {
        toast({
          title: "📊 Leaderboard Entry!",
          description: "Your score has been added to the leaderboard!",
        });
      }
    },
    onError: (error) => {
      console.error('Stress test save mutation error:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Could not save your result. Please try again.",
        variant: "destructive",
      });
    },
  });

  const finishTest = useCallback((completed: boolean = false) => {
    isTestActiveRef.current = false;
    clearAllTimers();
    resetVisualStates();
    
    setIsFinished(true);
    setIsStarted(false);
    setCountdown(0);
    
    completedRef.current = completed;
    
    setTypedText((currentTypedText) => {
      typedTextRef.current = currentTypedText;
      setCurrentText((currentTextValue) => {
        currentTextRef.current = currentTextValue;
        setErrors((currentErrors) => {
          errorsRef.current = currentErrors;
          setStartTime((currentStartTime) => {
            startTimeRef.current = currentStartTime;
            setSelectedDifficulty((currentDifficulty) => {
              selectedDifficultyRef.current = currentDifficulty;
              
              const survivalTime = currentStartTime ? Math.max(0, (Date.now() - currentStartTime) / 1000) : 0;
              const completionRate = currentTextValue.length > 0 
                ? Math.min(100, (currentTypedText.length / currentTextValue.length) * 100)
                : 0;
              const correctChars = Math.max(0, currentTypedText.length - currentErrors);
              const totalTyped = currentTypedText.length;
              const wpm = survivalTime > 0 ? calculateWPM(correctChars, survivalTime) : 0;
              const accuracy = totalTyped > 0 ? Math.min(100, calculateAccuracy(correctChars, totalTyped)) : 100;
              
              const difficultyMultiplier = currentDifficulty === 'impossible' ? 5 : 
                                           currentDifficulty === 'nightmare' ? 4 :
                                           currentDifficulty === 'expert' ? 3 :
                                           currentDifficulty === 'intermediate' ? 2 : 1;
              const stressScore = Math.round((wpm * accuracy * completionRate * difficultyMultiplier) / 100);
              
              setFinalResults({ survivalTime, wpm, accuracy, completionRate, stressScore, completed });
              
              if (completed) {
                playSound('complete');
                if (!prefersReducedMotion) {
                  confetti({
                    particleCount: 200,
                    spread: 100,
                    origin: { y: 0.6 },
                    colors: ['#ff0000', '#ff6600', '#ffaa00'],
                  });
                }
              } else {
                playSound('error');
              }
              
              const diffConfig = currentDifficulty ? DIFFICULTY_CONFIGS[currentDifficulty] : null;
              const currentMaxCombo = maxComboRef.current;
              
              if (diffConfig && currentDifficulty && user) {
                saveResultMutation.mutate({
                  difficulty: currentDifficulty,
                  enabledEffects: diffConfig.effects,
                  wpm: Math.round(Math.min(500, Math.max(0, wpm))),
                  accuracy: Math.min(100, Math.max(0, accuracy)),
                  errors: Math.max(0, currentErrors),
                  maxCombo: Math.max(0, currentMaxCombo),
                  totalCharacters: Math.max(0, currentTypedText.length),
                  duration: Math.max(1, diffConfig.duration),
                  survivalTime: Math.round(Math.max(0, survivalTime)),
                  completionRate: Math.min(100, Math.max(0, completionRate)),
                  stressScore: Math.max(0, stressScore),
                });
              }
              
              return currentDifficulty;
            });
            return currentStartTime;
          });
          return currentErrors;
        });
        return currentTextValue;
      });
      return currentTypedText;
    });
  }, [clearAllTimers, resetVisualStates, playSound, prefersReducedMotion, user, saveResultMutation]);

  const hasShownFinishToast = useRef(false);
  
  useEffect(() => {
    if (finalResults && isFinished && !hasShownFinishToast.current) {
      hasShownFinishToast.current = true;
      const { survivalTime, stressScore, completed } = finalResults;
      
      if (completed) {
        toast({
          title: "🎉 Incredible!",
          description: `You completed the challenge with a Stress Score of ${stressScore}!`,
        });
      } else {
        toast({
          title: "Time's Up!",
          description: `You lasted ${Math.round(survivalTime)}s with a Stress Score of ${stressScore}`,
          variant: "destructive",
        });
      }
    }
    
    if (!isFinished) {
      hasShownFinishToast.current = false;
    }
  }, [finalResults, isFinished, toast]);

  useEffect(() => {
    finishTestRef.current = finishTest;
  }, [finishTest]);

  const handleStart = useCallback((difficulty: Difficulty) => {
    if (isStarted || countdown > 0) return;
    
    testSessionRef.current += 1;
    const currentSession = testSessionRef.current;
    
    clearAllTimers();
    isTestActiveRef.current = false;
    
    setTypedText('');
    setErrors(0);
    setCombo(0);
    setMaxCombo(0);
    maxComboRef.current = 0;
    setIsFinished(false);
    setFinalResults(null);
    resetVisualStates();
    
    setSelectedDifficulty(difficulty);
    selectedDifficultyRef.current = difficulty;
    setCountdown(3);
    const randomText = SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
    currentTextRef.current = randomText;
    setCurrentText(randomText);
    
    const diffConfig = DIFFICULTY_CONFIGS[difficulty];
    toast({
      title: `${diffConfig.icon} ${diffConfig.name}`,
      description: `${diffConfig.duration} seconds - ${diffConfig.difficulty}`,
    });
    
    countdownIntervalRef.current = setInterval(() => {
      if (testSessionRef.current !== currentSession) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        return;
      }
      
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          
          isTestActiveRef.current = true;
          setIsStarted(true);
          setStartTime(Date.now());
          setTimeLeft(DIFFICULTY_CONFIGS[difficulty].duration);
          
          setTimeout(() => inputRef.current?.focus(), 50);
          return 0;
        }
        playSound('warning');
        return prev - 1;
      });
    }, 1000);
  }, [isStarted, countdown, clearAllTimers, resetVisualStates, toast, playSound]);

  const calculateStressLevel = useCallback(() => {
    if (!config || !startTime) return 0;
    const elapsed = (Date.now() - startTime) / 1000;
    const progress = Math.min(1, Math.max(0, elapsed / config.duration));
    return progress * 100;
  }, [config, startTime]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isStarted || isFinished || !isTestActiveRef.current) return;
    
    const value = e.target.value;
    const lastChar = value[value.length - 1];
    const expectedChar = currentText[typedText.length];
    
    if (lastChar === expectedChar) {
      playSound('type');
      typedTextRef.current = value;
      setTypedText(value);
      setCombo((prev) => {
        const newCombo = prev + 1;
        if (newCombo > maxComboRef.current) {
          maxComboRef.current = newCombo;
          setMaxCombo(newCombo);
        }
        if (newCombo % 10 === 0 && newCombo > 0) {
          playSound('combo');
          if (!prefersReducedMotion && selectedDifficulty !== 'beginner') {
            setComboExplosion(true);
            safeTimeout(() => setComboExplosion(false), 500);
          }
        }
        return newCombo;
      });
      
      if (value === currentText) {
        finishTestRef.current(true);
      }
    } else {
      playSound('error');
      setErrors((prev) => prev + 1);
      setCombo(0);
      
      if (config?.effects.screenShake && !prefersReducedMotion) {
        const intensity = config.baseShakeIntensity + (stressLevel / 5);
        setShakeIntensity(intensity);
        safeTimeout(() => setShakeIntensity(0), 400);
        
        setBackgroundFlash(true);
        safeTimeout(() => setBackgroundFlash(false), 100);
      }
    }
  }, [isStarted, isFinished, currentText, typedText, playSound, prefersReducedMotion, selectedDifficulty, config, stressLevel, safeTimeout]);

  useEffect(() => {
    if (!isStarted || isFinished) return;
    
    const currentSession = testSessionRef.current;
    
    timerIntervalRef.current = setInterval(() => {
      if (testSessionRef.current !== currentSession || !isTestActiveRef.current) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        return;
      }
      
      setTimeLeft((prev) => {
        if (prev <= 1) {
          finishTestRef.current(false);
          return 0;
        }
        if (prev <= 5) {
          playSound('warning');
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isStarted, isFinished, playSound]);

  const hasShown10SecWarning = useRef(false);
  const lastComboMilestone = useRef(0);
  const lastProgressMilestone = useRef(0);
  const [activeEffectWarning, setActiveEffectWarning] = useState<string | null>(null);
  
  useEffect(() => {
    if (timeLeft === 10 && isStarted && !isFinished && !hasShown10SecWarning.current) {
      hasShown10SecWarning.current = true;
      playSound('warning');
      toast({
        title: "⏰ 10 Seconds Left!",
        description: "Final push!",
        variant: "destructive",
      });
    }
    if (timeLeft > 10) {
      hasShown10SecWarning.current = false;
    }
  }, [timeLeft, isStarted, isFinished, playSound, toast]);

  useEffect(() => {
    if (!isStarted || isFinished) {
      lastComboMilestone.current = 0;
      return;
    }
    
    if (combo === 50 && lastComboMilestone.current < 50) {
      lastComboMilestone.current = 50;
      toast({
        title: "🔥 50 Combo!",
        description: "You're on fire!",
      });
    } else if (combo === 100 && lastComboMilestone.current < 100) {
      lastComboMilestone.current = 100;
      toast({
        title: "⚡ 100 Combo!",
        description: "Incredible focus!",
      });
    }
  }, [combo, isStarted, isFinished, toast]);

  useEffect(() => {
    if (!isStarted || isFinished || !currentText.length) {
      lastProgressMilestone.current = 0;
      return;
    }
    
    const progress = Math.floor((typedText.length / currentText.length) * 100);
    
    if (selectedDifficulty === 'intermediate') {
      if (progress >= 25 && lastProgressMilestone.current < 25) {
        lastProgressMilestone.current = 25;
        toast({
          title: "💪 25% Complete!",
          description: "Great start! Effects are warming up...",
        });
      } else if (progress >= 50 && lastProgressMilestone.current < 50) {
        lastProgressMilestone.current = 50;
        toast({
          title: "⚡ Halfway There!",
          description: "Chaos intensifying - stay focused!",
        });
      } else if (progress >= 75 && lastProgressMilestone.current < 75) {
        lastProgressMilestone.current = 75;
        toast({
          title: "🔥 75% - Almost There!",
          description: "Final stretch - you've got this!",
        });
      }
    }
  }, [typedText.length, currentText.length, isStarted, isFinished, selectedDifficulty, toast]);

  useEffect(() => {
    if (!isStarted || !config || !isTestActiveRef.current) return;
    
    const currentSession = testSessionRef.current;
    
    stressIntervalRef.current = setInterval(() => {
      if (testSessionRef.current !== currentSession || !isTestActiveRef.current) return;
      setStressLevel(calculateStressLevel());
    }, 100);
    
    return () => {
      if (stressIntervalRef.current) {
        clearInterval(stressIntervalRef.current);
        stressIntervalRef.current = null;
      }
    };
  }, [isStarted, config, calculateStressLevel]);

  useEffect(() => {
    if (!isStarted || !config || prefersReducedMotion || !isTestActiveRef.current) return;
    
    const currentSession = testSessionRef.current;
    
    effectsIntervalRef.current = setInterval(() => {
      if (testSessionRef.current !== currentSession || !isTestActiveRef.current) return;
      
      const intensity = config.effects.speedIncrease 
        ? 1 + (stressLevel / 50)
        : 1;
      
      if (config.effects.distractions && Math.random() > (1 - config.particleFrequency)) {
        const emojis = ['💥', '⚡', '🔥', '💀', '👻', '🌟', '💫', '✨', '⭐', '💣', '🎯', '🎪', '🎨', '🎭'];
        const particleCount = Math.min(3, Math.floor(1 + intensity * 2));
        
        setParticles((prev) => {
          if (prev.length >= MAX_PARTICLES) {
            const newParticles = prev.slice(-MAX_PARTICLES + particleCount);
            const additions: ParticleData[] = [];
            for (let i = 0; i < particleCount; i++) {
              particleIdRef.current += 1;
              additions.push({
                id: particleIdRef.current,
                x: Math.random() * 100,
                y: Math.random() * 100,
                emoji: emojis[Math.floor(Math.random() * emojis.length)],
                speed: 1 + Math.random() * 2,
              });
            }
            return [...newParticles, ...additions];
          }
          
          const additions: ParticleData[] = [];
          for (let i = 0; i < particleCount; i++) {
            particleIdRef.current += 1;
            additions.push({
              id: particleIdRef.current,
              x: Math.random() * 100,
              y: Math.random() * 100,
              emoji: emojis[Math.floor(Math.random() * emojis.length)],
              speed: 1 + Math.random() * 2,
            });
          }
          return [...prev, ...additions];
        });
        
        safeTimeout(() => {
          setParticles((prev) => prev.slice(particleCount));
        }, 1500 / intensity);
        
        playSound('chaos');
      }
      
      if (config.effects.colorShift) {
        const hue = Math.random() * 360;
        const saturation = 60 + Math.random() * 40;
        const lightness = 40 + Math.random() * 20;
        setCurrentColor(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
      }
      
      if (config.effects.limitedVisibility) {
        setBlur(2 + Math.random() * (8 * intensity));
      }
      
      if (config.effects.rotation) {
        setRotation((Math.random() - 0.5) * 15 * intensity);
      }
      
      if (config.effects.gravity) {
        setGravityOffset(Math.sin(Date.now() / 200) * 20 * intensity);
      }
      
      if (config.effects.glitch && Math.random() > 0.8) {
        setGlitchActive(true);
        safeTimeout(() => setGlitchActive(false), 50 + Math.random() * 100);
      }
      
      if (config.effects.textFade) {
        setTextOpacity(0.3 + Math.random() * 0.7);
      }
      
      if (config.effects.reverseText && Math.random() > 0.9) {
        setTextReversed(true);
        safeTimeout(() => setTextReversed(false), 500 + Math.random() * 1000);
      }
      
      if (config.effects.randomJumps && Math.random() > 0.85) {
        setTextPosition({
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 50,
        });
        safeTimeout(() => setTextPosition({ x: 0, y: 0 }), 300);
      }
      
      if (config.effects.screenInvert && Math.random() > 0.7) {
        const progressPercent = currentTextRef.current.length > 0 
          ? (typedTextRef.current.length / currentTextRef.current.length) * 100 : 0;
        
        if (selectedDifficultyRef.current === 'intermediate' && progressPercent < 30) {
        } else if (selectedDifficultyRef.current === 'intermediate') {
          setActiveEffectWarning('🔄 Screen Invert!');
          safeTimeout(() => {
            setActiveEffectWarning(null);
            setScreenInverted(true);
            safeTimeout(() => setScreenInverted(false), 800 + Math.random() * 1200);
          }, 500);
        } else {
          setScreenInverted(true);
          safeTimeout(() => setScreenInverted(false), 800 + Math.random() * 1200);
        }
      }
      
      if (config.effects.zoomChaos && Math.random() > 0.75) {
        const progressPercent = currentTextRef.current.length > 0 
          ? (typedTextRef.current.length / currentTextRef.current.length) * 100 : 0;
        
        if (selectedDifficultyRef.current === 'intermediate' && progressPercent < 40) {
        } else if (selectedDifficultyRef.current === 'intermediate') {
          setActiveEffectWarning('🔍 Zoom Chaos!');
          safeTimeout(() => {
            setActiveEffectWarning(null);
            const zoomRange = 0.5 + (stressLevel / 100);
            setZoomScale(0.6 + Math.random() * zoomRange);
            safeTimeout(() => setZoomScale(1), 600 + Math.random() * 800);
          }, 500);
        } else {
          const zoomRange = 0.5 + (stressLevel / 100);
          setZoomScale(0.6 + Math.random() * zoomRange);
          safeTimeout(() => setZoomScale(1), 600 + Math.random() * 800);
        }
      }
      
      if (config.effects.screenFlip && Math.random() > 0.85) {
        setScreenFlipped(true);
        safeTimeout(() => setScreenFlipped(false), 1000 + Math.random() * 2000);
      }
      
    }, 200);
    
    return () => {
      if (effectsIntervalRef.current) {
        clearInterval(effectsIntervalRef.current);
        effectsIntervalRef.current = null;
      }
    };
  }, [isStarted, config, stressLevel, prefersReducedMotion, playSound, safeTimeout]);

  useEffect(() => {
    if (!isStarted || !config?.effects.screenShake || prefersReducedMotion || !isTestActiveRef.current) return;
    
    const currentSession = testSessionRef.current;
    
    shakeIntervalRef.current = setInterval(() => {
      if (testSessionRef.current !== currentSession || !isTestActiveRef.current) return;
      const baseShake = config.baseShakeIntensity;
      const stressBonus = (stressLevel / 100) * baseShake;
      setShakeIntensity(baseShake + stressBonus);
    }, 50);
    
    return () => {
      if (shakeIntervalRef.current) {
        clearInterval(shakeIntervalRef.current);
        shakeIntervalRef.current = null;
      }
    };
  }, [isStarted, config, stressLevel, prefersReducedMotion]);

  useEffect(() => {
    if (!isStarted || isFinished) return;
    
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTestActiveRef.current) {
        finishTest(false);
        toast({
          title: "Test Aborted",
          description: "You quit the test early. No score saved.",
          variant: "destructive",
        });
      }
    };
    
    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [isStarted, isFinished, finishTest, toast]);

  const handleReset = useCallback(() => {
    testSessionRef.current += 1;
    isTestActiveRef.current = false;
    clearAllTimers();
    setSelectedDifficulty(null);
    setIsStarted(false);
    setIsFinished(false);
    setCountdown(0);
    setTypedText('');
    setErrors(0);
    setCombo(0);
    setMaxCombo(0);
    maxComboRef.current = 0;
    setFinalResults(null);
    resetVisualStates();
  }, [clearAllTimers, resetVisualStates]);

  const displayText = textReversed ? currentText.split('').reverse().join('') : currentText;
  
  const renderedCharacters = useMemo(() => {
    if (!currentText) return [];
    const textLength = currentText.length;
    return displayText.split('').map((char, displayIndex) => {
      const originalIndex = textReversed ? (textLength - 1 - displayIndex) : displayIndex;
      
      let color = 'text-muted-foreground';
      if (originalIndex < typedText.length) {
        color = typedText[originalIndex] === currentText[originalIndex] ? 'text-green-500' : 'text-red-500';
      } else if (originalIndex === typedText.length) {
        color = 'text-primary bg-primary/20';
      }
      return { char, color, index: displayIndex };
    });
  }, [displayText, typedText, currentText, textReversed]);

  if (!selectedDifficulty || (!isStarted && !isFinished && countdown === 0)) {
    return (
      <TooltipProvider delayDuration={200}>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/">
                  <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Return to home page</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/stress-leaderboard">
                  <Button variant="outline" size="sm" className="gap-2" data-testid="button-leaderboard">
                    <Trophy className="w-4 h-4" />
                    Leaderboard
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>View top stress test scores from all players</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 mb-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Zap className={`w-12 h-12 text-primary cursor-help ${prefersReducedMotion ? '' : 'animate-pulse'}`} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>High intensity typing challenge</p>
                  </TooltipContent>
                </Tooltip>
                
                <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500">
                  Typing Stress Test
                </h1>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Skull className={`w-12 h-12 text-destructive cursor-help ${prefersReducedMotion ? '' : 'animate-bounce'}`} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Test your typing under extreme pressure!</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Can you type while the world collapses around you? Choose your nightmare.
              </p>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg max-w-xl mx-auto cursor-help" role="alert">
                    <div className="flex items-center gap-2 justify-center text-destructive">
                      <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                      <p className="font-semibold">Warning: May cause extreme frustration</p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p>This mode features intense visual effects including screen shake, color shifts, and text distortions. Not recommended for those sensitive to flashing lights.</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8" role="list" aria-label="Difficulty levels">
              {(Object.keys(DIFFICULTY_CONFIGS) as Difficulty[]).map((difficulty) => {
                const diffConfig = DIFFICULTY_CONFIGS[difficulty];
                const activeEffects = Object.entries(diffConfig.effects).filter(([_, enabled]) => enabled);
                
                return (
                  <Tooltip key={difficulty}>
                    <TooltipTrigger asChild>
                      <Card
                        className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-2 ${
                          difficulty === 'impossible' 
                            ? `border-purple-500 hover:border-purple-400 ${prefersReducedMotion ? '' : 'animate-pulse'}` 
                            : 'border-border hover:border-primary'
                        }`}
                        onClick={() => handleStart(difficulty)}
                        data-testid={`card-difficulty-${difficulty}`}
                        role="listitem"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleStart(difficulty);
                          }
                        }}
                        aria-label={`${diffConfig.name} - ${diffConfig.difficulty}`}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${diffConfig.color} opacity-50`} aria-hidden="true" />
                        <CardContent className="relative p-6">
                          <div className="text-center mb-4">
                            <div className="text-6xl mb-2" aria-hidden="true">{diffConfig.icon}</div>
                            <h3 className="text-2xl font-bold mb-2">{diffConfig.name}</h3>
                            <p className="text-sm text-muted-foreground mb-4">{diffConfig.description}</p>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-background/80 rounded-full text-sm font-mono cursor-help">
                                  <Clock className="w-3 h-3" aria-hidden="true" />
                                  {diffConfig.duration}s duration
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>You have {diffConfig.duration} seconds to complete the text</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-center gap-1 font-semibold mb-2">
                              <span>Active Torments:</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p>Effects that will make your typing experience chaotic. Hover over each effect for details.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            {activeEffects.map(([effect]) => (
                              <Tooltip key={effect}>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2 bg-background/60 px-2 py-1 rounded cursor-help hover:bg-background/80 transition-colors">
                                    <span className={`w-2 h-2 bg-destructive rounded-full ${prefersReducedMotion ? '' : 'animate-pulse'}`} aria-hidden="true" />
                                    <span className="capitalize">{effect.replace(/([A-Z])/g, ' $1').trim()}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <p>{EFFECT_DESCRIPTIONS[effect as keyof StressEffects]}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-semibold">{diffConfig.difficulty}</p>
                        {difficulty === 'intermediate' && (
                          <>
                            <p className="text-xs text-green-400">✓ Progressive chaos - effects ramp up gradually</p>
                            <p className="text-xs text-green-400">✓ Milestone encouragement at 25%, 50%, 75%</p>
                            <p className="text-xs text-green-400">✓ Effect warnings before disorienting moments</p>
                          </>
                        )}
                        {difficulty === 'beginner' && (
                          <p className="text-xs text-green-400">✓ Perfect for learning the chaos mechanics</p>
                        )}
                        <p className="text-xs text-muted-foreground">{activeEffects.length} active effects</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            <div className="text-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="gap-2"
                    data-testid="button-toggle-sound"
                    aria-pressed={soundEnabled}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    {soundEnabled ? 'Sound On' : 'Sound Off'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{soundEnabled ? 'Click to mute chaotic sound effects' : 'Click to enable sound effects during the test'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  if (countdown > 0 && !isStarted) {
    return (
      <TooltipProvider>
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50" role="alert" aria-live="assertive">
          <div className="text-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <h2 className="text-2xl font-bold mb-4 text-muted-foreground cursor-help">Get Ready...</h2>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Focus on the screen - chaos begins soon!</p>
              </TooltipContent>
            </Tooltip>
            <div className={`text-9xl font-bold text-destructive ${prefersReducedMotion ? '' : 'animate-bounce'}`} aria-label={`Starting in ${countdown}`}>
              {countdown}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xl text-muted-foreground mt-4 cursor-help">
                  {config?.name}
                </p>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{config?.description}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  if (isFinished && finalResults) {
    const { survivalTime, wpm, accuracy, completionRate, stressScore } = finalResults;

    return (
      <TooltipProvider delayDuration={200}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <div className="text-center mb-8" role="status" aria-live="polite">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-primary" aria-hidden="true" />
                  
                  <h2 className="text-4xl font-bold mb-2">
                    {completionRate >= 100 ? '🎉 Completed!' : '💀 Survived!'}
                  </h2>
                  
                  <p className="text-lg text-muted-foreground mb-2">
                    {config?.name} · {config?.difficulty}
                  </p>
                  
                  <div className="inline-flex items-center gap-2 bg-primary/10 px-6 py-3 rounded-full">
                    <span className="text-sm text-muted-foreground">Stress Score</span>
                    <span className="text-3xl font-bold text-primary">{stressScore}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8" role="list" aria-label="Test results">
                  <div className="text-center p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="stat-wpm" role="listitem">
                    <div className="text-3xl font-bold text-primary" aria-label={`${wpm} words per minute`}>{wpm}</div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <BarChart3 className="w-3 h-3" aria-hidden="true" />
                      WPM
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="stat-accuracy" role="listitem">
                    <div className="text-3xl font-bold text-green-500" aria-label={`${accuracy.toFixed(1)} percent accuracy`}>{accuracy.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <Target className="w-3 h-3" aria-hidden="true" />
                      Accuracy
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="stat-completion" role="listitem">
                    <div className="text-3xl font-bold text-orange-500" aria-label={`${completionRate.toFixed(1)} percent completed`}>{completionRate.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <Eye className="w-3 h-3" aria-hidden="true" />
                      Completed
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="stat-combo" role="listitem">
                    <div className="text-3xl font-bold text-purple-500" aria-label={`Maximum combo of ${maxCombo}`}>{maxCombo}</div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <Flame className="w-3 h-3" aria-hidden="true" />
                      Max Combo
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="stat-errors" role="listitem">
                    <div className="text-3xl font-bold text-red-500" aria-label={`${errors} errors`}>{errors}</div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <XCircle className="w-3 h-3" aria-hidden="true" />
                      Errors
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="stat-survival" role="listitem">
                    <div className="text-3xl font-bold text-blue-500" aria-label={`Survived ${Math.round(survivalTime)} seconds`}>{Math.round(survivalTime)}s</div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <Timer className="w-3 h-3" aria-hidden="true" />
                      Survival Time
                    </div>
                  </div>
                </div>

                {!user && (
                  <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg" data-testid="login-prompt">
                    <div className="flex items-center gap-3">
                      <LogIn className="w-5 h-5 text-amber-500 flex-shrink-0" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="font-medium text-amber-500">Login to save your results</p>
                        <p className="text-sm text-muted-foreground">Your score won't be saved to the leaderboard without an account.</p>
                      </div>
                      <Link href="/login">
                        <Button size="sm" variant="outline" className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10" data-testid="button-login-save">
                          Login
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {user && (
                  <div className="mb-6 p-3 bg-green-500/10 border border-green-500/30 rounded-lg" data-testid="save-status">
                    <p className="text-sm text-green-500 text-center">
                      {saveResultMutation.isPending ? '⏳ Saving result...' : 
                       saveResultMutation.isSuccess ? '✓ Result saved to your profile!' : 
                       saveResultMutation.isError ? '✗ Failed to save - please try again' : ''}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={() => selectedDifficulty && handleStart(selectedDifficulty)} 
                    className="w-full gap-2"
                    data-testid="button-retry-same"
                  >
                    <Zap className="w-4 h-4" aria-hidden="true" />
                    Retry {config?.name}
                  </Button>
                  
                  <div className="flex gap-4">
                    <Button onClick={handleReset} variant="outline" className="flex-1 gap-2" data-testid="button-try-again">
                      <RefreshCw className="w-4 h-4" aria-hidden="true" />
                      Change Difficulty
                    </Button>
                    
                    <Link href="/" className="flex-1">
                      <Button variant="outline" className="w-full gap-2" data-testid="button-home">
                        <Home className="w-4 h-4" aria-hidden="true" />
                        Home
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  const progress = currentText.length > 0 ? Math.min(100, (typedText.length / currentText.length) * 100) : 0;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={containerRef}
        onClick={() => inputRef.current?.focus()}
        className={`min-h-screen flex items-center justify-center p-4 transition-all duration-100 cursor-text ${
          backgroundFlash ? 'bg-red-500/30' : 'bg-background'
        }`}
        style={{
          transform: prefersReducedMotion ? 'none' : `translate(${Math.sin(Date.now() / 100) * shakeIntensity}px, ${Math.cos(Date.now() / 80) * shakeIntensity}px) rotate(${rotation}deg) scale(${zoomScale}) ${screenFlipped ? 'rotateX(180deg)' : ''}`,
          filter: prefersReducedMotion ? 'none' : `${glitchActive ? 'hue-rotate(180deg) saturate(3)' : ''} ${screenInverted ? 'invert(1) hue-rotate(180deg)' : ''}`,
        }}
        role="main"
        aria-label="Stress test in progress"
      >
        {!prefersReducedMotion && particles.map((particle) => (
          <Particle key={particle.id} particle={particle} />
        ))}

        <div className="w-full max-w-4xl">
          <div className="mb-8 flex items-center justify-between" role="status" aria-live="polite">
            <div className="flex items-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-2xl font-mono font-bold cursor-help" style={{ color: prefersReducedMotion ? undefined : currentColor }} aria-label={`${timeLeft} seconds remaining`}>
                    {timeLeft}s
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Time remaining - type fast!</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`text-sm text-muted-foreground transition-all cursor-help ${
                    comboExplosion && !prefersReducedMotion ? 'scale-150 text-yellow-500' : ''
                  }`} aria-label={`Current combo: ${combo}`}>
                    Combo: <span className="text-primary font-bold">{combo}</span>
                    {comboExplosion && !prefersReducedMotion && <span className="ml-1 animate-ping" aria-hidden="true">🔥</span>}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Current streak of correct keys. Every 10 combo = bonus!</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-sm text-muted-foreground cursor-help" aria-label={`${errors} errors`}>
                    Errors: <span className="text-destructive font-bold">{errors}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Mistakes reset your combo and shake the screen!</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help" aria-label={`Stress level: ${Math.round(stressLevel)} percent`}>
                  <span className="text-sm text-muted-foreground">Stress</span>
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(stressLevel)} aria-valuemin={0} aria-valuemax={100}>
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-300"
                      style={{ width: `${stressLevel}%` }}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="space-y-1">
                  <p className="font-semibold">Stress Level: {Math.round(stressLevel)}%</p>
                  <p className="text-xs">As stress increases, visual effects intensify!</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <Progress value={progress} className="mb-8 h-3" aria-label={`Progress: ${progress.toFixed(1)} percent complete`} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Progress: {progress.toFixed(1)}% - {typedText.length}/{currentText.length} characters</p>
            </TooltipContent>
          </Tooltip>

          <Card
            className="mb-8 transition-all duration-200"
            style={prefersReducedMotion ? {} : {
              transform: `translateY(${gravityOffset}px) translate(${textPosition.x}px, ${textPosition.y}px)`,
              opacity: textOpacity,
              filter: `blur(${blur}px)`,
              borderColor: currentColor,
              borderWidth: '2px',
            }}
          >
            <CardContent className="p-8">
              <div className="text-2xl font-mono leading-relaxed whitespace-pre-wrap select-none" aria-label="Text to type">
                {renderedCharacters.map(({ char, color, index }) => (
                  <span
                    key={index}
                    className={`${color} transition-colors duration-100`}
                    style={{
                      display: 'inline-block',
                      animation: glitchActive && !prefersReducedMotion ? 'glitch 0.1s infinite' : 'none',
                    }}
                  >
                    {char}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <input
            ref={inputRef}
            type="text"
            value={typedText}
            onChange={handleInputChange}
            onBlur={() => {
              if (isStarted && !isFinished && isTestActiveRef.current) {
                setTimeout(() => inputRef.current?.focus(), 10);
              }
            }}
            className="sr-only"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Type the text shown above"
            data-testid="input-typing"
          />
          
          <p className="text-center text-sm text-muted-foreground" aria-live="polite">
            {isStarted ? 'Click anywhere or press ESC to quit' : 'Click to focus and start typing'}
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
