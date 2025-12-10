# TypeMasterAI - AI-Powered Typing Test Application

## Overview
TypeMasterAI is a high-performance, full-stack typing test web application designed to enhance typing skills through engaging features. It offers real-time analytics, diverse test durations and languages, user authentication, and an AI chat assistant. Key capabilities include visual progress tracking, AI-powered content generation, real-time multiplayer racing with instant matchmaking, private rooms, and AI Ghost Racers. It features a production-ready Code Typing Mode with continuous AI-generated code snippets and dedicated leaderboards, an Advanced Keystroke Analytics System for in-depth performance tracking, a Smart Daily Notification System for PWA push notifications and gamification, and Advanced SEO Optimization. The project aims to provide an effective platform for typing mastery, leveraging advanced AI and a competitive environment to expand market reach and user engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## Contact & Communication
**Company Location:** Solapur, Maharashtra 413224, India
**Service Scope:** Global (serves users worldwide)

Domain-based email system for all communications:
- support@typemasterai.com - User support, privacy, legal, accessibility, and all two-way communications
- business@typemasterai.com - Business inquiries, partnerships, and official business correspondence
- no-reply@typemasterai.com - Automated system notifications (password resets, registrations, transactional emails)
- Admin email for feedback management: amar01pawar80@gmail.com

**Email Deliverability Status:**
- Mailgun domain (mg.typemasterai.com) fully verified with SPF, DKIM, DMARC
- Email tracking disabled for transactional emails to maximize deliverability
- Domain reputation building in progress (2-4 weeks for full trust)
- CAN-SPAM compliant with physical mailing address in all email footers (Solapur, Maharashtra 413224, India)
- Optimized email templates for spam filter compatibility (no external fonts, proper headers)

## Recent Changes (December 2025)

### Cursor Removal from Typing Test (December 10, 2025 - COMPLETED)
- **Issue**: User requested removal of the visual cursor from the typing test
- **Solution Implemented**:
  - Removed cursor span element rendering completely from the typing test component
  - Cursor-related state and positioning logic retained (can be re-enabled if needed)
  - Typing functionality remains fully intact - characters still change color to show correct/incorrect input
- **Files Modified**: `client/src/components/typing-test.tsx`
- **Testing**: 
  - Verified no cursor visible on page load
  - Verified no cursor visible during typing
  - Verified typing functionality works normally (characters turn green/red)
  - Verified restart and all other features work without issues
- **Technical Details**: 
  - Removed the absolutely positioned cursor span that was styled with yellow/gold color
  - Hidden input field still receives all keystrokes for typing detection
  - Visual feedback now relies solely on character color changes (gray → green/red)

### Certificate System Implementation (COMPLETED)
- **Certificate Coverage**: Expert-level certificates now available across ALL 7 typing modes (100% coverage)
  - ✅ Standard Mode: Certificate with tier-based visuals and performance metrics
  - ✅ Code Typing Mode: Certificate with code language, snippet preview, and specialized metrics
  - ✅ Book Mode: Certificate with book title, author, and reading-specific stats
  - ✅ Race/Multiplayer Mode: Certificate with placement badges and opponent metrics
  - ✅ Chapter Typing: Certificate with book + chapter metadata
  - ✅ Dictation Mode: Certificate with speed level, sentences completed, and total words
  - ✅ Stress Test Mode: Certificate with difficulty, stress score, survival time, and active challenges
  - ✅ Profile Certificate Gallery: Full filtering by mode, view/download functionality
  - ✅ Shared Results Certificate Display: Code test shared results show certificates
- **Database Schema**: Created `certificates` table with:
  - Multi-mode support (standard, code, book, race, chapter, dictation, stress)
  - Foreign keys to all test result tables (cascade delete)
  - Denormalized performance metrics (WPM, accuracy, consistency, duration)
  - Sharing features (unique shareId, view count, public/private toggle)
  - JSONB metadata for mode-specific data
  - Optimized indexes for user queries, type filtering, and chronological ordering
- **Certificate Design Pattern**: Consistent tabbed share dialog (Certificate/Card/Link) across all modes
- **Sharing Features**: Download as PNG, copy share link, social media integration
- **Tier System**: Diamond/Platinum/Gold/Silver/Bronze based on performance metrics
- **Consistency Formula**: Standardized across all modes: `100 - (errors/characters)*100` clamped 0-100

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript and Vite, styled with Shadcn UI (New York style), Tailwind CSS v4, and custom design tokens in a dark-first "Focus Flow" theme. Typography uses DM Sans and JetBrains Mono. Animations are handled with Canvas Confetti and custom Tailwind animations.

### Technical Implementations
- **Network Resilience**: Global network disconnection handling with multi-layer detection, connection state machine, pending action queue with localStorage persistence, exponential backoff with jitter, and comprehensive toast notifications.
- **Frontend**: State management uses TanStack Query v5 for server state and React Context API for authentication. The typing input system supports multi-language input (23+ languages). An advanced analytics dashboard features comprehensive visualizations using Recharts, including interactive keyboard heatmaps and AI-powered insights. The application is a Progressive Web App (PWA) with offline support and push notifications. SEO is optimized with a dynamic `useSEO()` hook and 8 SEO-optimized landing pages.
- **Backend**: Built with Express.js on Node.js with TypeScript. Real-time communication for multiplayer racing is handled by a WebSocket server. An AI Ghost Racer system populates race rooms with intelligent bots using OpenAI GPT-4o-mini. Authentication is managed with Passport.js, bcryptjs, and Express session with PostgreSQL store. The RESTful API supports authentication, test results, leaderboards, multi-language content, multiplayer race management, code typing features, push notification management, achievement, and challenge systems. AI code snippet generation utilizes OpenAI GPT-4o-mini. A production-ready job-based smart notification scheduler handles timezone-aware daily reminders. An achievement engine and challenge system provide gamification. The AI chat assistant uses **GPT-4o** with **OpenAI native web search** (`gpt-4o-search-preview`) as the primary search provider, with **Azure AI Foundry Bing Grounding** as fallback, ensuring reliable real-time web-grounded AI responses.
- **Scalability Infrastructure**: Designed for massive concurrent user loads with features like a Race Cache System, WebSocket Rate Limiter, Race Cleanup Scheduler, Graceful Degradation (circuit breaker, load shedding), Room Sharding, Heartbeat Monitoring, Metrics Collector, Health Check System, Graceful Shutdown, and Database Optimization (composite indexes, chunked batch updates).
- **Competitive Multiplayer Features**: Includes an ELO Rating System with skill-based matchmaking, Anti-Cheat Validation (keystroke timing analysis, server-side WPM recalculation, synthetic input detection), Race Replays, In-Race Chat, Spectator Mode, Match History, and a Rating Leaderboard.
- **Private Room System**: Comprehensive production hardening with Host Failover, Reconnection Support (5-minute window), Double-Action Prevention for countdowns, Countdown Cancellation, Rate Limiting per command, Typed Error Codes, Timer Cleanup, and `isBot` propagation.
- **Production Limitation (Single-Instance)**: The current multiplayer racing architecture stores all room state, matchmaking queues, and race timers in a single Node.js process memory. This means the application must run on a single server instance. For horizontal scaling across multiple servers, a distributed coordination layer (Redis pub/sub or PostgreSQL advisory locks) would be required for race rooms and matchmaking. This limitation is acceptable for initial launch but should be addressed for high-traffic scaling.
- **Leaderboard System**: Enterprise-grade features including a Leaderboard Caching Service, Cursor-Based Pagination, Time-Based Leaderboards (Daily, Weekly, Monthly), "Around Me" Rankings, HTTP Caching Headers, Verified Score Badges, and Multi-Type Support (Global, Stress Test, Code Typing, Dictation, Rating).
- **Legal & Compliance Infrastructure**: Production-ready legal framework for global operations:
  - **AI Transparency Notice** (`/ai-transparency`): EU AI Act compliance disclosures, AI data processing transparency, AI limitations disclosure
  - **Accessibility Statement** (`/accessibility`): WCAG 2.1 Level AA compliance documentation, accessibility features, known limitations
  - **Cookie Consent Banner**: GDPR-compliant cookie consent with Accept/Reject/Customize options, 6-month consent refresh
  - **CCPA Compliance**: "Do Not Sell My Info" footer link with anchor navigation to Privacy Policy CCPA section
  - **Privacy Policy**: Production-ready with generic vendor references (no OpenAI/PostgreSQL exposure), covers GDPR/CCPA, international data transfers
  - **Terms of Service**: Governed by Indian law (jurisdiction: Solapur, Maharashtra, India), designed for global user base
  - **Governing Law**: All legal pages reference India as operational base, with international service delivery
  - **Footer ARIA Landmarks**: Proper accessibility attributes (role="contentinfo", aria-label) per WCAG requirements

### System Design Choices
- **Data Layer**: PostgreSQL database managed with Drizzle ORM, with a schema including users, test results, content, races, analytics, notifications, achievements, and gamification.
- **Validation**: Zod for runtime validation and Drizzle-Zod for schema conversion.
- **Build & Deployment**: Development uses separate client/server dev servers; production client bundled with Vite, server with esbuild.

## External Dependencies

### Third-Party Services
- **Database Hosting**: Neon Serverless PostgreSQL.
- **Email Service**: Mailgun (domain: mg.typemasterai.com) - handles transactional emails with full metadata tracking (tags, custom variables, scheduled delivery).
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