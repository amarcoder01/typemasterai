import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Lock, Zap, Target, Flame, TrendingUp, Star, Award, Share2 } from "lucide-react";
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
};

interface BadgeCardProps {
  badge: BadgeType;
  unlocked: boolean;
  progress?: number;
  currentValue?: number;
  unlockedAt?: string;
}

export function BadgeCard({ badge, unlocked, progress = 0, currentValue = 0, unlockedAt }: BadgeCardProps) {
  const isAlmostUnlocked = !unlocked && progress >= 50;
  const IconComponent = iconMap[badge.icon] || Star;

  return (
    <Card
      className={cn(
        "relative p-4 transition-all duration-300",
        unlocked
          ? `border-2 ${getTierBorder(badge.tier)} bg-gradient-to-br ${getTierColor(badge.tier)} bg-opacity-10 hover:scale-105 shadow-lg`
          : "border border-border/50 bg-muted/30 opacity-70 hover:opacity-90",
        isAlmostUnlocked && "animate-pulse"
      )}
      data-testid={`badge-${badge.id}`}
    >
      <div className="absolute top-2 right-2">
        <Badge
          variant={unlocked ? "default" : "secondary"}
          className={cn(
            "text-[10px] px-2 py-0.5",
            unlocked && `bg-gradient-to-r ${getTierColor(badge.tier)} border-0 text-white`
          )}
        >
          {badge.tier.toUpperCase()}
        </Badge>
      </div>

      <div className="flex flex-col items-center justify-center space-y-3">
        <div
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center",
            unlocked
              ? `bg-gradient-to-br ${getTierColor(badge.tier)} shadow-md`
              : "bg-muted/50"
          )}
        >
          {unlocked ? (
            <IconComponent className="w-10 h-10 text-white drop-shadow-lg" />
          ) : (
            <Lock className="w-8 h-8 text-muted-foreground" />
          )}
        </div>

        <div className="text-center space-y-1">
          <h3 className={cn("font-bold text-sm", unlocked ? "text-foreground" : "text-muted-foreground")}>
            {badge.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2">{badge.description}</p>
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
          </div>
        )}

        <div className={cn("text-xs font-semibold", getCategoryColor(badge.category))}>
          +{badge.points} XP
        </div>
      </div>
    </Card>
  );
}
