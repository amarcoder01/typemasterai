# TypeMasterAI - AI-Powered Typing Test Application

## Overview
TypeMasterAI is a high-performance, full-stack typing test web application designed to enhance typing skills through engaging features. It offers real-time analytics, diverse test durations and languages, user authentication, and an AI chat assistant. Key capabilities include visual progress tracking, AI-powered content generation, real-time multiplayer racing with instant matchmaking, private rooms, AI Ghost Racers, a production-ready Code Typing Mode with continuous AI-generated code snippets, dedicated leaderboards, an Advanced Keystroke Analytics System, a Smart Daily Notification System for PWA push notifications and gamification, and Advanced SEO Optimization. The project aims to provide an effective platform for typing mastery, leveraging advanced AI and a competitive environment to expand market reach and user engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (December 2025)

### Enhanced AI Difficulty System with Word Count Validation (December 10, 2025 - COMPLETED)
- **Issue**: AI-generated paragraphs needed to respect difficulty levels (Easy, Medium, Hard) with appropriate vocabulary complexity, sentence structure, AND strict word count ranges
- **Solution**: Implemented comprehensive difficulty system with server-side validation and smart text extension logic
- **Implementation Details**:
  1. **Difficulty Guidelines** (`server/ai-paragraph-generator.ts`):
     - **Easy (25-35 words)**: Simple vocabulary, short sentences (8-12 words), basic concepts, everyday language
     - **Medium (35-50 words)**: Moderate vocabulary, medium sentences (10-15 words), intermediate concepts, occasional specialized terms
     - **Hard (50-70 words)**: Advanced vocabulary, complex sentences (12-20 words), nuanced concepts, specialized terminology
  2. **Strict Word Count Enforcement** (`server/ai-paragraph-generator.ts`):
     - Added `countWords()` helper function for accurate word counting
     - Added `parseWordCountRange()` to extract min/max from difficulty ranges
     - Implemented retry loop (max 3 attempts) with post-generation validation
     - Content rejected and regenerated if word count falls outside min-max range
     - Prompts clarified: "Write between X and Y words (inclusive). This is mandatory."
  3. **Server-Side Validation**:
     - Each AI generation is validated for word count before being saved/returned
     - Detailed logging shows attempt numbers, word counts, and validation status
     - Failed validations trigger automatic retry with fresh generation
     - Success logged only when content passes ALL validations (word count + no banned terms)
  4. **Smart Text Extension Logic** (`client/src/components/typing-test.tsx`):
     - **When user clicks "New Paragraph"** (`forceGenerate=true`): NO extension - respects difficulty word counts exactly (Easy: 25-35, Medium: 35-50, Hard: 50-70)
     - **When loading from database/queue** (`forceGenerate=false`): Text MAY be extended to fill timed test duration
     - This ensures difficulty ranges are strictly respected for explicit AI generations while still supporting longer timed tests
     - `data-original-paragraph` attribute exposes the base AI-generated paragraph for testing/validation
     - `data-paragraph-text` attribute contains the actual typing test text (may include extensions for database paragraphs)
- **Testing Infrastructure**: Added `data-testid="text-paragraph"` and `data-original-paragraph` for automated testing
- **Result**: AI now generates content with appropriate difficulty, strictly enforced word counts on server, and smart client-side extension that respects explicit user requests for difficulty-focused paragraphs
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