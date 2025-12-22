/**
 * Book Scene Detector
 * 
 * Splits book chapters into logical scenes/sections for progressive typing.
 * Enables scene-by-scene navigation instead of overwhelming users with entire chapters.
 * 
 * Detection strategies:
 * - Theatrical plays: ACT/SCENE markers
 * - Novels: Section breaks, time/location changes
 * - General: Paragraph grouping by length
 */

import type { BookParagraph } from "@shared/schema";

export interface Scene {
  index: number;
  title: string;
  paragraphs: BookParagraph[];
  wordCount: number;
  startParagraphIndex: number;
  endParagraphIndex: number;
  type: 'act' | 'scene' | 'section' | 'auto'; // How the scene was detected
}

export interface SceneBreak {
  paragraphIndex: number;
  type: 'act' | 'scene' | 'section';
  title?: string;
}

/**
 * Extract scene title from paragraph text
 * Handles various formats: "ACT I", "SCENE II", "_[SCENE.—A room...]", "Chapter 3", etc.
 */
export function extractSceneTitle(text: string): string {
  if (!text) return "Untitled";
  
  const trimmed = text.trim();
  
  // ACT headers: "ACT I", "ACT II", etc.
  const actMatch = trimmed.match(/^ACT\s+([IVXLCDM]+|[0-9]+)/i);
  if (actMatch) {
    return `Act ${actMatch[1]}`;
  }
  
  // SCENE headers with description: "_[SCENE.—A room...]"
  const sceneDescMatch = trimmed.match(/^\[?_?\[?SCENE[\.:\s—-]+(.*?)[\].]?$/i);
  if (sceneDescMatch && sceneDescMatch[1]) {
    const desc = sceneDescMatch[1].trim().replace(/\]$/, '');
    return desc.length > 50 ? `Scene: ${desc.substring(0, 47)}...` : `Scene: ${desc}`;
  }
  
  // Simple SCENE headers: "SCENE I", "SCENE II"
  const sceneMatch = trimmed.match(/^SCENE\s+([IVXLCDM]+|[0-9]+)/i);
  if (sceneMatch) {
    return `Scene ${sceneMatch[1]}`;
  }
  
  // Chapter markers
  const chapterMatch = trimmed.match(/^(CHAPTER|PART|BOOK)\s+([IVXLCDM]+|[0-9]+)/i);
  if (chapterMatch) {
    return `${chapterMatch[1]} ${chapterMatch[2]}`;
  }
  
  // If text is short and looks like a header, use it
  if (trimmed.length <= 60 && trimmed.split(' ').length <= 8) {
    return trimmed;
  }
  
  return "Section";
}

/**
 * Detect scene breaks in a list of paragraphs
 * Returns array of scene break points with metadata
 */
export function detectSceneBreaks(paragraphs: BookParagraph[]): SceneBreak[] {
  const breaks: SceneBreak[] = [];
  
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const text = para.text.trim();
    
    // Skip empty paragraphs
    if (text.length === 0) continue;
    
    // ACT headers
    if (/^ACT\s+[IVXLCDM0-9]+/i.test(text)) {
      breaks.push({
        paragraphIndex: i,
        type: 'act',
        title: extractSceneTitle(text),
      });
      continue;
    }
    
    // SCENE headers
    if (/^\[?_?\[?SCENE[\.:\s—-]/i.test(text)) {
      breaks.push({
        paragraphIndex: i,
        type: 'scene',
        title: extractSceneTitle(text),
      });
      continue;
    }
    
    // Chapter/Part/Book markers
    if (/^(CHAPTER|PART|BOOK)\s+[IVXLCDM0-9]+/i.test(text)) {
      breaks.push({
        paragraphIndex: i,
        type: 'section',
        title: extractSceneTitle(text),
      });
      continue;
    }
  }
  
  return breaks;
}

/**
 * Split paragraphs into scenes based on detected breaks
 * Falls back to word-count-based chunking if no structural breaks found
 */
export function splitIntoScenes(
  paragraphs: BookParagraph[],
  options: {
    maxWordsPerScene?: number; // Max words before auto-splitting
    minWordsPerScene?: number; // Min words to consider a valid scene
  } = {}
): Scene[] {
  const { maxWordsPerScene = 800, minWordsPerScene = 50 } = options;
  
  if (paragraphs.length === 0) return [];
  
  // Detect structural breaks (acts, scenes, chapters)
  const breaks = detectSceneBreaks(paragraphs);
  
  const scenes: Scene[] = [];
  
  // If we found structural breaks, use them
  if (breaks.length > 0) {
    // Create scene for content before first break
    if (breaks[0].paragraphIndex > 0) {
      const initialParas = paragraphs.slice(0, breaks[0].paragraphIndex);
      const wordCount = initialParas.reduce((sum, p) => sum + (p.lengthWords || 0), 0);
      
      if (wordCount >= minWordsPerScene) {
        scenes.push({
          index: 0,
          title: "Introduction",
          paragraphs: initialParas,
          wordCount,
          startParagraphIndex: 0,
          endParagraphIndex: breaks[0].paragraphIndex - 1,
          type: 'auto',
        });
      }
    }
    
    // Create scenes between breaks
    for (let i = 0; i < breaks.length; i++) {
      const breakPoint = breaks[i];
      const nextBreakIndex = i + 1 < breaks.length ? breaks[i + 1].paragraphIndex : paragraphs.length;
      
      const sceneParas = paragraphs.slice(breakPoint.paragraphIndex, nextBreakIndex);
      const wordCount = sceneParas.reduce((sum, p) => sum + (p.lengthWords || 0), 0);
      
      // Only create scene if it has enough content
      if (wordCount >= minWordsPerScene && sceneParas.length > 0) {
        scenes.push({
          index: scenes.length,
          title: breakPoint.title || extractSceneTitle(sceneParas[0].text),
          paragraphs: sceneParas,
          wordCount,
          startParagraphIndex: breakPoint.paragraphIndex,
          endParagraphIndex: nextBreakIndex - 1,
          type: breakPoint.type,
        });
      }
    }
  } else {
    // No structural breaks found - use word-count-based chunking
    let currentScene: BookParagraph[] = [];
    let currentWordCount = 0;
    let sceneStartIndex = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      const paraWords = para.lengthWords || 0;
      
      // Check if adding this paragraph would exceed max
      if (currentWordCount + paraWords > maxWordsPerScene && currentScene.length > 0) {
        // Flush current scene
        scenes.push({
          index: scenes.length,
          title: `Section ${scenes.length + 1}`,
          paragraphs: currentScene,
          wordCount: currentWordCount,
          startParagraphIndex: sceneStartIndex,
          endParagraphIndex: i - 1,
          type: 'auto',
        });
        
        // Start new scene
        currentScene = [para];
        currentWordCount = paraWords;
        sceneStartIndex = i;
      } else {
        currentScene.push(para);
        currentWordCount += paraWords;
      }
    }
    
    // Flush final scene
    if (currentScene.length > 0 && currentWordCount >= minWordsPerScene) {
      scenes.push({
        index: scenes.length,
        title: `Section ${scenes.length + 1}`,
        paragraphs: currentScene,
        wordCount: currentWordCount,
        startParagraphIndex: sceneStartIndex,
        endParagraphIndex: paragraphs.length - 1,
        type: 'auto',
      });
    }
  }
  
  // If no scenes created (very short chapter), create single scene
  if (scenes.length === 0) {
    const totalWords = paragraphs.reduce((sum, p) => sum + (p.lengthWords || 0), 0);
    scenes.push({
      index: 0,
      title: "Complete Chapter",
      paragraphs: paragraphs,
      wordCount: totalWords,
      startParagraphIndex: 0,
      endParagraphIndex: paragraphs.length - 1,
      type: 'auto',
    });
  }
  
  return scenes;
}

/**
 * Get scene at a specific index (with bounds checking)
 */
export function getSceneAtIndex(scenes: Scene[], index: number): Scene | null {
  if (index < 0 || index >= scenes.length) return null;
  return scenes[index];
}

/**
 * Find which scene contains a specific paragraph index
 */
export function findSceneForParagraph(scenes: Scene[], paragraphIndex: number): Scene | null {
  for (const scene of scenes) {
    if (paragraphIndex >= scene.startParagraphIndex && paragraphIndex <= scene.endParagraphIndex) {
      return scene;
    }
  }
  return null;
}

/**
 * Calculate total progress across all scenes
 */
export function calculateSceneProgress(
  scenes: Scene[],
  currentSceneIndex: number,
  currentSceneProgress: number // 0-100
): number {
  if (scenes.length === 0) return 0;
  
  const totalWords = scenes.reduce((sum, scene) => sum + scene.wordCount, 0);
  if (totalWords === 0) return 0;
  
  // Words completed in previous scenes
  let completedWords = 0;
  for (let i = 0; i < currentSceneIndex && i < scenes.length; i++) {
    completedWords += scenes[i].wordCount;
  }
  
  // Words in current scene
  const currentScene = scenes[currentSceneIndex];
  if (currentScene) {
    completedWords += (currentScene.wordCount * currentSceneProgress) / 100;
  }
  
  return (completedWords / totalWords) * 100;
}
