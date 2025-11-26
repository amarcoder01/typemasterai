# TypeMasterAI - AI-Powered Typing Test Application

## Overview
TypeMasterAI is a high-performance, full-stack typing test web application designed to enhance typing skills through engaging features. It offers real-time analytics, diverse test durations and languages, user authentication, and an AI chat assistant. Key capabilities include visual progress tracking, AI-powered content generation, real-time multiplayer racing with instant matchmaking and private rooms, AI Ghost Racers that populate rooms with realistic bot opponents, **Code Typing Mode** - a production-ready developer feature with AI-generated code snippets across 10+ programming languages, syntax highlighting, dedicated code leaderboards, and deep analytics, **Advanced Keystroke Analytics System** - industry-leading performance tracking with keystroke dynamics, keyboard heatmaps, finger usage analytics, AI-powered insights, and personalized practice recommendations that surpasses competitors like Monkeytype, **Smart Daily Notification System** - production-ready PWA with browser push notifications, VAPID authentication, intelligent scheduling for daily reminders/streak warnings/weekly summaries, comprehensive achievement/badge gamification with 5-tier progression (bronze to diamond), competitive challenge framework with daily/weekly challenges, and personalized notification preferences, and **Advanced SEO Optimization** - comprehensive search engine optimization targeting #1 rankings with extensive meta tags, JSON-LD structured data (WebApplication, Organization, FAQPage, BreadcrumbList, HowTo schemas), sitemap.xml, robots.txt, 7 SEO-optimized landing pages (1-min, 3-min, 5-min typing tests, Monkeytype/Typeracer/10FastFingers alternatives), font preloading for Core Web Vitals, strategic keyword targeting (typing test: 450K+ searches, typing speed test: 200K+, wpm test: 165K+, competitor keywords), and comprehensive competitor comparison hub. The project aims to provide an effective platform for typing mastery, leveraging advanced AI and a competitive environment to expand market reach and user engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework & Build**: React 18 with TypeScript, Vite.
- **UI Component System**: Shadcn UI (New York style) based on Radix UI, Tailwind CSS v4 with custom design tokens, dark-first "Focus Flow" theme. Typography uses DM Sans and JetBrains Mono.
- **State Management & Data Fetching**: TanStack Query v5 for server state, Context API for authentication, React hooks for local state.
- **Animation & Visual Feedback**: Canvas Confetti, custom Tailwind animations, real-time loading states, and toast notifications.
- **Typing Input System**: Hidden auto-focused input field for seamless direct keyboard typing, full IME/composition event handling for multi-language support (23+ languages including CJK), robust error handling, backspace support, and real-time visual feedback (green for typed, highlighted for current, gray for remaining).
- **Advanced Analytics Dashboard**: Comprehensive 5-tab analytics page featuring: (1) Performance - WPM/accuracy trends, consistency metrics; (2) **Keystroke Analysis** - industry-leading visualizations including interactive keyboard heatmap with color-coded key frequency, finger usage distribution bar charts, hand balance visualization (left/right split with visual progress bar), timing metrics (dwell/flight time), WPM consistency line chart showing speed throughout test, slowest words analysis, and fastest/slowest digraph comparison; (3) Mistakes - error heatmap and common typing errors; (4) AI Insights - personalized recommendations; (5) Practice Plan - daily exercises and weekly improvement roadmap. All visualizations use Recharts with custom styling, proper null/undefined handling, and responsive layouts.
- **PWA & Push Notifications**: Progressive Web App with manifest.json, service worker for offline support and push notification handling, notification manager utility for subscription management, VAPID key integration for secure push messaging, and comprehensive notification settings UI.
- **SEO & Performance Optimization**: Dynamic useSEO() React hook for page-specific meta tags and structured data, breadcrumb navigation component with schema.org BreadcrumbList microdata, font preloading for LCP optimization (Core Web Vitals), comprehensive internal linking structure, 7 SEO-optimized landing pages with 2000-3000 words of unique content each (1-min test, 3-min test, 5-min test, Monkeytype alternative, Typeracer alternative, 10FastFingers alternative, plus homepage), competitor comparison hub with feature tables and detailed analysis targeting commercial-intent searches.

### Backend Architecture
- **Server Framework**: Express.js on Node.js with TypeScript.
- **Real-Time Communication**: WebSocket server (ws library) for multiplayer racing, handling room management, participant tracking, countdowns, live progress broadcasting, and race state transitions.
- **AI Ghost Racer System**: Intelligent bot service populates race rooms using OpenAI GPT-4o-mini for unique username generation. Bots have 7 realistic skill levels (35-130 WPM, 88-99% accuracy), human-like typing patterns (variable delays, error injection, bursts/pauses), and race-condition-free finish handling using atomic counters and `SELECT FOR UPDATE` locking.
- **Authentication & Security**: Passport.js with LocalStrategy, bcryptjs (10 rounds), Express session with PostgreSQL store, HTTP-only cookies, rate limiting, DOMPurify for XSS protection, and React ErrorBoundary.
- **API Design**: RESTful API for authentication, test results, statistics, leaderboards, multi-language content, multiplayer race management (quick match, create/join room, race state), code typing features (AI snippet generation, code test results, code leaderboards), push notification management (subscription, preferences, history), achievement system, challenge system, and gamification profiles.
- **AI Code Snippet Generation**: Utilizes OpenAI GPT-4o-mini to generate realistic code examples across 10+ programming languages and frameworks for code typing tests.
- **Bot Name Pool**: Caches 100 OpenAI GPT-4o-mini generated realistic usernames to optimize API costs and ensure varied bot identities.
- **Smart Notification System**: Web-push library with VAPID authentication for secure push notifications, intelligent scheduler for daily reminders (hourly checks), streak warnings (bi-hourly checks), and weekly summaries (Sunday evenings), preference-based notification filtering, and automatic subscription cleanup for expired/invalid endpoints.
- **Achievement Engine**: Automatic achievement checking after each test completion, 25+ predefined achievements across 5 categories (speed, accuracy, streak, consistency, special), 5-tier progression system (bronze, silver, gold, platinum, diamond), point-based rewards, and real-time achievement unlock notifications.
- **Challenge System**: Daily and weekly competitive challenges with progress tracking, automatic notification triggers (started, progress, completed), points and badge rewards, and difficulty tiers (easy, medium, hard, expert).

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
    - **Keystroke Events**: Individual keystroke tracking with press/release times, dwell time, flight time, finger/hand mapping, correctness.
    - **Typing Analytics**: Comprehensive metrics per test including WPM, raw WPM, accuracy, consistency score, dwell/flight time averages, finger usage distribution, hand balance, error categorization, keyboard heatmap, WPM by position, slowest words, fastest/slowest digraphs.
    - **Typing Insights**: AI-generated personalized insights with type (weakness/strength/recommendation), category, confidence score, affected keys, actionable steps.
    - **Practice Recommendations**: AI-generated custom practice sessions targeting user weaknesses with focus keys/digraphs, estimated duration, target WPM.
    - **Push Subscriptions**: Endpoint URL, VAPID keys (stored as JSONB), expiration time, user agent, active status, last used timestamp.
    - **Notification Preferences**: Per-user settings for all notification types (daily reminders, streak warnings, weekly summaries, achievements, challenges, leaderboard updates, race invites, etc.), quiet hours configuration, preferred reminder times.
    - **Notification History**: Complete audit trail of sent notifications with delivery status, engagement tracking (delivered, clicked), error logging, and deduplication support.
    - **Achievements**: Unique keys, names, descriptions, categories, tier levels, requirement specifications (JSONB), point values, icon/color theming, secret/active flags.
    - **User Achievements**: Unlock timestamp, associated test result, notification status, and foreign keys to users and achievements.
    - **Challenges**: Type (daily/weekly/special), title, description, goal specification (JSONB), difficulty, rewards (points, optional badge), active date range, category.
    - **User Challenges**: Progress tracking, completion status, notification flags (started, completed), timestamps.
    - **User Gamification**: Total points, level, experience points, achievement/challenge counts, current title, featured badges (JSONB array).
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
- **Backend**: `express`, `express-session`, `passport`, `passport-local`, `bcryptjs`, `drizzle-orm`, `@neondatabase/serverless`, `ws`, `openai`, `web-push`.
- **Development Tools**: `vite`, `@vitejs/plugin-react`, `typescript`, `tsx`, `esbuild`, `drizzle-kit`.