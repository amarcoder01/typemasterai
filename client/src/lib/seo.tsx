import { useEffect } from 'react';

export interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  canonical?: string;
  structuredData?: object;
}

/**
 * SEO Component for dynamic meta tag management
 * Updates page-specific meta tags for better search engine optimization
 */
export function useSEO(config: SEOConfig) {
  useEffect(() => {
    // Update document title
    if (config.title) {
      document.title = config.title;
      updateMetaTag('name', 'title', config.title);
      updateMetaTag('property', 'og:title', config.ogTitle || config.title);
      updateMetaTag('name', 'twitter:title', config.twitterTitle || config.title);
    }

    // Update description
    if (config.description) {
      updateMetaTag('name', 'description', config.description);
      updateMetaTag('property', 'og:description', config.ogDescription || config.description);
      updateMetaTag('name', 'twitter:description', config.twitterDescription || config.description);
    }

    // Update keywords
    if (config.keywords) {
      updateMetaTag('name', 'keywords', config.keywords);
    }

    // Update canonical URL
    if (config.canonical) {
      updateLinkTag('canonical', config.canonical);
    }

    // Update Open Graph URL
    if (config.ogUrl) {
      updateMetaTag('property', 'og:url', config.ogUrl);
      updateMetaTag('name', 'twitter:url', config.ogUrl);
    }

    // Add structured data if provided
    if (config.structuredData) {
      addStructuredData(config.structuredData);
    }
  }, [config]);
}

/**
 * Update or create a meta tag
 */
function updateMetaTag(attribute: string, key: string, content: string) {
  let element = document.querySelector(`meta[${attribute}="${key}"]`);
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
}

/**
 * Update or create a link tag
 */
function updateLinkTag(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
  
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  
  element.href = href;
}

/**
 * Add structured data (JSON-LD) to the page
 */
function addStructuredData(data: object) {
  // Remove existing dynamic structured data
  const existing = document.querySelector('script[data-dynamic-seo="true"]');
  if (existing) {
    existing.remove();
  }

  // Add new structured data
  const script = document.createElement('script');
  script.setAttribute('type', 'application/ld+json');
  script.setAttribute('data-dynamic-seo', 'true');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

/**
 * Page-specific SEO configurations
 */
export const SEO_CONFIGS = {
  home: {
    title: 'Free Typing Test | TypeMasterAI - Check Your WPM & Typing Speed Online',
    description: 'Test your typing speed in 60 seconds! Free online typing test with real-time WPM calculator, accuracy tracker, AI-powered analytics, multiplayer racing, code typing mode for developers, and 23+ languages. No signup required.',
    keywords: 'typing test, typing speed test, wpm test, words per minute test, free typing test, typing speed, online typing test, typing test wpm, 1 minute typing test, typing accuracy test, typing game, typing practice, monkeytype alternative, code typing test, multiplayer typing race',
    canonical: 'https://typemaster-ai.replit.app/',
    ogUrl: 'https://typemaster-ai.replit.app/',
  },
  test: {
    title: '1 Minute Typing Speed Test | Free WPM Calculator - TypeMasterAI',
    description: 'Take a quick 1-minute typing speed test and get instant WPM results. Track your accuracy, view detailed analytics, and compare with global averages. No signup required.',
    keywords: '1 minute typing test, typing speed test, wpm calculator, typing test 60 seconds, free typing test, online typing speed test, check typing speed',
    canonical: 'https://typemaster-ai.replit.app/test',
    ogUrl: 'https://typemaster-ai.replit.app/test',
  },
  codeTest: {
    title: 'Code Typing Test for Programmers | 10+ Languages - TypeMasterAI',
    description: 'Improve your coding speed with our specialized code typing test. Practice typing in JavaScript, Python, Java, C++, and more with syntax highlighting and real-time feedback.',
    keywords: 'code typing test, programming typing test, coding speed test, developer typing practice, javascript typing test, python typing test, coding wpm',
    canonical: 'https://typemaster-ai.replit.app/code-test',
    ogUrl: 'https://typemaster-ai.replit.app/code-test',
  },
  multiplayer: {
    title: 'Multiplayer Typing Race | Compete Live Online - TypeMasterAI',
    description: 'Join real-time multiplayer typing races and compete against players worldwide. Race to type the fastest, see live WPM updates, and climb the rankings!',
    keywords: 'multiplayer typing race, typing game online, competitive typing, typeracer alternative, online typing competition, typing race multiplayer',
    canonical: 'https://typemaster-ai.replit.app/multiplayer',
    ogUrl: 'https://typemaster-ai.replit.app/multiplayer',
  },
  leaderboard: {
    title: 'Global Typing Speed Leaderboard | Top WPM Rankings - TypeMasterAI',
    description: 'View the fastest typists in the world! Browse global and code typing leaderboards, filter by language, and compete for the top spot.',
    keywords: 'typing leaderboard, fastest typists, typing speed rankings, wpm leaderboard, typing competition rankings, best typists',
    canonical: 'https://typemaster-ai.replit.app/leaderboard',
    ogUrl: 'https://typemaster-ai.replit.app/leaderboard',
  },
  analytics: {
    title: 'Typing Analytics & Performance Insights | AI-Powered - TypeMasterAI',
    description: 'Get detailed typing analytics with keystroke heatmaps, finger usage stats, WPM trends, accuracy metrics, and AI-powered personalized recommendations.',
    keywords: 'typing analytics, typing statistics, keystroke analysis, typing performance, wpm tracking, typing improvement insights',
    canonical: 'https://typemaster-ai.replit.app/analytics',
    ogUrl: 'https://typemaster-ai.replit.app/analytics',
  },
  profile: {
    title: 'Your Typing Profile & Progress | Track Improvement - TypeMasterAI',
    description: 'View your typing history, track progress over time, earn achievements, manage badges, and monitor your typing speed improvement journey.',
    keywords: 'typing profile, typing progress, typing history, typing achievements, track typing speed, typing improvement',
    canonical: 'https://typemaster-ai.replit.app/profile',
    ogUrl: 'https://typemaster-ai.replit.app/profile',
  },
};
