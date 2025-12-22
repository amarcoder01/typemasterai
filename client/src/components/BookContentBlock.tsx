/**
 * BookContentBlock Component
 * 
 * Renders individual content blocks with proper typography and highlighting.
 * Handles multi-layer context: section-level, paragraph-level, character-level.
 * 
 * Enhanced with:
 * - Smooth scroll-into-view for current blocks
 * - Focus ring animation for active blocks
 * - Proper margins between content types
 * - Support for displayText (cleaned formatting)
 * 
 * Design principles:
 * - Completed sections: dimmed (opacity 40-50%)
 * - Current section: highlighted with background
 * - Upcoming sections: medium visibility (opacity 60-70%)
 * - Character-level: green (correct), red (error), gray (not typed)
 */

import { useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ParsedContent } from '@/lib/book-content-parser';
import { getTypeStyle, TYPING_STATE_STYLES, FOCUS_MODE_STYLES, CHARACTER_STYLES } from '@/lib/book-typography';

interface BookContentBlockProps {
  block: ParsedContent;
  userProgress: number; // Total characters typed so far
  blockStartOffset: number; // Character position where this block starts
  isActive: boolean; // Is typing session active?
  readingMode?: 'theater' | 'novel' | 'compact';
  /** Use displayText instead of raw text */
  useDisplayText?: boolean;
  /** Enable focus mode (more aggressive dimming) */
  focusMode?: boolean;
  /** Auto-scroll into view when current */
  autoScroll?: boolean;
  /** Callback when block becomes current */
  onBecomeCurrent?: () => void;
}

/**
 * Highlight individual characters in the block based on typing progress
 * Simple version without error detection - assumes all typed chars are correct
 */
function highlightBlockText(
  text: string,
  userProgress: number,
  blockStartOffset: number
): React.ReactNode[] {
  const result: React.ReactNode[] = [];

  for (let i = 0; i < text.length; i++) {
    const charGlobalPosition = blockStartOffset + i;
    const char = text[i];
    const isTyped = charGlobalPosition < userProgress;
    const isAtCursor = charGlobalPosition === userProgress;
    
    let className = CHARACTER_STYLES.pending;
    if (isTyped) {
      className = CHARACTER_STYLES.correct;
    }

    result.push(
      <span 
        key={i} 
        className={cn(
          className,
          isAtCursor && 'relative after:absolute after:left-0 after:top-0 after:h-full after:w-[2px] after:bg-primary after:animate-pulse'
        )}
      >
        {char}
      </span>
    );
  }

  return result;
}

/**
 * Determine the state of this block relative to user progress
 */
function getBlockState(
  userProgress: number,
  blockStartOffset: number,
  blockLength: number
): 'completed' | 'current' | 'upcoming' {
  const blockEndOffset = blockStartOffset + blockLength;

  if (userProgress >= blockEndOffset) {
    return 'completed';
  } else if (userProgress >= blockStartOffset && userProgress < blockEndOffset) {
    return 'current';
  } else {
    return 'upcoming';
  }
}

export function BookContentBlock({
  block,
  userProgress,
  blockStartOffset,
  isActive,
  readingMode = 'theater',
  useDisplayText = true,
  focusMode = false,
  autoScroll = true,
  onBecomeCurrent,
}: BookContentBlockProps) {
  const blockRef = useRef<HTMLElement>(null);
  const typeConfig = getTypeStyle(block.type);
  const Element = typeConfig.element as keyof JSX.IntrinsicElements;
  const textToRender = useDisplayText ? block.displayText : block.text;
  const blockState = getBlockState(userProgress, blockStartOffset, textToRender.length);
  const prevStateRef = useRef(blockState);

  // Auto-scroll current block into view
  useEffect(() => {
    if (blockState === 'current' && autoScroll && blockRef.current) {
      blockRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
    
    // Trigger callback when becoming current
    if (blockState === 'current' && prevStateRef.current !== 'current' && onBecomeCurrent) {
      onBecomeCurrent();
    }
    
    prevStateRef.current = blockState;
  }, [blockState, autoScroll, onBecomeCurrent]);

  // Highlight text characters
  const highlightedChars = useMemo(
    () => highlightBlockText(textToRender, userProgress, blockStartOffset),
    [textToRender, userProgress, blockStartOffset]
  );

  // State-based classes using the typography system
  const stateClasses = useMemo(() => {
    if (!isActive) return '';
    
    const baseStyles = focusMode ? FOCUS_MODE_STYLES : TYPING_STATE_STYLES;
    return baseStyles[blockState as keyof typeof baseStyles] || '';
  }, [blockState, isActive, focusMode]);

  // Enhanced current block styling
  const currentBlockClasses = cn({
    // Current block highlight - different treatment for headers vs content
    'ring-2 ring-primary/30 shadow-lg': blockState === 'current' && isActive && 
      !['BOOK_TITLE', 'ACT_HEADER', 'SECTION_DIVIDER'].includes(block.type),
    'bg-primary/5 rounded-lg px-4 py-3 -mx-2': blockState === 'current' && isActive && 
      !['BOOK_TITLE', 'ACT_HEADER', 'SECTION_DIVIDER'].includes(block.type),
  });

  // Reading mode modifiers
  const readingModeClasses = cn({
    // Theater mode: enhance character names and dialogue indentation
    'font-extrabold tracking-widest text-primary': readingMode === 'theater' && block.type === 'CHARACTER_NAME',
    'ml-8 pl-4 border-l-2 border-primary/30': readingMode === 'theater' && block.type === 'DIALOGUE',

    // Novel mode: justify narration
    'text-justify hyphens-auto': readingMode === 'novel' && block.type === 'NARRATION',

    // Compact mode: reduce spacing
    'my-1 leading-snug': readingMode === 'compact' && (block.type === 'DIALOGUE' || block.type === 'NARRATION'),
    'ml-4 pl-2': readingMode === 'compact' && block.type === 'DIALOGUE',
  });

  // For section dividers, render an HR
  if (block.type === 'SECTION_DIVIDER') {
    return (
      <hr
        ref={blockRef as React.RefObject<HTMLHRElement>}
        className={cn(typeConfig.className, stateClasses)}
        aria-hidden="true"
      />
    );
  }

  // Accessibility: Add semantic ARIA labels
  const ariaLabel = useMemo(() => {
    switch (block.type) {
      case 'BOOK_TITLE':
        return `Book title: ${textToRender}`;
      case 'AUTHOR':
        return `Author: ${textToRender}`;
      case 'ACT_HEADER':
        return `Act ${block.metadata?.actNumber || ''}: ${textToRender}`;
      case 'SCENE_HEADER':
        return `Scene ${block.metadata?.sceneNumber || ''}: ${textToRender}`;
      case 'CHARACTER_NAME':
        return `Character: ${block.metadata?.characterName || textToRender}`;
      case 'STAGE_DIRECTION':
        return `Stage direction: ${textToRender}`;
      case 'SETTING_DESCRIPTION':
        return `Setting: ${textToRender}`;
      case 'TIME_MARKER':
        return `Time: ${textToRender}`;
      default:
        return undefined;
    }
  }, [block.type, textToRender, block.metadata]);

  return (
    <Element
      ref={blockRef as any}
      className={cn(
        'book-content-block',
        typeConfig.className,
        typeConfig.maxWidth,
        stateClasses,
        currentBlockClasses,
        readingModeClasses,
        'transition-all duration-200 ease-out'
      )}
      aria-label={ariaLabel}
      data-block-type={block.type}
      data-block-state={blockState}
    >
      {highlightedChars}
    </Element>
  );
}

/**
 * Enhanced version with full typing comparison
 * Compares actual user input against expected text for character-level feedback
 */
interface EnhancedBlockProps extends BookContentBlockProps {
  userInput: string; // Full user input string
}

export function BookContentBlockEnhanced({
  block,
  userProgress,
  blockStartOffset,
  isActive,
  readingMode = 'theater',
  userInput,
  useDisplayText = true,
  focusMode = false,
  autoScroll = true,
  onBecomeCurrent,
}: EnhancedBlockProps) {
  const blockRef = useRef<HTMLElement>(null);
  const typeConfig = getTypeStyle(block.type);
  const Element = typeConfig.element as keyof JSX.IntrinsicElements;
  const textToRender = useDisplayText ? block.displayText : block.text;
  const blockState = getBlockState(userProgress, blockStartOffset, textToRender.length);
  const prevStateRef = useRef(blockState);

  // Auto-scroll current block into view
  useEffect(() => {
    if (blockState === 'current' && autoScroll && blockRef.current) {
      blockRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
    
    if (blockState === 'current' && prevStateRef.current !== 'current' && onBecomeCurrent) {
      onBecomeCurrent();
    }
    
    prevStateRef.current = blockState;
  }, [blockState, autoScroll, onBecomeCurrent]);

  // Enhanced highlighting with error detection
  const highlightedChars = useMemo(() => {
    const result: React.ReactNode[] = [];
    const isCurrent = blockState === 'current';

    for (let i = 0; i < textToRender.length; i++) {
      const charGlobalPosition = blockStartOffset + i;
      const expectedChar = textToRender[i];
      let className = CHARACTER_STYLES.pending;
      let displayChar: React.ReactNode = expectedChar;
      const isAtCursor = isCurrent && charGlobalPosition === userProgress;

      if (charGlobalPosition < userProgress) {
        const actualChar = userInput[charGlobalPosition];

        if (actualChar === expectedChar) {
          className = CHARACTER_STYLES.correct;
        } else {
          // Show both expected (crossed out) and typed (highlighted)
          displayChar = (
            <span className="relative inline">
              <span className={CHARACTER_STYLES.incorrect}>{expectedChar}</span>
              <span className={CHARACTER_STYLES.actualTyped}>{actualChar || '·'}</span>
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
            isAtCursor && 'relative after:absolute after:left-0 after:top-0 after:h-full after:w-[2px] after:bg-primary after:animate-pulse'
          )}
        >
          {displayChar}
        </span>
      );
    }

    return result;
  }, [textToRender, userProgress, blockStartOffset, userInput, blockState]);

  // State-based classes
  const stateClasses = useMemo(() => {
    if (!isActive) return '';
    const baseStyles = focusMode ? FOCUS_MODE_STYLES : TYPING_STATE_STYLES;
    return baseStyles[blockState as keyof typeof baseStyles] || '';
  }, [blockState, isActive, focusMode]);

  // Current block highlight
  const currentBlockClasses = cn({
    'ring-2 ring-primary/30 shadow-lg': blockState === 'current' && isActive && 
      !['BOOK_TITLE', 'ACT_HEADER', 'SECTION_DIVIDER'].includes(block.type),
    'bg-primary/5 rounded-lg px-4 py-3 -mx-2': blockState === 'current' && isActive && 
      !['BOOK_TITLE', 'ACT_HEADER', 'SECTION_DIVIDER'].includes(block.type),
  });

  const readingModeClasses = cn({
    'font-extrabold tracking-widest text-primary': readingMode === 'theater' && block.type === 'CHARACTER_NAME',
    'ml-8 pl-4 border-l-2 border-primary/30': readingMode === 'theater' && block.type === 'DIALOGUE',
    'text-justify hyphens-auto': readingMode === 'novel' && block.type === 'NARRATION',
    'my-1 leading-snug': readingMode === 'compact' && (block.type === 'DIALOGUE' || block.type === 'NARRATION'),
    'ml-4 pl-2': readingMode === 'compact' && block.type === 'DIALOGUE',
  });

  if (block.type === 'SECTION_DIVIDER') {
    return (
      <hr
        ref={blockRef as React.RefObject<HTMLHRElement>}
        className={cn(typeConfig.className, stateClasses)}
        aria-hidden="true"
      />
    );
  }

  const ariaLabel = useMemo(() => {
    switch (block.type) {
      case 'BOOK_TITLE':
        return `Book title: ${textToRender}`;
      case 'AUTHOR':
        return `Author: ${textToRender}`;
      case 'ACT_HEADER':
        return `Act ${block.metadata?.actNumber || ''}: ${textToRender}`;
      case 'SCENE_HEADER':
        return `Scene ${block.metadata?.sceneNumber || ''}: ${textToRender}`;
      case 'CHARACTER_NAME':
        return `Character: ${block.metadata?.characterName || textToRender}`;
      case 'STAGE_DIRECTION':
        return `Stage direction: ${textToRender}`;
      case 'SETTING_DESCRIPTION':
        return `Setting: ${textToRender}`;
      case 'TIME_MARKER':
        return `Time: ${textToRender}`;
      default:
        return undefined;
    }
  }, [block.type, textToRender, block.metadata]);

  return (
    <Element
      ref={blockRef as any}
      className={cn(
        'book-content-block',
        typeConfig.className,
        typeConfig.maxWidth,
        stateClasses,
        currentBlockClasses,
        readingModeClasses,
        'transition-all duration-200 ease-out'
      )}
      aria-label={ariaLabel}
      data-block-type={block.type}
      data-block-state={blockState}
    >
      {highlightedChars}
    </Element>
  );
}
