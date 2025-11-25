import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Zap, Skull, Trophy, Eye, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import confetti from 'canvas-confetti';

type Difficulty = 'beginner' | 'intermediate' | 'expert' | 'nightmare';

interface StressEffects {
  screenShake: boolean;
  distractions: boolean;
  sounds: boolean;
  speedIncrease: boolean;
  limitedVisibility: boolean;
  colorShift: boolean;
  gravity: boolean;
  rotation: boolean;
}

const DIFFICULTY_CONFIGS: Record<Difficulty, {
  name: string;
  description: string;
  effects: StressEffects;
  duration: number;
  icon: string;
  color: string;
}> = {
  beginner: {
    name: 'Beginner Chaos',
    description: 'Gentle introduction to stress typing',
    effects: {
      screenShake: true,
      distractions: false,
      sounds: true,
      speedIncrease: false,
      limitedVisibility: false,
      colorShift: false,
      gravity: false,
      rotation: false,
    },
    duration: 30,
    icon: '🔥',
    color: 'from-orange-500/20 to-red-500/20',
  },
  intermediate: {
    name: 'Mind Bender',
    description: 'Multiple distractions at once',
    effects: {
      screenShake: true,
      distractions: true,
      sounds: true,
      speedIncrease: true,
      limitedVisibility: false,
      colorShift: true,
      gravity: false,
      rotation: false,
    },
    duration: 45,
    icon: '⚡',
    color: 'from-purple-500/20 to-pink-500/20',
  },
  expert: {
    name: 'Sensory Overload',
    description: 'Maximum chaos - for experts only',
    effects: {
      screenShake: true,
      distractions: true,
      sounds: true,
      speedIncrease: true,
      limitedVisibility: true,
      colorShift: true,
      gravity: true,
      rotation: false,
    },
    duration: 60,
    icon: '💀',
    color: 'from-red-500/20 to-orange-500/20',
  },
  nightmare: {
    name: 'Nightmare Mode',
    description: 'You will fail. Accept it.',
    effects: {
      screenShake: true,
      distractions: true,
      sounds: true,
      speedIncrease: true,
      limitedVisibility: true,
      colorShift: true,
      gravity: true,
      rotation: true,
    },
    duration: 90,
    icon: '☠️',
    color: 'from-black/40 to-red-900/40',
  },
};

const SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog. Practice makes perfect. Stay calm and type fast. Focus on accuracy over speed. Never give up, even when the screen shakes!";

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
  
  // Visual effects state
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; emoji: string }>>([]);
  const [currentColor, setCurrentColor] = useState('hsl(0, 0%, 100%)');
  const [blur, setBlur] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [gravityOffset, setGravityOffset] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const config = selectedDifficulty ? DIFFICULTY_CONFIGS[selectedDifficulty] : null;

  // Sound effects using Web Audio API
  const playSound = useCallback((type: 'type' | 'error' | 'combo' | 'complete') => {
    if (!soundEnabled || !config?.effects.sounds) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch (type) {
      case 'type':
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.1;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.05);
        break;
      case 'error':
        oscillator.frequency.value = 200;
        gainNode.gain.value = 0.3;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
        break;
      case 'combo':
        oscillator.frequency.value = 1200;
        gainNode.gain.value = 0.2;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        break;
      case 'complete':
        oscillator.frequency.value = 1500;
        gainNode.gain.value = 0.3;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
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
    setCurrentText(SAMPLE_TEXT);
    
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
        return prev - 1;
      });
    }, 1000);
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
        }
        return newCombo;
      });
    } else {
      playSound('error');
      setErrors((prev) => prev + 1);
      setCombo(0);
      
      // Trigger screen shake on error
      if (config?.effects.screenShake) {
        setShakeIntensity(10);
        setTimeout(() => setShakeIntensity(0), 300);
      }
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!isStarted || isFinished || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          finishTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isStarted, isFinished, timeLeft]);

  // Visual effects
  useEffect(() => {
    if (!isStarted || !config) return;
    
    const effectsInterval = setInterval(() => {
      // Random distractions
      if (config.effects.distractions && Math.random() > 0.7) {
        const emojis = ['💥', '⚡', '🔥', '💀', '👻', '🌟', '💫', '✨'];
        const newParticle = {
          id: Date.now(),
          x: Math.random() * 100,
          y: Math.random() * 100,
          emoji: emojis[Math.floor(Math.random() * emojis.length)],
        };
        setParticles((prev) => [...prev, newParticle]);
        setTimeout(() => {
          setParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
        }, 2000);
      }
      
      // Color shift
      if (config.effects.colorShift) {
        const hue = Math.random() * 360;
        setCurrentColor(`hsl(${hue}, 70%, 50%)`);
      }
      
      // Limited visibility
      if (config.effects.limitedVisibility) {
        setBlur(Math.random() * 5);
      }
      
      // Rotation
      if (config.effects.rotation) {
        setRotation(Math.sin(Date.now() / 1000) * 5);
      }
      
      // Gravity effect
      if (config.effects.gravity) {
        setGravityOffset(Math.sin(Date.now() / 500) * 10);
      }
    }, 1000);
    
    return () => clearInterval(effectsInterval);
  }, [isStarted, config]);

  const finishTest = () => {
    setIsFinished(true);
    playSound('complete');
    
    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const accuracy = typedText.length > 0 
      ? ((typedText.length - errors) / typedText.length) * 100 
      : 0;
    const wpm = Math.floor((typedText.length / 5) / (duration / 60));
    const completionRate = (typedText.length / currentText.length) * 100;
    
    // Calculate stress score
    const difficultyMultiplier = { beginner: 1, intermediate: 2, expert: 3, nightmare: 5 }[selectedDifficulty!];
    const stressScore = Math.floor((wpm * accuracy / 100 * maxCombo * difficultyMultiplier) / 10);
    
    if (completionRate >= 100) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
    
    // Save result
    if (config) {
      saveResultMutation.mutate({
        difficulty: selectedDifficulty!,
        enabledEffects: config.effects,
        wpm,
        accuracy,
        errors,
        maxCombo,
        totalCharacters: typedText.length,
        duration,
        survivalTime: duration,
        completionRate,
        stressScore,
      });
    }
  };

  const reset = () => {
    setSelectedDifficulty(null);
    setIsStarted(false);
    setIsFinished(false);
    setCountdown(3);
    setTypedText('');
    setErrors(0);
    setCombo(0);
    setMaxCombo(0);
    setStartTime(null);
    setShakeIntensity(0);
    setParticles([]);
    setBlur(0);
    setRotation(0);
    setGravityOffset(0);
  };

  // Difficulty selection screen
  if (!selectedDifficulty) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Skull className="w-12 h-12 text-red-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
              Typing Stress Test
            </h1>
            <Zap className="w-12 h-12 text-yellow-500" />
          </div>
          <p className="text-xl text-muted-foreground mb-2">Advanced Mode for Experts</p>
          <p className="text-sm text-muted-foreground">Can you type accurately while everything tries to distract you?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {(Object.entries(DIFFICULTY_CONFIGS) as [Difficulty, typeof DIFFICULTY_CONFIGS[Difficulty]][]).map(([key, config]) => (
            <Card 
              key={key}
              className={`cursor-pointer transition-all hover:scale-105 border-2 hover:border-primary bg-gradient-to-br ${config.color}`}
              onClick={() => handleStart(key)}
              data-testid={`card-difficulty-${key}`}
            >
              <CardContent className="pt-6">
                <div className="text-center mb-4">
                  <div className="text-6xl mb-2">{config.icon}</div>
                  <h3 className="text-2xl font-bold mb-2">{config.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{config.description}</p>
                  <div className="text-xs text-muted-foreground mb-4">Duration: {config.duration}s</div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-semibold mb-2">Active Effects:</div>
                  {Object.entries(config.effects).filter(([, enabled]) => enabled).map(([effect]) => (
                    <div key={effect} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="capitalize">{effect.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-yellow-500 mt-1" />
              <div>
                <h4 className="font-semibold mb-2">Warning</h4>
                <p className="text-sm text-muted-foreground">
                  This mode includes visual effects (screen shake, color changes, particles) and may not be suitable for users with motion sensitivity or photosensitive conditions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Countdown screen
  if (countdown > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-red-900/20">
        <div className="text-center">
          <div className="text-9xl font-bold mb-4 animate-bounce">{countdown}</div>
          <div className="text-2xl text-muted-foreground">Get Ready...</div>
        </div>
      </div>
    );
  }

  // Results screen
  if (isFinished) {
    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const accuracy = typedText.length > 0 ? ((typedText.length - errors) / typedText.length) * 100 : 0;
    const wpm = Math.floor((typedText.length / 5) / (duration / 60));
    const completionRate = (typedText.length / currentText.length) * 100;
    const difficultyMultiplier = { beginner: 1, intermediate: 2, expert: 3, nightmare: 5 }[selectedDifficulty];
    const stressScore = Math.floor((wpm * accuracy / 100 * maxCombo * difficultyMultiplier) / 10);

    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="pt-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">
                {completionRate >= 100 ? '🎉 Challenge Complete!' : '💀 Test Failed'}
              </h2>
              <p className="text-muted-foreground">
                {config?.name} • {completionRate.toFixed(1)}% Complete
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-3xl font-bold text-primary">{wpm}</div>
                <div className="text-sm text-muted-foreground">WPM</div>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{accuracy.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
              <div className="text-center p-4 bg-orange-500/10 rounded-lg">
                <div className="text-3xl font-bold text-orange-600">{errors}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
              <div className="text-center p-4 bg-purple-500/10 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">{maxCombo}</div>
                <div className="text-sm text-muted-foreground">Max Combo</div>
              </div>
            </div>

            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <div>
                  <div className="text-sm text-muted-foreground">Stress Score</div>
                  <div className="text-3xl font-bold">{stressScore}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button onClick={reset} size="lg" data-testid="button-try-again">
                Try Again
              </Button>
              <Link href="/">
                <Button variant="outline" size="lg" data-testid="button-home">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active test screen
  return (
    <div 
      ref={containerRef}
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{
        transform: `translateX(${Math.sin(shakeIntensity) * shakeIntensity}px) translateY(${Math.cos(shakeIntensity) * shakeIntensity}px) rotate(${rotation}deg)`,
        transition: 'transform 0.1s',
        backgroundColor: config?.effects.colorShift ? currentColor : undefined,
        filter: `blur(${blur}px)`,
      }}
    >
      {/* Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute text-4xl pointer-events-none animate-bounce"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animation: 'bounce 1s ease-in-out',
          }}
        >
          {particle.emoji}
        </div>
      ))}

      <div 
        className="w-full max-w-4xl"
        style={{
          transform: `translateY(${gravityOffset}px)`,
          transition: 'transform 0.3s',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold">{config?.icon}</div>
            <div>
              <div className="font-semibold">{config?.name}</div>
              <div className="text-sm text-muted-foreground">Survive to win!</div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            data-testid="button-toggle-sound"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{timeLeft}s</div>
              <div className="text-xs text-muted-foreground">Time Left</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{errors}</div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{combo}</div>
              <div className="text-xs text-muted-foreground">Combo</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{maxCombo}</div>
              <div className="text-xs text-muted-foreground">Best</div>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <Progress value={(typedText.length / currentText.length) * 100} className="h-3" />
            <div className="text-sm text-center mt-2 text-muted-foreground">
              {typedText.length} / {currentText.length} characters
            </div>
          </CardContent>
        </Card>

        {/* Text display */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="font-mono text-lg leading-relaxed">
              <span className="text-green-600">{typedText}</span>
              <span className="bg-primary/20 px-1">{currentText[typedText.length]}</span>
              <span className="text-muted-foreground">{currentText.slice(typedText.length + 1)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Hidden input */}
        <input
          ref={inputRef}
          type="text"
          value={typedText}
          onChange={handleInputChange}
          className="w-full p-4 text-lg font-mono border-2 border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Start typing..."
          autoFocus
          data-testid="input-stress-test"
        />
      </div>
    </div>
  );
}
