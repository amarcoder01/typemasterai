import { useState, useEffect, useRef, useCallback, useMemo, memo, useLayoutEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, Zap, Skull, Trophy, Eye, Volume2, VolumeX, AlertTriangle, HelpCircle, Clock, Target, Flame, XCircle, Timer, BarChart3, RefreshCw, Home, Info, ChevronDown, Share2, Copy, Check, Loader2, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { calculateWPM, calculateAccuracy } from '@/lib/typing-utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
  gradientFrom: string;
  gradientTo: string;
  baseShakeIntensity: number;
  particleFrequency: number;
  multiplier: number;
  difficulty: string;
  badge: string;
  badgeClass: string;
  survivalRate: number;
}> = {
  beginner: {
    name: 'Warm-Up Chaos',
    description: 'Light screen shake and basic distractions. Perfect for first-timers.',
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
    color: 'from-orange-500/20 to-red-500/20',
    gradientFrom: '#22c55e',
    gradientTo: '#16a34a',
    baseShakeIntensity: 5,
    particleFrequency: 0.3,
    multiplier: 1,
    difficulty: 'Easy',
    badge: 'Easy',
    badgeClass: 'stress-badge-easy',
    survivalRate: 78,
  },
  intermediate: {
    name: 'Mind Scrambler',
    description: 'Screen inverts, colors shift, and zoom goes wild. Stay focused!',
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
    gradientFrom: '#eab308',
    gradientTo: '#ca8a04',
    baseShakeIntensity: 15,
    particleFrequency: 0.5,
    multiplier: 2,
    difficulty: 'Medium',
    badge: 'Medium',
    badgeClass: 'stress-badge-medium',
    survivalRate: 52,
  },
  expert: {
    name: 'Absolute Mayhem',
    description: 'Screen flips, glitches strike, and visibility fades. Chaos reigns.',
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
    gradientFrom: '#f97316',
    gradientTo: '#ea580c',
    baseShakeIntensity: 25,
    particleFrequency: 0.7,
    multiplier: 3,
    difficulty: 'Hard',
    badge: 'Hard',
    badgeClass: 'stress-badge-hard',
    survivalRate: 28,
  },
  nightmare: {
    name: 'Nightmare Realm',
    description: 'Text reverses, reality collapses. Your sanity will be tested.',
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
    gradientFrom: '#dc2626',
    gradientTo: '#991b1b',
    baseShakeIntensity: 40,
    particleFrequency: 0.85,
    multiplier: 4,
    difficulty: 'Extreme',
    badge: 'Extreme',
    badgeClass: 'stress-badge-extreme',
    survivalRate: 8,
  },
  impossible: {
    name: 'IMPOSSIBLE',
    description: 'Text teleports, ALL effects active. Reality ceases to exist.',
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
    gradientFrom: '#7c3aed',
    gradientTo: '#581c87',
    baseShakeIntensity: 60,
    particleFrequency: 0.95,
    multiplier: 5,
    difficulty: 'Legendary',
    badge: 'Legendary',
    badgeClass: 'stress-badge-legendary',
    survivalRate: 1,
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
    className="fixed pointer-events-none text-4xl animate-ping stress-particle-safe-zone"
    style={{
      transform: `translate(${particle.x}vw, ${particle.y}vh)`,
      animationDuration: `${particle.speed}s`,
      willChange: 'transform, opacity',
      top: 0,
      left: 0,
    }}
    aria-hidden="true"
  >
    {particle.emoji}
  </div>
));

Particle.displayName = 'Particle';

const getPerformanceTier = (stressScore: number, difficulty: Difficulty): { tier: string; class: string; emoji: string } => {
  const thresholds = {
    beginner: { platinum: 5000, gold: 3000, silver: 1500, bronze: 500 },
    intermediate: { platinum: 8000, gold: 5000, silver: 2500, bronze: 1000 },
    expert: { platinum: 12000, gold: 8000, silver: 4000, bronze: 2000 },
    nightmare: { platinum: 18000, gold: 12000, silver: 6000, bronze: 3000 },
    impossible: { platinum: 25000, gold: 18000, silver: 10000, bronze: 5000 },
  };
  
  const t = thresholds[difficulty];
  if (stressScore >= t.platinum) return { tier: 'Platinum', class: 'stress-tier-platinum', emoji: '💎' };
  if (stressScore >= t.gold) return { tier: 'Gold', class: 'stress-tier-gold', emoji: '🥇' };
  if (stressScore >= t.silver) return { tier: 'Silver', class: 'stress-tier-silver', emoji: '🥈' };
  if (stressScore >= t.bronze) return { tier: 'Bronze', class: 'stress-tier-bronze', emoji: '🥉' };
  return { tier: 'Participant', class: 'text-muted-foreground', emoji: '🎯' };
};

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
  const [keypressFlash, setKeypressFlash] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [comboMilestone, setComboMilestone] = useState<number | null>(null);
  
  const confettiRef = useRef<typeof import('canvas-confetti').default | null>(null);
  
  useEffect(() => {
    import('canvas-confetti').then((mod) => {
      confettiRef.current = mod.default;
    });
  }, []);
  
  const [finalResults, setFinalResults] = useState<{
    survivalTime: number;
    wpm: number;
    accuracy: number;
    completionRate: number;
    stressScore: number;
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
      
      if (!res.ok) throw new Error('Failed to save result');
      return res.json();
    },
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
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Could not save your result. Please try again.",
        variant: "destructive",
      });
    },
  });

  const finishTest = useCallback((completed: boolean = false) => {
    const currentSession = testSessionRef.current;
    
    isTestActiveRef.current = false;
    clearAllTimers();
    resetVisualStates();
    
    setIsFinished(true);
    setIsStarted(false);
    setCountdown(0);
    
    setTypedText((currentTypedText) => {
      setCurrentText((currentTextValue) => {
        setErrors((currentErrors) => {
          setStartTime((currentStartTime) => {
            setSelectedDifficulty((currentDifficulty) => {
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
              
              setFinalResults({ survivalTime, wpm, accuracy, completionRate, stressScore });
              
              if (completed) {
                playSound('complete');
                if (!prefersReducedMotion && confettiRef.current) {
                  confettiRef.current({
                    particleCount: 200,
                    spread: 100,
                    origin: { y: 0.6 },
                    colors: ['#ff0000', '#ff6600', '#ffaa00'],
                  });
                }
                
                toast({
                  title: "🎉 Incredible!",
                  description: `You survived ${currentDifficulty} mode! Score: ${stressScore}`,
                });
              } else {
                playSound('error');
                toast({
                  title: "Time's Up!",
                  description: `You survived ${Math.round(survivalTime)}s. Score: ${stressScore}`,
                  variant: "destructive",
                });
              }
              
              const diffConfig = currentDifficulty ? DIFFICULTY_CONFIGS[currentDifficulty] : null;
              if (diffConfig && currentDifficulty) {
                saveResultMutation.mutate({
                  difficulty: currentDifficulty,
                  enabledEffects: diffConfig.effects,
                  wpm,
                  accuracy,
                  errors: currentErrors,
                  maxCombo,
                  totalCharacters: currentTypedText.length,
                  duration: diffConfig.duration,
                  survivalTime,
                  completionRate,
                  stressScore,
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
  }, [clearAllTimers, resetVisualStates, playSound, prefersReducedMotion, toast, maxCombo, saveResultMutation]);

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
    setIsFinished(false);
    setFinalResults(null);
    resetVisualStates();
    
    setSelectedDifficulty(difficulty);
    setCountdown(3);
    const randomText = SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
    setCurrentText(randomText);
    
    const diffConfig = DIFFICULTY_CONFIGS[difficulty];
    toast({
      title: `${diffConfig.icon} ${diffConfig.name}`,
      description: `${diffConfig.duration}s of pure chaos awaits! Get ready...`,
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
      setTypedText(value);
      
      if (!prefersReducedMotion) {
        setKeypressFlash(true);
        safeTimeout(() => setKeypressFlash(false), 100);
      }
      
      setCombo((prev) => {
        const newCombo = prev + 1;
        if (newCombo > maxCombo) setMaxCombo(newCombo);
        
        const milestones = [10, 25, 50, 100, 150, 200];
        if (milestones.includes(newCombo)) {
          playSound('combo');
          setComboMilestone(newCombo);
          safeTimeout(() => setComboMilestone(null), 1500);
          
          if (!prefersReducedMotion) {
            setComboExplosion(true);
            safeTimeout(() => setComboExplosion(false), 500);
          }
          
          if (newCombo === 25) {
            toast({
              title: "🔥 25 Combo!",
              description: "Nice streak! Keep going!",
            });
          } else if (newCombo === 50) {
            toast({
              title: "⚡ 50 Combo!",
              description: "You're on fire! Keep it up!",
            });
          } else if (newCombo === 100) {
            toast({
              title: "💎 100 Combo!",
              description: "Incredible focus under pressure!",
            });
          } else if (newCombo === 200) {
            toast({
              title: "🌟 200 Combo!",
              description: "LEGENDARY! You're unstoppable!",
            });
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
  }, [isStarted, isFinished, currentText, typedText, playSound, maxCombo, prefersReducedMotion, toast, config, stressLevel, safeTimeout]);

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
        if (prev === 10) {
          playSound('warning');
          toast({
            title: "⏰ 10 Seconds Left!",
            description: "Final push! You can do this!",
            variant: "destructive",
          });
        } else if (prev <= 5) {
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
  }, [isStarted, isFinished, playSound, toast]);

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
      
      const intensity = 1 + (stressLevel / 100);
      
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
        setScreenInverted(true);
        safeTimeout(() => setScreenInverted(false), 800 + Math.random() * 1200);
      }
      
      if (config.effects.zoomChaos && Math.random() > 0.75) {
        const zoomRange = 0.5 + (stressLevel / 100);
        setZoomScale(0.6 + Math.random() * zoomRange);
        safeTimeout(() => setZoomScale(1), 600 + Math.random() * 800);
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
    setFinalResults(null);
    resetVisualStates();
  }, [clearAllTimers, resetVisualStates]);

  const handleShareResult = useCallback(() => {
    if (!finalResults || !selectedDifficulty || !config) return;
    
    const { wpm, accuracy, stressScore } = finalResults;
    const tier = getPerformanceTier(stressScore, selectedDifficulty);
    
    const shareText = `🔥 Stress Test Result 🔥
${tier.emoji} ${tier.tier} Tier
📊 Score: ${stressScore}
⚡ WPM: ${wpm} | 🎯 Accuracy: ${accuracy.toFixed(1)}%
🏆 Difficulty: ${config.name}

Think you can beat me? Try the Typing Stress Test!`;

    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied to clipboard!",
        description: "Share your result with friends!",
      });
    });
  }, [finalResults, selectedDifficulty, config, toast]);

  if (!selectedDifficulty || (!isStarted && !isFinished && countdown === 0)) {
    return (
      <TooltipProvider delayDuration={200}>
        <div className="stress-test-container min-h-screen">
          <a href="#difficulty-selection" className="stress-skip-link">Skip to difficulty selection</a>
          
          <div className={`relative overflow-hidden ${prefersReducedMotion ? 'bg-background' : 'stress-hero-gradient'}`}>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" aria-hidden="true" />
            
            <div className="container mx-auto px-4 py-6 relative z-10">
              <div className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/">
                      <Button variant="ghost" size="sm" className="gap-2 stress-button-glow" data-testid="button-back">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Back</span>
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
                      <Button variant="outline" size="sm" className="gap-2 stress-button-glow" data-testid="button-leaderboard">
                        <Trophy className="w-4 h-4" />
                        <span className="hidden sm:inline">Leaderboard</span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>View top stress test scores from all players</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="text-center py-12 sm:py-16 lg:py-20">
                <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6">
                  <Zap className={`w-8 h-8 sm:w-12 sm:h-12 text-primary ${prefersReducedMotion ? '' : 'animate-pulse'}`} aria-hidden="true" />
                  <Skull className={`w-8 h-8 sm:w-12 sm:h-12 text-destructive ${prefersReducedMotion ? '' : 'animate-bounce'}`} aria-hidden="true" />
                </div>
                
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500">
                  Can You Survive the Chaos?
                </h1>
                
                <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
                  Push your typing skills to the absolute limit. Distractions, visual chaos, and 
                  time pressure await. Only the focused will prevail.
                </p>
                
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-destructive/15 border border-destructive/30 rounded-full text-destructive text-sm" role="alert">
                  <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="font-medium">Warning: Intense visual effects ahead</span>
                </div>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-4 py-8 sm:py-12" id="difficulty-selection">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Choose Your Challenge</h2>
                <p className="text-sm text-muted-foreground">Select a difficulty level to begin your descent into madness</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-10" role="list" aria-label="Difficulty levels">
                {(Object.keys(DIFFICULTY_CONFIGS) as Difficulty[]).map((difficulty) => {
                  const diffConfig = DIFFICULTY_CONFIGS[difficulty];
                  const activeEffects = Object.entries(diffConfig.effects).filter(([_, enabled]) => enabled);
                  
                  return (
                    <div 
                      key={difficulty}
                      className={`group relative stress-glass-card rounded-xl cursor-pointer transition-all duration-300 hover:-translate-y-2 focus-within:ring-2 focus-within:ring-primary ${
                        difficulty === 'impossible' ? 'ring-2 ring-purple-500/50' : ''
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
                      aria-label={`${diffConfig.name} - ${diffConfig.difficulty} difficulty with ${diffConfig.survivalRate}% survival rate`}
                    >
                      <div 
                        className="absolute inset-0 rounded-xl opacity-20 group-hover:opacity-30 transition-opacity"
                        style={{ background: `linear-gradient(135deg, ${diffConfig.gradientFrom}, ${diffConfig.gradientTo})` }}
                        aria-hidden="true"
                      />
                      
                      <div className="relative p-4 sm:p-6">
                        <div className={`stress-difficulty-badge ${diffConfig.badgeClass} inline-block mb-3`}>
                          {diffConfig.badge}
                        </div>
                        
                        <div className={`text-4xl sm:text-5xl mb-3 ${prefersReducedMotion ? '' : 'stress-effect-preview'}`} aria-hidden="true">
                          {diffConfig.icon}
                        </div>
                        
                        <h3 className="text-lg sm:text-xl font-bold mb-2">{diffConfig.name}</h3>
                        
                        <p className="text-xs sm:text-sm text-muted-foreground mb-4 line-clamp-2">{diffConfig.description}</p>
                        
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" aria-hidden="true" />
                              Duration
                            </span>
                            <span className="font-mono font-bold">{diffConfig.duration}s</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Target className="w-3 h-3" aria-hidden="true" />
                              Survival Rate
                            </span>
                            <span className="font-mono font-bold" style={{ color: diffConfig.gradientFrom }}>{diffConfig.survivalRate}%</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <BarChart3 className="w-3 h-3" aria-hidden="true" />
                              Multiplier
                            </span>
                            <span className="font-mono font-bold">{diffConfig.multiplier}x</span>
                          </div>
                        </div>
                        
                        <div className="pt-3 border-t border-white/10">
                          <div className="text-xs text-muted-foreground mb-2">{activeEffects.length} Active Effects</div>
                          <div className="flex flex-wrap gap-1">
                            {activeEffects.slice(0, 4).map(([effect]) => (
                              <Tooltip key={effect}>
                                <TooltipTrigger asChild>
                                  <span className="inline-block w-2 h-2 rounded-full bg-destructive/60 cursor-help" aria-label={effect} />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="font-semibold capitalize mb-1">{effect.replace(/([A-Z])/g, ' $1').trim()}</p>
                                  <p className="text-xs text-muted-foreground">{EFFECT_DESCRIPTIONS[effect as keyof StressEffects]}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                            {activeEffects.length > 4 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-xs text-muted-foreground cursor-help">+{activeEffects.length - 4} more</span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-1">
                                    {activeEffects.slice(4).map(([effect]) => (
                                      <p key={effect} className="text-xs capitalize">{effect.replace(/([A-Z])/g, ' $1').trim()}</p>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="max-w-2xl mx-auto mb-8">
                <Collapsible open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between gap-2 stress-glass-card py-4" data-testid="button-how-it-works">
                      <span className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4" />
                        How It Works & Scoring
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${howItWorksOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="stress-glass-card rounded-xl mt-2 overflow-hidden">
                    <div className="p-6 space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Keyboard className="w-4 h-4 text-primary" />
                          The Challenge
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Type the displayed text as quickly and accurately as possible while visual chaos unfolds around you. 
                          Each difficulty level introduces more distracting effects to test your focus.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-primary" />
                          Scoring Formula
                        </h4>
                        <div className="bg-background/50 rounded-lg p-3 font-mono text-sm">
                          <span className="text-primary">Stress Score</span> = WPM × Accuracy × Completion × Difficulty Multiplier
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Flame className="w-4 h-4 text-primary" />
                          Combo System
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Build combos by typing correctly without mistakes. Reach milestones at 10, 25, 50, 100, and 200 for bonus celebrations! 
                          Any mistake resets your combo and triggers extra chaos.
                        </p>
                      </div>
                      
                      <div className="pt-2 border-t border-white/10 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span className="stress-kbd">ESC</span>
                          <span>Quit test</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="stress-kbd">SPACE</span>
                          <span>Retry after results</span>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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
                      {soundEnabled ? 'Sound Effects On' : 'Sound Effects Off'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{soundEnabled ? 'Click to mute chaotic sound effects' : 'Click to enable sound effects during the test'}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
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
          <div className={`text-center ${prefersReducedMotion ? '' : 'stress-shake-preview'}`}>
            <h2 className="text-lg sm:text-2xl font-bold mb-6 text-muted-foreground uppercase tracking-widest">Get Ready...</h2>
            
            <div className="relative inline-flex items-center justify-center mb-6">
              <svg className="stress-countdown-svg w-32 h-32 sm:w-40 sm:h-40" viewBox="0 0 100 100" aria-hidden="true">
                <circle className="stress-countdown-bg" cx="50" cy="50" r="45" />
                <circle 
                  key={`countdown-${countdown}`}
                  className="stress-countdown-progress" 
                  cx="50" 
                  cy="50" 
                  r="45"
                />
              </svg>
              <span className="absolute text-6xl sm:text-8xl font-bold text-destructive" aria-label={`Starting in ${countdown}`}>
                {countdown}
              </span>
            </div>
            
            <div className="space-y-2">
              <p className="text-xl sm:text-2xl font-bold" style={config ? { background: `linear-gradient(135deg, ${config.gradientFrom}, ${config.gradientTo})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : {}}>
                {config?.name}
              </p>
              <p className="text-sm text-muted-foreground">{config?.description}</p>
              
              {soundEnabled && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
                  <Volume2 className="w-3 h-3" />
                  <span>Sound effects enabled</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  if (isFinished && finalResults) {
    const { survivalTime, wpm, accuracy, completionRate, stressScore } = finalResults;
    const difficultyMultiplier = selectedDifficulty === 'impossible' ? 5 : 
                                 selectedDifficulty === 'nightmare' ? 4 :
                                 selectedDifficulty === 'expert' ? 3 :
                                 selectedDifficulty === 'intermediate' ? 2 : 1;
    const tier = selectedDifficulty ? getPerformanceTier(stressScore, selectedDifficulty) : { tier: 'Participant', class: '', emoji: '🎯' };

    return (
      <TooltipProvider delayDuration={200}>
        <div className="stress-test-container min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <div className="stress-results-card relative p-6 sm:p-8" role="status" aria-live="polite">
              <div className="text-center mb-6">
                <div className={`text-5xl sm:text-6xl mb-3 ${tier.class}`} aria-hidden="true">
                  {tier.emoji}
                </div>
                
                <h2 className="text-2xl sm:text-4xl font-bold mb-2">
                  {completionRate >= 100 ? 'Challenge Completed!' : 'You Survived!'}
                </h2>
                
                <div className={`inline-block stress-difficulty-badge ${config?.badgeClass} mb-3`}>
                  {tier.tier} Tier
                </div>
                
                <p className="text-3xl sm:text-5xl font-bold text-primary mb-1">{stressScore}</p>
                <p className="text-sm text-muted-foreground">Stress Score</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6" role="list" aria-label="Test results">
                <div className="stress-glass-card rounded-lg p-3 sm:p-4 text-center" data-testid="stat-wpm" role="listitem">
                  <div className="text-xl sm:text-2xl font-bold text-primary" aria-label={`${wpm} words per minute`}>{wpm}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <BarChart3 className="w-3 h-3" aria-hidden="true" />
                    WPM
                  </div>
                </div>
                
                <div className="stress-glass-card rounded-lg p-3 sm:p-4 text-center" data-testid="stat-accuracy" role="listitem">
                  <div className="text-xl sm:text-2xl font-bold text-green-500" aria-label={`${accuracy.toFixed(1)} percent accuracy`}>{accuracy.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Target className="w-3 h-3" aria-hidden="true" />
                    Accuracy
                  </div>
                </div>
                
                <div className="stress-glass-card rounded-lg p-3 sm:p-4 text-center" data-testid="stat-completion" role="listitem">
                  <div className="text-xl sm:text-2xl font-bold text-orange-500" aria-label={`${completionRate.toFixed(1)} percent completed`}>{completionRate.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Eye className="w-3 h-3" aria-hidden="true" />
                    Completed
                  </div>
                </div>
                
                <div className="stress-glass-card rounded-lg p-3 sm:p-4 text-center" data-testid="stat-combo" role="listitem">
                  <div className="text-xl sm:text-2xl font-bold text-purple-500" aria-label={`Maximum combo of ${maxCombo}`}>{maxCombo}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Flame className="w-3 h-3" aria-hidden="true" />
                    Max Combo
                  </div>
                </div>
                
                <div className="stress-glass-card rounded-lg p-3 sm:p-4 text-center" data-testid="stat-errors" role="listitem">
                  <div className="text-xl sm:text-2xl font-bold text-red-500" aria-label={`${errors} errors`}>{errors}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <XCircle className="w-3 h-3" aria-hidden="true" />
                    Errors
                  </div>
                </div>
                
                <div className="stress-glass-card rounded-lg p-3 sm:p-4 text-center" data-testid="stat-survival" role="listitem">
                  <div className="text-xl sm:text-2xl font-bold text-blue-500" aria-label={`Survived ${Math.round(survivalTime)} seconds`}>{Math.round(survivalTime)}s</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Timer className="w-3 h-3" aria-hidden="true" />
                    Survival
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-muted-foreground mb-6 p-3 bg-background/30 rounded-lg">
                <p className="font-mono">Score = WPM ({wpm}) × Accuracy ({accuracy.toFixed(0)}%) × Completion ({completionRate.toFixed(0)}%) × {difficultyMultiplier}x</p>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleShareResult}
                  variant="outline"
                  className="w-full gap-2 stress-button-glow"
                  data-testid="button-share"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Share Result'}
                </Button>
                
                <Button 
                  onClick={() => selectedDifficulty && handleStart(selectedDifficulty)} 
                  className="w-full gap-2 stress-button-glow"
                  data-testid="button-retry-same"
                  disabled={saveResultMutation.isPending}
                >
                  {saveResultMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Retry {config?.name}
                </Button>
                
                <div className="flex gap-3">
                  <Button onClick={handleReset} variant="outline" className="flex-1 gap-2 stress-button-glow" data-testid="button-try-again">
                    <RefreshCw className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Change</span> Difficulty
                  </Button>
                  
                  <Link href="/" className="flex-1">
                    <Button variant="outline" className="w-full gap-2 stress-button-glow" data-testid="button-home">
                      <Home className="w-4 h-4" aria-hidden="true" />
                      Home
                    </Button>
                  </Link>
                </div>
                
                <div className="text-center text-xs text-muted-foreground pt-2 flex flex-wrap justify-center gap-4">
                  <span className="flex items-center gap-1">
                    <span className="stress-kbd">SPACE</span> Retry
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="stress-kbd">ESC</span> Menu
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  const progress = currentText.length > 0 ? Math.min(100, (typedText.length / currentText.length) * 100) : 0;
  const displayText = textReversed ? currentText.split('').reverse().join('') : currentText;

  const renderedCharacters = useMemo(() => {
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

  const intensityLevel = stressLevel >= 80 ? 'high' : stressLevel >= 50 ? 'medium' : 'low';

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={containerRef}
        onClick={() => inputRef.current?.focus()}
        className={`stress-test-container min-h-screen flex items-center justify-center p-4 transition-all duration-100 cursor-text ${
          backgroundFlash ? 'bg-red-500/30' : 'bg-background'
        }`}
        style={{
          transform: prefersReducedMotion ? 'none' : `translate(${Math.sin(Date.now() / 100) * shakeIntensity}px, ${Math.cos(Date.now() / 80) * shakeIntensity}px) rotate(${rotation}deg) scale(${zoomScale}) ${screenFlipped ? 'rotateX(180deg)' : ''}`,
          filter: prefersReducedMotion ? 'none' : `${glitchActive ? 'hue-rotate(180deg) saturate(3)' : ''} ${screenInverted ? 'invert(1) hue-rotate(180deg)' : ''}`,
          willChange: 'transform, filter',
        }}
        role="main"
        aria-label="Stress test in progress"
      >
        {!prefersReducedMotion && particles.map((particle) => (
          <Particle key={particle.id} particle={particle} />
        ))}

        {keypressFlash && !prefersReducedMotion && (
          <div 
            className="fixed inset-0 pointer-events-none bg-primary/10 stress-keypress-indicator z-40"
            aria-hidden="true"
          />
        )}

        {comboMilestone && !prefersReducedMotion && (
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50" aria-hidden="true">
            <div className="stress-combo-milestone text-6xl sm:text-8xl font-bold text-primary opacity-80">
              {comboMilestone}x
            </div>
          </div>
        )}

        <div className="w-full max-w-4xl px-2 sm:px-0">
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" role="status" aria-live="polite">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4">
              <div className={`relative flex items-center justify-center ${timeLeft <= 10 && !prefersReducedMotion ? 'stress-timer-urgent' : ''}`}>
                <div 
                  className="text-2xl sm:text-3xl font-mono font-bold px-3 py-1 rounded-lg bg-background/50"
                  style={{ color: timeLeft <= 10 ? 'hsl(0 85% 60%)' : (prefersReducedMotion ? undefined : currentColor) }} 
                  aria-label={`${timeLeft} seconds remaining`}
                >
                  {timeLeft}s
                </div>
              </div>
              
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                comboExplosion && !prefersReducedMotion ? 'stress-combo-milestone bg-primary/20' : 'bg-background/50'
              }`} aria-label={`Current combo: ${combo}`}>
                <Flame className={`w-4 h-4 ${combo > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} aria-hidden="true" />
                <span className="text-sm font-bold">{combo}</span>
                {comboExplosion && !prefersReducedMotion && <span className="animate-ping" aria-hidden="true">🔥</span>}
              </div>
              
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/50" aria-label={`${errors} errors`}>
                <XCircle className={`w-4 h-4 ${errors > 0 ? 'text-destructive' : 'text-muted-foreground'}`} aria-hidden="true" />
                <span className={`text-sm font-bold ${errors > 0 ? 'text-destructive' : ''}`}>{errors}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 justify-center sm:justify-end">
              <div className="flex items-center gap-2" aria-label={`Intensity: ${intensityLevel}`}>
                <span className="text-xs text-muted-foreground uppercase tracking-wider hidden sm:inline">Intensity</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div 
                      key={level}
                      className={`w-1.5 sm:w-2 h-4 sm:h-5 rounded-sm transition-all ${
                        stressLevel >= level * 20 
                          ? `stress-intensity-bar ${stressLevel >= 80 ? 'high' : ''} ${
                              stressLevel >= 80 ? 'bg-red-500' : stressLevel >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                            }`
                          : 'bg-muted/50'
                      }`}
                      style={{ height: `${12 + level * 3}px` }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 sm:mb-8">
            <div className="relative h-2 sm:h-3 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
              <div 
                className="h-full rounded-full transition-all duration-150 ease-out"
                style={{ 
                  width: `${progress}%`,
                  background: progress < 33 
                    ? 'linear-gradient(90deg, #22c55e, #4ade80)' 
                    : progress < 66 
                      ? 'linear-gradient(90deg, #eab308, #facc15)' 
                      : 'linear-gradient(90deg, #f97316, #ef4444)'
                }}
                aria-hidden="true"
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>{typedText.length}/{currentText.length}</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
          </div>

          <Card
            className="mb-6 sm:mb-8 transition-all duration-200 stress-glass-card"
            style={prefersReducedMotion ? {} : {
              transform: `translateY(${gravityOffset}px) translate(${textPosition.x}px, ${textPosition.y}px)`,
              opacity: textOpacity,
              filter: `blur(${blur}px)`,
              borderColor: currentColor,
              borderWidth: '2px',
              willChange: 'transform, opacity, filter',
            }}
          >
            <CardContent className="p-4 sm:p-8">
              <div className="text-lg sm:text-2xl font-mono leading-relaxed whitespace-pre-wrap select-none" aria-label="Text to type">
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
          
          <div className="text-center space-y-2" aria-live="polite">
            <p className="text-sm text-muted-foreground">
              {isStarted ? 'Click anywhere to focus' : 'Click to focus and start typing'}
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="stress-kbd">ESC</span>
                <span>Quit</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
