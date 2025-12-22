import React from 'react';
import { 
  ChevronRight, 
  RotateCcw, 
  Bookmark, 
  BookmarkCheck,
  Lightbulb,
  Sparkles,
  Award,
  Target,
  TrendingUp,
  Flame,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getAccuracyGrade, type WordDiff } from '@shared/dictation-utils';
import type { CoachingTip, DictationTestResult } from '../types';

interface DictationResultsProps {
  result: DictationTestResult;
  sentence: string;
  typedText: string;
  replayCount: number;
  hintUsed: boolean;
  duration: number;
  isBookmarked: boolean;
  coachingTip: CoachingTip | null;
  autoAdvanceCountdown: number | null;
  onNext: () => void;
  onReplay: () => void;
  onToggleBookmark: () => void;
}

const COACHING_ICONS: Record<CoachingTip['type'], React.ReactNode> = {
  achievement: <Sparkles className="w-5 h-5 text-yellow-500" />,
  encouragement: <Award className="w-5 h-5 text-green-500" />,
  improvement: <Lightbulb className="w-5 h-5 text-blue-500" />,
  warning: <AlertCircle className="w-5 h-5 text-orange-500" />,
};

/**
 * Results display after completing a dictation test
 */
export function DictationResults({
  result,
  sentence,
  typedText,
  replayCount,
  hintUsed,
  duration,
  isBookmarked,
  coachingTip,
  autoAdvanceCountdown,
  onNext,
  onReplay,
  onToggleBookmark,
}: DictationResultsProps) {
  const grade = getAccuracyGrade(result.accuracy);
  
  return (
    <div className="space-y-6">
      {/* Main stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className={`text-6xl font-bold mb-2 ${grade.color}`}>
              {grade.grade}
            </div>
            <p className="text-lg text-muted-foreground">{grade.message}</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-3 bg-primary/10 rounded-lg cursor-help">
                  <div className="text-2xl font-bold text-primary" data-testid="result-accuracy">
                    {result.accuracy}%
                  </div>
                  <div className="text-xs text-muted-foreground">Accuracy</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{result.correctWords}/{result.totalWords} words correct</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-3 bg-blue-500/10 rounded-lg cursor-help">
                  <div className="text-2xl font-bold text-blue-600" data-testid="result-wpm">
                    {result.wpm}
                  </div>
                  <div className="text-xs text-muted-foreground">WPM</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Words per minute</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-3 bg-orange-500/10 rounded-lg cursor-help">
                  <div className="text-2xl font-bold text-orange-600" data-testid="result-errors">
                    {result.errors}
                  </div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Word errors (missing, extra, or incorrect)</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-3 bg-muted rounded-lg cursor-help">
                  <div className="text-2xl font-bold" data-testid="result-duration">
                    {duration}s
                  </div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Time taken to type the sentence</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          {/* Additional stats */}
          <div className="flex justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <RotateCcw className="w-4 h-4" />
              {replayCount} replays
            </span>
            {hintUsed && (
              <span className="flex items-center gap-1 text-primary">
                <Lightbulb className="w-4 h-4" />
                Hint used
              </span>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Coaching tip */}
      {coachingTip && (
        <Card className={`border-l-4 ${
          coachingTip.type === 'achievement' ? 'border-l-yellow-500 bg-yellow-500/5' :
          coachingTip.type === 'encouragement' ? 'border-l-green-500 bg-green-500/5' :
          coachingTip.type === 'improvement' ? 'border-l-blue-500 bg-blue-500/5' :
          'border-l-orange-500 bg-orange-500/5'
        }`}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              {COACHING_ICONS[coachingTip.type]}
              <p className="text-sm font-medium">{coachingTip.message}</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Word-by-word breakdown */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium mb-3">Word Comparison</h3>
          
          {/* Original sentence */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-1">Original:</p>
            <p className="font-mono text-sm bg-muted/50 p-3 rounded-lg">{sentence}</p>
          </div>
          
          {/* Typed text with highlighting */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-1">Your answer:</p>
            <div className="font-mono text-sm bg-muted/50 p-3 rounded-lg">
              {result.wordDiff.map((diff, idx) => (
                <span
                  key={idx}
                  className={`${
                    diff.status === 'correct'
                      ? 'text-green-600 dark:text-green-400'
                      : diff.status === 'incorrect'
                      ? 'text-red-600 dark:text-red-400 line-through'
                      : diff.status === 'missing'
                      ? 'text-yellow-600 dark:text-yellow-400 italic'
                      : 'text-orange-600 dark:text-orange-400'
                  }`}
                  title={
                    diff.status === 'correct'
                      ? 'Correct'
                      : diff.status === 'incorrect'
                      ? `Expected: ${diff.word}`
                      : diff.status === 'missing'
                      ? `Missing: ${diff.word}`
                      : `Extra word`
                  }
                >
                  {diff.status === 'missing' ? `[${diff.word}]` : diff.typedWord || diff.word}{' '}
                </span>
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500" />
              Correct
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              Incorrect
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              Missing
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-500" />
              Extra
            </span>
          </div>
        </CardContent>
      </Card>
      
      {/* Action buttons */}
      <Card className="bg-gradient-to-r from-muted/50 to-muted/30">
        <CardContent className="py-4">
          <div className="flex gap-3 justify-center flex-wrap items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onToggleBookmark}
                  variant="outline"
                  size="lg"
                  className="h-12"
                  data-testid="button-bookmark"
                >
                  {isBookmarked ? (
                    <>
                      <BookmarkCheck className="w-5 h-5 mr-2 text-primary" />
                      Bookmarked
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-5 h-5 mr-2" />
                      Bookmark
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isBookmarked ? 'Remove from bookmarks' : 'Save for later practice'}</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onReplay}
                  variant="outline"
                  size="lg"
                  className="h-12"
                  data-testid="button-replay-result"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Retry This
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Try this sentence again</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onNext}
                  size="lg"
                  className="h-12 px-8 font-semibold shadow-lg shadow-primary/20"
                  data-testid="button-next"
                >
                  Next Sentence
                  <ChevronRight className="w-5 h-5 ml-2" />
                  {autoAdvanceCountdown !== null && (
                    <Badge variant="secondary" className="ml-2">
                      {autoAdvanceCountdown}s
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Continue to the next sentence (press N)</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
