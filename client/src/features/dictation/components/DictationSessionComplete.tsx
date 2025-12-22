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
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DictationCertificate } from '@/components/DictationCertificate';
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
  certificateData?: {
    wpm: number;
    accuracy: number;
    consistency: number;
    speedLevel: string;
    sentencesCompleted: number;
    totalWords: number;
    duration: number;
    username: string;
    verificationId?: string;
  } | null;
  onNewSession: () => void;
  onShare: () => void;
  onSessionLengthChange: (length: number) => void;
}

const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  speed_demon: <Zap className="w-4 h-4" />,
  perfectionist: <Trophy className="w-4 h-4" />,
  accuracy_ace: <Target className="w-4 h-4" />,
  marathon: <Flame className="w-4 h-4" />,
};

/**
 * Session complete screen with stats, achievements, and certificate
 */
export function DictationSessionComplete({
  sessionStats,
  sessionHistory,
  sessionLength,
  speedLevel,
  username,
  certificateData,
  onNewSession,
  onShare,
  onSessionLengthChange,
}: DictationSessionCompleteProps) {
  const [showCertificate, setShowCertificate] = useState(false);
  const [showCustomLength, setShowCustomLength] = useState(false);
  const [customLengthInput, setCustomLengthInput] = useState('');
  
  const avgWpm = sessionStats.count > 0 ? Math.round(sessionStats.totalWpm / sessionStats.count) : 0;
  const avgAccuracy = sessionStats.count > 0 ? Math.round(sessionStats.totalAccuracy / sessionStats.count) : 0;
  
  const achievements = useMemo(
    () => calculateAchievements(sessionStats, sessionHistory),
    [sessionStats, sessionHistory]
  );
  
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);
  
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
      <div className="container max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Return to home page</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <Card>
          <CardContent className="pt-8 pb-8">
            {/* Celebration header */}
            <div className="text-center mb-6">
              <Tooltip>
                <TooltipTrigger asChild>
                  <h2
                    className="text-3xl font-bold mb-2 cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg px-2 inline-block"
                    tabIndex={0}
                    role="heading"
                    aria-label="Session complete - congratulations"
                  >
                    Session Complete! 🎉
                  </h2>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Congratulations! You've finished all {sessionLength} dictation exercises</p>
                </TooltipContent>
              </Tooltip>
              <p className="text-muted-foreground">
                You've completed {sessionLength} dictation tests
              </p>
            </div>
            
            {/* Main stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="text-center p-4 bg-primary/10 rounded-lg cursor-help transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    tabIndex={0}
                    role="group"
                    aria-label="Average words per minute statistic"
                  >
                    <div className="text-3xl font-bold text-primary" data-testid="text-session-avg-wpm">
                      {avgWpm}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg WPM</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium mb-1">Average Words Per Minute</p>
                  <p className="text-xs opacity-90">
                    Your average typing speed across all {sessionStats.count} sentences.
                  </p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="text-center p-4 bg-green-500/10 rounded-lg cursor-help transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                    tabIndex={0}
                    role="group"
                    aria-label="Average accuracy statistic"
                  >
                    <div className="text-3xl font-bold text-green-600" data-testid="text-session-avg-accuracy">
                      {avgAccuracy}%
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Accuracy</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium mb-1">Average Accuracy Score</p>
                  <p className="text-xs opacity-90">
                    How closely your typing matched the spoken sentences.
                  </p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="text-center p-4 bg-orange-500/10 rounded-lg cursor-help transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    tabIndex={0}
                    role="group"
                    aria-label="Total errors statistic"
                  >
                    <div className="text-3xl font-bold text-orange-600" data-testid="text-session-total-errors">
                      {sessionStats.totalErrors}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Errors</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium mb-1">Total Word Errors</p>
                  <p className="text-xs opacity-90">
                    Sum of all word errors across the session.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            {/* Achievements unlocked */}
            {unlockedAchievements.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3 text-center flex items-center justify-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  Achievements Unlocked!
                </h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {unlockedAchievements.map((achievement) => (
                    <Tooltip key={achievement.id}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="default"
                          className="bg-yellow-500/20 text-yellow-600 border-yellow-500/50 px-3 py-1.5"
                        >
                          <span className="mr-1">{ACHIEVEMENT_ICONS[achievement.id]}</span>
                          {achievement.name}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{achievement.name}</p>
                        <p className="text-xs opacity-90">{achievement.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}
            
            {/* Achievements in progress */}
            {lockedAchievements.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3 text-center text-muted-foreground">
                  Almost there...
                </h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {lockedAchievements.map((achievement) => (
                    <Tooltip key={achievement.id}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full text-sm text-muted-foreground">
                          <span className="opacity-50">{ACHIEVEMENT_ICONS[achievement.id]}</span>
                          <span>{achievement.name}</span>
                          {achievement.progress !== undefined && achievement.target && (
                            <span className="text-xs">
                              ({Math.round(achievement.progress)}/{achievement.target})
                            </span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{achievement.name}</p>
                        <p className="text-xs opacity-90">{achievement.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}
            
            {/* Certificate section */}
            {certificateData && !showCertificate && (
              <div className="mb-6">
                <Button
                  onClick={() => setShowCertificate(true)}
                  className="w-full gap-2"
                  size="lg"
                  variant="outline"
                  data-testid="button-view-certificate"
                >
                  <Award className="w-5 h-5" />
                  View Your Certificate
                </Button>
              </div>
            )}
            
            {showCertificate && certificateData && (
              <div className="mb-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">Your Achievement Certificate</h3>
                  <Button
                    onClick={() => setShowCertificate(false)}
                    variant="ghost"
                    size="sm"
                    data-testid="button-hide-certificate"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Hide
                  </Button>
                </div>
                <DictationCertificate {...certificateData} />
              </div>
            )}
            
            {/* Session length selector */}
            <div className="flex gap-4 justify-center items-center mb-4 flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Session Length:</span>
                    {showCustomLength ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={customLengthInput}
                          onChange={(e) => setCustomLengthInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCustomLengthSubmit()}
                          placeholder="1-500"
                          className="w-20 px-3 py-2 text-sm border rounded-md bg-background"
                          data-testid="input-custom-session-length"
                          autoFocus
                        />
                        <Button size="sm" onClick={handleCustomLengthSubmit}>
                          Set
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowCustomLength(false)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Select
                        value={
                          SESSION_LENGTH_OPTIONS.find((o) => o.value === sessionLength)
                            ? sessionLength.toString()
                            : '0'
                        }
                        onValueChange={handleSessionLengthChange}
                      >
                        <SelectTrigger className="w-[200px]" data-testid="select-session-length">
                          <SelectValue>
                            {SESSION_LENGTH_OPTIONS.find((o) => o.value === sessionLength)?.label ||
                              `${sessionLength} sentences (Custom)`}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {SESSION_LENGTH_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value.toString()}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Choose how many sentences to practice in your next session (1-500)</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-3 justify-center flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onNewSession} size="lg" data-testid="button-new-session">
                    Start New Session
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Begin a fresh session with {sessionLength} new sentences</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onShare} variant="secondary" size="lg" data-testid="button-share-result">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Result
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Share your session results with friends</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/">
                    <Button variant="outline" size="lg" data-testid="button-home">
                      Back to Home
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Return to the main menu</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
