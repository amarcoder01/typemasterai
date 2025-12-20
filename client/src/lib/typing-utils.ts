import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const WORDS = [
  "the", "be", "of", "and", "a", "to", "in", "he", "have", "it", "that", "for", "they", "I", "with", "as", "not", "on", "she", "at", "by", "this", "we", "you", "do", "but", "from", "or", "which", "one", "would", "all", "will", "there", "say", "who", "make", "when", "can", "more", "if", "no", "man", "out", "other", "so", "what", "time", "up", "go", "about", "than", "into", "could", "state", "only", "new", "year", "some", "take", "come", "these", "know", "see", "use", "get", "like", "then", "first", "any", "work", "now", "may", "such", "give", "over", "think", "most", "even", "find", "day", "also", "after", "way", "many", "must", "look", "before", "great", "back", "through", "long", "where", "much", "should", "well", "people", "down", "own", "just", "because", "good", "each", "those", "feel", "seem", "how", "high", "too", "place", "little", "world", "very", "still", "nation", "hand", "old", "life", "tell", "write", "become", "here", "show", "house", "both", "between", "need", "mean", "call", "develop", "under", "last", "right", "move", "thing", "general", "school", "never", "same", "another", "begin", "while", "number", "part", "turn", "real", "leave", "might", "want", "point", "form", "off", "child", "few", "small", "since", "against", "ask", "late", "home", "interest", "large", "person", "end", "open", "public", "follow", "during", "present", "without", "again", "hold", "govern", "around", "possible", "head", "consider", "word", "program", "problem", "however", "lead", "system", "set", "order", "eye", "plan", "run", "keep", "face", "fact", "group", "play", "stand", "increase", "early", "course", "change", "help", "line"
];

export function generateText(wordCount: number = 50): string {
  const text = [];
  for (let i = 0; i < wordCount; i++) {
    text.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
  }
  return text.join(" ");
}

// Maximum realistic WPM - world record is ~212 WPM sustained
// Setting cap at 300 to allow for brief bursts while catching cheating
const MAX_WPM = 300;
const MIN_WPM = 0;

export function calculateWPM(correctChars: number, timeElapsedSeconds: number): number {
  // Guard against invalid inputs
  if (timeElapsedSeconds <= 0 || correctChars < 0) return 0;
  if (!Number.isFinite(correctChars) || !Number.isFinite(timeElapsedSeconds)) return 0;
  
  const words = correctChars / 5;
  const minutes = timeElapsedSeconds / 60;
  const wpm = Math.round(words / minutes);
  
  // Clamp to realistic bounds
  return Math.max(MIN_WPM, Math.min(MAX_WPM, wpm));
}

export function calculateAccuracy(correctChars: number, totalChars: number): number {
  // Guard against invalid inputs
  if (totalChars <= 0 || correctChars < 0) return 100;
  if (!Number.isFinite(correctChars) || !Number.isFinite(totalChars)) return 100;
  
  const accuracy = Math.round((correctChars / totalChars) * 100);
  
  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, accuracy));
}
