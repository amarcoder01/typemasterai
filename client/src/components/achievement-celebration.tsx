import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Trophy, Star, Sparkles, Share2, X, Zap, Target, Flame, TrendingUp, Award, Moon, Sunrise, Rocket, Timer, Image } from "lucide-react";
import { BadgeShareCard } from "@/components/badge-share-card";
import { BADGES } from "@shared/badges";
import { useAuth } from "@/lib/auth-context";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Target,
  Flame,
  TrendingUp,
  Star,
  Award,
  Share2,
  Trophy,
  Moon,
  Sunrise,
  Rocket,
  Sparkles,
  Timer,
};

export interface UnlockedAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  points: number;
  category: string;
}

interface AchievementCelebrationContextType {
  celebrate: (achievement: UnlockedAchievement) => void;
  celebrateMultiple: (achievements: UnlockedAchievement[]) => void;
}

const AchievementCelebrationContext = createContext<AchievementCelebrationContextType | null>(null);

export function useAchievementCelebration() {
  const context = useContext(AchievementCelebrationContext);
  if (!context) {
    throw new Error("useAchievementCelebration must be used within AchievementCelebrationProvider");
  }
  return context;
}

const tierColors = {
  bronze: { bg: "from-orange-600 to-orange-800", border: "border-orange-500", text: "text-orange-400" },
  silver: { bg: "from-slate-400 to-slate-600", border: "border-slate-400", text: "text-slate-300" },
  gold: { bg: "from-yellow-500 to-amber-600", border: "border-yellow-400", text: "text-yellow-400" },
  platinum: { bg: "from-cyan-400 to-blue-600", border: "border-cyan-400", text: "text-cyan-400" },
  diamond: { bg: "from-purple-400 to-pink-600", border: "border-purple-400", text: "text-purple-400" },
};

const tierEmojis = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💎",
  diamond: "👑",
};

let sharedAudioContext: AudioContext | null = null;
let audioContextResumed = false;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

export function preWarmAudioContext() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended" && !audioContextResumed) {
    ctx.resume().then(() => {
      audioContextResumed = true;
    }).catch(() => {});
  }
}

async function playAchievementSound(tier: string) {
  try {
    const audioContext = getAudioContext();
    if (!audioContext) return;
    
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    
    const tierFrequencies: Record<string, number[]> = {
      bronze: [523.25, 659.25, 783.99],
      silver: [587.33, 739.99, 880.00],
      gold: [659.25, 830.61, 987.77],
      platinum: [739.99, 932.33, 1108.73],
      diamond: [783.99, 987.77, 1174.66, 1318.51],
    };
    
    const frequencies = tierFrequencies[tier] || tierFrequencies.bronze;
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = "sine";
      
      const startTime = audioContext.currentTime + index * 0.15;
      const duration = 0.3;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  } catch (error) {
    console.warn("Could not play achievement sound:", error);
  }
}

function triggerAchievementConfetti(tier: string) {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  const tierConfigs = {
    bronze: { particleCount: 50, spread: 60, colors: ["#CD7F32", "#B87333", "#A0522D"] },
    silver: { particleCount: 80, spread: 70, colors: ["#C0C0C0", "#A9A9A9", "#D3D3D3"] },
    gold: { particleCount: 100, spread: 80, colors: ["#FFD700", "#FFA500", "#DAA520"] },
    platinum: { particleCount: 120, spread: 90, colors: ["#00CED1", "#40E0D0", "#00FFFF"] },
    diamond: { particleCount: 150, spread: 100, colors: ["#9B59B6", "#E91E63", "#FF69B4", "#FFD700"] },
  };

  const config = tierConfigs[tier as keyof typeof tierConfigs] || tierConfigs.bronze;

  confetti({
    particleCount: config.particleCount,
    spread: config.spread,
    origin: { y: 0.4 },
    colors: config.colors,
    zIndex: 10000,
  });

  if (tier === "diamond" || tier === "platinum") {
    setTimeout(() => {
      confetti({
        particleCount: 30,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: config.colors,
        zIndex: 10000,
      });
      confetti({
        particleCount: 30,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: config.colors,
        zIndex: 10000,
      });
    }, 300);
  }
}

interface AchievementCelebrationModalProps {
  achievement: UnlockedAchievement | null;
  isOpen: boolean;
  onClose: () => void;
  queueLength: number;
}

function AchievementCelebrationModal({ achievement, isOpen, onClose, queueLength }: AchievementCelebrationModalProps) {
  const { user } = useAuth();
  const [showShareCard, setShowShareCard] = useState(false);

  useEffect(() => {
    if (isOpen && achievement) {
      triggerAchievementConfetti(achievement.tier);
      playAchievementSound(achievement.tier);
    }
  }, [isOpen, achievement]);

  const handleShareTracked = async (platform: string) => {
    try {
      await fetch("/api/share/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ platform, type: "badge", badgeId: achievement?.id }),
      });
    } catch (error) {
      console.error("Failed to track share:", error);
    }
  };

  const badgeData = achievement ? BADGES.find(b => b.id === achievement.id) : null;

  if (!achievement) return null;

  const colors = tierColors[achievement.tier] || tierColors.bronze;
  const tierEmoji = tierEmojis[achievement.tier] || "🏆";
  const IconComponent = iconMap[achievement.icon] || Trophy;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-2 border-primary/50 bg-background/95 backdrop-blur-xl p-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative"
        >
          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-20", colors.bg)} />
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10"
            onClick={onClose}
            data-testid="button-close-celebration"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="relative p-8 text-center">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-center gap-2 mb-4"
            >
              <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Achievement Unlocked!
              </span>
              <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
            </motion.div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2, duration: 0.6 }}
              className={cn(
                "w-28 h-28 mx-auto rounded-full flex items-center justify-center mb-6",
                "bg-gradient-to-br shadow-2xl ring-4 ring-offset-2 ring-offset-background",
                colors.bg,
                colors.border
              )}
            >
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <IconComponent className="w-14 h-14 text-white drop-shadow-lg" />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <h2 className="text-2xl font-bold">{achievement.name}</h2>
              <p className="text-muted-foreground">{achievement.description}</p>
              
              <div className="flex items-center justify-center gap-3 pt-2">
                <Badge variant="outline" className={cn("uppercase font-bold", colors.text, colors.border)}>
                  {tierEmoji} {achievement.tier}
                </Badge>
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  <Star className="w-3 h-3 mr-1" />
                  +{achievement.points} XP
                </Badge>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col gap-3 mt-8"
            >
              <Button
                onClick={onClose}
                className={cn("w-full bg-gradient-to-r", colors.bg)}
                size="lg"
                data-testid="button-continue"
              >
                <Trophy className="w-4 h-4 mr-2" />
                {queueLength > 0 ? `Continue (${queueLength} more)` : "Awesome!"}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowShareCard(true)}
                className="w-full"
                size="lg"
                data-testid="button-share-achievement"
              >
                <Image className="w-4 h-4 mr-2" />
                Share with Visual Card
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => {
                  const text = `I just unlocked the "${achievement.name}" achievement on TypeMasterAI! ${achievement.icon}`;
                  const url = "https://typemasterai.com";
                  window.open(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                    "_blank",
                    "width=600,height=400"
                  );
                  handleShareTracked('twitter_quick');
                }}
                className="w-full text-muted-foreground"
                size="sm"
                data-testid="button-quick-share-twitter"
              >
                <Share2 className="w-3 h-3 mr-2" />
                Quick Share to Twitter
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </DialogContent>

      {badgeData && (
        <BadgeShareCard
          badge={badgeData}
          username={user?.username}
          isOpen={showShareCard}
          onClose={() => setShowShareCard(false)}
          onShareTracked={handleShareTracked}
        />
      )}
    </Dialog>
  );
}

export function AchievementCelebrationProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<UnlockedAchievement[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<UnlockedAchievement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const processQueue = useCallback(() => {
    if (queue.length > 0 && !isOpen) {
      const [next, ...rest] = queue;
      setCurrentAchievement(next);
      setQueue(rest);
      setIsOpen(true);
    }
  }, [queue, isOpen]);

  useEffect(() => {
    processQueue();
  }, [processQueue]);

  const celebrate = useCallback((achievement: UnlockedAchievement) => {
    setQueue((prev) => [...prev, achievement]);
  }, []);

  const celebrateMultiple = useCallback((achievements: UnlockedAchievement[]) => {
    setQueue((prev) => [...prev, ...achievements]);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCurrentAchievement(null);
    setTimeout(processQueue, 300);
  }, [processQueue]);

  return (
    <AchievementCelebrationContext.Provider value={{ celebrate, celebrateMultiple }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <AchievementCelebrationModal
            achievement={currentAchievement}
            isOpen={isOpen}
            onClose={handleClose}
            queueLength={queue.length}
          />
        )}
      </AnimatePresence>
    </AchievementCelebrationContext.Provider>
  );
}
