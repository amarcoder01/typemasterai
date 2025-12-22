import React from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Zap, Target, Trophy, HelpCircle, Flame, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { PracticeMode, StreakData } from '../types';
import { PRACTICE_MODES } from '../types';

interface DictationModeSelectorProps {
  streakData: StreakData;
  onSelectMode: (mode: PracticeMode) => void;
  hasRecoverableSession?: boolean;
  onRecoverSession?: () => void;
}

const MODE_ICONS: Record<PracticeMode, React.ReactNode> = {
  quick: <Zap className="w-5 h-5" />,
  focus: <Target className="w-5 h-5" />,
  challenge: <Trophy className="w-5 h-5" />,
};

const MODE_COLORS: Record<PracticeMode, string> = {
  quick: 'bg-blue-500/10 text-blue-500',
  focus: 'bg-green-500/10 text-green-500',
  challenge: 'bg-yellow-500/10 text-yellow-500',
};

/**
 * Mode selection screen for Dictation Mode
 * Displays available practice modes and streak information
 */
export function DictationModeSelector({
  streakData,
  onSelectMode,
  hasRecoverableSession = false,
  onRecoverSession,
}: DictationModeSelectorProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="container max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
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

          <Tooltip>
            <TooltipTrigger asChild>
              <h1
                className="text-3xl font-bold cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg px-2"
                tabIndex={0}
                role="heading"
                aria-label="Choose your practice mode"
              >
                Dictation Mode 🎧
              </h1>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p>Select how you want to practice today</p>
            </TooltipContent>
          </Tooltip>

          <div className="w-20" />
        </div>

        {/* Session Recovery Banner */}
        {hasRecoverableSession && onRecoverSession && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-full">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Resume Previous Session?</p>
                    <p className="text-sm text-muted-foreground">
                      You have an unfinished session from earlier
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={onRecoverSession}
                    size="sm"
                    data-testid="button-recover-session"
                  >
                    Resume
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      localStorage.removeItem('dictation_session_backup');
                      window.location.reload();
                    }}
                    data-testid="button-discard-session"
                  >
                    Discard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Streak Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help transition-transform hover:scale-105">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-full">
                      <Flame className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-500">
                        {streakData.currentStreak}
                      </p>
                      <p className="text-xs text-muted-foreground">Current Streak</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Practice daily to keep your streak going!</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help transition-transform hover:scale-105">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-full">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">
                        {streakData.longestStreak}
                      </p>
                      <p className="text-xs text-muted-foreground">Best Streak</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Your all-time best streak</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help transition-transform hover:scale-105">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-full">
                      <Target className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-500">
                        {streakData.totalSessions}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Sessions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total practice sessions completed</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Mode Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-center">Choose Your Practice Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.entries(PRACTICE_MODES) as [PracticeMode, typeof PRACTICE_MODES[PracticeMode]][]).map(
                ([mode, config]) => (
                  <Tooltip key={mode}>
                    <TooltipTrigger asChild>
                      <Card
                        className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 border-transparent hover:border-primary/50"
                        onClick={() => onSelectMode(mode)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Select ${config.name}`}
                        onKeyDown={(e) => e.key === 'Enter' && onSelectMode(mode)}
                        data-testid={`button-mode-${mode}`}
                      >
                        <CardContent className="pt-6 text-center">
                          <div
                            className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 ${MODE_COLORS[mode]}`}
                          >
                            {MODE_ICONS[mode]}
                          </div>
                          <h3 className="font-semibold mb-1">{config.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {config.description}
                          </p>
                          <div className="flex flex-wrap gap-1 justify-center">
                            {config.hintsAllowed && (
                              <Badge variant="secondary" className="text-xs">
                                Hints
                              </Badge>
                            )}
                            {config.timerPressure && (
                              <Badge variant="secondary" className="text-xs">
                                Timed
                              </Badge>
                            )}
                            {!config.hintsAllowed && (
                              <Badge variant="outline" className="text-xs">
                                No Hints
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-medium mb-1">{config.name}</p>
                      <p className="text-xs opacity-90">{config.description}</p>
                      <p className="text-xs mt-1 opacity-70">
                        Default: {config.defaultDifficulty} difficulty at {config.defaultSpeed}x speed
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">How it works</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Listen to the sentence being spoken</li>
                  <li>Type exactly what you hear</li>
                  <li>Submit and get instant feedback on accuracy</li>
                  <li>
                    Press <kbd className="px-1 bg-muted rounded text-xs">R</kbd> to replay,{' '}
                    <kbd className="px-1 bg-muted rounded text-xs">H</kbd> for hints
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
