/**
 * Book Segment Splitter
 * 
 * Smart sub-chunking of book content into comfortable typing segments.
 * Splits at natural break points:
 * - After stage directions
 * - After complete dialogue exchanges
 * - At significant punctuation (semicolons, em-dashes)
 * - At sentence boundaries when approaching max words
 * 
 * This ensures users never face overwhelming walls of text.
 */

import type { ParsedContent, ContentType } from './book-content-parser';

export interface TypingSegment {
  /** Unique ID for the segment */
  id: string;
  
  /** Content blocks in this segment */
  blocks: ParsedContent[];
  
  /** Combined text for typing (uses displayText) */
  text: string;
  
  /** Word count in this segment */
  wordCount: number;
  
  /** Character count */
  charCount: number;
  
  /** Starting character offset in full content */
  startOffset: number;
  
  /** Ending character offset */
  endOffset: number;
  
  /** Index of this segment */
  index: number;
  
  /** Total number of segments */
  totalSegments: number;
  
  /** Primary content type for styling hints */
  primaryType: ContentType;
  
  /** Whether this segment contains dialogue */
  hasDialogue: boolean;
  
  /** Whether this segment contains stage directions */
  hasStageDirections: boolean;
}

/**
 * Configuration for segment splitting
 */
export interface SplitConfig {
  /** Maximum words per segment (default: 80) */
  maxWords?: number;
  
  /** Minimum words per segment (default: 30) */
  minWords?: number;
  
  /** Target words per segment (default: 60) */
  targetWords?: number;
  
  /** Keep stage directions with preceding content */
  groupStageDirections?: boolean;
  
  /** Keep character name with dialogue */
  groupDialogue?: boolean;
}

const DEFAULT_CONFIG: Required<SplitConfig> = {
  maxWords: 80,
  minWords: 30,
  targetWords: 60,
  groupStageDirections: true,
  groupDialogue: true,
};

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Get the primary content type for a set of blocks
 * Returns the most "important" type for styling purposes
 */
function getPrimaryType(blocks: ParsedContent[]): ContentType {
  const priorities: Partial<Record<ContentType, number>> = {
    ACT_HEADER: 100,
    SCENE_HEADER: 90,
    BOOK_TITLE: 85,
    SETTING_DESCRIPTION: 80,
    CHARACTER_LIST_HEADER: 75,
    DIALOGUE: 60,
    CHARACTER_NAME: 55,
    STAGE_DIRECTION: 50,
    NARRATION: 40,
  };
  
  let bestType: ContentType = 'NARRATION';
  let bestPriority = 0;
  
  for (const block of blocks) {
    const priority = priorities[block.type] || 0;
    if (priority > bestPriority) {
      bestPriority = priority;
      bestType = block.type;
    }
  }
  
  return bestType;
}

/**
 * Check if block type should start a new segment
 */
function isSegmentBreaker(type: ContentType): boolean {
  return type === 'ACT_HEADER' || 
         type === 'SCENE_HEADER' || 
         type === 'SECTION_DIVIDER' ||
         type === 'CHARACTER_LIST_HEADER';
}

/**
 * Check if block should be kept with the next block
 */
function shouldGroupWithNext(block: ParsedContent, nextBlock: ParsedContent | undefined, config: Required<SplitConfig>): boolean {
  if (!nextBlock) return false;
  
  // Keep character names with their dialogue
  if (config.groupDialogue && block.type === 'CHARACTER_NAME' && nextBlock.type === 'DIALOGUE') {
    return true;
  }
  
  return false;
}

/**
 * Check if block should be kept with the previous block
 */
function shouldGroupWithPrevious(block: ParsedContent, prevBlock: ParsedContent | undefined, config: Required<SplitConfig>): boolean {
  if (!prevBlock) return false;
  
  // Keep stage directions with preceding dialogue or narration
  if (config.groupStageDirections && block.type === 'STAGE_DIRECTION') {
    if (prevBlock.type === 'DIALOGUE' || prevBlock.type === 'NARRATION') {
      return true;
    }
  }
  
  return false;
}

/**
 * Split a single long block at sentence boundaries
 */
function splitLongBlock(block: ParsedContent, maxWords: number): ParsedContent[] {
  const text = block.displayText;
  const words = countWords(text);
  
  if (words <= maxWords) {
    return [block];
  }
  
  // Split at sentence boundaries
  const sentences = text.split(/(?<=[.!?])\s+/);
  const result: ParsedContent[] = [];
  let currentText = '';
  let currentWordCount = 0;
  
  for (const sentence of sentences) {
    const sentenceWords = countWords(sentence);
    
    if (currentWordCount + sentenceWords > maxWords && currentText.length > 0) {
      // Flush current
      result.push({
        ...block,
        text: currentText.trim(),
        displayText: currentText.trim(),
      });
      currentText = sentence;
      currentWordCount = sentenceWords;
    } else {
      currentText += (currentText ? ' ' : '') + sentence;
      currentWordCount += sentenceWords;
    }
  }
  
  // Flush remaining
  if (currentText.length > 0) {
    result.push({
      ...block,
      text: currentText.trim(),
      displayText: currentText.trim(),
    });
  }
  
  return result;
}

/**
 * Split parsed content blocks into typing segments
 * 
 * @param blocks - Array of parsed content blocks
 * @param config - Splitting configuration
 * @returns Array of typing segments
 */
export function splitIntoTypingSegments(
  blocks: ParsedContent[],
  config: Partial<SplitConfig> = {}
): TypingSegment[] {
  const cfg: Required<SplitConfig> = { ...DEFAULT_CONFIG, ...config };
  const segments: TypingSegment[] = [];
  
  if (blocks.length === 0) {
    return segments;
  }
  
  // Pre-process: split any blocks that are too long
  const processedBlocks: ParsedContent[] = [];
  for (const block of blocks) {
    const splitBlocks = splitLongBlock(block, cfg.maxWords);
    processedBlocks.push(...splitBlocks);
  }
  
  let currentBlocks: ParsedContent[] = [];
  let currentWordCount = 0;
  let currentCharCount = 0;
  let currentOffset = 0;
  
  const flushSegment = () => {
    if (currentBlocks.length === 0) return;
    
    const text = currentBlocks.map(b => b.displayText).join(' ');
    
    segments.push({
      id: `segment-${segments.length}`,
      blocks: [...currentBlocks],
      text,
      wordCount: currentWordCount,
      charCount: text.length,
      startOffset: currentOffset - currentCharCount,
      endOffset: currentOffset,
      index: segments.length,
      totalSegments: 0, // Will be updated at the end
      primaryType: getPrimaryType(currentBlocks),
      hasDialogue: currentBlocks.some(b => b.type === 'DIALOGUE'),
      hasStageDirections: currentBlocks.some(b => b.type === 'STAGE_DIRECTION'),
    });
    
    currentBlocks = [];
    currentWordCount = 0;
    currentCharCount = 0;
  };
  
  for (let i = 0; i < processedBlocks.length; i++) {
    const block = processedBlocks[i];
    const nextBlock = processedBlocks[i + 1];
    const prevBlock = processedBlocks[i - 1];
    
    const blockWords = countWords(block.displayText);
    const blockChars = block.displayText.length + 1; // +1 for separator
    
    // Check if this block forces a new segment
    if (isSegmentBreaker(block.type) && currentBlocks.length > 0) {
      flushSegment();
    }
    
    // Check if adding this block would exceed max
    if (currentWordCount + blockWords > cfg.maxWords && currentBlocks.length > 0) {
      // Check if we should still group
      if (!shouldGroupWithPrevious(block, prevBlock, cfg)) {
        flushSegment();
      }
    }
    
    // Add block to current segment
    currentBlocks.push(block);
    currentWordCount += blockWords;
    currentCharCount += blockChars;
    currentOffset += blockChars;
    
    // Check if we've reached target and can break
    if (currentWordCount >= cfg.targetWords && !shouldGroupWithNext(block, nextBlock, cfg)) {
      // Check if next block is a segment breaker
      if (nextBlock && isSegmentBreaker(nextBlock.type)) {
        flushSegment();
      } else if (currentWordCount >= cfg.maxWords) {
        flushSegment();
      }
    }
  }
  
  // Flush any remaining blocks
  flushSegment();
  
  // Update total segments count
  const totalSegments = segments.length;
  for (const segment of segments) {
    segment.totalSegments = totalSegments;
  }
  
  return segments;
}

/**
 * Get segment containing a specific character position
 */
export function findSegmentAtPosition(segments: TypingSegment[], charPosition: number): TypingSegment | null {
  for (const segment of segments) {
    if (charPosition >= segment.startOffset && charPosition < segment.endOffset) {
      return segment;
    }
  }
  return segments[segments.length - 1] || null;
}

/**
 * Calculate overall progress across segments
 */
export function calculateSegmentProgress(
  segments: TypingSegment[],
  currentSegmentIndex: number,
  currentSegmentProgress: number // 0-100
): number {
  if (segments.length === 0) return 0;
  
  const totalChars = segments.reduce((sum, s) => sum + s.charCount, 0);
  if (totalChars === 0) return 0;
  
  // Characters completed in previous segments
  let completedChars = 0;
  for (let i = 0; i < currentSegmentIndex && i < segments.length; i++) {
    completedChars += segments[i].charCount;
  }
  
  // Chars in current segment
  const currentSegment = segments[currentSegmentIndex];
  if (currentSegment) {
    completedChars += (currentSegment.charCount * currentSegmentProgress) / 100;
  }
  
  return (completedChars / totalChars) * 100;
}

/**
 * Get navigation info for segment controls
 */
export function getSegmentNavigation(segments: TypingSegment[], currentIndex: number) {
  return {
    current: segments[currentIndex] || null,
    previous: currentIndex > 0 ? segments[currentIndex - 1] : null,
    next: currentIndex < segments.length - 1 ? segments[currentIndex + 1] : null,
    hasPrevious: currentIndex > 0,
    hasNext: currentIndex < segments.length - 1,
    isFirst: currentIndex === 0,
    isLast: currentIndex === segments.length - 1,
    position: `${currentIndex + 1} of ${segments.length}`,
  };
}

/**
 * Estimate reading/typing time for a segment
 * Based on average typing speed of 40 WPM for focused reading
 */
export function estimateSegmentTime(segment: TypingSegment, wpm: number = 40): number {
  return Math.ceil((segment.wordCount / wpm) * 60); // seconds
}

/**
 * Format time estimate as human-readable string
 */
export function formatTimeEstimate(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}
