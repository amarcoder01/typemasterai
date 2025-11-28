# TypeMasterAI - AI-Powered Typing Test Application

## Overview
TypeMasterAI is a high-performance, full-stack typing test web application designed to enhance typing skills through engaging features. It offers real-time analytics, diverse test durations and languages, user authentication, and an AI chat assistant. Key capabilities include visual progress tracking, AI-powered content generation, real-time multiplayer racing with instant matchmaking and private rooms, AI Ghost Racers that populate rooms with realistic bot opponents, a production-ready **Code Typing Mode** with AI-generated code snippets and dedicated leaderboards, an **Advanced Keystroke Analytics System** providing in-depth performance tracking and personalized recommendations, a **Smart Daily Notification System** for PWA push notifications and gamification, and **Advanced SEO Optimization** targeting top search rankings with extensive meta-data and landing pages. The project aims to provide an effective platform for typing mastery, leveraging advanced AI and a competitive environment to expand market reach and user engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18 with TypeScript and Vite, styled with Shadcn UI (New York style), Tailwind CSS v4, and custom design tokens in a dark-first "Focus Flow" theme. Typography uses DM Sans and JetBrains Mono. Animations are handled with Canvas Confetti and custom Tailwind animations, providing real-time visual feedback.

### Technical Implementations
- **Frontend**: State management uses TanStack Query v5 for server state and React Context API for authentication. The typing input system uses a hidden auto-focused input field with full IME/composition event handling for multi-language support (23+ languages) and robust error handling. An advanced analytics dashboard features comprehensive visualizations using Recharts, including interactive keyboard heatmaps, finger usage distribution, and AI-powered insights. The application is a Progressive Web App (PWA) with a service worker for offline support and push notifications, including a comprehensive notification settings UI. A social sharing system generates shareable images with performance badges for viral growth. SEO is optimized with a dynamic `useSEO()` hook, structured data, font preloading, and 8 SEO-optimized landing pages with extensive internal linking.
- **Backend**: Built with Express.js on Node.js with TypeScript. Real-time communication for multiplayer racing is handled by a WebSocket server. An AI Ghost Racer system populates race rooms with intelligent bots using OpenAI GPT-4o-mini for realistic typing patterns and skill levels. Authentication is managed with Passport.js, bcryptjs, and Express session with PostgreSQL store, including security measures like rate limiting and XSS protection. The RESTful API supports authentication, test results, leaderboards, multi-language content, multiplayer race management, code typing features, push notification management, achievement, and challenge systems. AI code snippet generation utilizes OpenAI GPT-4o-mini for diverse programming languages. A production-ready job-based smart notification scheduler handles timezone-aware daily reminders, streak warnings, and weekly summaries, using VAPID authentication for web-push integration. An achievement engine automatically checks and awards progress post-test, while a challenge system provides daily and weekly competitive tasks with rewards.

### System Design Choices
- **Data Layer**: PostgreSQL database managed with Drizzle ORM. The schema includes tables for users, test results, typing paragraphs, code snippets, code typing tests, races, race participants (with soft-delete), keystroke events, typing analytics, typing insights, practice recommendations, push subscriptions, notification preferences, notification jobs, notification history, achievements, user achievements, challenges, and user gamification.
- **Validation**: Zod for runtime validation and Drizzle-Zod for schema conversion, enforcing strict TypeScript.
- **Build & Deployment**: Development uses separate client/server dev servers with HMR. Production client is bundled with Vite, and the server with esbuild.

## External Dependencies

### Third-Party Services
- **Database Hosting**: Neon Serverless PostgreSQL.
- **AI Services**: OpenAI (GPT-4o-mini for bot username generation and code snippet generation).

### Key NPM Packages
- **UI & Styling**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `canvas-confetti`, `recharts`, `prismjs`.
- **Data & Forms**: `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
- **Backend**: `express`, `express-session`, `passport`, `passport-local`, `bcryptjs`, `drizzle-orm`, `@neondatabase/serverless`, `ws`, `openai`, `web-push`.
- **Development Tools**: `vite`, `@vitejs/plugin-react`, `typescript`, `tsx`, `esbuild`, `drizzle-kit`.