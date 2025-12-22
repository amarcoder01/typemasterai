/**
 * BookHeader Component
 * 
 * Persistent header showing book metadata and reading progress.
 * Always visible at the top of the typing area.
 * 
 * Displays:
 * - Book title and author
 * - Current chapter/act/scene info
 * - Overall progress percentage
 * - Reading mode indicator
 */

import { BookOpen, User, Bookmark, Clock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface BookHeaderProps {
  /** Book title */
  title: string;
  
  /** Author name */
  author: string;
  
  /** Current chapter number */
  chapter?: number;
  
  /** Chapter title if available */
  chapterTitle?: string;
  
  /** Total chapters in book */
  totalChapters?: number;
  
  /** Current act (for plays) */
  actNumber?: number;
  
  /** Current scene (for plays) */
  sceneNumber?: number;
  
  /** Overall progress percentage (0-100) */
  progress: number;
  
  /** Estimated time remaining in minutes */
  timeRemaining?: number;
  
  /** Topic/genre of the book */
  topic?: string;
  
  /** Difficulty level */
  difficulty?: 'easy' | 'medium' | 'hard';
  
  /** Whether the header should be compact */
  compact?: boolean;
  
  /** Additional className */
  className?: string;
}

/**
 * Format time remaining as human-readable string
 */
function formatTimeRemaining(minutes: number): string {
  if (minutes < 1) {
    return '< 1 min';
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Get difficulty color classes
 */
function getDifficultyClasses(difficulty: 'easy' | 'medium' | 'hard'): string {
  const colors = {
    easy: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
    hard: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
  };
  return colors[difficulty];
}

export function BookHeader({
  title,
  author,
  chapter,
  chapterTitle,
  totalChapters,
  actNumber,
  sceneNumber,
  progress,
  timeRemaining,
  topic,
  difficulty,
  compact = false,
  className,
}: BookHeaderProps) {
  // Build location breadcrumb
  const locationParts: string[] = [];
  if (actNumber) locationParts.push(`Act ${actNumber}`);
  if (sceneNumber) locationParts.push(`Scene ${sceneNumber}`);
  if (chapter && !actNumber) {
    locationParts.push(chapterTitle || `Chapter ${chapter}`);
  }
  
  const hasLocation = locationParts.length > 0;
  
  return (
    <TooltipProvider>
      <div
        className={cn(
          'book-header bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10',
          compact ? 'px-4 py-2' : 'px-6 py-4',
          className
        )}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left side: Book info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Book icon */}
            <div className={cn(
              'flex-shrink-0 rounded-lg bg-primary/10 flex items-center justify-center',
              compact ? 'w-8 h-8' : 'w-10 h-10'
            )}>
              <BookOpen className={cn('text-primary', compact ? 'w-4 h-4' : 'w-5 h-5')} />
            </div>
            
            {/* Title and author */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={cn(
                  'font-bold text-foreground truncate',
                  compact ? 'text-sm' : 'text-base md:text-lg'
                )}>
                  {title}
                </h2>
                
                {/* Difficulty badge */}
                {difficulty && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className={cn('text-xs capitalize cursor-help', getDifficultyClasses(difficulty))}
                      >
                        {difficulty}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Reading difficulty level</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                
                {/* Topic badge */}
                {topic && !compact && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {topic.replace(/-/g, ' ')}
                  </Badge>
                )}
              </div>
              
              {/* Author line */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-3 h-3" />
                <span className={cn('italic', compact ? 'text-xs' : 'text-sm')}>
                  {author}
                </span>
                
                {/* Location breadcrumb */}
                {hasLocation && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span className={cn('font-medium text-foreground/80', compact ? 'text-xs' : 'text-sm')}>
                      {locationParts.join(' · ')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Right side: Progress */}
          <div className="flex items-center gap-4">
            {/* Time remaining */}
            {timeRemaining !== undefined && timeRemaining > 0 && !compact && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-muted-foreground cursor-help">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {formatTimeRemaining(timeRemaining)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Estimated time remaining</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Chapter progress */}
            {totalChapters && chapter && !compact && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-muted-foreground cursor-help">
                    <Bookmark className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {chapter}/{totalChapters}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Chapter {chapter} of {totalChapters}</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Progress bar and percentage */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <div className={cn('bg-muted rounded-full overflow-hidden', compact ? 'w-16 h-1.5' : 'w-24 h-2')}>
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                  </div>
                  <span className={cn('font-mono font-bold text-primary', compact ? 'text-xs' : 'text-sm')}>
                    {Math.round(progress)}%
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reading progress: {Math.round(progress)}% complete</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

/**
 * Minimal header for very compact display
 */
export function BookHeaderCompact({
  title,
  progress,
  chapter,
  totalChapters,
  className,
}: Pick<BookHeaderProps, 'title' | 'progress' | 'chapter' | 'totalChapters' | 'className'>) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-2 px-3 py-1.5 bg-muted/50 rounded-lg text-xs',
      className
    )}>
      <span className="font-medium text-foreground truncate max-w-[200px]">{title}</span>
      <div className="flex items-center gap-2 text-muted-foreground">
        {chapter && totalChapters && (
          <span>Ch. {chapter}/{totalChapters}</span>
        )}
        <span className="font-mono font-bold text-primary">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

export default BookHeader;
