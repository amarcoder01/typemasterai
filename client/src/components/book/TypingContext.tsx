/**
 * TypingContext Component
 * 
 * Shows a focused 3-line typing context window:
 * - Completed text (dimmed)
 * - Current typing line (highlighted)
 * - Upcoming text (semi-visible)
 * 
 * Provides clear reading context without overwhelming users.
 */

import { useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ParsedContent } from '@/lib/book-content-parser';
import { CHARACTER_STYLES } from '@/lib/book-typography';

export interface TypingContextProps {
  /** All parsed content blocks */
  blocks: ParsedContent[];
  
  /** User's typed input */
  userInput: string;
  
  /** Full text to type (normalized) */
  targetText: string;
  
  /** Current character position */
  charPosition: number;
  
  /** Number of lines to show before/after current */
  contextLines?: number;
  
  /** Whether to show character-level highlighting */
  showCharacterHighlight?: boolean;
  
  /** Focus mode - more aggressive dimming */
  focusMode?: boolean;
  
  /** Additional className */
  className?: string;
}

/**
 * Find line boundaries in text
 */
function getLineInfo(text: string, charPosition: number): {
  lineStart: number;
  lineEnd: number;
  lineNumber: number;
  totalLines: number;
} {
  const lines = text.split('\n');
  let currentPos = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length;
    const lineEnd = currentPos + lineLength;
    
    if (charPosition <= lineEnd || i === lines.length - 1) {
      return {
        lineStart: currentPos,
        lineEnd: lineEnd,
        lineNumber: i,
        totalLines: lines.length,
      };
    }
    
    currentPos = lineEnd + 1; // +1 for newline
  }
  
  return {
    lineStart: 0,
    lineEnd: text.length,
    lineNumber: 0,
    totalLines: 1,
  };
}

/**
 * Extract context lines around current position
 */
function getContextLines(
  text: string, 
  charPosition: number, 
  contextBefore: number, 
  contextAfter: number
): {
  beforeLines: string[];
  currentLine: string;
  currentLineOffset: number;
  afterLines: string[];
  cursorPosInLine: number;
} {
  const lines = text.split('\n');
  const { lineNumber } = getLineInfo(text, charPosition);
  
  // Calculate cursor position within current line
  let charsBeforeLine = 0;
  for (let i = 0; i < lineNumber; i++) {
    charsBeforeLine += lines[i].length + 1;
  }
  const cursorPosInLine = charPosition - charsBeforeLine;
  
  // Get context lines
  const startLine = Math.max(0, lineNumber - contextBefore);
  const endLine = Math.min(lines.length - 1, lineNumber + contextAfter);
  
  return {
    beforeLines: lines.slice(startLine, lineNumber),
    currentLine: lines[lineNumber] || '',
    currentLineOffset: charsBeforeLine,
    afterLines: lines.slice(lineNumber + 1, endLine + 1),
    cursorPosInLine,
  };
}

/**
 * Render text with character-level highlighting
 */
function HighlightedText({
  text,
  userInput,
  startOffset,
  isCompleted,
  isCurrent,
  cursorPosition,
}: {
  text: string;
  userInput: string;
  startOffset: number;
  isCompleted: boolean;
  isCurrent: boolean;
  cursorPosition?: number;
}) {
  const chars = useMemo(() => {
    const result: React.ReactNode[] = [];
    
    for (let i = 0; i < text.length; i++) {
      const globalPos = startOffset + i;
      const expectedChar = text[i];
      const typedChar = userInput[globalPos];
      const isTyped = globalPos < userInput.length;
      const isCursor = isCurrent && cursorPosition === i;
      
      let className = CHARACTER_STYLES.pending;
      let displayContent: React.ReactNode = expectedChar;
      
      if (isTyped) {
        if (typedChar === expectedChar) {
          className = CHARACTER_STYLES.correct;
        } else {
          // Show error: expected character crossed out, typed character shown
          displayContent = (
            <span className="relative">
              <span className={CHARACTER_STYLES.incorrect}>{expectedChar}</span>
              <span className={CHARACTER_STYLES.actualTyped}>{typedChar}</span>
            </span>
          );
          className = '';
        }
      }
      
      result.push(
        <span 
          key={i} 
          className={cn(
            className,
            isCursor && 'relative after:absolute after:left-0 after:top-0 after:h-full after:w-[2px] after:bg-primary after:animate-pulse'
          )}
        >
          {displayContent}
        </span>
      );
    }
    
    return result;
  }, [text, userInput, startOffset, isCurrent, cursorPosition]);
  
  return <span className={isCompleted ? 'opacity-40' : ''}>{chars}</span>;
}

export function TypingContext({
  blocks,
  userInput,
  targetText,
  charPosition,
  contextLines = 2,
  showCharacterHighlight = true,
  focusMode = false,
  className,
}: TypingContextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentLineRef = useRef<HTMLDivElement>(null);
  
  // Get context around current position
  const context = useMemo(() => 
    getContextLines(targetText, charPosition, contextLines, contextLines),
    [targetText, charPosition, contextLines]
  );
  
  // Calculate line offsets for highlighting
  const lineOffsets = useMemo(() => {
    let offset = 0;
    const offsets: number[] = [];
    const lines = targetText.split('\n');
    
    for (const line of lines) {
      offsets.push(offset);
      offset += line.length + 1;
    }
    
    return offsets;
  }, [targetText]);
  
  // Auto-scroll current line into view
  useEffect(() => {
    if (currentLineRef.current) {
      currentLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [context.currentLine]);
  
  const { lineNumber } = getLineInfo(targetText, charPosition);
  
  return (
    <div 
      ref={containerRef}
      className={cn(
        'typing-context font-serif text-lg leading-relaxed overflow-hidden',
        focusMode && 'focus-mode',
        className
      )}
    >
      {/* Completed lines (before current) */}
      {context.beforeLines.map((line, idx) => {
        const actualLineNumber = lineNumber - context.beforeLines.length + idx;
        const lineOffset = lineOffsets[actualLineNumber] || 0;
        
        return (
          <div 
            key={`before-${idx}`}
            className={cn(
              'typing-line transition-opacity duration-200',
              focusMode ? 'opacity-25 blur-[0.3px]' : 'opacity-40'
            )}
          >
            {showCharacterHighlight ? (
              <HighlightedText
                text={line}
                userInput={userInput}
                startOffset={lineOffset}
                isCompleted={true}
                isCurrent={false}
              />
            ) : (
              <span className="text-muted-foreground">{line}</span>
            )}
          </div>
        );
      })}
      
      {/* Current line */}
      <div 
        ref={currentLineRef}
        className={cn(
          'typing-line-current py-2 px-3 -mx-3 rounded-lg transition-all duration-200',
          'bg-primary/5 ring-1 ring-primary/20',
          focusMode && 'ring-2 ring-primary/30 shadow-lg scale-[1.01]'
        )}
      >
        {showCharacterHighlight ? (
          <HighlightedText
            text={context.currentLine}
            userInput={userInput}
            startOffset={context.currentLineOffset}
            isCompleted={false}
            isCurrent={true}
            cursorPosition={context.cursorPosInLine}
          />
        ) : (
          <span className="text-foreground">{context.currentLine}</span>
        )}
        
        {/* Visual cursor at end if at line end */}
        {context.cursorPosInLine >= context.currentLine.length && (
          <span className="inline-block w-[2px] h-[1.2em] bg-primary animate-pulse align-middle ml-0.5" />
        )}
      </div>
      
      {/* Upcoming lines */}
      {context.afterLines.map((line, idx) => {
        const actualLineNumber = lineNumber + 1 + idx;
        const lineOffset = lineOffsets[actualLineNumber] || 0;
        
        return (
          <div 
            key={`after-${idx}`}
            className={cn(
              'typing-line transition-opacity duration-200',
              focusMode ? 'opacity-35' : 'opacity-60'
            )}
          >
            <span className="text-muted-foreground">{line}</span>
          </div>
        );
      })}
      
      {/* Fade gradient at bottom */}
      {context.afterLines.length > 0 && (
        <div className="h-4 bg-gradient-to-b from-transparent to-background/50 -mt-4 relative z-10 pointer-events-none" />
      )}
    </div>
  );
}

/**
 * Simplified single-line typing display
 */
export function TypingLine({
  text,
  userInput,
  startOffset = 0,
  className,
}: {
  text: string;
  userInput: string;
  startOffset?: number;
  className?: string;
}) {
  return (
    <div className={cn('font-serif text-lg leading-relaxed', className)}>
      <HighlightedText
        text={text}
        userInput={userInput}
        startOffset={startOffset}
        isCompleted={false}
        isCurrent={true}
        cursorPosition={userInput.length - startOffset}
      />
    </div>
  );
}

export default TypingContext;
