# TypeMasterAI - AI-Powered Typing Test Application

## Overview

TypeMasterAI is a high-performance typing test web application built with a modern full-stack architecture. The application allows users to test their typing speed and accuracy, track their progress over time, and compete on a global leaderboard. It features real-time analytics, multiple test modes (15s, 30s, 60s, 120s), multi-language support (23 languages including English, Spanish, French, German, Italian, Portuguese, Japanese, Chinese, Hindi, Russian, Arabic, Korean, Marathi, Bengali, Tamil, Telugu, Vietnamese, Turkish, Polish, Dutch, Swedish, Thai, and Indonesian), diverse paragraph modes (8+ categories), user authentication with AI chat assistant, comprehensive progress tracking with visual charts, and AI-powered content generation with real-time loading states and user feedback.

**Domain**: TypeMasterAI.com

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### November 24, 2025 - Security & Account Management Enhancements
- **Rate Limiting**: Implemented comprehensive rate limiting to prevent abuse
  - Authentication endpoints: 10 requests per 15 minutes (prevents brute-force attacks)
  - Chat API: 30 requests per minute (prevents API abuse)
  - AI generation endpoints: 20 requests per 5 minutes (prevents excessive AI usage)
  - Uses express-rate-limit with proper headers and customizable error messages
- **Input Sanitization**: Added DOMPurify for XSS protection
  - Sanitizes user bios before saving and displaying
  - Sanitizes chat messages before processing and storage
  - Strips all HTML tags while preserving text content
- **Session Security**: Enhanced session secret handling
  - Added production validation for SESSION_SECRET environment variable
  - Logs warnings when using default/fallback session secret
  - Alerts in production when security configuration is weak
- **Error Boundary**: Implemented React ErrorBoundary component
  - Catches and displays errors gracefully without crashing the entire app
  - Shows user-friendly error UI with reload and retry options
  - Displays error details in development mode for debugging
  - Mounted at app root to protect all routes and components
- **Password Management**: Added password change functionality
  - Secure password change in settings page for authenticated users
  - Validates current password before allowing change
  - Enforces minimum 8-character password length
  - Uses bcrypt hashing with 10 rounds
  - Rate-limited to prevent brute-force attempts
- **Account Deletion**: Implemented account deletion with safeguards
  - Confirmation dialog with detailed warning about data loss
  - Cascading delete removes all user data (test results, conversations, profile)
  - Proper session destruction after account deletion
  - Rate-limited to prevent abuse
  - Only accessible to authenticated users

### November 24, 2025 - Legal Pages & Production Readiness
- **Comprehensive Legal Documentation**: Created full suite of legal and informational pages
  - Privacy Policy: Complete data collection, usage, AI integration, and user rights documentation
  - Terms of Service: Detailed acceptable use, intellectual property, liability, and account terms
  - Cookie Policy: Comprehensive cookie types, usage purposes, and user controls
  - About Page: Company mission, features, statistics, and target audiences
  - Contact Page: Multiple contact channels (general, support, legal, business)
  - All pages fully styled with TypeMasterAI branding and responsive design
  - Professional legal language suitable for production deployment
  - Cross-linked for easy navigation between related policies

### November 24, 2025 - Professional Certificate & Footer Implementation
- **Professional Certificate System**: Added downloadable achievement certificates for typing tests
  - Canvas-based certificate generation with TypeMasterAI branding
  - Includes username, WPM, accuracy, test duration, and completion date
  - Professional design with gradient borders, TM logo seal, signature line, and decorative elements
  - Download as high-quality PNG image
  - Only available to authenticated users after completing a test
- **Production-Ready Footer**: Created comprehensive, industry-standard website footer
  - Multi-section layout: Brand, Product, Resources, Legal
  - Social media links (Twitter, GitHub, Email, Website) with hover effects
  - Quick navigation to key features (Typing Tests, Leaderboard, AI Assistant, Analytics, Certificates)
  - Resource links (About Us, Contact Us, Tips, API Documentation, Help Center)
  - Legal links (Privacy Policy, Terms of Service, Cookie Policy)
  - Stats bar displaying key metrics (23+ Languages, 10k+ Users, 1M+ Tests, AI Powered)
  - Responsive grid layout for mobile, tablet, and desktop
  - All links include proper data-testid attributes for automated testing
  - Professional typography and hover states matching TypeMasterAI brand

### November 24, 2025 - Enhanced UX with Loading States
- **Loading States for AI Generation**: Added comprehensive loading indicators for "New Paragraph" and "AI Custom Content" features
  - Buttons show "Generating..." text with spinning icon during AI generation
  - Buttons and inputs disabled during generation to prevent conflicts
  - Visual feedback through button styling changes (dimmed appearance when disabled)
- **Success Notifications**: Implemented toast notifications for generation lifecycle
  - Start: "🤖 Generating New Paragraph..." / "🤖 Generating Custom Content..."
  - Success: "✨ New Paragraph Ready!" / "✨ Custom Content Ready!"
  - Error: "❌ Generation Failed" with fallback messages
- **Cache-Busting Implementation**: Added timestamp-based cache busting and no-cache headers to ensure fresh content on each request
- **AI Prompt Fix**: Resolved contradictory AI prompt that caused refusal messages for English language generation
- **Database Cleanup**: Removed invalid refusal message paragraphs from database
- **Force Generation**: "New Paragraph" button now always generates fresh AI content instead of database lookup (forceGenerate=true parameter)

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
- Real-time loading states with spinning icon animations for AI content generation
- Toast notifications for generation progress (loading, success, error states)
- Disabled UI states during asynchronous operations to prevent user conflicts

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
- Multi-language typing endpoints (`/api/typing/paragraph`, `/api/typing/languages`, `/api/typing/modes`)

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

*Typing Paragraphs Table:*
- Serial integer primary key
- Language code (2-10 chars): 23 languages supported (en, es, fr, de, it, pt, ja, zh, hi, ru, ar, ko, mr, bn, ta, te, vi, tr, pl, nl, sv, th, id)
- Mode/category (general, entertainment, technical, quotes, programming, news, stories, business)
- Difficulty level (easy, medium, hard)
- Content (paragraph text, minimum 50 chars)
- Word count (integer)
- Created timestamp
- Indexes on language, mode, and combined language+mode for query optimization
- Graceful fallback: API returns language paragraphs if specific mode unavailable, then English as final fallback
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