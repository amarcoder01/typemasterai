# TypeMasterAI - AI-Powered Typing Test Application

## Overview
TypeMasterAI is a high-performance, full-stack typing test web application designed to enhance typing skills through engaging features. It offers real-time analytics, diverse test durations and languages, user authentication, and an AI chat assistant. Key capabilities include visual progress tracking, AI-powered content generation, real-time multiplayer racing with instant matchmaking, private rooms, AI Ghost Racers, a production-ready Code Typing Mode with continuous AI-generated code snippets, dedicated leaderboards, an Advanced Keystroke Analytics System, a Smart Daily Notification System for PWA push notifications and gamification, and Advanced SEO Optimization. The project aims to provide an effective platform for typing mastery, leveraging advanced AI and a competitive environment to expand market reach and user engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (December 2025)

### Educational & Engaging General Mode Content (December 10, 2025 - LATEST)
- **Enhancement**: Updated General Mode to generate educational, engaging content that helps users learn while typing
- **Implementation**:
  - **Enhanced Subtopics**: 30+ new engaging topics across Technology & Learning, Friendship & Relationships, Personal Growth, Interesting Topics & Knowledge, Life Skills, and Culture & Society
  - **Educational Focus**: AI now generates content that teaches valuable lessons, interesting facts, and practical insights
  - **Topics Include**: Technology basics, building friendships, personal development, fascinating science, life skills, cultural knowledge
  - **User Engagement**: Content written as if teaching a friend - relatable, practical, and inspiring curiosity
  - **Real-World Value**: Every paragraph helps users gain knowledge, insights, or actionable understanding
- **Result**: General mode now provides educational value beyond typing practice, engaging users with meaningful, learning-focused content
- **Files Modified**: `server/ai-paragraph-generator.ts`

### Enhanced AI Difficulty System Based on Content Complexity (December 10, 2025 - COMPLETED)
- **Issue**: AI-generated paragraphs needed to respect difficulty levels (Easy, Medium, Hard) through appropriate vocabulary complexity, sentence structure, and content depth
- **Solution**: Implemented comprehensive difficulty system that maintains difficulty through content complexity without word count constraints
- **Implementation Details**:
  1. **Difficulty Guidelines** (`server/ai-paragraph-generator.ts`):
     - **Easy**: Simple vocabulary, short sentences (8-12 words), basic concepts, everyday language
     - **Medium**: Moderate vocabulary, medium sentences (10-15 words), intermediate concepts, occasional specialized terms
     - **Hard**: Advanced vocabulary, complex sentences (12-20 words), nuanced concepts, specialized terminology
     - **Natural Length**: AI generates paragraphs with natural length based on content and difficulty level, no artificial word count constraints
  2. **Content Validation** (`server/ai-paragraph-generator.ts`):
     - Implemented retry loop (max 3 attempts) for content quality validation
     - Validates that content doesn't contain typing-related terms (typing, keyboard, practice, etc.)
     - Content rejected and regenerated if forbidden terms are found
     - Word count logged for monitoring but not enforced
  3. **Smart Text Extension Logic** (`client/src/components/typing-test.tsx`):
     - **When user clicks "New Paragraph"** (`forceGenerate=true`): NO extension - uses AI-generated paragraph as-is
     - **When loading from database/queue** (`forceGenerate=false`): Text MAY be extended to fill timed test duration
     - `data-original-paragraph` attribute exposes the base AI-generated paragraph
     - `data-paragraph-text` attribute contains the actual typing test text (may include extensions for timed tests)
- **Testing Infrastructure**: Added `data-testid="text-paragraph"` with data attributes for automated testing
- **Result**: AI generates content with appropriate difficulty through vocabulary complexity, sentence structure, and content depth, without artificial word count limits
- **Files Modified**: `server/ai-paragraph-generator.ts`, `client/src/components/typing-test.tsx`

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript and Vite, styled with Shadcn UI (New York style), Tailwind CSS v4, and custom design tokens in a dark-first "Focus Flow" theme. Typography uses DM Sans and JetBrains Mono. Animations are handled with Canvas Confetti and custom Tailwind animations.

### Technical Implementations
- **Network Resilience**: Global network disconnection handling with multi-layer detection, connection state machine, pending action queue with localStorage persistence, exponential backoff with jitter, and comprehensive toast notifications.
- **Frontend**: State management uses TanStack Query v5 for server state and React Context API for authentication. The typing input system supports multi-language input (23+ languages). An advanced analytics dashboard features comprehensive visualizations using Recharts, including interactive keyboard heatmaps and AI-powered insights. The application is a Progressive Web App (PWA) with offline support and push notifications. SEO is optimized with a dynamic `useSEO()` hook and 8 SEO-optimized landing pages.
- **Backend**: Built with Express.js on Node.js with TypeScript. Real-time communication for multiplayer racing is handled by a WebSocket server. An AI Ghost Racer system populates race rooms with intelligent bots. Authentication is managed with Passport.js, bcryptjs, and Express session with PostgreSQL store. The RESTful API supports authentication, test results, leaderboards, multi-language content, multiplayer race management, code typing features, push notification management, achievement, and challenge systems. AI code snippet generation and chat assistance are integrated. A production-ready job-based smart notification scheduler handles timezone-aware daily reminders. An achievement engine and challenge system provide gamification.
- **Scalability Infrastructure**: Designed for massive concurrent user loads with features like a Race Cache System, WebSocket Rate Limiter, Race Cleanup Scheduler, Graceful Degradation (circuit breaker, load shedding), Room Sharding, Heartbeat Monitoring, Metrics Collector, Health Check System, Graceful Shutdown, and Database Optimization (composite indexes, chunked batch updates).
- **Competitive Multiplayer Features**: Includes an ELO Rating System with skill-based matchmaking, Anti-Cheat Validation, Race Replays, In-Race Chat, Spectator Mode, Match History, and a Rating Leaderboard.
- **Private Room System**: Comprehensive production hardening with Host Failover, Reconnection Support, Double-Action Prevention for countdowns, Countdown Cancellation, Rate Limiting per command, Typed Error Codes, Timer Cleanup, and `isBot` propagation.
- **Production Limitation (Single-Instance)**: The current multiplayer racing architecture stores all room state, matchmaking queues, and race timers in a single Node.js process memory, requiring the application to run on a single server instance for multiplayer functionality.
- **Leaderboard System**: Enterprise-grade features including a Leaderboard Caching Service, Cursor-Based Pagination, Time-Based Leaderboards (Daily, Weekly, Monthly), "Around Me" Rankings, HTTP Caching Headers, Verified Score Badges, and Multi-Type Support (Global, Stress Test, Code Typing, Dictation, Rating).
- **Legal & Compliance Infrastructure**: Production-ready legal framework for global operations including AI Transparency Notice, Accessibility Statement, Cookie Consent Banner, CCPA Compliance, Privacy Policy, and Terms of Service, all referencing India as the operational base.
- **Certificate System**: Expert-level certificates available across all 7 typing modes (Standard, Code Typing, Book, Race/Multiplayer, Chapter Typing, Dictation, Stress Test) with mode-specific visuals and metrics. Features a consistent tabbed share dialog, download as PNG, copy share link, social media integration, and a Diamond/Platinum/Gold/Silver/Bronze tier system.

### System Design Choices
- **Data Layer**: PostgreSQL database managed with Drizzle ORM, with a schema including users, test results, content, races, analytics, notifications, achievements, and gamification.
- **Validation**: Zod for runtime validation and Drizzle-Zod for schema conversion.
- **Build & Deployment**: Development uses separate client/server dev servers; production client bundled with Vite, server with esbuild.

## External Dependencies

### Third-Party Services
- **Database Hosting**: Neon Serverless PostgreSQL.
- **Email Service**: Mailgun (domain: mg.typemasterai.com).
- **AI Services**:
  - OpenAI GPT-4o (main chat model)
  - OpenAI gpt-4o-search-preview (native web search)
  - OpenAI GPT-4o-mini (bot username generation, code snippet generation)
  - Azure AI Foundry (Bing Grounding fallback for web search)
- **Web Search**: OpenAI native web search (primary), Azure AI Foundry Bing Grounding (fallback).

### Key NPM Packages
- **UI & Styling**: `@radix-ui/*`, `tailwindcss`, `lucide-react`, `canvas-confetti`, `recharts`, `prismjs`.
- **Data & Forms**: `@tanstack/react-query`, `react-hook-form`, `zod`, `drizzle-zod`.
- **Backend**: `express`, `express-session`, `passport`, `bcryptjs`, `drizzle-orm`, `@neondatabase/serverless`, `ws`, `openai`, `web-push`, `@azure/ai-projects`, `@azure/identity`, `mailgun.js`, `form-data`.
- **Development Tools**: `vite`, `typescript`, `esbuild`, `drizzle-kit`.