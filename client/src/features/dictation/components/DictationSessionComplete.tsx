import React, { useState, useMemo } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft,
  Award,
  Share2,
  Flame,
  Zap,
  Trophy,
  Target,
  Clock,
  RotateCcw,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import type { SessionStats, SessionHistoryItem, Achievement } from '../types';
import { SESSION_LENGTH_OPTIONS } from '../types';
import { calculateAchievements } from '../utils/scoring';
import { getSpeedLevelName } from '@shared/dictation-utils';

interface DictationSessionCompleteProps {
  sessionStats: SessionStats;
  sessionHistory: SessionHistoryItem[];
  sessionLength: number;
  speedLevel: string;
  username?: string;
  // Certificate data
  totalWords?: number;
  totalCharacters?: number;
  duration?: number;
  consistency?: number;
  verificationId?: string;
  onNewSession: () => void;
  onShare: () => void;
  onSessionLengthChange: (length: number) => void;
  // Certificate functions
  onViewCertificate?: () => void;
}

const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  speed_demon: <Zap className="w-4 h-4" />,
  perfectionist: <Trophy className="w-4 h-4" />,
  accuracy_ace: <Target className="w-4 h-4" />,
  marathon: <Flame className="w-4 h-4" />,
};

const getDictationPerformanceRating = (wpm: number, accuracy: number) => {
  if (wpm >= 100 && accuracy >= 98) return { title: 'Dictation Master', icon: <Trophy className="w-8 h-8" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
  if (wpm >= 80 && accuracy >= 95) return { title: 'Expert Scribe', icon: <Zap className="w-8 h-8" />, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
  if (wpm >= 60 && accuracy >= 92) return { title: 'Professional', icon: <Flame className="w-8 h-8" />, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
  if (wpm >= 40) return { title: 'Intermediate', icon: <Target className="w-8 h-8" />, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' };
  return { title: 'Novice', icon: <TrendingUp className="w-8 h-8" />, color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20' };
};

/**
 * Session complete screen with stats and action buttons
 * Simplified - all sharing is done via the Share dialog
 */
export function DictationSessionComplete({
  sessionStats,
  sessionHistory,
  sessionLength,
  speedLevel,
  username,
  consistency = 100,
  onNewSession,
  onShare,
  onSessionLengthChange,
  onViewCertificate,
}: DictationSessionCompleteProps) {
  const [showCustomLength, setShowCustomLength] = useState(false);
  const [customLengthInput, setCustomLengthInput] = useState('');
  
  const avgWpm = sessionStats.count > 0 ? Math.round(sessionStats.totalWpm / sessionStats.count) : 0;
  const avgAccuracy = sessionStats.count > 0 ? Math.round(sessionStats.totalAccuracy / sessionStats.count) : 0;
  
  const rating = getDictationPerformanceRating(avgWpm, avgAccuracy);
  
  const achievements = useMemo(
    () => calculateAchievements(sessionStats, sessionHistory),
    [sessionStats, sessionHistory]
  );
  
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  
  const handleSessionLengthChange = (value: string) => {
    const numValue = parseInt(value);
    if (numValue === 0) {
      setShowCustomLength(true);
    } else {
      onSessionLengthChange(numValue);
      setShowCustomLength(false);
    }
  };
  
  const handleCustomLengthSubmit = () => {
    const value = parseInt(customLengthInput);
    if (value >= 1 && value <= 500) {
      onSessionLengthChange(value);
      setShowCustomLength(false);
      setCustomLengthInput('');
    }
  };
  
  return (
    <TooltipProvider delayDuration={300}>
      <div className="container max-w-4xl mx-auto p-4 sm:p-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Return to home page</p>
            </TooltipContent>
          </Tooltip>
          
          <div className="flex items-center gap-2">
            <Badge className="px-3 py-1 bg-purple-500/20 text-purple-400 border-purple-500/30">
              🎧 Dictation Mode
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-background/50 backdrop-blur">
              {getSpeedLevelName(parseFloat(speedLevel))} Speed
            </Badge>
          </div>
        </div>
        
        {/* Title */}
        <div className="text-center mb-8 space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500 inline-block">
            🎉 Session Complete!
          </h1>
          <p className="text-muted-foreground">
            You've successfully completed {sessionLength} sentences
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg border border-border/50">
            <span className="text-sm text-muted-foreground">Mode:</span>
            <span className="font-semibold text-purple-400">🎧 Dictation Mode</span>
            <span className="text-xs text-muted-foreground">(Listen & Type)</span>
          </div>
        </div>
        
        {/* Hero Stats Card */}
        <Card className="border-primary/20 shadow-lg bg-gradient-to-br from-background to-muted/20 mb-6">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Your Dictation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              {/* WPM */}
              <div className="text-center space-y-2">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" /> Typing Speed
                </div>
                <div className="text-5xl md:text-6xl font-bold text-primary tabular-nums">
                  {avgWpm}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold">WPM</span>
                  <span className="text-xs ml-1">(Words Per Minute)</span>
                </div>
              </div>

              {/* Rating Badge */}
              <div className="text-center flex flex-col items-center justify-center py-4 md:py-0 border-y md:border-y-0 md:border-x border-border/50">
                <div className={`w-20 h-20 rounded-full ${rating.bg} ${rating.border} border-2 flex items-center justify-center text-4xl mb-3 shadow-lg`}>
                  {rating.icon}
                </div>
                <div className={`text-xl font-bold ${rating.color}`}>{rating.title}</div>
                <div className="text-xs text-muted-foreground mt-1">Performance Rating</div>
              </div>

              {/* Accuracy */}
              <div className="text-center space-y-2">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-2">
                  <Target className="w-4 h-4 text-green-500" /> Accuracy
                </div>
                <div className="text-5xl md:text-6xl font-bold text-green-500 tabular-nums">
                  {Math.round(avgAccuracy)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold">ACC</span>
                  <span className="text-xs ml-1">(Precision Rate)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Additional Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="text-2xl font-bold text-primary">{sessionStats.count}</div>
              <div className="text-xs text-muted-foreground">Sentences</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="text-2xl font-bold text-red-500">{sessionStats.totalErrors}</div>
              <div className="text-xs text-muted-foreground">Total Errors</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="text-2xl font-bold text-purple-500">{consistency}%</div>
              <div className="text-xs text-muted-foreground">Consistency</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="text-2xl font-bold text-blue-500">{unlockedAchievements.length}</div>
              <div className="text-xs text-muted-foreground">Achievements</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Achievements */}
        {unlockedAchievements.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Achievements Unlocked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {unlockedAchievements.map((achievement) => (
                  <Badge
                    key={achievement.id}
                    variant="secondary"
                    className="px-3 py-1.5 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20 gap-2"
                  >
                    {ACHIEVEMENT_ICONS[achievement.id] || <Trophy className="w-4 h-4" />}
                    {achievement.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Action Buttons */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Next Session Length */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Next session:</span>
                {showCustomLength ? (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={customLengthInput}
                      onChange={(e) => setCustomLengthInput(e.target.value)}
                      placeholder="1-500"
                      className="w-24"
                    />
                    <Button size="sm" onClick={handleCustomLengthSubmit}>Set</Button>
                  </div>
                ) : (
                  <Select value={sessionLength.toString()} onValueChange={handleSessionLengthChange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SESSION_LENGTH_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 w-full sm:w-auto flex-wrap justify-center sm:justify-end">
                {username && onViewCertificate && (
                  <button
                    onClick={onViewCertificate}
                    className="flex-1 sm:flex-none py-3 px-5 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    data-testid="button-view-certificate"
                  >
                    <Award className="w-5 h-5" />
                    Get Certificate
                  </button>
                )}
                <Button onClick={onNewSession} size="lg" className="flex-1 sm:flex-none shadow-lg shadow-primary/20">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  New Session
                </Button>
                <Button onClick={onShare} variant="secondary" size="lg" className="flex-1 sm:flex-none">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
