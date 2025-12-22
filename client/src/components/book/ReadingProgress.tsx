/**
 * ReadingProgress Component
 * 
 * Visual progress indicators for book typing:
 * - Segment progress bar (current segment completion)
 * - Overall chapter progress
 * - Segment dots navigation
 * - Estimated time remaining
 */

import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Target, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TypingSegment } from '@/lib/book-segment-splitter';

export interface ReadingProgressProps {
  /** Current segment index (0-based) */
  currentSegment: number;
  
  /** Total number of segments */
  totalSegments: number;
  
  /** Progress within current segment (0-100) */
  segmentProgress: number;
  
  /** Overall chapter progress (0-100) */
  overallProgress: number;
  
  /** Words typed so far */
  wordsTyped?: number;
  
  /** Total words in chapter */
  totalWords?: number;
  
  /** Estimated time remaining in seconds */
  timeRemaining?: number;
  
  /** Callback when segment dot is clicked */
  onSegmentClick?: (segmentIndex: number) => void;
  
  /** Whether navigation is disabled (e.g., while typing) */
  navigationDisabled?: boolean;
  
  /** All segments for detailed tooltip info */
  segments?: TypingSegment[];
  
  /** Compact mode */
  compact?: boolean;
  
  /** Additional className */
  className?: string;
}

/**
 * Format seconds as human-readable time
 */
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

/**
 * Segment dot indicator
 */
interface SegmentDotProps {
  index: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isUpcoming: boolean;
  onClick?: () => void;
  disabled?: boolean;
  segment?: TypingSegment;
}

function SegmentDot({ 
  index, 
  isCompleted, 
  isCurrent, 
  isUpcoming, 
  onClick, 
  disabled,
  segment 
}: SegmentDotProps) {
  const tooltipContent = segment 
    ? `${segment.primaryType.replace('_', ' ')}: ${segment.wordCount} words`
    : `Segment ${index + 1}`;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-200',
              isCompleted && 'bg-green-500 dark:bg-green-400',
              isCurrent && 'bg-primary scale-125 ring-2 ring-primary/30 animate-pulse',
              isUpcoming && 'bg-muted-foreground/30',
              !disabled && !isCurrent && 'hover:scale-110 cursor-pointer',
              disabled && 'cursor-not-allowed'
            )}
            aria-label={`Go to segment ${index + 1}`}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p className="font-medium">Segment {index + 1}</p>
          {segment && (
            <p className="text-muted-foreground">
              {segment.wordCount} words
              {segment.hasDialogue && ' · Has dialogue'}
            </p>
          )}
          {isCompleted && <p className="text-green-500">Completed</p>}
          {isCurrent && <p className="text-primary">Current</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ReadingProgress({
  currentSegment,
  totalSegments,
  segmentProgress,
  overallProgress,
  wordsTyped,
  totalWords,
  timeRemaining,
  onSegmentClick,
  navigationDisabled = false,
  segments,
  compact = false,
  className,
}: ReadingProgressProps) {
  // Generate segment dots
  const segmentDots = useMemo(() => {
    const dots: React.ReactNode[] = [];
    
    // Limit dots shown for very long chapters
    const maxDots = 20;
    const showAllDots = totalSegments <= maxDots;
    
    if (showAllDots) {
      for (let i = 0; i < totalSegments; i++) {
        dots.push(
          <SegmentDot
            key={i}
            index={i}
            isCompleted={i < currentSegment}
            isCurrent={i === currentSegment}
            isUpcoming={i > currentSegment}
            onClick={onSegmentClick ? () => onSegmentClick(i) : undefined}
            disabled={navigationDisabled}
            segment={segments?.[i]}
          />
        );
      }
    } else {
      // Show first few, current area, and last few
      const showStart = 3;
      const showEnd = 3;
      const showAroundCurrent = 2;
      
      for (let i = 0; i < totalSegments; i++) {
        const isNearStart = i < showStart;
        const isNearEnd = i >= totalSegments - showEnd;
        const isNearCurrent = Math.abs(i - currentSegment) <= showAroundCurrent;
        
        if (isNearStart || isNearEnd || isNearCurrent) {
          dots.push(
            <SegmentDot
              key={i}
              index={i}
              isCompleted={i < currentSegment}
              isCurrent={i === currentSegment}
              isUpcoming={i > currentSegment}
              onClick={onSegmentClick ? () => onSegmentClick(i) : undefined}
              disabled={navigationDisabled}
              segment={segments?.[i]}
            />
          );
        } else if (
          (i === showStart && currentSegment > showStart + showAroundCurrent) ||
          (i === totalSegments - showEnd - 1 && currentSegment < totalSegments - showEnd - showAroundCurrent - 1)
        ) {
          dots.push(
            <span key={`ellipsis-${i}`} className="text-muted-foreground text-xs px-1">
              ···
            </span>
          );
        }
      }
    }
    
    return dots;
  }, [totalSegments, currentSegment, onSegmentClick, navigationDisabled, segments]);
  
  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-200"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          {currentSegment + 1}/{totalSegments}
        </span>
      </div>
    );
  }
  
  return (
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        {/* Segment progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="w-4 h-4" />
              <span>Segment Progress</span>
            </div>
            <span className="font-mono font-semibold text-primary">
              {Math.round(segmentProgress)}%
            </span>
          </div>
          <Progress value={segmentProgress} className="h-2" />
        </div>
        
        {/* Overall progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Layers className="w-4 h-4" />
              <span>Overall Progress</span>
            </div>
            <div className="flex items-center gap-3">
              {wordsTyped !== undefined && totalWords !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {wordsTyped.toLocaleString()} / {totalWords.toLocaleString()} words
                </span>
              )}
              <span className="font-mono font-semibold text-primary">
                {Math.round(overallProgress)}%
              </span>
            </div>
          </div>
          <Progress value={overallProgress} className="h-2 bg-primary/10" />
        </div>
        
        {/* Segment dots navigation */}
        {totalSegments > 1 && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {segmentDots}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                Segment {currentSegment + 1} of {totalSegments}
              </span>
              {timeRemaining !== undefined && timeRemaining > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(timeRemaining)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Estimated time remaining</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Inline progress indicator for minimal UI
 */
export function ReadingProgressInline({
  currentSegment,
  totalSegments,
  overallProgress,
  className,
}: Pick<ReadingProgressProps, 'currentSegment' | 'totalSegments' | 'overallProgress' | 'className'>) {
  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-200"
          style={{ width: `${overallProgress}%` }}
        />
      </div>
      <span className="text-muted-foreground">
        {currentSegment + 1}/{totalSegments}
      </span>
      <span className="font-mono font-medium text-primary">
        {Math.round(overallProgress)}%
      </span>
    </div>
  );
}

export default ReadingProgress;
