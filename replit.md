# TypeMasterAI - AI-Powered Typing Test Application

## Overview
TypeMasterAI is a high-performance, full-stack typing test web application designed to help users improve their typing skills. It offers real-time analytics, various test durations (15s, 30s, 60s, 120s), multi-language support (23 languages), diverse paragraph categories, user authentication, and an AI chat assistant. The application tracks progress with visual charts and provides AI-powered content generation for customized practice. **NEW: Real-Time Multiplayer Racing** allows users to compete head-to-head with instant matchmaking, private rooms, live progress tracking, and WebSocket-powered real-time updates. **LATEST: AI Ghost Racers** automatically fill race rooms with realistic bot opponents featuring OpenAI-generated unique names, human-like typing patterns, and variable skill levels to ensure competitive races even when few human players are online. Its core purpose is to provide an engaging and effective platform for typing mastery, with a vision for expanding market reach and user engagement through advanced AI features and a competitive environment.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework & Build**: React 18 with TypeScript, Vite for fast HMR.
- **UI Component System**: Shadcn UI (New York style) built on Radix UI, Tailwind CSS v4 for styling with custom design tokens, dark-first "Focus Flow" theme. Typography uses DM Sans and JetBrains Mono.
- **State Management & Data Fetching**: TanStack Query v5 for server state, Context API for authentication, React hooks for local state.
- **Animation & Visual Feedback**: Canvas Confetti, custom Tailwind animations, real-time loading states, and toast notifications.

### Backend Architecture
- **Server Framework**: Express.js on Node.js with TypeScript, running in dual-mode (dev/prod).
- **Real-Time Communication**: WebSocket server (ws library) for multiplayer racing with room management, participant tracking, countdown timers, live progress broadcasting, and automatic race state transitions.
- **AI Ghost Racer System**: Intelligent bot service that automatically populates race rooms when human players are scarce. Features OpenAI GPT-4o-mini-powered unique username generation with fallback algorithms, 7 realistic skill levels (35-130 WPM, 88-99% accuracy), human-like typing patterns with variable delays (50-200ms), error injection, typing bursts/pauses, and race-condition-free finish handling using atomic counter with SELECT FOR UPDATE row locking and isNewFinish flag for idempotent broadcasts. Bot progress persisted to PostgreSQL for seamless synchronization.
- **Authentication & Security**: Passport.js with LocalStrategy, bcryptjs for password hashing (10 rounds), Express session with PostgreSQL store, HTTP-only cookies, rate limiting, DOMPurify for XSS protection, and React ErrorBoundary for graceful error handling.
- **API Design**: RESTful API with endpoints for authentication, test results, statistics, leaderboard, multi-language typing content, and multiplayer race management (quick match, create room, join room, race state).

### Data Layer
- **Database**: PostgreSQL (Neon Serverless compatible) managed with Drizzle ORM for type-safe queries.
- **Schema Design**:
    - **Users**: UUID, username, email, hashed password, avatar color, streak tracking, timestamp.
    - **Test Results**: Serial ID, foreign key to users, WPM, accuracy, mode (duration), character/error count, timestamp.
    - **Typing Paragraphs**: Serial ID, language code (23 supported), mode/category (8+ categories), difficulty, content, word count, timestamp.
    - **Races**: Serial ID, unique room code (6 chars), status (waiting/countdown/racing/finished), paragraph content, max players, privacy flag, **finish counter for atomic position assignment**, start/finish timestamps.
    - **Race Participants**: Serial ID, foreign key to races, optional user ID (supports guests), **guestName (stores guest ID)**, username, avatar color, **isBot flag for AI ghost racers**, **isActive flag for soft-delete**, real-time progress (characters typed), live WPM, accuracy, error count, finish position (atomically assigned via race-level counter with SELECT FOR UPDATE locking), isFinished flag, timestamps.
- **Validation & Type Safety**: Zod for runtime validation, Drizzle-Zod for schema conversion, strict TypeScript configuration.

### Build & Deployment
- **Development**: Separate dev servers (client/server), HMR.
- **Production**: Vite bundles client code, esbuild bundles server code.
- **Deployment Considerations**: Replit-specific plugins, environment-based configuration, secure session secret handling.

## External Dependencies

### Third-Party Services
- **Database Hosting**: Neon Serverless PostgreSQL.

### Key NPM Packages
- **UI & Styling**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `canvas-confetti`, `recharts`.
- **Data & Forms**: `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
- **Backend**: `express`, `express-session`, `passport`, `passport-local`, `bcryptjs`, `drizzle-orm`, `@neondatabase/serverless`, `ws`, `openai` (GPT-4o-mini for bot username generation).
- **Development Tools**: `vite`, `@vitejs/plugin-react`, `typescript`, `tsx`, `esbuild`, `drizzle-kit`.

## Recent Changes

### AI Ghost Racer Implementation (November 24, 2025)
- **Intelligent Bot System**: Created comprehensive AI bot service (`server/bot-service.ts`) with OpenAI GPT-4o-mini integration for generating unique, believable usernames for each race. Fallback to algorithmic generation ensures reliability.
- **Realistic Skill Levels**: Implemented 7 difficulty tiers from beginner (35-50 WPM, 88-92% accuracy) to elite (120-130 WPM, 98-99% accuracy) with human-like variance.
- **Human-Like Typing Simulation**: Bots type with realistic patterns including variable delays (50-200ms), typing bursts/pauses, intentional mistakes, and natural rhythm variations to mimic real human behavior.
- **Automatic Lobby Filling**: Race countdown system intelligently adds AI ghost racers when fewer than max players join, ensuring competitive races always have sufficient opponents.
- **Race-Condition-Free Finish Handling**: Implemented atomic finish position assignment using race-level `finishCounter` with PostgreSQL SELECT FOR UPDATE row locking, transaction-based serialization, and `isNewFinish` flag to prevent duplicate broadcasts. This guarantees exactly one position per racer and exactly one finish event broadcast to clients, even under high concurrency.
- **Database Schema Updates**: Added `isBot` flag to `race_participants` table for tracking AI racers, and `finishCounter` to `races` table for contention-safe position assignment.
- **Production-Ready Implementation**: Comprehensive error handling, timer cleanup, profile management, and resource cleanup ensure stable performance under load.

### Soft-Delete Participant System (November 24, 2025)
- **Eliminated Duplicate Participants**: Implemented comprehensive soft-delete system with `isActive` flag (default 1) in race_participants table, preventing duplicate entries when users refresh pages or rejoin races.
- **Stable Guest Identity**: Added persistent guest ID system using localStorage (`multiplayer_guest_id`) that survives page refreshes and prevents duplicate guest participants across sessions.
- **Smart Reactivation Flow**: Implemented active→inactive→create sequence in all join endpoints (quick-match, create, join) that checks for existing active participants first, then searches for inactive participants to reactivate, and only creates new entries if neither exist.
- **Proper Leave/Rejoin Handling**: Soft-delete sets `isActive = 0` when participants leave, preserving database records for analytics while allowing seamless reactivation with reset state (progress, WPM, accuracy, finish position) when they rejoin.
- **WebSocket Synchronization**: Added `participant_left` broadcast after soft-delete to ensure all connected clients remove departed players from UI in real-time, eliminating ghost entries.
- **Capacity Check Optimization**: Reordered capacity validation to occur only when creating new participants, not when reactivating returning players, preventing false "Race is full" errors for legitimate rejoins.
- **Clean Guest Storage**: Guest participants store just the guest ID (e.g., "4lk0hz") in `guestName` column while displaying full username (e.g., "Guest_4lk0hz") in UI, enabling efficient database lookups.
- **Database Migration**: Applied schema changes using direct SQL ALTER statements for `is_active` column and `races_room_code_unique` constraint without data loss.