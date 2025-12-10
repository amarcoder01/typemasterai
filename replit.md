# TypeMasterAI - AI-Powered Typing Test Application

## Overview
TypeMasterAI is a high-performance, full-stack typing test web application designed to enhance typing skills through engaging features. It offers real-time analytics, diverse test durations and languages, user authentication, and an AI chat assistant. Key capabilities include visual progress tracking, AI-powered content generation, real-time multiplayer racing with instant matchmaking, private rooms, AI Ghost Racers, a production-ready Code Typing Mode with continuous AI-generated code snippets, dedicated leaderboards, an Advanced Keystroke Analytics System, a Smart Daily Notification System for PWA push notifications and gamification, and Advanced SEO Optimization. The project aims to provide an effective platform for typing mastery, leveraging advanced AI and a competitive environment to expand market reach and user engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

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