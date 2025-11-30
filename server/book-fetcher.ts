// Book Fetcher Service for downloading and processing public-domain books from Gutendex API
import type { InsertBook } from '@shared/schema';

export interface GutendexBook {
  id: number;
  title: string;
  authors: Array<{ name: string }>;
  subjects: string[];
  bookshelves: string[];
  formats: Record<string, string>;
}

export interface ChapterInfo {
  chapterNumber: number;
  startIndex: number;
  title?: string;
}

export interface ProcessedParagraph {
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  durationMode: number;
  lengthWords: number;
  source: string;
  bookId: number;
  paragraphIndex: number;
  language: string;
  chapter?: number;
  sectionIndex?: number;
  chapterTitle?: string;
}

interface GutendexResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutendexBook[];
}

// Topic mapping from Gutendex subjects/bookshelves to simplified categories
const TOPIC_MAPPING: Record<string, string> = {
  // Fiction categories
  'fiction': 'fiction',
  'science fiction': 'science-fiction',
  'fantasy': 'fantasy',
  'adventure': 'adventure',
  'mystery': 'mystery',
  'detective': 'mystery',
  'thriller': 'thriller',
  'horror': 'horror',
  'romance': 'romance',
  'historical fiction': 'historical-fiction',
  'western': 'western',
  
  // Classics and literature
  'classics': 'classics',
  'literature': 'classics',
  'poetry': 'poetry',
  'drama': 'drama',
  'plays': 'drama',
  'shakespeare': 'classics',
  
  // Non-fiction categories
  'history': 'history',
  'biography': 'biography',
  'autobiography': 'biography',
  'philosophy': 'philosophy',
  'psychology': 'psychology',
  'science': 'science',
  'nature': 'nature',
  'travel': 'travel',
  'religion': 'religion',
  'education': 'education',
  'politics': 'politics',
  'economics': 'economics',
  'sociology': 'sociology',
  
  // Children's and young adult
  'children': 'children',
  'juvenile': 'children',
  'young adult': 'young-adult',
  
  // Other
  'humor': 'humor',
  'satire': 'humor',
  'short stories': 'short-stories',
  'essays': 'essays',
  'reference': 'reference',
};

/**
 * Fetch books from Gutendex API with pagination
 * @param limit Number of books to fetch (default: 96, which is 3 pages)
 * @returns Array of GutendexBook objects
 */
export async function fetchBooksFromGutendex(limit: number = 96): Promise<GutendexBook[]> {
  const books: GutendexBook[] = [];
  const baseUrl = 'https://gutendex.com/books?languages=en&copyright=false&mime_type=text/plain';
  let currentUrl: string | null = baseUrl;
  
  console.log(`Fetching up to ${limit} books from Gutendex API...`);
  
  while (currentUrl && books.length < limit) {
    try {
      console.log(`Fetching page: ${currentUrl}`);
      const response = await fetch(currentUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: GutendexResponse = await response.json();
      
      // Filter books that have text/plain format (check all variants)
      const validBooks = data.results.filter(book => {
        return book.formats['text/plain; charset=utf-8'] || 
               book.formats['text/plain; charset=us-ascii'] || 
               book.formats['text/plain'];
      });
      books.push(...validBooks);
      
      console.log(`Fetched ${validBooks.length} valid books (total: ${books.length}/${limit})`);
      
      // Get next page URL
      currentUrl = data.next;
      
      // Stop if we have enough books
      if (books.length >= limit) {
        break;
      }
      
      // Add a small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error fetching books from Gutendex:`, error);
      throw error;
    }
  }
  
  // Return only the requested number of books
  return books.slice(0, limit);
}

/**
 * Download book text from a URL
 * @param url The text/plain URL from Gutendex
 * @returns The raw book text
 */
export async function downloadBookText(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    return text;
  } catch (error) {
    console.error(`Error downloading book from ${url}:`, error);
    throw error;
  }
}

/**
 * Clean book text by removing Project Gutenberg headers/footers and normalizing
 * @param rawText The raw book text
 * @returns Cleaned text
 */
export function cleanBookText(rawText: string): string {
  let text = rawText;
  
  // Remove Project Gutenberg header (everything before "*** START OF")
  const startMarkers = [
    '*** START OF THIS PROJECT GUTENBERG',
    '*** START OF THE PROJECT GUTENBERG',
    '***START OF THIS PROJECT GUTENBERG',
    '***START OF THE PROJECT GUTENBERG',
  ];
  
  for (const marker of startMarkers) {
    const startIndex = text.indexOf(marker);
    if (startIndex !== -1) {
      // Find the end of the line containing the marker
      const lineEnd = text.indexOf('\n', startIndex);
      if (lineEnd !== -1) {
        text = text.substring(lineEnd + 1);
      }
      break;
    }
  }
  
  // Remove Project Gutenberg footer (everything after "*** END OF")
  const endMarkers = [
    '*** END OF THIS PROJECT GUTENBERG',
    '*** END OF THE PROJECT GUTENBERG',
    '***END OF THIS PROJECT GUTENBERG',
    '***END OF THE PROJECT GUTENBERG',
  ];
  
  for (const marker of endMarkers) {
    const endIndex = text.indexOf(marker);
    if (endIndex !== -1) {
      text = text.substring(0, endIndex);
      break;
    }
  }
  
  // Remove control characters (keep only printable ASCII and common whitespace)
  // Keep: space (32), tab (9), newline (10), carriage return (13), and printable ASCII (32-126)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g, '');
  
  // Normalize line breaks to \n
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\r/g, '\n');
  
  // Remove excessive whitespace (more than 2 consecutive newlines)
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Trim leading and trailing whitespace
  text = text.trim();
  
  return text;
}

/**
 * Check if a paragraph should be excluded (non-content sections)
 */
function shouldExcludeParagraph(text: string): boolean {
  const upperText = text.toUpperCase().trim();
  
  // Exclude illustration references
  if (/\[ILLUSTRATION/i.test(text)) return true;
  if (/\[IMAGE/i.test(text)) return true;
  if (/\[FIGURE/i.test(text)) return true;
  if (/\[PLATE/i.test(text)) return true;
  if (/\[PICTURE/i.test(text)) return true;
  if (/\[PORTRAIT/i.test(text)) return true;
  if (/\[MAP/i.test(text)) return true;
  if (/\[DIAGRAM/i.test(text)) return true;
  
  // Exclude lines that are just section markers (short lines with specific keywords)
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length <= 5) {
    // Short text - check if it's a section header to exclude
    const excludePatterns = [
      /^ILLUSTRATION/i,
      /^INTRODUCTION$/i,
      /^PREFACE$/i,
      /^FOREWORD$/i,
      /^CONTENTS$/i,
      /^TABLE OF CONTENTS$/i,
      /^INDEX$/i,
      /^APPENDIX$/i,
      /^GLOSSARY$/i,
      /^BIBLIOGRAPHY$/i,
      /^FOOTNOTE/i,
      /^NOTE:/i,
      /^EDITOR'S NOTE/i,
      /^TRANSLATOR'S NOTE/i,
      /^\[.*\]$/i, // Text entirely in brackets
      /^_+$/i, // Just underscores
      /^\*+$/i, // Just asterisks
      /^-+$/i, // Just dashes
    ];
    
    for (const pattern of excludePatterns) {
      if (pattern.test(upperText)) return true;
    }
  }
  
  // Exclude paragraphs that are mostly numbers/punctuation (likely tables or indices)
  const alphaChars = text.replace(/[^a-zA-Z]/g, '').length;
  const totalChars = text.length;
  if (totalChars > 0 && alphaChars / totalChars < 0.5) return true;
  
  return false;
}

/**
 * Split text into paragraphs with target word count
 * Target: 120-280 words per paragraph
 * Minimum: 50 words, Maximum: 500 words
 * @param text The cleaned book text
 * @returns Array of paragraph strings
 */
export function splitIntoParagraphs(text: string): string[] {
  // Split on double newlines (paragraph breaks)
  const rawParagraphs = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0)
    .filter(p => !shouldExcludeParagraph(p)); // Filter out non-content sections
  
  const paragraphs: string[] = [];
  let buffer = '';
  
  for (const paragraph of rawParagraphs) {
    const words = paragraph.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const bufferWords = buffer.split(/\s+/).filter(w => w.length > 0).length;
    
    // If buffer + current paragraph is still small, combine them
    if (bufferWords > 0 && bufferWords + wordCount <= 280) {
      buffer += '\n\n' + paragraph;
    }
    // If current paragraph alone is in target range
    else if (wordCount >= 120 && wordCount <= 280) {
      // Flush buffer if it has content
      if (buffer.length > 0) {
        const bufWords = buffer.split(/\s+/).filter(w => w.length > 0).length;
        if (bufWords >= 50) {
          paragraphs.push(buffer);
        }
        buffer = '';
      }
      paragraphs.push(paragraph);
    }
    // If current paragraph is too long, split it
    else if (wordCount > 500) {
      // Flush buffer first
      if (buffer.length > 0) {
        const bufWords = buffer.split(/\s+/).filter(w => w.length > 0).length;
        if (bufWords >= 50) {
          paragraphs.push(buffer);
        }
        buffer = '';
      }
      
      // Split long paragraph at sentence boundaries
      const sentences = paragraph.split(/([.!?]+\s+)/).filter(s => s.trim().length > 0);
      let chunk = '';
      
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const chunkWords = (chunk + sentence).split(/\s+/).filter(w => w.length > 0).length;
        
        if (chunkWords > 500) {
          // Push current chunk and start new one
          if (chunk.length > 0) {
            const cWords = chunk.split(/\s+/).filter(w => w.length > 0).length;
            if (cWords >= 50) {
              paragraphs.push(chunk.trim());
            }
          }
          chunk = sentence;
        } else {
          chunk += sentence;
        }
        
        // Check if we're in target range
        const currentWords = chunk.split(/\s+/).filter(w => w.length > 0).length;
        if (currentWords >= 120 && currentWords <= 280) {
          paragraphs.push(chunk.trim());
          chunk = '';
        }
      }
      
      // Handle remaining chunk
      if (chunk.length > 0) {
        const cWords = chunk.split(/\s+/).filter(w => w.length > 0).length;
        if (cWords >= 50) {
          paragraphs.push(chunk.trim());
        }
      }
    }
    // If current paragraph is too small, add to buffer
    else {
      if (buffer.length > 0) {
        buffer += '\n\n' + paragraph;
      } else {
        buffer = paragraph;
      }
      
      // If buffer is now in good range, flush it
      const bufWords = buffer.split(/\s+/).filter(w => w.length > 0).length;
      if (bufWords >= 120 && bufWords <= 280) {
        paragraphs.push(buffer);
        buffer = '';
      }
    }
  }
  
  // Flush remaining buffer
  if (buffer.length > 0) {
    const bufWords = buffer.split(/\s+/).filter(w => w.length > 0).length;
    if (bufWords >= 50) {
      paragraphs.push(buffer);
    }
  }
  
  return paragraphs;
}

/**
 * Count syllables in a word using vowel group heuristic
 * @param word The word to count syllables for
 * @returns Number of syllables
 */
export function countSyllables(word: string): number {
  word = word.toLowerCase().trim();
  
  if (word.length === 0) return 0;
  if (word.length <= 2) return 1;
  
  // Remove non-alphabetic characters
  word = word.replace(/[^a-z]/g, '');
  
  if (word.length === 0) return 1;
  
  // Count vowel groups
  let syllables = 0;
  let previousWasVowel = false;
  const vowels = 'aeiouy';
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    
    if (isVowel && !previousWasVowel) {
      syllables++;
    }
    
    previousWasVowel = isVowel;
  }
  
  // Adjust for silent 'e' at the end
  if (word.endsWith('e') && syllables > 1) {
    syllables--;
  }
  
  // Adjust for common patterns
  if (word.endsWith('le') && word.length > 2 && !vowels.includes(word[word.length - 3])) {
    syllables++;
  }
  
  // Ensure at least 1 syllable
  return Math.max(syllables, 1);
}

/**
 * Calculate Flesch-Kincaid Reading Ease score
 * Formula: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
 * @param text The text to analyze
 * @returns Reading ease score
 */
export function calculateReadingEase(text: string): number {
  // Count words
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  if (wordCount === 0) return 0;
  
  // Count sentences (split on . ! ?)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = Math.max(sentences.length, 1);
  
  // Count syllables
  let totalSyllables = 0;
  for (const word of words) {
    totalSyllables += countSyllables(word);
  }
  
  // Calculate reading ease
  const wordsPerSentence = wordCount / sentenceCount;
  const syllablesPerWord = totalSyllables / wordCount;
  
  const readingEase = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  
  return readingEase;
}

/**
 * Calculate difficulty level based on Flesch-Kincaid Reading Ease
 * Easy: score >= 60
 * Medium: score 45-59
 * Hard: score < 45
 * @param text The text to analyze
 * @returns Difficulty level
 */
export function calculateDifficulty(text: string): 'easy' | 'medium' | 'hard' {
  const readingEase = calculateReadingEase(text);
  
  if (readingEase >= 60) {
    return 'easy';
  } else if (readingEase >= 45) {
    return 'medium';
  } else {
    return 'hard';
  }
}

/**
 * Extract simplified topic from Gutendex subjects and bookshelves
 * @param subjects Array of subject strings
 * @param bookshelves Array of bookshelf strings
 * @returns Simplified topic string
 */
export function extractTopic(subjects: string[], bookshelves: string[]): string {
  const allCategories = [...subjects, ...bookshelves].map(s => s.toLowerCase());
  
  // Try to find a match in our topic mapping
  for (const category of allCategories) {
    for (const [key, value] of Object.entries(TOPIC_MAPPING)) {
      if (category.includes(key)) {
        return value;
      }
    }
  }
  
  // If no match found, try to extract a general category
  if (allCategories.some(c => c.includes('fiction'))) {
    return 'fiction';
  }
  
  if (allCategories.some(c => c.includes('science'))) {
    return 'science';
  }
  
  if (allCategories.some(c => c.includes('history'))) {
    return 'history';
  }
  
  // Default to 'general' if no match found
  return 'general';
}

/**
 * Generate URL-safe slug from title
 * @param title The book title
 * @returns URL-safe slug
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, '') // Remove apostrophes
    .replace(/[&]/g, 'and') // Replace ampersands with 'and'
    .replace(/[:;,]/g, '') // Remove colons, semicolons, commas
    .replace(/[^a-z0-9\s-]/g, '') // Remove other special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Detect chapters in book text - STRICT MODE
 * Only detects lines that explicitly start with "CHAPTER" followed by a number.
 * This ensures we only get actual chapters, not letters, prologues, or other sections.
 * @param text The cleaned book text
 * @returns Array of ChapterInfo objects
 */
export function detectChapters(text: string): ChapterInfo[] {
  const chapters: ChapterInfo[] = [];
  const lines = text.split('\n');
  
  // Roman numeral mapping
  const romanNumerals = [
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
    'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX',
    'XXXI', 'XXXII', 'XXXIII', 'XXXIV', 'XXXV', 'XXXVI', 'XXXVII', 'XXXVIII', 'XXXIX', 'XL',
    'XLI', 'XLII', 'XLIII', 'XLIV', 'XLV', 'XLVI', 'XLVII', 'XLVIII', 'XLIX', 'L'
  ];
  
  // Ordinal word numbers (for "CHAPTER THE FIRST" style)
  const ordinalNumbers = [
    'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH',
    'ELEVENTH', 'TWELFTH', 'THIRTEENTH', 'FOURTEENTH', 'FIFTEENTH', 'SIXTEENTH', 'SEVENTEENTH',
    'EIGHTEENTH', 'NINETEENTH', 'TWENTIETH'
  ];
  
  let currentPosition = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    const line = originalLine.trim();
    const upperLine = line.toUpperCase();
    
    if (line.length === 0) {
      currentPosition += originalLine.length + 1;
      continue;
    }
    
    let chapterNumber: number | null = null;
    let title: string | undefined = undefined;
    
    // ONLY detect lines starting with "CHAPTER" (strict mode)
    if (upperLine.startsWith('CHAPTER')) {
      const afterChapter = line.substring(7).trim(); // 7 = length of "CHAPTER"
      const upperAfter = afterChapter.toUpperCase();
      
      // Try Arabic numeral: "CHAPTER 1", "CHAPTER 23", etc.
      const arabicMatch = afterChapter.match(/^(\d+)[\s.:—-]*(.*)/);
      if (arabicMatch) {
        chapterNumber = parseInt(arabicMatch[1], 10);
        if (arabicMatch[2].trim()) {
          title = arabicMatch[2].trim();
        }
      }
      
      // Try Roman numeral: "CHAPTER I", "CHAPTER XIV", etc.
      if (chapterNumber === null) {
        for (let j = romanNumerals.length - 1; j >= 0; j--) { // Check longer ones first
          const roman = romanNumerals[j];
          const romanPattern = new RegExp(`^${roman}(?:[\\s.:—-]|$)`, 'i');
          if (romanPattern.test(upperAfter)) {
            chapterNumber = j + 1;
            const titleMatch = afterChapter.match(new RegExp(`^${roman}[\\s.:—-]+(.+)`, 'i'));
            if (titleMatch && titleMatch[1].trim()) {
              title = titleMatch[1].trim();
            }
            break;
          }
        }
      }
      
      // Try ordinal: "CHAPTER THE FIRST", "CHAPTER THE SECOND", etc.
      if (chapterNumber === null) {
        const ordinalPattern = new RegExp(`^THE\\s+(${ordinalNumbers.join('|')})`, 'i');
        const ordinalMatch = upperAfter.match(ordinalPattern);
        if (ordinalMatch) {
          const ordinalIndex = ordinalNumbers.indexOf(ordinalMatch[1]);
          if (ordinalIndex >= 0) {
            chapterNumber = ordinalIndex + 1;
          }
        }
      }
    }
    
    // Add chapter if found
    if (chapterNumber !== null) {
      chapters.push({
        chapterNumber,
        startIndex: currentPosition,
        title
      });
    }
    
    currentPosition += originalLine.length + 1;
  }
  
  // If no chapters detected, treat entire book as single chapter
  if (chapters.length === 0) {
    return [{
      chapterNumber: 1,
      startIndex: 0,
      title: undefined
    }];
  }
  
  // Sort by position and renumber sequentially
  chapters.sort((a, b) => a.startIndex - b.startIndex);
  
  // Renumber chapters sequentially (1, 2, 3...) to ensure clean numbering
  for (let i = 0; i < chapters.length; i++) {
    chapters[i].chapterNumber = i + 1;
  }
  
  return chapters;
}

/**
 * Process a book into paragraphs with metadata
 * @param book The GutendexBook to process
 * @returns Array of ProcessedParagraph objects
 */
export async function processBook(book: GutendexBook): Promise<ProcessedParagraph[]> {
  console.log(`Processing book: "${book.title}" (ID: ${book.id})`);
  
  // Check if book has text/plain format (try all variants)
  const textUrl = book.formats['text/plain; charset=utf-8'] || 
                  book.formats['text/plain; charset=us-ascii'] || 
                  book.formats['text/plain'];
  if (!textUrl) {
    console.warn(`Book "${book.title}" does not have text/plain format`);
    return [];
  }
  
  try {
    // Download book text
    const rawText = await downloadBookText(textUrl);
    
    // Clean the text
    const cleanedText = cleanBookText(rawText);
    
    if (cleanedText.length === 0) {
      console.warn(`Book "${book.title}" has no content after cleaning`);
      return [];
    }
    
    // Detect chapters in the cleaned text
    const chapters = detectChapters(cleanedText);
    
    console.log(`Book "${book.title}": detected ${chapters.length} chapter(s)`);
    
    // Get the position of the first chapter - we'll exclude everything before it
    const firstChapterPosition = chapters.length > 0 ? chapters[0].startIndex : 0;
    
    // Split into paragraphs
    const paragraphs = splitIntoParagraphs(cleanedText);
    
    console.log(`Book "${book.title}": extracted ${paragraphs.length} raw paragraphs`);
    
    // Extract topic
    const topic = extractTopic(book.subjects, book.bookshelves);
    
    // Format source
    const authorNames = book.authors.map(a => a.name).join(', ');
    const source = `${book.title} by ${authorNames || 'Unknown'}`;
    
    // Helper function to find which chapter a paragraph belongs to
    const findChapterForPosition = (position: number): ChapterInfo | null => {
      // If position is before first chapter, return null (exclude this paragraph)
      if (position < firstChapterPosition) {
        return null;
      }
      // Find the last chapter that starts before or at this position
      for (let i = chapters.length - 1; i >= 0; i--) {
        if (chapters[i].startIndex <= position) {
          return chapters[i];
        }
      }
      return null;
    };
    
    // Helper function to count paragraphs in a chapter
    const chapterParagraphCounts = new Map<number, number>();
    
    // Track current position in the text
    let currentTextPosition = 0;
    let paragraphIndex = 0;
    
    // Process each paragraph, filtering out those before first chapter
    const processedParagraphs: ProcessedParagraph[] = [];
    
    for (const text of paragraphs) {
      const words = text.split(/\s+/).filter(w => w.length > 0);
      const lengthWords = words.length;
      
      // Find the position of this paragraph in the original text
      const paragraphPosition = cleanedText.indexOf(text, currentTextPosition);
      currentTextPosition = paragraphPosition >= 0 ? paragraphPosition + text.length : currentTextPosition;
      
      // Determine which chapter this paragraph belongs to
      const chapter = findChapterForPosition(paragraphPosition >= 0 ? paragraphPosition : currentTextPosition);
      
      // Skip paragraphs that are before the first chapter (front matter)
      if (chapter === null) {
        continue;
      }
      
      // Calculate difficulty
      const difficulty = calculateDifficulty(text);
      
      // Calculate duration mode based on word count (at 50 WPM average)
      let durationMode: number;
      if (lengthWords <= 150) {
        durationMode = 30;
      } else if (lengthWords <= 300) {
        durationMode = 60;
      } else if (lengthWords <= 400) {
        durationMode = 90;
      } else {
        durationMode = 120;
      }
      
      // Calculate section index within the chapter
      const currentCount = chapterParagraphCounts.get(chapter.chapterNumber) || 0;
      chapterParagraphCounts.set(chapter.chapterNumber, currentCount + 1);
      const sectionIndex = currentCount;
      
      processedParagraphs.push({
        text,
        difficulty,
        topic,
        durationMode,
        lengthWords,
        source,
        bookId: book.id,
        paragraphIndex: paragraphIndex++,
        language: 'en',
        chapter: chapter.chapterNumber,
        sectionIndex,
        chapterTitle: chapter.title
      });
    }
    
    console.log(`Book "${book.title}": kept ${processedParagraphs.length} paragraphs (excluded front matter)`);
    
    // Renumber chapters sequentially starting from 1 after excluding front matter
    const usedChapters = Array.from(new Set(processedParagraphs.map(p => p.chapter).filter((c): c is number => c !== undefined))).sort((a, b) => a - b);
    const chapterRemap = new Map<number, number>();
    usedChapters.forEach((oldNum, idx) => chapterRemap.set(oldNum, idx + 1));
    
    // Apply the remapping
    for (const para of processedParagraphs) {
      if (para.chapter !== undefined) {
        para.chapter = chapterRemap.get(para.chapter) || para.chapter;
      }
    }
    
    console.log(`Book "${book.title}": renumbered to ${usedChapters.length} chapters`);
    
    return processedParagraphs;
  } catch (error) {
    console.error(`Error processing book "${book.title}":`, error);
    return [];
  }
}

/**
 * Extract book metadata from GutendexBook and processed paragraphs
 * @param book The GutendexBook object
 * @param paragraphs Array of ProcessedParagraph objects
 * @returns InsertBook object ready for database insertion
 * @throws Error if paragraphs array is empty
 */
export function getBookMetadata(book: GutendexBook, paragraphs: ProcessedParagraph[]): InsertBook {
  // Validate that paragraphs array is not empty
  if (!paragraphs || paragraphs.length === 0) {
    throw new Error(`Cannot generate metadata for book "${book.title}": No paragraphs were extracted from the book text`);
  }
  
  // Generate slug from title
  const slug = generateSlug(book.title);
  
  // Format author names
  const authorNames = book.authors.map(a => a.name).join(', ');
  const author = authorNames || 'Unknown';
  
  // Extract topic (use first paragraph's topic, they should all be the same)
  const topic = paragraphs[0].topic;
  
  // Calculate difficulty distribution
  const difficultyCount = {
    easy: 0,
    medium: 0,
    hard: 0
  };
  
  paragraphs.forEach(p => {
    difficultyCount[p.difficulty]++;
  });
  
  // Find dominant difficulty (most common)
  let dominantDifficulty: 'easy' | 'medium' | 'hard' = 'medium';
  let maxCount = 0;
  
  for (const [diff, count] of Object.entries(difficultyCount)) {
    if (count > maxCount) {
      maxCount = count;
      dominantDifficulty = diff as 'easy' | 'medium' | 'hard';
    }
  }
  
  // Calculate estimated duration map
  const durationMap: Record<number, number> = {
    30: 0,
    60: 0,
    90: 0,
    120: 0
  };
  
  paragraphs.forEach(p => {
    if (p.durationMode in durationMap) {
      durationMap[p.durationMode]++;
    }
  });
  
  // Count unique chapters
  const uniqueChapters = new Set<number>();
  paragraphs.forEach(p => {
    if (p.chapter !== undefined) {
      uniqueChapters.add(p.chapter);
    }
  });
  const totalChapters = uniqueChapters.size > 0 ? uniqueChapters.size : 1;
  
  // Get cover image URL (try image/jpeg format)
  const coverImageUrl = book.formats['image/jpeg'] || null;
  
  // Create description from subjects (take first 3)
  const description = book.subjects.slice(0, 3).join(', ') || null;
  
  return {
    id: book.id,
    slug,
    title: book.title,
    author,
    language: 'en',
    topic,
    difficulty: dominantDifficulty,
    totalParagraphs: paragraphs.length,
    totalChapters,
    coverImageUrl,
    description,
    estimatedDurationMap: durationMap
  };
}
