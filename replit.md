# TypeMasterAI - AI-Powered Typing Test Application

## Overview
TypeMasterAI is a high-performance, full-stack typing test web application designed to enhance typing skills through engaging features. It offers real-time analytics, diverse test durations and languages, user authentication, and an AI chat assistant. Key capabilities include visual progress tracking, AI-powered content generation, real-time multiplayer racing with instant matchmaking and private rooms, AI Ghost Racers that populate rooms with realistic bot opponents, a production-ready **Code Typing Mode** with continuous AI-generated code snippets (bounded by timer for timed tests) and dedicated leaderboards, an **Advanced Keystroke Analytics System** providing in-depth performance tracking and personalized recommendations, a **Smart Daily Notification System** for PWA push notifications and gamification, and **Advanced SEO Optimization** targeting top search rankings with extensive meta-data and landing pages. The project aims to provide an effective platform for typing mastery, leveraging advanced AI and a competitive environment to expand market reach and user engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18 with TypeScript and Vite, styled with Shadcn UI (New York style), Tailwind CSS v4, and custom design tokens in a dark-first "Focus Flow" theme. Typography uses DM Sans and JetBrains Mono. Animations are handled with Canvas Confetti and custom Tailwind animations, providing real-time visual feedback.

### Technical Implementations
- **Network Resilience**: Production-ready global network disconnection handling with multi-layer detection (browser online/offline + server health checks), connection state machine (connected/connecting/reconnecting/disconnected), connection quality inference, pending action queue with localStorage persistence, exponential backoff with jitter for retries, and comprehensive toast notifications. The global NetworkStatusBanner displays connection states with ARIA accessibility, countdown timers for auto-retry, and manual retry controls.
- **Frontend**: State management uses TanStack Query v5 for server state and React Context API for authentication. The typing input system uses a hidden auto-focused input field with full IME/composition event handling for multi-language support (23+ languages) and robust error handling. An advanced analytics dashboard features comprehensive visualizations using Recharts, including interactive keyboard heatmaps, finger usage distribution, and AI-powered insights. The application is a Progressive Web App (PWA) with a service worker for offline support and push notifications, including a comprehensive notification settings UI. A social sharing system generates shareable images with performance badges for viral growth. SEO is optimized with a dynamic `useSEO()` hook, structured data, font preloading, and 8 SEO-optimized landing pages with extensive internal linking.
- **Backend**: Built with Express.js on Node.js with TypeScript. Real-time communication for multiplayer racing is handled by a WebSocket server. An AI Ghost Racer system populates race rooms with intelligent bots using OpenAI GPT-4o-mini for realistic typing patterns and skill levels. Authentication is managed with Passport.js, bcryptjs, and Express session with PostgreSQL store, including security measures like rate limiting and XSS protection. The RESTful API supports authentication, test results, leaderboards, multi-language content, multiplayer race management, code typing features, push notification management, achievement, and challenge systems. AI code snippet generation utilizes OpenAI GPT-4o-mini for diverse programming languages. A production-ready job-based smart notification scheduler handles timezone-aware daily reminders, streak warnings, and weekly summaries, using VAPID authentication for web-push integration. An achievement engine automatically checks and awards progress post-test, while a challenge system provides daily and weekly competitive tasks with rewards. The AI chat assistant uses **GPT-4o** with **OpenAI native web search** (`gpt-4o-search-preview` model with `web_search_options`) as the primary search provider, with **Azure AI Foundry Bing Grounding** as fallback. The dual-provider architecture ensures reliable real-time web-grounded AI responses with automatic failover.

### Scalability Infrastructure (Million-User Ready)
The multiplayer racing system includes comprehensive scalability features designed for massive concurrent user loads:

- **Race Cache System** (`server/race-cache.ts`): In-memory LRU cache with 5-minute TTL, max 10,000 races. Buffers progress updates and flushes to database every 500ms to reduce DB writes by ~90%.
- **WebSocket Rate Limiter** (`server/ws-rate-limiter.ts`): Per-connection token bucket rate limiting with different limits per message type (progress: 20/sec, join/ready/finish: 1/sec). Includes 10KB payload validation and violation tracking.
- **Race Cleanup Scheduler** (`server/race-cleanup.ts`): Automatic stale race cleanup (waiting >10min, countdown >2min, racing >30min). Removes finished races after 24 hours.
- **Graceful Degradation**: Circuit breaker pattern with 5 DB failure threshold and 30-second recovery. Load shedding activates at 80% capacity (50,000 max connections). Connection rejection tracking.
- **Room Sharding**: 16 logical shards for race room partitioning enabling future horizontal scaling.
- **Heartbeat Monitoring**: 30-second heartbeat with 60-second connection timeout for stale connection cleanup.
- **Metrics Collector** (`server/metrics.ts`): Rolling 60-second window metrics for requests/sec, WebSocket messages/sec, response times, and error rates. Lifetime statistics tracking.
- **Health Check System** (`server/health-check.ts`): Kubernetes-compatible endpoints (`/health`, `/health/live`, `/health/ready`) for load balancer integration. Checks database latency, WebSocket state, memory usage, and cache performance.
- **Graceful Shutdown** (`server/graceful-shutdown.ts`): Proper cleanup on SIGTERM/SIGINT with cache flush, WebSocket connection closure, and 30-second timeout.
- **Database Optimization**: Composite indexes on (race_id, is_active), chunked batch updates with controlled concurrency (10 per batch, max 3 concurrent).

Monitoring endpoint: `GET /api/races/stats` provides real-time metrics for all scalability components.

### Enhanced Competitive Multiplayer Features (December 2025)
The multiplayer racing system now includes competitive gaming features comparable to TypeRacer and Monkeytype:

- **ELO Rating System** (`server/elo-rating-service.ts`): Full ELO-based skill rating with 1200 starting rating, 3000 rating cap, K-factor scaling (64 provisional, 32 regular, 24 established), and tier system (Bronze/Silver/Gold/Platinum/Diamond/Grandmaster). Features idempotency protection via processedRaces Map + DB match history checks to prevent duplicate race processing.
- **Skill-Based Matchmaking**: Players are matched within ±200 rating tolerance. API endpoint: `GET /api/matchmaking/pool` returns compatible players.
- **Anti-Cheat Validation** (`server/anticheat-service.ts`): Keystroke timing analysis with minimum 10ms interval detection, server-side WPM recalculation, synthetic input detection via `isTrusted` flag, and cheating probability scoring.
- **Race Replays** (`server/websocket.ts`): Keystroke-level race recording stored in `race_replays` table. API endpoint: `GET /api/replays/:raceId` retrieves replay data for playback.
- **In-Race Chat**: Real-time WebSocket chat with message history persisted to `race_chat_messages` table. Chat UI in waiting room and during races (disabled while typing).
- **Spectator Mode**: Users can watch live races without participating. WebSocket handlers for join/leave spectating.
- **Match History**: Detailed race results with rating changes stored in `race_match_history` table. API endpoint: `GET /api/match-history`.
- **Rating Leaderboard**: Global and tier-specific leaderboards. API endpoint: `GET /api/ratings/leaderboard`.

New Database Tables: `user_ratings`, `race_match_history`, `race_keystrokes`, `race_chat_messages`, `race_spectators`, `race_replays`, `anti_cheat_challenges`.

### Production-Ready Leaderboard System (December 2025)
The leaderboard system has been enhanced with enterprise-grade features for performance and scalability:

- **Leaderboard Caching Service** (`server/leaderboard-cache.ts`): In-memory LRU cache with type-specific TTLs (global: 30s, stress: 5s, rating: 15s, aroundMe: 10s). Features true LRU eviction, cache statistics tracking (hits/misses/hit rate), and max 100 entries.
- **Cursor-Based Pagination**: All leaderboards support cursor-based pagination with configurable limits (max 100 per page). Provides stable pagination even as data changes.
- **Time-Based Leaderboards**: Daily, weekly, and monthly leaderboards with automatic date filtering. API endpoints: `/api/leaderboard?timeframe=daily|weekly|monthly|all`.
- **"Around Me" Rankings**: Shows users their position relative to nearby competitors (configurable range, default 5). Authenticated endpoint: `/api/leaderboard/around-me`.
- **HTTP Caching Headers**: All leaderboard endpoints include `Cache-Control`, `X-Cache` (HIT/MISS), and `X-Total-Count` headers for CDN integration.
- **Verified Score Badges**: Displays verification status from anti-cheat challenges. Users who pass verification challenges get a green checkmark badge on leaderboards.
- **Multi-Type Support**: Global, stress test, code typing, dictation, and rating leaderboards all share the same caching and pagination infrastructure.

API Endpoints:
- `GET /api/leaderboard` - Global leaderboard with timeframe filter
- `GET /api/leaderboard/around-me` - User's surrounding ranks
- `GET /api/leaderboard/time-based` - Time-filtered leaderboard
- `GET /api/leaderboard/cache-stats` - Cache performance metrics
- `GET /api/stress-test/leaderboard/around-me` - Stress test around-me
- `GET /api/code/leaderboard/around-me` - Code typing around-me
- `GET /api/dictation/leaderboard/around-me` - Dictation around-me
- `GET /api/ratings/leaderboard/around-me` - Rating around-me

Frontend Pages:
- `/leaderboard` - Global leaderboard with timeframe tabs and pagination
- `/stress-leaderboard` - Stress test leaderboard with difficulty filters
- `/code/leaderboard` - Code typing leaderboard with language filters

### System Design Choices
- **Data Layer**: PostgreSQL database managed with Drizzle ORM. The schema includes tables for users, test results, typing paragraphs, code snippets, code typing tests, races, race participants (with soft-delete), keystroke events, typing analytics, typing insights, practice recommendations, push subscriptions, notification preferences, notification jobs, notification history, achievements, user achievements, challenges, and user gamification.
- **Validation**: Zod for runtime validation and Drizzle-Zod for schema conversion, enforcing strict TypeScript.
- **Build & Deployment**: Development uses separate client/server dev servers with HMR. Production client is bundled with Vite, and the server with esbuild.

## External Dependencies

### Third-Party Services
- **Database Hosting**: Neon Serverless PostgreSQL.
- **AI Services**: 
  - OpenAI GPT-4o (main chat model with streaming responses)
  - OpenAI gpt-4o-search-preview (native web search for real-time information)
  - OpenAI GPT-4o-mini (bot username generation, code snippet generation, search decision)
  - Azure AI Foundry (Bing Grounding fallback for web search)
- **Web Search**: OpenAI native web search (primary), Azure AI Foundry Bing Grounding (fallback).

### Key NPM Packages
- **UI & Styling**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `canvas-confetti`, `recharts`, `prismjs`.
- **Data & Forms**: `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
- **Backend**: `express`, `express-session`, `passport`, `passport-local`, `bcryptjs`, `drizzle-orm`, `@neondatabase/serverless`, `ws`, `openai`, `web-push`, `@azure/ai-projects`, `@azure/identity`.
- **Development Tools**: `vite`, `@vitejs/plugin-react`, `typescript`, `tsx`, `esbuild`, `drizzle-kit`.