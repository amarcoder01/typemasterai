# TypeFlow - Typing Test Application

## Overview

TypeFlow is a high-performance typing test web application built with a modern full-stack architecture. The application allows users to test their typing speed and accuracy, track their progress over time, and compete on a global leaderboard. It features real-time analytics, multiple test modes (15s, 30s, 60s, 120s), user authentication, and comprehensive progress tracking with visual charts.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tool**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR (Hot Module Replacement)
- Wouter for lightweight client-side routing instead of React Router

**UI Component System**
- Shadcn UI component library (New York style variant) built on Radix UI primitives
- Tailwind CSS v4 (using `@import` syntax) for utility-first styling with custom design tokens
- Custom CSS variables for theming with a dark-first "Focus Flow" theme
- Typography: DM Sans for UI elements, JetBrains Mono for typing/code display

**State Management & Data Fetching**
- TanStack Query (React Query) v5 for server state management, caching, and API communication
- Context API for authentication state via `AuthProvider`
- Local component state with React hooks for UI interactions

**Animation & Visual Feedback**
- Framer Motion for smooth animations and transitions (note: dependency removed but imports still present in code)
- Canvas Confetti for celebratory effects on test completion
- Custom Tailwind animations via `tw-animate-css`

### Backend Architecture

**Server Framework**
- Express.js running on Node.js with TypeScript
- Dual-mode setup: development (`index-dev.ts`) with Vite middleware, production (`index-prod.ts`) with static file serving
- Session-based authentication using Passport.js with LocalStrategy

**Authentication & Security**
- Password hashing with bcryptjs (10 rounds)
- Express session with PostgreSQL session store (connect-pg-simple)
- HTTP-only cookies for session management
- CSRF protection considerations through session configuration

**API Design**
- RESTful API endpoints under `/api` prefix
- Endpoints for authentication (`/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/auth/logout`)
- Test results endpoints (`/api/test-results` - GET/POST)
- Statistics endpoint (`/api/stats`)
- Leaderboard endpoint (`/api/leaderboard`)

### Data Layer

**Database**
- PostgreSQL as the primary database (configured for Neon serverless)
- Drizzle ORM for type-safe database queries and schema management
- WebSocket connection support for Neon serverless via `ws` package

**Schema Design**

*Users Table:*
- UUID primary key (auto-generated)
- Username (unique, 3-30 chars, alphanumeric + underscore)
- Email (unique, validated)
- Password (hashed, 8-100 chars)
- Created timestamp

*Test Results Table:*
- Serial integer primary key
- Foreign key to users (cascade delete)
- WPM (words per minute, 0-500 range)
- Accuracy (0-100 percentage)
- Mode (test duration in seconds)
- Character count and error count
- Timestamp with indexes on userId, wpm, and createdAt for query optimization

**Data Access Patterns**
- Storage abstraction layer (`IStorage` interface) for potential future storage backend swaps
- Aggregated statistics queries for user performance metrics (best WPM, average WPM, average accuracy)
- Leaderboard query sorting by WPM descending with username joins

### Validation & Type Safety

**Schema Validation**
- Zod for runtime validation of API inputs and database inserts
- Drizzle-Zod for generating Zod schemas from Drizzle table definitions
- Validation errors transformed to user-friendly messages via `zod-validation-error`

**TypeScript Configuration**
- Strict mode enabled across the entire codebase
- Path aliases: `@/` for client source, `@shared/` for shared code, `@assets/` for assets
- Incremental compilation with build info caching
- Module resolution set to "bundler" for Vite compatibility

### Build & Deployment

**Development Workflow**
- Separate dev servers: `dev:client` (Vite on port 5000) and `dev` (Express with Vite middleware)
- Hot module replacement for instant feedback during development
- Custom Vite plugin for updating OpenGraph meta tags with Replit deployment URLs

**Production Build**
- Vite bundles client code to `dist/public`
- esbuild bundles server code (index-prod.ts) to `dist/index.js` as ESM with external packages
- Static file serving from dist/public in production mode

**Deployment Considerations**
- Replit-specific plugins: runtime error modal, cartographer (dev-only), dev banner (dev-only)
- Environment-based configuration (NODE_ENV)
- Database URL validation on startup
- Session secret from environment variable with fallback

## External Dependencies

### Third-Party Services

**Database Hosting**
- Neon Serverless PostgreSQL (requires DATABASE_URL environment variable)
- WebSocket-based connection pooling for serverless compatibility

**Authentication**
- Session storage in PostgreSQL via connect-pg-simple
- No external OAuth providers (local authentication only)

### Key NPM Packages

**UI & Styling**
- `@radix-ui/*` - Accessible UI primitives (30+ component packages)
- `tailwindcss` - Utility-first CSS framework
- `class-variance-authority` - Component variant management
- `clsx` & `tailwind-merge` - Conditional className utilities
- `lucide-react` - Icon library
- `canvas-confetti` - Confetti animations
- `recharts` - Charting library for statistics visualization

**Data & Forms**
- `@tanstack/react-query` - Server state management
- `react-hook-form` - Form state management
- `@hookform/resolvers` - Form validation resolvers
- `zod` - Schema validation
- `drizzle-zod` - Drizzle to Zod schema conversion

**Backend**
- `express` - Web server framework
- `express-session` - Session middleware
- `passport` & `passport-local` - Authentication middleware
- `bcryptjs` - Password hashing
- `drizzle-orm` - TypeScript ORM
- `@neondatabase/serverless` - Neon database driver
- `ws` - WebSocket library for Neon connections

**Development Tools**
- `vite` - Build tool and dev server
- `@vitejs/plugin-react` - React support for Vite
- `typescript` - Type checking
- `tsx` - TypeScript execution for development
- `esbuild` - Production bundler for server code
- `drizzle-kit` - Database migration tool

### Configuration Files

- `drizzle.config.ts` - Database connection and migration settings (PostgreSQL dialect)
- `vite.config.ts` - Frontend build configuration with plugins and path aliases
- `tsconfig.json` - TypeScript compiler options with path mappings
- `tailwind.config.ts` - Tailwind customization (referenced but not provided)
- `components.json` - Shadcn UI configuration (New York style, Lucide icons)
- `postcss.config.js` - PostCSS with Tailwind and Autoprefixer