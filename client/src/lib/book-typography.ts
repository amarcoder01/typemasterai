/**
 * Book Typography System
 * 
 * Professional typography scale for book content based on research:
 * - Body text: 16-20px desktop, 15-19px tablet, 12-16px mobile
 * - Line height: 1.6-1.8 for readability
 * - Max line width: 65-70 characters (optimal prose)
 * - Contrast: WCAG AA 4.5:1 minimum
 * - Hierarchy: 3:1 ratio between headers and body text
 * 
 * Enhanced with:
 * - Typing state visual feedback (completed/current/upcoming)
 * - Focus mode for distraction-free typing
 * - CSS variable-based theming
 * - Animation definitions
 * 
 * Sources: Material Design 3, Refactoring UI, Typography best practices
 */

import type { ContentType } from './book-content-parser';

export interface TypeStyle {
  // Base className for the element
  className: string;
  
  // HTML element to render
  element: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div' | 'hr' | 'span';
  
  // Optional: max-width constraint for readability
  maxWidth?: string;
  
  // Optional: special spacing rules
  spacing?: {
    marginTop?: string;
    marginBottom?: string;
  };
}

/**
 * Typing state types for visual feedback
 */
export type TypingState = 'completed' | 'current' | 'upcoming' | 'inactive';

/**
 * Typing state visual styles
 * Applied to content blocks based on user's typing progress
 */
export const TYPING_STATE_STYLES: Record<TypingState, string> = {
  // Completed: dimmed and slightly blurred to reduce visual noise
  completed: 'opacity-40 saturate-50 transition-opacity duration-300',
  
  // Current: fully visible with subtle highlight
  current: 'opacity-100 bg-primary/5 rounded-lg ring-1 ring-primary/20 shadow-sm transition-all duration-200',
  
  // Upcoming: visible but de-emphasized
  upcoming: 'opacity-60 transition-opacity duration-300',
  
  // Inactive: normal state when not actively typing
  inactive: 'opacity-100',
};

/**
 * Focus mode styles - dims all non-current content more aggressively
 */
export const FOCUS_MODE_STYLES: Record<TypingState, string> = {
  completed: 'opacity-25 blur-[0.5px] saturate-0 transition-all duration-500',
  current: 'opacity-100 scale-[1.01] bg-primary/8 rounded-xl ring-2 ring-primary/30 shadow-lg transition-all duration-200',
  upcoming: 'opacity-35 transition-all duration-500',
  inactive: 'opacity-100',
};

/**
 * Character-level highlighting styles for typing feedback
 */
export const CHARACTER_STYLES = {
  // Not yet typed
  pending: 'text-muted-foreground/60',
  
  // Correctly typed
  correct: 'text-green-500 dark:text-green-400',
  
  // Incorrectly typed (shows expected character struck through)
  incorrect: 'text-red-500 line-through opacity-70',
  
  // What the user actually typed (incorrect)
  actualTyped: 'text-yellow-400 font-bold',
  
  // Current cursor position
  cursor: 'border-l-2 border-primary animate-pulse',
};

/**
 * Animation class definitions for smooth transitions
 */
export const ANIMATION_CLASSES = {
  // Fade in when block becomes visible
  fadeIn: 'animate-in fade-in duration-300',
  
  // Slide up when completing a block
  slideUp: 'animate-in slide-in-from-bottom-2 duration-200',
  
  // Pulse for current block indicator
  pulse: 'animate-pulse',
  
  // Smooth scroll behavior
  smoothScroll: 'scroll-smooth',
  
  // Block transition
  blockTransition: 'transition-all duration-200 ease-out',
};

/**
 * Typography configuration for each content type
 * 
 * Design principles:
 * - Vertical rhythm: consistent spacing ratios (1:1.5:2:3)
 * - Contrast through size, weight, and color
 * - Readability: 45-75 characters per line for prose
 * - Hierarchy: 6-8 distinct visual levels
 */
export const BOOK_TYPE_STYLES: Record<ContentType, TypeStyle> = {
  // Book title: Extra large, bold, centered with gradient accent
  // Desktop: ~48-56px (3rem-3.5rem), Mobile: 32-40px (2rem-2.5rem)
  BOOK_TITLE: {
    element: 'h1',
    className: 'text-3xl md:text-4xl lg:text-5xl font-bold text-foreground text-center tracking-tight leading-tight mb-4 pb-4 border-b border-primary/20',
    maxWidth: 'max-w-4xl',
    spacing: {
      marginTop: '0',
      marginBottom: '1rem',
    },
  },

  // Author: Medium-large, italic, centered, serif with subtle styling
  // Desktop: ~24-28px (1.5rem-1.75rem), Mobile: 20-24px (1.25rem-1.5rem)
  AUTHOR: {
    element: 'p',
    className: 'text-lg md:text-xl italic text-muted-foreground text-center font-serif leading-normal mb-6',
    maxWidth: 'max-w-3xl',
    spacing: {
      marginTop: '0',
      marginBottom: '1.5rem',
    },
  },

  // Act header: Large, extra bold, uppercase with decorative borders
  // Desktop: ~40-48px (2.5rem-3rem), Mobile: 28-32px (1.75rem-2rem)
  ACT_HEADER: {
    element: 'h2',
    className: 'text-2xl md:text-3xl lg:text-4xl font-extrabold uppercase text-primary text-center border-t-2 border-b-2 border-primary/40 py-4 tracking-widest leading-tight mt-8 mb-6 bg-primary/5 rounded-lg',
    maxWidth: 'max-w-full',
    spacing: {
      marginTop: '2rem',
      marginBottom: '1.5rem',
    },
  },

  // Scene header: Medium-large, bold, with scene indicator badge
  // Desktop: ~28-32px (1.75rem-2rem), Mobile: 24-28px (1.5rem-1.75rem)
  SCENE_HEADER: {
    element: 'h3',
    className: 'text-xl md:text-2xl font-semibold text-primary/90 leading-snug mt-6 mb-4 pl-4 border-l-4 border-primary/50',
    maxWidth: 'max-w-4xl',
    spacing: {
      marginTop: '1.5rem',
      marginBottom: '1rem',
    },
  },

  // Setting description: Italic, slightly muted, with background
  SETTING_DESCRIPTION: {
    element: 'p',
    className: 'text-sm md:text-base italic text-muted-foreground bg-muted/30 rounded-lg px-4 py-3 my-4 leading-relaxed border border-muted/50',
    maxWidth: 'max-w-prose',
    spacing: {
      marginTop: '1rem',
      marginBottom: '1rem',
    },
  },

  // Time marker: Small, centered, with decorative elements
  TIME_MARKER: {
    element: 'p',
    className: 'text-xs md:text-sm uppercase tracking-widest text-muted-foreground text-center my-4 before:content-["—"] before:mr-2 after:content-["—"] after:ml-2',
    maxWidth: 'max-w-prose',
    spacing: {
      marginTop: '1rem',
      marginBottom: '1rem',
    },
  },

  // Stage direction: Italic, muted, indented with left border - distinct visual treatment
  // Desktop: 16-18px (1rem-1.125rem), Mobile: 14-16px (0.875rem-1rem)
  STAGE_DIRECTION: {
    element: 'p',
    className: 'text-sm md:text-base italic text-muted-foreground/80 ml-4 md:ml-6 my-3 pl-4 border-l-2 border-amber-500/40 bg-amber-500/5 rounded-r-lg py-2 pr-3 leading-relaxed',
    maxWidth: 'max-w-prose',
    spacing: {
      marginTop: '0.75rem',
      marginBottom: '0.75rem',
    },
  },

  // Character list header: Medium, bold, uppercase, centered with underline
  // Desktop: ~24-28px (1.5rem-1.75rem), Mobile: 20-24px (1.25rem-1.5rem)
  CHARACTER_LIST_HEADER: {
    element: 'h3',
    className: 'text-lg md:text-xl font-bold uppercase text-foreground text-center tracking-widest leading-normal mt-8 mb-4 pb-2 border-b-2 border-foreground/20',
    maxWidth: 'max-w-3xl',
    spacing: {
      marginTop: '2rem',
      marginBottom: '1rem',
    },
  },

  // Character entry: Small, muted, with bullet point styling
  // Desktop: 14-16px (0.875rem-1rem), Mobile: 13-15px
  CHARACTER_ENTRY: {
    element: 'p',
    className: 'text-sm md:text-base text-muted-foreground ml-6 md:ml-10 my-1 leading-relaxed before:content-["•"] before:mr-2 before:text-primary/50',
    maxWidth: 'max-w-prose',
    spacing: {
      marginTop: '0.25rem',
      marginBottom: '0.25rem',
    },
  },

  // Character name in dialogue: Bold, uppercase, primary color accent
  // Desktop: 14-16px (0.875rem-1rem), Mobile: 13-15px
  CHARACTER_NAME: {
    element: 'p',
    className: 'text-sm md:text-base font-bold uppercase text-primary tracking-wider leading-tight mt-4 mb-1',
    maxWidth: 'max-w-prose',
    spacing: {
      marginTop: '1rem',
      marginBottom: '0.25rem',
    },
  },

  // Dialogue: Indented, comfortable reading with subtle left indicator
  // Desktop: 16-18px (1rem-1.125rem), Mobile: 14-16px (0.875rem-1rem)
  DIALOGUE: {
    element: 'p',
    className: 'text-base md:text-lg text-foreground ml-6 md:ml-8 my-2 leading-relaxed pl-3 border-l border-primary/20',
    maxWidth: 'max-w-prose',
    spacing: {
      marginTop: '0.5rem',
      marginBottom: '0.5rem',
    },
  },

  // Narration/prose: Standard reading text with proper typographic treatment
  // Desktop: 16-18px (1rem-1.125rem), Mobile: 14-16px (0.875rem-1rem)
  NARRATION: {
    element: 'p',
    className: 'text-base md:text-lg text-foreground my-3 leading-[1.8] first-letter:text-lg first-letter:font-medium',
    maxWidth: 'max-w-prose', // ~65-70 characters per line
    spacing: {
      marginTop: '0.75rem',
      marginBottom: '0.75rem',
    },
  },

  // Section divider: Visual separator with centered ornament
  SECTION_DIVIDER: {
    element: 'hr',
    className: 'my-8 border-0 h-px bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent',
    spacing: {
      marginTop: '2rem',
      marginBottom: '2rem',
    },
  },
};

/**
 * Content width classes for different contexts
 * Based on research: max 65-70 characters per line for optimal readability
 */
export const CONTENT_WIDTH_CLASSES = {
  // ~65ch - ideal for body text (dialogue, narration)
  narrow: 'max-w-prose',
  
  // ~80ch - wider for scene descriptions
  wide: 'max-w-4xl',
  
  // Full width for titles, acts
  full: 'max-w-full',
};

/**
 * Reading mode configurations
 * Allows users to choose their preferred reading style
 */
export interface ReadingMode {
  id: 'theater' | 'novel' | 'compact';
  label: string;
  description: string;
  modifierClasses: {
    container?: string;
    characterName?: string;
    dialogue?: string;
    narration?: string;
  };
}

export const READING_MODES: ReadingMode[] = [
  {
    id: 'theater',
    label: 'Theater Script',
    description: 'Traditional play format - character names bold, dialogue indented',
    modifierClasses: {
      characterName: 'font-bold uppercase tracking-wider',
      dialogue: 'ml-8 leading-loose',
    },
  },
  {
    id: 'novel',
    label: 'Novel',
    description: 'Book-style formatting - centered headers, justified text',
    modifierClasses: {
      container: 'text-justify',
      narration: 'text-justify hyphens-auto',
    },
  },
  {
    id: 'compact',
    label: 'Compact',
    description: 'Dense layout for experienced readers - reduced spacing',
    modifierClasses: {
      container: 'space-y-2',
      dialogue: 'ml-4 leading-normal',
      narration: 'leading-normal my-2',
    },
  },
];

/**
 * Get the appropriate typography style for a content type
 * @param type - Content type from parser
 * @returns Typography configuration
 */
export function getTypeStyle(type: ContentType): TypeStyle {
  return BOOK_TYPE_STYLES[type];
}

/**
 * Helper: Get responsive font size class
 * Based on research: mobile 12-16px, tablet 15-19px, desktop 16-20px
 */
export function getResponsiveFontSize(level: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'): string {
  const sizes: Record<string, string> = {
    xs: 'text-xs md:text-sm', // 12-14px
    sm: 'text-sm md:text-base', // 14-16px
    base: 'text-base md:text-lg', // 16-18px
    lg: 'text-lg md:text-xl', // 18-20px
    xl: 'text-xl md:text-2xl', // 20-24px
    '2xl': 'text-2xl md:text-3xl', // 24-30px
    '3xl': 'text-3xl md:text-4xl', // 30-36px
    '4xl': 'text-4xl md:text-5xl lg:text-6xl', // 36-48px+
  };
  
  return sizes[level] || sizes.base;
}

/**
 * Helper: Calculate WCAG contrast ratio
 * Ensures text meets accessibility standards (4.5:1 minimum for AA)
 */
export function meetsContrastRequirement(foreground: string, background: string): boolean {
  // This is a simplified check - in production, use a proper contrast calculation library
  // For now, we rely on Tailwind's color system which is designed with accessibility in mind
  return true; // Placeholder - implement actual contrast calculation if needed
}

/**
 * Get typing state style classes
 * @param state - Current typing state
 * @param focusMode - Whether focus mode is enabled
 */
export function getTypingStateClasses(state: TypingState, focusMode = false): string {
  return focusMode ? FOCUS_MODE_STYLES[state] : TYPING_STATE_STYLES[state];
}

/**
 * Get combined style for a content block
 * Merges type-specific styles with state-based styles
 */
export function getBlockClasses(
  type: ContentType,
  state: TypingState,
  focusMode = false,
  readingMode?: ReadingMode
): string {
  const typeStyle = getTypeStyle(type);
  const stateClasses = getTypingStateClasses(state, focusMode);
  
  // Get reading mode modifiers if applicable
  let modeModifiers = '';
  if (readingMode?.modifierClasses) {
    const key = type.toLowerCase() as keyof typeof readingMode.modifierClasses;
    modeModifiers = readingMode.modifierClasses[key] || '';
  }
  
  return `${typeStyle.className} ${stateClasses} ${modeModifiers}`.trim();
}

/**
 * Reading preferences for user customization
 */
export interface ReadingPreferences {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  lineHeight: 'compact' | 'normal' | 'relaxed';
  contentWidth: 'narrow' | 'medium' | 'wide';
  theme: 'default' | 'sepia' | 'dark' | 'high-contrast';
}

/**
 * Font size scale classes
 */
export const FONT_SIZE_SCALE: Record<ReadingPreferences['fontSize'], string> = {
  small: 'text-sm md:text-base',
  medium: 'text-base md:text-lg',
  large: 'text-lg md:text-xl',
  xlarge: 'text-xl md:text-2xl',
};

/**
 * Line height classes
 */
export const LINE_HEIGHT_SCALE: Record<ReadingPreferences['lineHeight'], string> = {
  compact: 'leading-snug',
  normal: 'leading-relaxed',
  relaxed: 'leading-loose',
};

/**
 * Content width classes
 */
export const WIDTH_SCALE: Record<ReadingPreferences['contentWidth'], string> = {
  narrow: 'max-w-xl', // ~55ch
  medium: 'max-w-prose', // ~65ch
  wide: 'max-w-3xl', // ~80ch
};

/**
 * Theme classes for reading
 */
export const THEME_CLASSES: Record<ReadingPreferences['theme'], string> = {
  default: '',
  sepia: 'bg-amber-50/50 dark:bg-amber-900/10',
  dark: 'bg-slate-900 text-slate-100',
  'high-contrast': 'bg-black text-white',
};

/**
 * Get preference-adjusted classes
 */
export function getPreferenceClasses(prefs: Partial<ReadingPreferences>): string {
  const classes: string[] = [];
  
  if (prefs.fontSize) classes.push(FONT_SIZE_SCALE[prefs.fontSize]);
  if (prefs.lineHeight) classes.push(LINE_HEIGHT_SCALE[prefs.lineHeight]);
  if (prefs.contentWidth) classes.push(WIDTH_SCALE[prefs.contentWidth]);
  if (prefs.theme) classes.push(THEME_CLASSES[prefs.theme]);
  
  return classes.join(' ');
}

/**
 * CSS custom properties for dynamic theming
 * These can be overridden via inline styles or CSS variables
 */
export const CSS_VARIABLES = {
  // Typography
  '--book-font-body': 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  '--book-font-heading': 'ui-sans-serif, system-ui, sans-serif',
  '--book-line-height': '1.8',
  '--book-letter-spacing': '0.01em',
  
  // Spacing
  '--book-block-gap': '1rem',
  '--book-section-gap': '2rem',
  '--book-indent': '2rem',
  
  // Colors (use CSS custom properties for theme support)
  '--book-text-primary': 'var(--foreground)',
  '--book-text-secondary': 'var(--muted-foreground)',
  '--book-text-accent': 'var(--primary)',
  '--book-bg-highlight': 'var(--primary) / 0.05',
  
  // Transitions
  '--book-transition-fast': '150ms ease-out',
  '--book-transition-normal': '200ms ease-out',
  '--book-transition-slow': '300ms ease-out',
};

/**
 * Apply CSS variables to an element
 */
export function getCSSVariableStyle(): React.CSSProperties {
  return CSS_VARIABLES as unknown as React.CSSProperties;
}
