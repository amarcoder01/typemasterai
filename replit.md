# TypeMasterAI - AI-Powered Typing Test Application

## Overview
TypeMasterAI is a high-performance, full-stack typing test web application designed to enhance typing skills through engaging features. It offers real-time analytics, diverse test durations and languages, user authentication, and an AI chat assistant. Key capabilities include visual progress tracking, AI-powered content generation, real-time multiplayer racing with instant matchmaking and private rooms, AI Ghost Racers that populate rooms with realistic bot opponents, and **Code Typing Mode** - a production-ready developer feature with AI-generated code snippets across 10+ programming languages, syntax highlighting, dedicated code leaderboards, and deep analytics. The project aims to provide an effective platform for typing mastery, leveraging advanced AI and a competitive environment to expand market reach and user engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework & Build**: React 18 with TypeScript, Vite.
- **UI Component System**: Shadcn UI (New York style) based on Radix UI, Tailwind CSS v4 with custom design tokens, dark-first "Focus Flow" theme. Typography uses DM Sans and JetBrains Mono.
- **State Management & Data Fetching**: TanStack Query v5 for server state, Context API for authentication, React hooks for local state.
- **Animation & Visual Feedback**: Canvas Confetti, custom Tailwind animations, real-time loading states, and toast notifications.
- **Typing Input System**: Hidden auto-focused input field for seamless direct keyboard typing, full IME/composition event handling for multi-language support (23+ languages including CJK), robust error handling, backspace support, and real-time visual feedback (green for typed, highlighted for current, gray for remaining).

### Backend Architecture
- **Server Framework**: Express.js on Node.js with TypeScript.
- **Real-Time Communication**: WebSocket server (ws library) for multiplayer racing, handling room management, participant tracking, countdowns, live progress broadcasting, and race state transitions.
- **AI Ghost Racer System**: Intelligent bot service populates race rooms using OpenAI GPT-4o-mini for unique username generation. Bots have 7 realistic skill levels (35-130 WPM, 88-99% accuracy), human-like typing patterns (variable delays, error injection, bursts/pauses), and race-condition-free finish handling using atomic counters and `SELECT FOR UPDATE` locking.
- **Authentication & Security**: Passport.js with LocalStrategy, bcryptjs (10 rounds), Express session with PostgreSQL store, HTTP-only cookies, rate limiting, DOMPurify for XSS protection, and React ErrorBoundary.
- **API Design**: RESTful API for authentication, test results, statistics, leaderboards, multi-language content, multiplayer race management (quick match, create/join room, race state), and code typing features (AI snippet generation, code test results, code leaderboards).
- **AI Code Snippet Generation**: Utilizes OpenAI GPT-4o-mini to generate realistic code examples across 10+ programming languages and frameworks for code typing tests.
- **Bot Name Pool**: Caches 100 OpenAI GPT-4o-mini generated realistic usernames to optimize API costs and ensure varied bot identities.

### Data Layer
- **Database**: PostgreSQL (Neon Serverless compatible) managed with Drizzle ORM.
- **Schema Design**:
    - **Users**: UUID, username, email, hashed password, avatar color, streak, timestamp.
    - **Test Results**: WPM, accuracy, mode, character/error count, timestamp.
    - **Typing Paragraphs**: Language (23 supported), category, difficulty, content.
    - **Code Snippets**: Programming language, framework, difficulty, code content, metadata.
    - **Code Typing Tests**: User, snippet reference, language, framework, WPM, accuracy, errors, syntax errors, duration.
    - **Races**: Unique room code, status, paragraph content, max players, privacy, atomic `finishCounter`.
    - **Race Participants**: Foreign keys to races, user ID/guestName, username, avatar color, `isBot` flag, `isActive` (soft-delete), real-time progress, live WPM/accuracy, finish position (atomically assigned).
- **Validation & Type Safety**: Zod for runtime validation, Drizzle-Zod for schema conversion, strict TypeScript.
- **Soft-Delete Participant System**: Implemented `isActive` flag in `race_participants` to prevent duplicate entries and manage guest identity across refreshes, ensuring seamless rejoining.

### Build & Deployment
- **Development**: Separate dev servers (client/server), HMR.
- **Production**: Vite bundles client, esbuild bundles server.
- **Deployment Considerations**: Replit-specific plugins, environment-based configuration, secure session handling.

## External Dependencies

### Third-Party Services
- **Database Hosting**: Neon Serverless PostgreSQL.
- **AI Services**: OpenAI (GPT-4o-mini for bot username generation and code snippet generation).

### Key NPM Packages
- **UI & Styling**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `canvas-confetti`, `recharts`, `prismjs`.
- **Data & Forms**: `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
- **Backend**: `express`, `express-session`, `passport`, `passport-local`, `bcryptjs`, `drizzle-orm`, `@neondatabase/serverless`, `ws`, `openai`.
- **Development Tools**: `vite`, `@vitejs/plugin-react`, `typescript`, `tsx`, `esbuild`, `drizzle-kit`.