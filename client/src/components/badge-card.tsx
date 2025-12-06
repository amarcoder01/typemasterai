import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Zap, Target, Flame, TrendingUp, Star, Award, Share2, Moon, Sunrise, Rocket, Sparkles, Timer, HelpCircle } from "lucide-react";
import { getTierColor, getTierBorder, getCategoryColor, type Badge as BadgeType } from "@shared/badges";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Target,
  Flame,
  TrendingUp,
  Star,
  Award,
  Share2,
  Moon,
  Sunrise,
  Rocket,
  Sparkles,
  Timer,
};

interface BadgeCardProps {
  badge: BadgeType;
  unlocked: boolean;
  progress?: number;
  currentValue?: number;
  unlockedAt?: string;
  onShare?: (badge: BadgeType) => void;
}

export function BadgeCard({ badge, unlocked, progress = 0, currentValue = 0, unlockedAt, onShare }: BadgeCardProps) {
  const isAlmostUnlocked = !unlocked && progress >= 50;
  const IconComponent = iconMap[badge.icon] || Star;
  const isSecret = badge.isSecret === true;
  const isHiddenSecret = isSecret && !unlocked;

  return (
    <Card
      className={cn(
        "relative p-4 transition-all duration-300",
        unlocked
          ? `border-2 ${getTierBorder(badge.tier)} bg-gradient-to-br ${getTierColor(badge.tier)} bg-opacity-10 hover:scale-105 shadow-lg`
          : isHiddenSecret
            ? "border border-dashed border-indigo-500/50 bg-gradient-to-br from-indigo-950/20 to-purple-950/20 hover:border-indigo-400/70"
            : "border border-border/50 bg-muted/30 opacity-70 hover:opacity-90",
        isAlmostUnlocked && !isHiddenSecret && "animate-pulse"
      )}
      data-testid={`badge-${badge.id}`}
    >
      <div className="absolute top-2 right-2">
        <Badge
          variant={unlocked ? "default" : "secondary"}
          className={cn(
            "text-[10px] px-2 py-0.5",
            unlocked && `bg-gradient-to-r ${getTierColor(badge.tier)} border-0 text-white`,
            isHiddenSecret && "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
          )}
        >
          {isHiddenSecret ? "???" : badge.tier.toUpperCase()}
        </Badge>
      </div>

      <div className="flex flex-col items-center justify-center space-y-3">
        <div
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center",
            unlocked
              ? `bg-gradient-to-br ${getTierColor(badge.tier)} shadow-md`
              : isHiddenSecret
                ? "bg-gradient-to-br from-indigo-600/30 to-purple-600/30 animate-pulse"
                : "bg-muted/50"
          )}
        >
          {unlocked ? (
            <IconComponent className="w-10 h-10 text-white drop-shadow-lg" />
          ) : isHiddenSecret ? (
            <HelpCircle className="w-10 h-10 text-indigo-400" />
          ) : (
            <Lock className="w-8 h-8 text-muted-foreground" />
          )}
        </div>

        <div className="text-center space-y-1">
          <h3 className={cn(
            "font-bold text-sm", 
            unlocked ? "text-foreground" : isHiddenSecret ? "text-indigo-400" : "text-muted-foreground"
          )}>
            {isHiddenSecret ? "???" : badge.name}
          </h3>
          <p className={cn(
            "text-xs line-clamp-2",
            isHiddenSecret ? "text-indigo-400/70 italic" : "text-muted-foreground"
          )}>
            {isHiddenSecret ? "Unlock to reveal this secret badge!" : badge.description}
          </p>
        </div>

        {!unlocked && progress > 0 && (
          <div className="w-full space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>
                {currentValue} / {badge.requirement.value}
              </span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  progress >= 75
                    ? "bg-gradient-to-r from-green-500 to-emerald-500"
                    : progress >= 50
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                    : "bg-gradient-to-r from-blue-500 to-cyan-500"
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {unlocked && (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-xs text-green-500 font-semibold">
              <span className="text-base">✓</span>
              Unlocked
            </div>
            {unlockedAt && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(unlockedAt).toLocaleDateString()}
              </span>
            )}
            {onShare && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary mt-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(badge);
                }}
                data-testid={`button-share-badge-${badge.id}`}
              >
                <Share2 className="w-3 h-3 mr-1" />
                Share
              </Button>
            )}
          </div>
        )}

        <div className={cn("text-xs font-semibold", getCategoryColor(badge.category))}>
          +{badge.points} XP
        </div>
      </div>
    </Card>
  );
}
