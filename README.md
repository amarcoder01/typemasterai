# TypeMasterAI - AI-Powered Typing Test Platform

<div align="center">

![TypeMasterAI](client/public/logo-icon.svg)

**The Ultimate Typing Test Platform with AI-Powered Features**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/amarcoder01/typemasterai)

</div>

## 🚀 Features

### Typing Modes
- **Standard Mode** - Classic typing test with 15s, 30s, 60s, and 120s durations
- **Code Typing** - Practice coding syntax with real programming languages
- **Book Typing** - Type excerpts from classic literature
- **Dictation Mode** - Listen and type with text-to-speech
- **Stress Test** - Challenge yourself with distractions and effects
- **Multiplayer Racing** - Real-time competitive typing races

### AI-Powered Features
- **Smart Content Generation** - AI generates contextual paragraphs
- **AI Chat Assistant** - Get typing tips and analysis
- **Ghost Racers** - Race against AI opponents
- **Intelligent Analytics** - AI-powered performance insights

### Advanced Features
- **23+ Languages** - Multi-language support
- **ELO Rating System** - Competitive matchmaking
- **Certificates** - Shareable achievement certificates
- **PWA Support** - Install as a desktop/mobile app
- **Push Notifications** - Daily reminders and streak alerts
- **Detailed Analytics** - Keystroke analysis, heatmaps, and more

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS v4, Shadcn UI
- **Backend**: Node.js, Express.js, WebSocket
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI GPT-4o
- **Auth**: Passport.js (Local, Google, GitHub, Facebook)

## 📦 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database (Neon, Render Postgres, or local)
- OpenAI API key (for AI features)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/amarcoder01/typemasterai.git
   cd typemasterai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file with the following required variables:
   ```env
   DATABASE_URL=postgresql://username:password@host:5432/database?sslmode=require
   SESSION_SECRET=your-secure-session-secret-at-least-64-chars
   OPENAI_API_KEY=sk-your-openai-api-key
   APP_URL=http://localhost:5000
   ```

4. **Push database schema**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:5000
   ```

## 🚀 Deployment on Render

### Option 1: One-Click Deploy

Click the "Deploy to Render" button above to automatically deploy with the included `render.yaml` blueprint.

### Option 2: Manual Deployment

1. **Create a new Web Service on Render**
   - Connect your GitHub repository
   - Select "Node" as the runtime
   - Set build command: `npm ci && npm run build`
   - Set start command: `npm run start`

2. **Create a PostgreSQL database on Render**
   - Create a new PostgreSQL instance
   - Copy the Internal Database URL

3. **Configure Environment Variables**

   | Variable | Description | Required |
   |----------|-------------|----------|
   | `DATABASE_URL` | PostgreSQL connection string | ✅ |
   | `SESSION_SECRET` | Secure random string (64+ chars) | ✅ |
   | `APP_URL` | Your Render app URL | ✅ |
   | `NODE_ENV` | Set to `production` | ✅ |
   | `PORT` | Set to `10000` (Render default) | ✅ |
   | `OPENAI_API_KEY` | OpenAI API key | For AI features |
   | `GOOGLE_CLIENT_ID` | Google OAuth client ID | For Google login |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth secret | For Google login |
   | `GITHUB_CLIENT_ID` | GitHub OAuth client ID | For GitHub login |
   | `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | For GitHub login |

4. **Deploy**
   - Trigger a deploy from the Render dashboard
   - Wait for the build to complete
   - The database schema will be automatically applied

### Post-Deployment

After deployment, update your OAuth callback URLs:
- Google: `https://your-app.onrender.com/api/auth/google/callback`
- GitHub: `https://your-app.onrender.com/api/auth/github/callback`
- Facebook: `https://your-app.onrender.com/api/auth/facebook/callback`

## 📝 Environment Variables Reference

### Required
```env
DATABASE_URL=postgresql://...          # PostgreSQL connection string
SESSION_SECRET=...                     # Secure session secret (64+ chars)
APP_URL=https://your-domain.com       # Application URL
```

### AI Features
```env
OPENAI_API_KEY=sk-...                 # OpenAI API key
AI_INTEGRATIONS_OPENAI_API_KEY=sk-... # Alternative OpenAI key
AI_INTEGRATIONS_OPENAI_BASE_URL=...   # Custom OpenAI base URL
```

### OAuth (Optional)
```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
```

### Push Notifications (Optional)
```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:your@email.com
```

### Email Service (Optional)
```env
MAILGUN_API_KEY=...
MAILGUN_DOMAIN=...
MAILGUN_FROM_EMAIL=...
```

## 🗄️ Database Setup

The application uses Drizzle ORM with PostgreSQL. To set up the database:

```bash
# Push schema to database
npm run db:push

# Generate migrations (for advanced use)
npx drizzle-kit generate

# View database in Drizzle Studio
npx drizzle-kit studio
```

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities
│   └── public/             # Static assets
├── server/                 # Express backend
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Database operations
│   ├── websocket.ts        # WebSocket handler
│   └── ...                 # Other services
├── shared/                 # Shared code
│   └── schema.ts           # Database schema
├── migrations/             # Database migrations
├── render.yaml             # Render deployment config
└── package.json
```

## 🧪 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run check        # TypeScript type checking
npm run db:push      # Push database schema
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

<div align="center">
  <sub>Built with ❤️ by the TypeMasterAI team</sub>
</div>

