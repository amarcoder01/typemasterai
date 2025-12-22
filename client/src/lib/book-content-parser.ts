/**
 * Book Content Parser
 * 
 * Parses raw book text into semantic content blocks for proper visual hierarchy.
 * Detects: titles, authors, acts, scenes, stage directions, character names, dialogue, narration.
 * 
 * Enhanced for production with:
 * - Multiline stage direction handling
 * - Inline dialogue detection within paragraphs
 * - Paragraph-level content type detection
 * - Raw formatting marker cleanup (_[...]_, etc.)
 * 
 * Based on research:
 * - TypeLit.io, Typersguild, Entertrained use flat text (no semantic parsing)
 * - We differentiate by handling theatrical plays, literature with proper structure
 */

export type ContentType =
  | 'BOOK_TITLE'
  | 'AUTHOR'
  | 'ACT_HEADER'
  | 'SCENE_HEADER'
  | 'STAGE_DIRECTION'
  | 'CHARACTER_LIST_HEADER'
  | 'CHARACTER_ENTRY'
  | 'CHARACTER_NAME'
  | 'DIALOGUE'
  | 'NARRATION'
  | 'SECTION_DIVIDER'
  | 'SETTING_DESCRIPTION'
  | 'TIME_MARKER';

export interface ParsedContent {
  type: ContentType;
  text: string;
  /** Clean display text with formatting markers removed */
  displayText: string;
  metadata?: {
    characterName?: string;
    actNumber?: number;
    sceneNumber?: number;
    isDialogue?: boolean;
    isInline?: boolean;
    speakerName?: string;
  };
}

// Pattern detection rules for content classification
const PATTERNS = {
  // Act headers: "ACT I", "ACT II", "ACT III", etc.
  actHeader: /^ACT\s+[IVXLCDM]+\.?$/i,
  
  // Scene headers: "SCENE I", "_[SCENE.—A room...]", "[SCENE: ...]"
  sceneHeader: /^\[?_?\[?SCENE[\.:\s—-]/i,
  
  // Stage directions: text in brackets or starting with underscore-bracket
  // Enhanced to detect multiline and inline variations
  stageDirection: /^\[.*\]$|^_\[.*\]_?$|^_.*_$/,
  
  // Inline stage directions within text: [text in brackets]
  inlineStageDirection: /\[([^\]]+)\]/g,
  
  // Inline dialogue with speaker: CHARACTER. "dialogue" or CHARACTER: dialogue
  inlineDialogue: /^([A-Z][A-Z\s'-]+)[.:][\s]*(.+)$/,
  
  // Character list headers
  characterListHeader: /^(DRAMATIS PERSONAE|CHARACTERS|PERSONS OF THE PLAY|CAST OF CHARACTERS)$/i,
  
  // Character names: ALL CAPS line (2+ words), possibly ending with period
  characterName: /^[A-Z][A-Z\s'-]+\.?$/,
  
  // Author line: starts with "by "
  author: /^by\s+/i,
  
  // Chapter/section dividers
  sectionDivider: /^(CHAPTER|PART|BOOK|VOLUME)\s+[IVXLCDM0-9]+/i,
  
  // Time markers: "Morning.", "The next day.", "Three years later."
  timeMarker: /^(Morning|Evening|Night|Noon|The next|Later|Three|Two|One|After|Before|The following|Next)\b/i,
  
  // Setting descriptions: start with "A room", "The scene is", etc.
  settingDescription: /^(A |The |In |At |An |Inside |Outside |Within )/i,
  
  // Underscore-wrapped text (italic markers): _text_
  underscoreWrap: /^_(.+)_$/,
  
  // Bracketed content (stage directions/setting)
  bracketedContent: /^\[(.+)\]$/,
};

/**
 * Clean raw text by removing formatting markers while preserving content
 * Handles: _[text]_, _text_, [text], etc.
 */
export function cleanDisplayText(text: string): string {
  let cleaned = text;
  
  // Remove leading/trailing underscores around brackets: _[text]_ -> [text]
  cleaned = cleaned.replace(/^_\[(.+)\]_?$/, '[$1]');
  
  // Remove standalone underscore wrapping: _text_ -> text
  cleaned = cleaned.replace(/^_(.+)_$/, '$1');
  
  // Clean up double underscores
  cleaned = cleaned.replace(/__/g, '');
  
  // Remove trailing underscore if present
  cleaned = cleaned.replace(/_$/, '');
  
  // Remove leading underscore if present
  cleaned = cleaned.replace(/^_/, '');
  
  return cleaned.trim();
}

/**
 * Detect if text contains inline stage directions
 */
export function hasInlineStageDirections(text: string): boolean {
  return PATTERNS.inlineStageDirection.test(text);
}

/**
 * Extract inline stage directions from text
 */
export function extractInlineStageDirections(text: string): { text: string; directions: string[] } {
  const directions: string[] = [];
  const cleanedText = text.replace(PATTERNS.inlineStageDirection, (match, content) => {
    directions.push(content);
    return ''; // Remove from main text
  }).trim();
  
  return { text: cleanedText, directions };
}

/**
 * Detect paragraph-level content type for chunked paragraphs
 * Used when processing database paragraphs that may span multiple content types
 */
export function detectParagraphType(text: string): ContentType {
  const trimmed = text.trim();
  const firstLine = trimmed.split('\n')[0]?.trim() || '';
  
  // Check for act headers
  if (PATTERNS.actHeader.test(firstLine)) {
    return 'ACT_HEADER';
  }
  
  // Check for scene headers
  if (PATTERNS.sceneHeader.test(firstLine)) {
    return 'SCENE_HEADER';
  }
  
  // Check for stage directions (entire paragraph is a stage direction)
  if (PATTERNS.stageDirection.test(trimmed) || PATTERNS.underscoreWrap.test(trimmed)) {
    return 'STAGE_DIRECTION';
  }
  
  // Check for setting descriptions
  if (PATTERNS.settingDescription.test(firstLine) && trimmed.length < 500) {
    return 'SETTING_DESCRIPTION';
  }
  
  // Check for character list header
  if (PATTERNS.characterListHeader.test(firstLine)) {
    return 'CHARACTER_LIST_HEADER';
  }
  
  // Check for inline dialogue format: CHARACTER. dialogue or CHARACTER: dialogue
  if (PATTERNS.inlineDialogue.test(firstLine)) {
    return 'DIALOGUE';
  }
  
  // Check for standalone character name (short, all caps)
  if (PATTERNS.characterName.test(firstLine) && firstLine.length <= 40) {
    return 'CHARACTER_NAME';
  }
  
  // Check for time marker
  if (PATTERNS.timeMarker.test(firstLine) && trimmed.length < 100) {
    return 'TIME_MARKER';
  }
  
  // Default to narration
  return 'NARRATION';
}

/**
 * Parse book text into structured content blocks
 * @param rawText - Raw book text (can include \n\n paragraph breaks)
 * @returns Array of parsed content blocks with clean display text
 */
export function parseBookContent(rawText: string): ParsedContent[] {
  if (!rawText || rawText.trim().length === 0) {
    return [];
  }

  const blocks: ParsedContent[] = [];
  const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let isFirstNonEmptyLine = true;
  let inCharacterList = false;
  let lastWasCharacterName = false;
  let lastCharacterName = '';
  let actCounter = 0;
  let sceneCounter = 0;
  let multilineStageDirection: string[] = [];
  let inMultilineStageDirection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : null;
    
    // Skip empty lines
    if (line.length === 0) continue;

    // Handle multiline stage directions (text that starts with [ but doesn't end with ])
    if (inMultilineStageDirection) {
      multilineStageDirection.push(line);
      if (line.endsWith(']') || line.endsWith(']_')) {
        // End of multiline stage direction
        const fullText = multilineStageDirection.join(' ');
        blocks.push({
          type: 'STAGE_DIRECTION',
          text: fullText,
          displayText: cleanDisplayText(fullText),
        });
        multilineStageDirection = [];
        inMultilineStageDirection = false;
      }
      continue;
    }

    // Check for start of multiline stage direction
    if ((line.startsWith('[') || line.startsWith('_[')) && !line.endsWith(']') && !line.endsWith(']_')) {
      inMultilineStageDirection = true;
      multilineStageDirection = [line];
      continue;
    }

    let type: ContentType;
    let metadata: ParsedContent['metadata'] = {};

    // 1. First non-empty line is likely the book title
    if (isFirstNonEmptyLine && !PATTERNS.author.test(line)) {
      type = 'BOOK_TITLE';
      isFirstNonEmptyLine = false;
    }
    // 2. Author line (starts with "by ")
    else if (PATTERNS.author.test(line)) {
      type = 'AUTHOR';
      isFirstNonEmptyLine = false;
    }
    // 3. Act header (ACT I, ACT II, etc.)
    else if (PATTERNS.actHeader.test(line)) {
      type = 'ACT_HEADER';
      actCounter++;
      sceneCounter = 0; // Reset scene counter for new act
      metadata.actNumber = actCounter;
      inCharacterList = false;
      lastWasCharacterName = false;
    }
    // 4. Scene header (includes setting descriptions starting with SCENE)
    else if (PATTERNS.sceneHeader.test(line)) {
      // Check if this is a scene with setting description
      if (line.length > 50) {
        type = 'SETTING_DESCRIPTION';
      } else {
        type = 'SCENE_HEADER';
        sceneCounter++;
        metadata.sceneNumber = sceneCounter;
      }
      inCharacterList = false;
      lastWasCharacterName = false;
    }
    // 5. Character list header
    else if (PATTERNS.characterListHeader.test(line)) {
      type = 'CHARACTER_LIST_HEADER';
      inCharacterList = true;
      lastWasCharacterName = false;
    }
    // 6. Stage direction (text in brackets or underscore-wrapped)
    else if (PATTERNS.stageDirection.test(line) || PATTERNS.underscoreWrap.test(line) || PATTERNS.bracketedContent.test(line)) {
      type = 'STAGE_DIRECTION';
      lastWasCharacterName = false;
    }
    // 7. Inline dialogue format: CHARACTER. dialogue or CHARACTER: dialogue
    else if (PATTERNS.inlineDialogue.test(line)) {
      const match = line.match(PATTERNS.inlineDialogue);
      if (match) {
        // First add the character name as its own block
        const charName = match[1].trim();
        blocks.push({
          type: 'CHARACTER_NAME',
          text: charName,
          displayText: charName,
          metadata: { characterName: charName.replace(/\.$/, '') },
        });
        // Then add the dialogue
        type = 'DIALOGUE';
        metadata.isDialogue = true;
        metadata.speakerName = charName.replace(/\.$/, '');
        // Update line to just the dialogue part for the block we're about to add
        const dialoguePart = match[2].trim();
        blocks.push({
          type,
          text: dialoguePart,
          displayText: cleanDisplayText(dialoguePart),
          metadata,
        });
        continue; // Skip the normal block push at the end
      }
      type = 'DIALOGUE';
    }
    // 8. Character entry (when in character list)
    else if (inCharacterList && line.length > 0) {
      // Check if this might be the end of character list
      // Character list ends when we hit normal prose or a scene header
      if (line.length > 100 || (!PATTERNS.characterName.test(line) && line.split(' ').length > 10)) {
        inCharacterList = false;
        type = 'NARRATION';
      } else {
        type = 'CHARACTER_ENTRY';
      }
    }
    // 9. Character name (all caps, followed by dialogue)
    else if (PATTERNS.characterName.test(line) && line.length >= 2 && line.length <= 40) {
      // Check if next line exists and looks like dialogue (not another character name)
      if (nextLine && !PATTERNS.characterName.test(nextLine) && !PATTERNS.actHeader.test(nextLine)) {
        type = 'CHARACTER_NAME';
        lastCharacterName = line.replace(/\.$/, ''); // Remove trailing period
        metadata.characterName = lastCharacterName;
        lastWasCharacterName = true;
      } else {
        // Might be a short narration line in all caps
        type = 'NARRATION';
        lastWasCharacterName = false;
      }
    }
    // 10. Dialogue (follows a character name)
    else if (lastWasCharacterName) {
      type = 'DIALOGUE';
      metadata.isDialogue = true;
      metadata.speakerName = lastCharacterName;
      // Keep lastWasCharacterName true to handle multi-line dialogue
      // Reset it when we hit a new character name or other element
    }
    // 11. Section divider (Chapter/Part markers)
    else if (PATTERNS.sectionDivider.test(line)) {
      type = 'SECTION_DIVIDER';
      lastWasCharacterName = false;
    }
    // 12. Time markers
    else if (PATTERNS.timeMarker.test(line) && line.length < 100) {
      type = 'TIME_MARKER';
      lastWasCharacterName = false;
    }
    // 13. Default: narration
    else {
      type = 'NARRATION';
      lastWasCharacterName = false;
      inCharacterList = false;
    }

    // Reset character name flag for non-dialogue
    if (type !== 'DIALOGUE' && type !== 'CHARACTER_NAME') {
      lastWasCharacterName = false;
    }

    blocks.push({
      type,
      text: line,
      displayText: cleanDisplayText(line),
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });
  }

  // Handle any remaining multiline stage direction
  if (multilineStageDirection.length > 0) {
    const fullText = multilineStageDirection.join(' ');
    blocks.push({
      type: 'STAGE_DIRECTION',
      text: fullText,
      displayText: cleanDisplayText(fullText),
    });
  }

  return blocks;
}

/**
 * Parse a single paragraph with inline content detection
 * Useful for handling database paragraphs that may contain mixed content
 */
export function parseWithInlineDetection(text: string): ParsedContent[] {
  const blocks: ParsedContent[] = [];
  const paragraphType = detectParagraphType(text);
  
  // If it's a simple type, return as single block
  if (paragraphType === 'ACT_HEADER' || paragraphType === 'SCENE_HEADER' || 
      paragraphType === 'STAGE_DIRECTION' || paragraphType === 'CHARACTER_LIST_HEADER') {
    blocks.push({
      type: paragraphType,
      text,
      displayText: cleanDisplayText(text),
    });
    return blocks;
  }
  
  // For narration/dialogue, check for inline stage directions
  if (hasInlineStageDirections(text)) {
    // Split text around inline stage directions
    const parts = text.split(PATTERNS.inlineStageDirection);
    const matches = text.match(PATTERNS.inlineStageDirection) || [];
    
    let matchIndex = 0;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (part) {
        blocks.push({
          type: paragraphType,
          text: part,
          displayText: cleanDisplayText(part),
        });
      }
      // Add the inline stage direction if there is one
      if (matchIndex < matches.length) {
        const direction = matches[matchIndex].replace(/^\[|\]$/g, '');
        blocks.push({
          type: 'STAGE_DIRECTION',
          text: matches[matchIndex],
          displayText: direction,
          metadata: { isInline: true },
        });
        matchIndex++;
      }
    }
    return blocks;
  }
  
  // Default: return as the detected type
  blocks.push({
    type: paragraphType,
    text,
    displayText: cleanDisplayText(text),
  });
  
  return blocks;
}

/**
 * Calculate the character offset (position) of a given block in the original text
 * Used for highlighting during typing
 * @param useDisplayText - If true, use displayText for offset calculation
 */
export function getBlockOffset(blocks: ParsedContent[], blockIndex: number, useDisplayText = false): number {
  if (blockIndex < 0 || blockIndex >= blocks.length) return 0;
  
  let offset = 0;
  for (let i = 0; i < blockIndex; i++) {
    // Add text length + newline (blocks are separated by newlines when joined)
    const textLength = useDisplayText ? blocks[i].displayText.length : blocks[i].text.length;
    offset += textLength + 1;
  }
  
  return offset;
}

/**
 * Join parsed blocks back into plain text for typing comparison
 * @param useDisplayText - If true, use cleaned displayText instead of raw text
 */
export function joinBlocksToText(blocks: ParsedContent[], useDisplayText = true): string {
  return blocks.map(block => useDisplayText ? block.displayText : block.text).join('\n');
}

/**
 * Get normalized text for typing comparison
 * This replaces newlines with spaces for flat typing experience
 */
export function getNormalizedTypingText(blocks: ParsedContent[]): string {
  return blocks.map(block => block.displayText).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Helper: Check if a block is a structural element (not typing content)
 * Used to filter out non-typing elements if needed
 */
export function isStructuralBlock(type: ContentType): boolean {
  return type === 'SECTION_DIVIDER';
}

/**
 * Helper: Check if a block should be visually de-emphasized
 */
export function isSecondaryContent(type: ContentType): boolean {
  return type === 'STAGE_DIRECTION' || type === 'CHARACTER_ENTRY' || type === 'TIME_MARKER';
}

/**
 * Helper: Check if a block is a header/title type
 */
export function isHeaderContent(type: ContentType): boolean {
  return type === 'BOOK_TITLE' || type === 'AUTHOR' || type === 'ACT_HEADER' || 
         type === 'SCENE_HEADER' || type === 'CHARACTER_LIST_HEADER' || type === 'SECTION_DIVIDER';
}

/**
 * Helper: Check if a block is dialogue-related
 */
export function isDialogueContent(type: ContentType): boolean {
  return type === 'CHARACTER_NAME' || type === 'DIALOGUE';
}

/**
 * Get the visual priority of a content type (higher = more prominent)
 */
export function getContentPriority(type: ContentType): number {
  const priorities: Record<ContentType, number> = {
    BOOK_TITLE: 100,
    ACT_HEADER: 90,
    SCENE_HEADER: 80,
    SECTION_DIVIDER: 75,
    SETTING_DESCRIPTION: 70,
    CHARACTER_LIST_HEADER: 65,
    TIME_MARKER: 60,
    AUTHOR: 55,
    CHARACTER_NAME: 50,
    CHARACTER_ENTRY: 45,
    DIALOGUE: 40,
    STAGE_DIRECTION: 30,
    NARRATION: 20,
  };
  return priorities[type] || 0;
}

/**
 * Find the current block based on character position
 */
export function findCurrentBlock(blocks: ParsedContent[], charPosition: number, useDisplayText = true): number {
  let offset = 0;
  for (let i = 0; i < blocks.length; i++) {
    const textLength = useDisplayText ? blocks[i].displayText.length : blocks[i].text.length;
    if (charPosition <= offset + textLength) {
      return i;
    }
    offset += textLength + 1; // +1 for separator
  }
  return blocks.length - 1;
}

/**
 * Get block state based on typing progress
 */
export function getBlockState(
  blocks: ParsedContent[],
  blockIndex: number,
  charPosition: number,
  useDisplayText = true
): 'completed' | 'current' | 'upcoming' {
  const blockStart = getBlockOffset(blocks, blockIndex, useDisplayText);
  const textLength = useDisplayText ? blocks[blockIndex].displayText.length : blocks[blockIndex].text.length;
  const blockEnd = blockStart + textLength;
  
  if (charPosition >= blockEnd) {
    return 'completed';
  } else if (charPosition >= blockStart) {
    return 'current';
  }
  return 'upcoming';
}
