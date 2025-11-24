# TypeMasterAI - AI-Powered Typing Test Application

## Overview
TypeMasterAI is a high-performance, full-stack typing test web application designed to help users improve their typing skills. It offers real-time analytics, various test durations (15s, 30s, 60s, 120s), multi-language support (23 languages), diverse paragraph categories, user authentication, and an AI chat assistant. The application tracks progress with visual charts and provides AI-powered content generation for customized practice. Its core purpose is to provide an engaging and effective platform for typing mastery, with a vision for expanding market reach and user engagement through advanced AI features and a competitive environment.

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
- **Authentication & Security**: Passport.js with LocalStrategy, bcryptjs for password hashing (10 rounds), Express session with PostgreSQL store, HTTP-only cookies, rate limiting, DOMPurify for XSS protection, and React ErrorBoundary for graceful error handling.
- **API Design**: RESTful API with endpoints for authentication, test results, statistics, leaderboard, and multi-language typing content.

### Data Layer
- **Database**: PostgreSQL (Neon Serverless compatible) managed with Drizzle ORM for type-safe queries.
- **Schema Design**:
    - **Users**: UUID, username, email, hashed password, timestamp.
    - **Test Results**: Serial ID, foreign key to users, WPM, accuracy, mode (duration), character/error count, timestamp.
    - **Typing Paragraphs**: Serial ID, language code (23 supported), mode/category (8+ categories), difficulty, content, word count, timestamp.
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
- **Backend**: `express`, `express-session`, `passport`, `passport-local`, `bcryptjs`, `drizzle-orm`, `@neondatabase/serverless`, `ws`.
- **Development Tools**: `vite`, `@vitejs/plugin-react`, `typescript`, `tsx`, `esbuild`, `drizzle-kit`.