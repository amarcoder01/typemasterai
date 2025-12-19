# TypeMasterAI - AI-Powered Typing Test Application

## Overview
TypeMasterAI is a high-performance, full-stack typing test web application aimed at enhancing typing skills through engaging features. It provides real-time analytics, diverse test durations and languages, user authentication, and an AI chat assistant. Key capabilities include visual progress tracking, AI-powered content generation, real-time multiplayer racing with instant matchmaking and AI Ghost Racers, a production-ready Code Typing Mode with Monkeytype-style strict validation, dedicated leaderboards, advanced keystroke analytics, a smart daily notification system (PWA), and advanced SEO optimization. The project's vision is to become a leading platform for typing mastery, leveraging AI and a competitive environment to drive user engagement and expand market reach.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18 with TypeScript and Vite, styled with Shadcn UI (New York style), Tailwind CSS v4, and custom design tokens in a dark-first "Focus Flow" theme. Typography uses DM Sans and JetBrains Mono, with animations handled by Canvas Confetti and custom Tailwind animations.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Shadcn UI, Tailwind CSS, TanStack Query v5 for server state, React Context API for authentication, multi-language input (23+ languages), advanced analytics dashboard with Recharts, interactive keyboard heatmaps, PWA with offline support and push notifications, and dynamic SEO with 8 landing pages. It includes a production-ready strict validation system for Standard Mode with stop-on-error enforcement, space/backspace validation, persistent error highlighting, comprehensive anti-cheat measures (selection blocking, paste prevention, drag-drop blocking, keyboard shortcut blocking), Monkeytype-style character-by-character state tracking where incorrect characters remain red until properly corrected, and industry-standard cursor implementation using content coordinates with synchronous scroll recalculation for perfect alignment during manual scrolling.
- **Backend**: Express.js on Node.js with TypeScript, WebSocket server for real-time multiplayer, AI Ghost Racer system, Passport.js for authentication, RESTful API for various features, AI code snippet generation and chat assistance, job-based smart notification scheduler, achievement engine, and challenge system.
- **Scalability Infrastructure**: Designed for massive concurrent user loads with features like Race Cache System, WebSocket Rate Limiter, Room Sharding, and Database Optimization.
- **Competitive Multiplayer Features**: ELO Rating System with skill-based matchmaking, Anti-Cheat Validation, Race Replays, In-Race Chat, Spectator Mode, Match History, and Rating Leaderboard. The current multiplayer architecture requires a single Node.js instance due to in-memory state management.
- **Private Room System**: Features Host Failover, Reconnection Support, Countdown Management, and Rate Limiting.
- **Leaderboard System**: Leaderboard Caching Service, Cursor-Based Pagination, Time-Based Leaderboards, "Around Me" Rankings, and Multi-Type Support across various typing modes.
- **Legal & Compliance Infrastructure**: AI Transparency Notice, Accessibility Statement, Cookie Consent Banner, CCPA Compliance, Privacy Policy, and Terms of Service.
- **Certificate System**: Expert-level certificates across 7 typing modes with mode-specific visuals and metrics, share functionality, tiered achievement levels, and a cryptographically secure verification system with HMAC-SHA256 signatures, QR codes, public verification portal, and audit logging.
- **AI-Powered Content Generation**: Enhanced difficulty system for AI-generated paragraphs (Easy, Medium, Hard) based on vocabulary, sentence structure, and content depth, with multi-language and cultural adaptation for 95 educational topics.

### System Design Choices
- **Data Layer**: PostgreSQL database managed with Drizzle ORM, storing users, test results, content, races, analytics, notifications, and gamification data.
- **Validation**: Zod for runtime validation and Drizzle-Zod for schema conversion.
- **Build & Deployment**: Client bundled with Vite, server with esbuild for production.

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
- **Certificate Verification**: `qrcode` for QR code generation.

## Environment Variables

### Required for Production
- `DATABASE_URL`: PostgreSQL connection string (Neon Serverless)
- `SESSION_SECRET`: Express session secret (32+ characters)
- `CERTIFICATE_SECRET`: HMAC signing secret for certificate verification (32+ characters, required in production)
- `MAILGUN_API_KEY`: Mailgun API key for email service
- `OPENAI_API_KEY`: OpenAI API key for AI features

### Optional
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: For push notifications
- `AZURE_AI_PROJECT_CONNECTION_STRING`: For Azure AI Foundry fallback
- `NODE_ENV`: Set to `production` for production builds