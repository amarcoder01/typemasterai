import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Zap, Skull, Trophy, Eye, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import confetti from 'canvas-confetti';

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

const DIFFICULTY_CONFIGS: Record<Difficulty, {
  name: string;
  description: string;
  effects: StressEffects;
  duration: number;
  icon: string;
  color: string;
  baseShakeIntensity: number;
  particleFrequency: number;
}> = {
  beginner: {
    name: 'Warm-Up Chaos',
    description: 'Light screen shake and basic distractions',
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
    baseShakeIntensity: 5,
    particleFrequency: 0.3,
  },
  intermediate: {
    name: 'Mind Scrambler',
    description: 'Screen inverts, zoom chaos, sensory assault',
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
    baseShakeIntensity: 15,
    particleFrequency: 0.5,
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
  },
};

const SAMPLE_TEXTS = [
  "The quick brown fox jumps over the lazy dog while the world shakes violently around you.",
  "In the midst of chaos, only the focused mind prevails against impossible odds.",
  "Type through the storm, embrace the madness, and prove your worth.",
  "Your fingers dance on keys while reality itself trembles and distorts.",
  "Focus is everything when the screen becomes your worst enemy.",
];

export default function StressTest() {
  const { toast } = useToast();
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [currentText, setCurrentText] = useState('');
  const [errors, setErrors] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Enhanced visual effects state
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; emoji: string; speed: number }>>([]);
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
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const config = selectedDifficulty ? DIFFICULTY_CONFIGS[selectedDifficulty] : null;

  // Enhanced sound effects
  const playSound = useCallback((type: 'type' | 'error' | 'combo' | 'complete' | 'warning' | 'chaos') => {
    if (!soundEnabled || !config?.effects.sounds) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  }, [soundEnabled, config]);

  // Save result mutation
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
  });

  // Start test with countdown
  const handleStart = (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty);
    setCountdown(3);
    const randomText = SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
    setCurrentText(randomText);
    setStressLevel(0);
    
    const countInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countInterval);
          setIsStarted(true);
          setStartTime(Date.now());
          setTimeLeft(DIFFICULTY_CONFIGS[difficulty].duration);
          inputRef.current?.focus();
          return 0;
        }
        playSound('warning');
        return prev - 1;
      });
    }, 1000);
  };

  // Calculate stress level based on time elapsed
  const calculateStressLevel = () => {
    if (!config || !startTime) return 0;
    const elapsed = (Date.now() - startTime) / 1000;
    const progress = elapsed / config.duration;
    return Math.min(100, progress * 100);
  };

  // Handle typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isStarted || isFinished) return;
    
    const value = e.target.value;
    const lastChar = value[value.length - 1];
    const expectedChar = currentText[typedText.length];
    
    if (lastChar === expectedChar) {
      playSound('type');
      setTypedText(value);
      setCombo((prev) => {
        const newCombo = prev + 1;
        if (newCombo > maxCombo) setMaxCombo(newCombo);
        if (newCombo % 10 === 0 && newCombo > 0) {
          playSound('combo');
          setComboExplosion(true);
          setTimeout(() => setComboExplosion(false), 500);
        }
        return newCombo;
      });
      
      // Check if test is complete
      if (value === currentText) {
        finishTest(true);
      }
    } else {
      playSound('error');
      setErrors((prev) => prev + 1);
      setCombo(0);
      
      // Enhanced screen shake on error
      if (config?.effects.screenShake) {
        const intensity = config.baseShakeIntensity + (stressLevel / 5);
        setShakeIntensity(intensity);
        setTimeout(() => setShakeIntensity(0), 400);
        
        // Flash background on error
        setBackgroundFlash(true);
        setTimeout(() => setBackgroundFlash(false), 100);
      }
    }
  };

  // Finish test
  const finishTest = (completed: boolean = false) => {
    setIsFinished(true);
    setIsStarted(false);
    
    const survivalTime = startTime ? (Date.now() - startTime) / 1000 : 0;
    const completionRate = (typedText.length / currentText.length) * 100;
    const wpm = Math.round((typedText.length / 5) / (survivalTime / 60));
    const accuracy = typedText.length > 0 ? ((typedText.length - errors) / typedText.length) * 100 : 0;
    
    // Calculate stress score (higher difficulty + better performance = higher score)
    const difficultyMultiplier = selectedDifficulty === 'impossible' ? 5 : 
                                 selectedDifficulty === 'nightmare' ? 4 :
                                 selectedDifficulty === 'expert' ? 3 :
                                 selectedDifficulty === 'intermediate' ? 2 : 1;
    const stressScore = Math.round((wpm * accuracy * completionRate * difficultyMultiplier) / 100);
    
    if (completed) {
      playSound('complete');
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ff0000', '#ff6600', '#ffaa00'],
      });
      
      toast({
        title: "🎉 Incredible!",
        description: `You survived ${selectedDifficulty} mode! Score: ${stressScore}`,
      });
    } else {
      playSound('error');
      toast({
        title: "Time's Up!",
        description: `You survived ${Math.round(survivalTime)}s. Score: ${stressScore}`,
        variant: "destructive",
      });
    }
    
    // Save result
    if (config && selectedDifficulty) {
      saveResultMutation.mutate({
        difficulty: selectedDifficulty,
        enabledEffects: config.effects,
        wpm,
        accuracy,
        errors,
        maxCombo,
        totalCharacters: typedText.length,
        duration: config.duration,
        survivalTime: Math.round(survivalTime),
        completionRate,
        stressScore,
      });
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!isStarted || isFinished || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          finishTest(false);
          return 0;
        }
        if (prev <= 10) {
          playSound('warning');
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isStarted, isFinished, timeLeft]);

  // Update stress level
  useEffect(() => {
    if (!isStarted || !config) return;
    
    const stressInterval = setInterval(() => {
      setStressLevel(calculateStressLevel());
    }, 100);
    
    return () => clearInterval(stressInterval);
  }, [isStarted, config, startTime]);

  // ENHANCED Visual effects
  useEffect(() => {
    if (!isStarted || !config) return;
    
    const effectsInterval = setInterval(() => {
      const intensity = 1 + (stressLevel / 100); // Effects get worse over time
      
      // Particle explosion distractions
      if (config.effects.distractions && Math.random() > (1 - config.particleFrequency)) {
        const emojis = ['💥', '⚡', '🔥', '💀', '👻', '🌟', '💫', '✨', '⭐', '💣', '🎯', '🎪', '🎨', '🎭'];
        const particleCount = Math.floor(1 + intensity * 3);
        
        for (let i = 0; i < particleCount; i++) {
          const newParticle = {
            id: Date.now() + i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            emoji: emojis[Math.floor(Math.random() * emojis.length)],
            speed: 1 + Math.random() * 2,
          };
          setParticles((prev) => [...prev, newParticle]);
          setTimeout(() => {
            setParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
          }, 1500 / intensity);
        }
        
        playSound('chaos');
      }
      
      // Aggressive color shift
      if (config.effects.colorShift) {
        const hue = Math.random() * 360;
        const saturation = 60 + Math.random() * 40;
        const lightness = 40 + Math.random() * 20;
        setCurrentColor(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
      }
      
      // Extreme blur for limited visibility
      if (config.effects.limitedVisibility) {
        setBlur(2 + Math.random() * (8 * intensity));
      }
      
      // Aggressive rotation
      if (config.effects.rotation) {
        setRotation((Math.random() - 0.5) * 15 * intensity);
      }
      
      // Gravity bounce effect
      if (config.effects.gravity) {
        setGravityOffset(Math.sin(Date.now() / 200) * 20 * intensity);
      }
      
      // Glitch effect
      if (config.effects.glitch && Math.random() > 0.8) {
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 50 + Math.random() * 100);
      }
      
      // Text fade in/out
      if (config.effects.textFade) {
        setTextOpacity(0.3 + Math.random() * 0.7);
      }
      
      // Reverse text randomly
      if (config.effects.reverseText && Math.random() > 0.9) {
        setTextReversed((prev) => !prev);
        setTimeout(() => setTextReversed(false), 500 + Math.random() * 1000);
      }
      
      // Random text jumps (IMPOSSIBLE mode)
      if (config.effects.randomJumps && Math.random() > 0.85) {
        setTextPosition({
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 50,
        });
        setTimeout(() => setTextPosition({ x: 0, y: 0 }), 300);
      }
      
      // Screen invert (Intermediate+)
      if (config.effects.screenInvert && Math.random() > 0.7) {
        setScreenInverted((prev) => !prev);
        setTimeout(() => setScreenInverted(false), 800 + Math.random() * 1200);
      }
      
      // Zoom chaos (Intermediate+)
      if (config.effects.zoomChaos && Math.random() > 0.75) {
        const zoomRange = 0.5 + (stressLevel / 100);
        setZoomScale(0.6 + Math.random() * zoomRange);
        setTimeout(() => setZoomScale(1), 600 + Math.random() * 800);
      }
      
      // Screen flip upside down (Expert+)
      if (config.effects.screenFlip && Math.random() > 0.85) {
        setScreenFlipped(true);
        setTimeout(() => setScreenFlipped(false), 1000 + Math.random() * 2000);
      }
      
    }, 200); // Effects update faster for more chaos
    
    return () => clearInterval(effectsInterval);
  }, [isStarted, config, stressLevel]);

  // Continuous shake effect that intensifies
  useEffect(() => {
    if (!isStarted || !config?.effects.screenShake) return;
    
    const shakeInterval = setInterval(() => {
      const baseShake = config.baseShakeIntensity;
      const stressBonus = (stressLevel / 100) * baseShake;
      setShakeIntensity(baseShake + stressBonus);
    }, 50);
    
    return () => clearInterval(shakeInterval);
  }, [isStarted, config, stressLevel]);

  // ESC key to quit test early
  useEffect(() => {
    if (!isStarted || isFinished) return;
    
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
  }, [isStarted, isFinished]);

  const handleReset = () => {
    setSelectedDifficulty(null);
    setIsStarted(false);
    setIsFinished(false);
    setTypedText('');
    setErrors(0);
    setCombo(0);
    setMaxCombo(0);
    setShakeIntensity(0);
    setParticles([]);
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
    setStressLevel(0);
  };

  // Selection screen
  if (!selectedDifficulty || (!isStarted && !isFinished)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <Link href="/stress-leaderboard">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-leaderboard">
              <Trophy className="w-4 h-4" />
              Leaderboard
            </Button>
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4">
              <Zap className="w-12 h-12 text-primary animate-pulse" />
              <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500">
                Typing Stress Test
              </h1>
              <Skull className="w-12 h-12 text-destructive animate-bounce" />
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Can you type while the world collapses around you? Choose your nightmare.
            </p>
            
            <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg max-w-xl mx-auto">
              <div className="flex items-center gap-2 justify-center text-destructive">
                <AlertTriangle className="w-5 h-5" />
                <p className="font-semibold">Warning: May cause extreme frustration</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {(Object.keys(DIFFICULTY_CONFIGS) as Difficulty[]).map((difficulty) => {
              const config = DIFFICULTY_CONFIGS[difficulty];
              return (
                <Card
                  key={difficulty}
                  className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-2 ${
                    difficulty === 'impossible' 
                      ? 'border-purple-500 hover:border-purple-400 animate-pulse' 
                      : 'border-border hover:border-primary'
                  }`}
                  onClick={() => !countdown && handleStart(difficulty)}
                  data-testid={`card-difficulty-${difficulty}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-50`} />
                  <CardContent className="relative p-6">
                    <div className="text-center mb-4">
                      <div className="text-6xl mb-2">{config.icon}</div>
                      <h3 className="text-2xl font-bold mb-2">{config.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{config.description}</p>
                      <div className="inline-block px-3 py-1 bg-background/80 rounded-full text-sm font-mono">
                        {config.duration}s duration
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      <p className="font-semibold text-center mb-2">Active Torments:</p>
                      {Object.entries(config.effects).filter(([_, enabled]) => enabled).map(([effect]) => (
                        <div key={effect} className="flex items-center gap-2 bg-background/60 px-2 py-1 rounded">
                          <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                          <span className="capitalize">{effect.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="gap-2"
              data-testid="button-toggle-sound"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {soundEnabled ? 'Sound On' : 'Sound Off'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Countdown screen
  if (countdown > 0 && !isStarted) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-muted-foreground">Get Ready...</h2>
          <div className="text-9xl font-bold animate-bounce text-destructive">
            {countdown}
          </div>
          <p className="text-xl text-muted-foreground mt-4">
            {config?.name}
          </p>
        </div>
      </div>
    );
  }

  // Results screen
  if (isFinished) {
    const survivalTime = startTime ? (Date.now() - startTime) / 1000 : 0;
    const completionRate = (typedText.length / currentText.length) * 100;
    const wpm = Math.round((typedText.length / 5) / (survivalTime / 60));
    const accuracy = typedText.length > 0 ? ((typedText.length - errors) / typedText.length) * 100 : 0;
    const difficultyMultiplier = selectedDifficulty === 'impossible' ? 5 : 
                                 selectedDifficulty === 'nightmare' ? 4 :
                                 selectedDifficulty === 'expert' ? 3 :
                                 selectedDifficulty === 'intermediate' ? 2 : 1;
    const stressScore = Math.round((wpm * accuracy * completionRate * difficultyMultiplier) / 100);

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h2 className="text-4xl font-bold mb-2">
                  {completionRate >= 100 ? '🎉 Completed!' : '💀 Survived!'}
                </h2>
                <p className="text-xl text-muted-foreground">
                  {config?.name} - Stress Score: {stressScore}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="text-center p-4 bg-muted rounded-lg" data-testid="stat-wpm">
                  <div className="text-3xl font-bold text-primary">{wpm}</div>
                  <div className="text-sm text-muted-foreground">WPM</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg" data-testid="stat-accuracy">
                  <div className="text-3xl font-bold text-green-500">{accuracy.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg" data-testid="stat-completion">
                  <div className="text-3xl font-bold text-orange-500">{completionRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg" data-testid="stat-combo">
                  <div className="text-3xl font-bold text-purple-500">{maxCombo}</div>
                  <div className="text-sm text-muted-foreground">Max Combo</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg" data-testid="stat-errors">
                  <div className="text-3xl font-bold text-red-500">{errors}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg" data-testid="stat-survival">
                  <div className="text-3xl font-bold text-blue-500">{Math.round(survivalTime)}s</div>
                  <div className="text-sm text-muted-foreground">Survival Time</div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={handleReset} className="flex-1" data-testid="button-try-again">
                  Try Again
                </Button>
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full" data-testid="button-home">
                    Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Active test screen
  const progress = (typedText.length / currentText.length) * 100;
  const displayText = textReversed ? currentText.split('').reverse().join('') : currentText;

  return (
    <div
      ref={containerRef}
      className={`min-h-screen flex items-center justify-center p-4 transition-all duration-100 ${
        backgroundFlash ? 'bg-red-500/30' : 'bg-background'
      }`}
      style={{
        transform: `translate(${Math.sin(Date.now() / 100) * shakeIntensity}px, ${Math.cos(Date.now() / 80) * shakeIntensity}px) rotate(${rotation}deg) scale(${zoomScale}) ${screenFlipped ? 'rotateX(180deg)' : ''}`,
        filter: `${glitchActive ? 'hue-rotate(180deg) saturate(3)' : ''} ${screenInverted ? 'invert(1) hue-rotate(180deg)' : ''}`,
      }}
    >
      {/* Floating particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="fixed pointer-events-none text-4xl animate-ping z-50"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDuration: `${particle.speed}s`,
          }}
        >
          {particle.emoji}
        </div>
      ))}

      <div className="w-full max-w-4xl">
        {/* Stats header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-mono font-bold" style={{ color: currentColor }}>
              {timeLeft}s
            </div>
            <div className={`text-sm text-muted-foreground transition-all ${
              comboExplosion ? 'scale-150 text-yellow-500' : ''
            }`}>
              Combo: <span className="text-primary font-bold">{combo}</span>
              {comboExplosion && <span className="ml-1 animate-ping">🔥</span>}
            </div>
            <div className="text-sm text-muted-foreground">
              Errors: <span className="text-destructive font-bold">{errors}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Stress</span>
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-300"
                style={{ width: `${stressLevel}%` }}
              />
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={progress} className="mb-8 h-3" />

        {/* Text display */}
        <Card
          className="mb-8 transition-all duration-200"
          style={{
            transform: `translateY(${gravityOffset}px) translate(${textPosition.x}px, ${textPosition.y}px)`,
            opacity: textOpacity,
            filter: `blur(${blur}px)`,
            borderColor: currentColor,
            borderWidth: '2px',
          }}
        >
          <CardContent className="p-8">
            <div className="text-2xl font-mono leading-relaxed whitespace-pre-wrap select-none">
              {displayText.split('').map((char, index) => {
                let color = 'text-muted-foreground';
                if (index < typedText.length) {
                  color = typedText[index] === displayText[index] ? 'text-green-500' : 'text-red-500';
                } else if (index === typedText.length) {
                  color = 'text-primary bg-primary/20';
                }
                
                return (
                  <span
                    key={index}
                    className={`${color} transition-colors duration-100`}
                    style={{
                      display: 'inline-block',
                      animation: glitchActive ? 'glitch 0.1s infinite' : 'none',
                    }}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Hidden input */}
        <input
          ref={inputRef}
          type="text"
          value={typedText}
          onChange={handleInputChange}
          className="opacity-0 absolute pointer-events-none"
          autoComplete="off"
          autoFocus
          data-testid="input-typing"
        />

        {/* Controls */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Type the text above to survive | ESC to quit</p>
        </div>
      </div>

      {/* Glitch animation */}
      <style>{`
        @keyframes glitch {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
        }
      `}</style>
    </div>
  );
}
