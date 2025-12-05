import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { leaderboardCache } from "./leaderboard-cache";
import { streamChatCompletionWithSearch, shouldPerformWebSearch, generateConversationTitle, type ChatMessage, type StreamEvent } from "./chat-service";
import { generateTypingParagraph } from "./ai-paragraph-generator";
import { generateCodeSnippet } from "./ai-code-generator";
import { analyzeFile } from "./file-analyzer";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { insertUserSchema, loginSchema, insertTestResultSchema, updateProfileSchema, insertKeystrokeAnalyticsSchema, insertCodeTypingTestSchema, insertSharedCodeResultSchema, insertBookTypingTestSchema, insertDictationTestSchema, type User } from "@shared/schema";
import { fromError } from "zod-validation-error";
import ConnectPgSimple from "connect-pg-simple";
import { Pool } from "@neondatabase/serverless";
import rateLimit from "express-rate-limit";
import DOMPurify from "isomorphic-dompurify";
import { raceWebSocket } from "./websocket";
import { botNamePool } from "./bot-name-pool";
import { botService } from "./bot-service";
import multer from "multer";
import { createNotificationRoutes } from "./notification-routes";
import { NotificationScheduler } from "./notification-scheduler";
import { AchievementService } from "./achievement-service";
import { AuthSecurityService } from "./auth-security-service";
import {
  initializeOAuthStrategies,
  rememberMeMiddleware,
  setupRememberMeOnLogin,
  clearRememberMeOnLogout,
  REMEMBER_ME_COOKIE,
  oauthRateLimitMiddleware,
  initiateOAuthFlow,
  handleOAuthCallbackFlow,
  canUnlinkProvider,
  getProviderAvailability,
  logAuthEvent,
  extractDeviceInfo,
  regenerateSession,
  checkRateLimit,
} from "./oauth-service";
import { securityHeaders, csrfProtection } from "./auth-security";

const PgSession = ConnectPgSimple(session);

// Generate realistic-looking guest usernames
const guestNamePrefixes = [
  'swift', 'quick', 'fast', 'speedy', 'rapid', 'turbo', 'nitro', 'zoom', 'dash', 'flash',
  'pro', 'ace', 'champ', 'star', 'ninja', 'wizard', 'master', 'legend', 'elite', 'epic',
  'cool', 'super', 'mega', 'ultra', 'hyper', 'cyber', 'tech', 'pixel', 'neon', 'cosmic'
];
const guestNameSuffixes = [
  'typer', 'fingers', 'keys', 'writer', 'racer', 'runner', 'coder', 'dev', 'fox', 'wolf',
  'hawk', 'eagle', 'tiger', 'lion', 'bear', 'shark', 'dragon', 'phoenix', 'storm', 'thunder'
];

function generateGuestUsername(): string {
  const prefix = guestNamePrefixes[Math.floor(Math.random() * guestNamePrefixes.length)];
  const suffix = guestNameSuffixes[Math.floor(Math.random() * guestNameSuffixes.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${prefix}${suffix}${num}`;
}

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      email: string;
      avatarColor?: string | null;
      bio?: string | null;
      country?: string | null;
      keyboardLayout?: string | null;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }

  // Enforce SESSION_SECRET in production
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error(
      "🚨 CRITICAL SECURITY ERROR: SESSION_SECRET must be set in production!\n" +
      "Using a predictable session secret allows attackers to forge session cookies.\n" +
      "Set SESSION_SECRET environment variable to a secure random value (minimum 32 characters).\n" +
      "Generate one using: openssl rand -base64 32"
    );
  }

  const sessionSecret = process.env.SESSION_SECRET || "typemasterai-secret-key-change-in-production";
  
  botNamePool.initialize().catch(error => {
    console.error("Failed to initialize bot name pool:", error);
  });

  // Initialize notification system
  const notificationScheduler = new NotificationScheduler(storage);
  const achievementService = new AchievementService(storage, notificationScheduler);
  
  // Initialize achievements in database
  achievementService.initializeAchievements().catch(error => {
    console.error("Failed to initialize achievements:", error);
  });
  
  // Start notification scheduler
  notificationScheduler.start();
  
  // Initialize authentication security service
  const authSecurityService = new AuthSecurityService(storage);

  const sessionPool = new Pool({ connectionString: process.env.DATABASE_URL });

  app.use(
    session({
      store: new PgSession({
        pool: sessionPool,
        createTableIfMissing: true,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());
  app.use(rememberMeMiddleware());

  initializeOAuthStrategies();

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: "Too many authentication attempts, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: { message: "Too many chat requests, please slow down" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const aiGenerationLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 20,
    message: { message: "Too many AI generation requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passReqToCallback: true },
      async (req, email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          
          if (!user) {
            // Record failed login attempt for unknown email
            await authSecurityService.recordLoginAttempt(
              null,
              email,
              req,
              false,
              "Invalid email"
            );
            return done(null, false, { message: "Invalid email or password" });
          }

          // Check if account is locked
          const lockoutCheck = await authSecurityService.checkAccountLockout(user.id);
          if (!lockoutCheck.allowed) {
            return done(null, false, { message: lockoutCheck.message || "Account temporarily locked" });
          }

          // Check if account is inactive
          if (!user.isActive) {
            await authSecurityService.recordLoginAttempt(
              user.id,
              email,
              req,
              false,
              "Account inactive"
            );
            return done(null, false, { message: "Account has been deactivated. Please contact support." });
          }

          const isValidPassword = await bcrypt.compare(password, user.password);
          
          if (!isValidPassword) {
            // Handle failed login attempt
            await authSecurityService.handleFailedLogin(user.id, email, req, "Invalid password");
            
            const attemptsRemaining = await authSecurityService.getRemainingAttempts(user.id);
            const message = attemptsRemaining > 0
              ? `Invalid email or password. ${attemptsRemaining} attempt${attemptsRemaining > 1 ? 's' : ''} remaining.`
              : "Invalid email or password";
            
            return done(null, false, { message });
          }

          // Handle successful login
          await authSecurityService.handleSuccessfulLogin(user.id, email, req);

          return done(null, {
            id: user.id,
            username: user.username,
            email: user.email,
          });
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarColor: user.avatarColor,
        bio: user.bio,
        country: user.country,
        keyboardLayout: user.keyboardLayout,
      });
    } catch (error) {
      done(error);
    }
  });

  function isAuthenticated(req: any, res: any, next: any) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  }

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  app.head("/api/health", (_req, res) => {
    res.status(200).end();
  });

  const errorReportLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: { success: true },
    standardHeaders: false,
    legacyHeaders: false,
    skipFailedRequests: true,
  });

  app.post("/api/error-report", errorReportLimiter, async (req, res) => {
    try {
      const { error, context, timestamp, url, userAgent } = req.body;
      
      if (!error || typeof error !== 'object') {
        return res.status(200).json({ success: true });
      }

      const sanitizedUrl = typeof url === 'string' 
        ? url.replace(/[?#].*$/, '').slice(0, 200) 
        : 'unknown';
      
      const sanitizedMessage = typeof error.message === 'string'
        ? error.message.slice(0, 500).replace(/password|secret|token|key|auth/gi, '[REDACTED]')
        : 'Unknown error';

      console.error("[Client Error Report]", {
        message: sanitizedMessage,
        code: typeof error.code === 'string' ? error.code.slice(0, 50) : undefined,
        url: sanitizedUrl,
        timestamp: typeof timestamp === 'string' ? timestamp.slice(0, 30) : new Date().toISOString(),
        userId: (req.user as any)?.id,
      });
      
      res.status(200).json({ success: true });
    } catch (err) {
      res.status(200).json({ success: true });
    }
  });

  app.get("/api/error-stats", isAuthenticated, async (req, res) => {
    try {
      res.json({
        success: true,
        stats: {
          message: "Error statistics available in server logs",
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve error stats" });
    }
  });

  app.post("/api/auth/register", authLimiter, async (req, res, next) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: fromError(parsed.error).toString(),
        });
      }

      const existingUserByEmail = await storage.getUserByEmail(parsed.data.email);
      if (existingUserByEmail) {
        return res.status(409).json({ message: "Email already exists" });
      }

      const existingUserByUsername = await storage.getUserByUsername(parsed.data.username);
      if (existingUserByUsername) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

      const user = await storage.createUser({
        ...parsed.data,
        password: hashedPassword,
      });

      // Create default security settings for the user
      await storage.createSecuritySettings(user.id).catch(error => {
        console.error("Failed to create security settings:", error);
      });

      // Send email verification (async, don't block registration)
      authSecurityService.sendVerificationEmail(user.id, user.email).catch(error => {
        console.error("Failed to send verification email:", error);
      });

      // Record successful registration login
      await authSecurityService.recordLoginAttempt(user.id, user.email, req, true);

      req.login(
        {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        (err) => {
          if (err) {
            return next(err);
          }
          res.status(201).json({
            message: "Registration successful. Please check your email to verify your account.",
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              emailVerified: user.emailVerified,
              avatarColor: user.avatarColor,
              bio: user.bio,
              country: user.country,
              keyboardLayout: user.keyboardLayout,
            },
          });
        }
      );
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", authLimiter, (req, res, next) => {
    const parsed = loginSchema.safeParse(req.body);
    const rememberMe = req.body.rememberMe === true;
    
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: fromError(parsed.error).toString(),
      });
    }

    passport.authenticate("local", async (err: any, user: Express.User | false, info: any) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      req.login(user, async (err) => {
        if (err) {
          return next(err);
        }
        
        if (rememberMe) {
          try {
            await setupRememberMeOnLogin(req, res, user.id);
          } catch (error) {
            console.error("Error setting up remember-me token:", error);
          }
        }
        
        res.json({
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatarColor: user.avatarColor,
            bio: user.bio,
            country: user.country,
            keyboardLayout: user.keyboardLayout,
          },
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      await clearRememberMeOnLogout(req, res);
    } catch (error) {
      console.error("Error clearing remember-me token:", error);
    }
    
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/me", isAuthenticated, (req, res) => {
    res.json({ user: req.user });
  });

  app.get("/api/auth/google", 
    oauthRateLimitMiddleware(), 
    initiateOAuthFlow("google")
  );

  app.get("/api/auth/google/callback",
    oauthRateLimitMiddleware(),
    handleOAuthCallbackFlow("google")
  );

  app.get("/api/auth/github", 
    oauthRateLimitMiddleware(),
    initiateOAuthFlow("github")
  );

  app.get("/api/auth/github/callback",
    oauthRateLimitMiddleware(),
    handleOAuthCallbackFlow("github")
  );

  app.get("/api/auth/facebook", 
    oauthRateLimitMiddleware(),
    initiateOAuthFlow("facebook")
  );

  app.get("/api/auth/facebook/callback",
    oauthRateLimitMiddleware(),
    handleOAuthCallbackFlow("facebook")
  );

  app.get("/api/auth/link/google", isAuthenticated,
    oauthRateLimitMiddleware(),
    (req, res, next) => initiateOAuthFlow("google", req.user?.id)(req, res, next)
  );

  app.get("/api/auth/link/github", isAuthenticated,
    oauthRateLimitMiddleware(),
    (req, res, next) => initiateOAuthFlow("github", req.user?.id)(req, res, next)
  );

  app.get("/api/auth/link/facebook", isAuthenticated,
    oauthRateLimitMiddleware(),
    (req, res, next) => initiateOAuthFlow("facebook", req.user?.id)(req, res, next)
  );

  app.get("/api/auth/providers/available", (req, res) => {
    const availability = getProviderAvailability();
    res.json({ providers: availability });
  });

  app.get("/api/auth/providers", isAuthenticated, async (req, res) => {
    try {
      const accounts = await storage.getUserOAuthAccounts(req.user!.id);
      const linkedProviders = accounts.map(acc => ({
        provider: acc.provider,
        profileName: acc.profileName,
        email: acc.email,
        linkedAt: acc.linkedAt,
      }));
      const availability = getProviderAvailability();
      res.json({ linkedProviders, availableProviders: availability });
    } catch (error: any) {
      console.error("Get linked providers error:", error);
      res.status(500).json({ message: "Failed to fetch linked providers" });
    }
  });

  app.delete("/api/auth/providers/:provider", isAuthenticated, async (req, res) => {
    try {
      const provider = req.params.provider as "google" | "github" | "facebook";
      if (!["google", "github", "facebook"].includes(provider)) {
        return res.status(400).json({ message: "Invalid provider" });
      }

      const rateLimitCheck = checkRateLimit(req.user!.id, "unlink");
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ 
          message: "Too many unlink attempts. Please try again later.",
          retryAfterMs: rateLimitCheck.retryAfterMs
        });
      }

      const unlinkCheck = await canUnlinkProvider(req.user!.id, provider);
      if (!unlinkCheck.allowed) {
        return res.status(400).json({ message: unlinkCheck.reason });
      }

      const deviceInfo = extractDeviceInfo(req);
      
      await storage.unlinkOAuthAccount(req.user!.id, provider);
      
      logAuthEvent({
        eventType: "oauth_unlink",
        userId: req.user!.id,
        provider,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        deviceFingerprint: deviceInfo.fingerprint,
        success: true,
      });
      
      res.json({ message: `${provider} account unlinked successfully` });
    } catch (error: any) {
      console.error("Unlink provider error:", error);
      res.status(500).json({ message: "Failed to unlink provider" });
    }
  });

  app.post("/api/test-results", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertTestResultSchema.safeParse({
        ...req.body,
        userId: req.user!.id,
      });

      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: fromError(parsed.error).toString(),
        });
      }

      const result = await storage.createTestResult(parsed.data);
      
      // Update user streak after completing a test
      await storage.updateUserStreak(req.user!.id);
      
      // Check for achievement unlocks (async, don't block response)
      achievementService.checkAchievements(req.user!.id, result).catch(error => {
        console.error("Achievement check error:", error);
      });
      
      res.status(201).json({ message: "Test result saved", result });
    } catch (error: any) {
      console.error("Save test result error:", error);
      res.status(500).json({ message: "Failed to save test result" });
    }
  });

  app.get("/api/test-results", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const results = await storage.getUserTestResults(req.user!.id, limit);
      res.json({ results });
    } catch (error: any) {
      console.error("Get test results error:", error);
      res.status(500).json({ message: "Failed to fetch test results" });
    }
  });

  app.get("/api/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.user!.id);
      res.json({ stats });
    } catch (error: any) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/badges", isAuthenticated, async (req, res) => {
    try {
      const badgeData = await storage.getUserBadgeData(req.user!.id);
      res.json({ badgeData });
    } catch (error: any) {
      console.error("Get badges error:", error);
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 100);
      const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
      const cursor = req.query.cursor as string | undefined;
      const timeframe = (req.query.timeframe as string) || "all";
      
      const actualOffset = cursor ? leaderboardCache.decodeCursor(cursor) : offset;
      
      const result = await leaderboardCache.getGlobalLeaderboard({
        timeframe: timeframe as any,
        limit,
        offset: actualOffset,
      });
      
      res.set('Cache-Control', 'public, max-age=30');
      res.set('X-Cache', result.metadata.cacheHit ? 'HIT' : 'MISS');
      res.set('X-Total-Count', String(result.pagination.total));
      
      res.json(result);
    } catch (error: any) {
      console.error("Get leaderboard error:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/leaderboard/around-me", isAuthenticated, async (req, res) => {
    try {
      const range = Math.min(Math.max(1, parseInt(req.query.range as string) || 5), 20);
      
      const result = await leaderboardCache.getAroundMe("global", req.user!.id, { range });
      
      res.set('Cache-Control', 'private, max-age=10');
      res.set('X-Cache', result.cacheHit ? 'HIT' : 'MISS');
      
      res.json({
        userRank: result.userRank,
        entries: result.entries,
      });
    } catch (error: any) {
      console.error("Get leaderboard around me error:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/leaderboard/time-based", async (req, res) => {
    try {
      const timeframe = req.query.timeframe as "daily" | "weekly" | "monthly";
      const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 100);
      const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
      
      if (!["daily", "weekly", "monthly"].includes(timeframe)) {
        return res.status(400).json({ message: "Invalid timeframe. Must be daily, weekly, or monthly" });
      }
      
      const entries = await storage.getTimeBasedLeaderboard(timeframe, limit, offset);
      const total = await storage.getTimeBasedLeaderboardCount(timeframe);
      
      res.set('Cache-Control', 'public, max-age=60');
      
      res.json({
        entries,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + entries.length < total,
        },
        metadata: {
          timeframe,
          lastUpdated: Date.now(),
        },
      });
    } catch (error: any) {
      console.error("Get time-based leaderboard error:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/leaderboard/cache-stats", async (req, res) => {
    try {
      const stats = leaderboardCache.getStats();
      res.json({ stats });
    } catch (error: any) {
      console.error("Get cache stats error:", error);
      res.status(500).json({ message: "Failed to fetch cache stats" });
    }
  });

  app.get("/api/platform-stats", async (req, res) => {
    try {
      const stats = await storage.getPlatformStats();
      res.json({ stats });
    } catch (error: any) {
      console.error("Get platform stats error:", error);
      res.status(500).json({ message: "Failed to fetch platform stats" });
    }
  });

  app.get("/api/analytics", isAuthenticated, async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const analytics = await storage.getUserAnalytics(req.user!.id, days);
      res.json({ analytics });
    } catch (error: any) {
      console.error("Analytics fetch error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.post("/api/analytics/keystrokes", isAuthenticated, async (req, res) => {
    try {
      const { testResultId, keystrokes } = req.body;
      
      if (!testResultId || !Array.isArray(keystrokes) || keystrokes.length === 0) {
        return res.status(400).json({ message: "Invalid request: testResultId and keystrokes array required" });
      }

      // Verify test result belongs to authenticated user
      const ownsTest = await storage.verifyTestResultOwnership(testResultId, req.user!.id);
      
      if (!ownsTest) {
        return res.status(403).json({ message: "Unauthorized: test result does not belong to user" });
      }

      // Validate and sanitize each keystroke, injecting server-side userId and testResultId
      const validatedKeystrokes = [];
      for (const keystroke of keystrokes) {
        const parsed = insertKeystrokeAnalyticsSchema.safeParse({
          ...keystroke,
          userId: req.user!.id,
          testResultId: testResultId,
        });

        if (!parsed.success) {
          return res.status(400).json({
            message: "Keystroke validation failed",
            errors: fromError(parsed.error).toString(),
          });
        }

        validatedKeystrokes.push(parsed.data);
      }

      await storage.saveBulkKeystrokeAnalytics(validatedKeystrokes);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Keystroke analytics save error:", error);
      res.status(500).json({ message: "Failed to save keystroke analytics" });
    }
  });

  app.patch("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: fromError(parsed.error).toString(),
        });
      }

      const sanitizedData = {
        ...parsed.data,
        bio: parsed.data.bio ? DOMPurify.sanitize(parsed.data.bio, { ALLOWED_TAGS: [] }) : parsed.data.bio,
      };

      const updatedUser = await storage.updateUserProfile(req.user!.id, sanitizedData);
      res.json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          avatarColor: updatedUser.avatarColor,
          bio: updatedUser.bio,
          country: updatedUser.country,
          keyboardLayout: updatedUser.keyboardLayout,
        },
      });
    } catch (error: any) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Track social shares and award bonus XP
  app.post("/api/share/track", isAuthenticated, async (req, res) => {
    try {
      const { platform, resultId } = req.body;
      const SHARE_BONUS_XP = 5; // Bonus XP for each share
      
      // Get or create gamification profile
      let gamification = await storage.getUserGamification(req.user!.id);
      if (!gamification) {
        gamification = await storage.createUserGamification({
          userId: req.user!.id,
          totalPoints: 0,
          level: 1,
          experiencePoints: 0,
          totalAchievements: 0,
          totalChallengesCompleted: 0,
        });
      }
      
      // Increment share count and add bonus XP
      const newShareCount = (gamification.totalShares || 0) + 1;
      const newXP = gamification.experiencePoints + SHARE_BONUS_XP;
      const newPoints = gamification.totalPoints + SHARE_BONUS_XP;
      const newLevel = Math.floor(newXP / 100) + 1;
      
      await storage.updateUserGamification(req.user!.id, {
        totalShares: newShareCount,
        experiencePoints: newXP,
        totalPoints: newPoints,
        level: newLevel,
      });
      
      // Check for social sharing achievements
      achievementService.checkSocialAchievements(req.user!.id, newShareCount).catch(error => {
        console.error("Social achievement check error:", error);
      });
      
      res.json({ 
        success: true, 
        bonusXP: SHARE_BONUS_XP,
        totalShares: newShareCount,
        newXP: newXP,
        newLevel: newLevel,
        message: `+${SHARE_BONUS_XP} XP for sharing!`
      });
    } catch (error: any) {
      console.error("Track share error:", error);
      res.status(500).json({ message: "Failed to track share" });
    }
  });

  app.post("/api/auth/change-password", authLimiter, isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      // Comprehensive password validation
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      if (!/[A-Z]/.test(newPassword)) {
        return res.status(400).json({ message: "Password must contain at least one uppercase letter" });
      }

      if (!/[a-z]/.test(newPassword)) {
        return res.status(400).json({ message: "Password must contain at least one lowercase letter" });
      }

      if (!/\d/.test(newPassword)) {
        return res.status(400).json({ message: "Password must contain at least one number" });
      }

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Ensure new password is different from current password
      const isSameAsOld = await bcrypt.compare(newPassword, user.password);
      if (isSameAsOld) {
        return res.status(400).json({ message: "New password must be different from current password" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(req.user!.id, hashedPassword);

      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.delete("/api/auth/delete-account", authLimiter, isAuthenticated, async (req, res) => {
    try {
      await storage.deleteUser(req.user!.id);
      
      req.logout((err) => {
        if (err) {
          console.error("Logout error after account deletion:", err);
        }
        
        req.session.destroy((destroyErr) => {
          if (destroyErr) {
            console.error("Session destroy error after account deletion:", destroyErr);
          }
          res.json({ message: "Account deleted successfully" });
        });
      });
    } catch (error: any) {
      console.error("Delete account error:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email.toLowerCase().trim());
      
      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "If an account exists with that email, a reset link has been sent." });
      }

      // Get IP address for logging
      const ipAddress = req.ip || req.socket.remoteAddress || "unknown";

      // Generate and send password reset email
      await authSecurityService.sendPasswordResetEmail(user.id, user.email, ipAddress);

      res.json({ message: "If an account exists with that email, a reset link has been sent." });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  app.get("/api/auth/validate-reset-token", async (req, res) => {
    try {
      const token = req.query.token as string;

      if (!token) {
        return res.json({ valid: false });
      }

      const resetToken = await storage.getPasswordResetToken(token);

      if (!resetToken) {
        return res.json({ valid: false });
      }

      if (resetToken.usedAt) {
        return res.json({ valid: false, reason: "already_used" });
      }

      if (new Date() > resetToken.expiresAt) {
        return res.json({ valid: false, reason: "expired" });
      }

      res.json({ valid: true });
    } catch (error: any) {
      console.error("Validate reset token error:", error);
      res.json({ valid: false });
    }
  });

  app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      // Validate password
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      if (!/[A-Z]/.test(password)) {
        return res.status(400).json({ message: "Password must contain at least one uppercase letter" });
      }
      if (!/[a-z]/.test(password)) {
        return res.status(400).json({ message: "Password must contain at least one lowercase letter" });
      }
      if (!/\d/.test(password)) {
        return res.status(400).json({ message: "Password must contain at least one number" });
      }

      const resetToken = await storage.getPasswordResetToken(token);

      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }

      if (resetToken.usedAt) {
        return res.status(400).json({ message: "This reset link has already been used" });
      }

      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "This reset link has expired" });
      }

      // Hash new password and update
      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateUserPassword(resetToken.userId, hashedPassword);

      // Mark token as used
      await storage.markPasswordResetTokenUsed(token);

      // Delete all reset tokens for this user
      await storage.deletePasswordResetTokens(resetToken.userId);

      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
      }

      const verificationToken = await storage.getEmailVerificationToken(token);

      if (!verificationToken) {
        return res.status(400).json({ message: "Invalid verification link" });
      }

      if (verificationToken.verifiedAt) {
        return res.status(400).json({ message: "Email has already been verified" });
      }

      if (new Date() > verificationToken.expiresAt) {
        return res.status(400).json({ message: "Verification link has expired", code: "TOKEN_EXPIRED" });
      }

      // Mark email as verified
      await storage.markEmailVerified(verificationToken.userId, token);

      res.json({ message: "Email verified successfully" });
    } catch (error: any) {
      console.error("Verify email error:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  app.post("/api/auth/resend-verification", authLimiter, isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      // Delete existing verification tokens
      await storage.deleteEmailVerificationToken(user.id);

      // Send new verification email
      await authSecurityService.sendVerificationEmail(user.id, user.email);

      res.json({ message: "Verification email sent" });
    } catch (error: any) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to send verification email" });
    }
  });

  app.get("/api/typing/paragraph", aiGenerationLimiter, async (req, res) => {
    try {
      const language = (req.query.language as string) || "en";
      const mode = req.query.mode as string | undefined;
      const difficulty = req.query.difficulty as string | undefined;
      const customPrompt = req.query.customPrompt as string | undefined;
      const generateIfMissing = req.query.generate === "true";
      const forceGenerate = req.query.forceGenerate === "true";
      
      let paragraph: any = undefined;
      let isGenerated = false;
      
      // If forceGenerate is true, always create new AI content
      if (forceGenerate && mode) {
        console.log(`🔄 Force generating new AI paragraph for ${language}/${mode}/${difficulty || 'medium'}`);
        
        try {
          const content = await generateTypingParagraph(
            language, 
            mode, 
            (difficulty as "easy" | "medium" | "hard") || "medium"
          );
          const wordCount = content.split(/\s+/).length;
          
          // Save to database
          paragraph = await storage.createTypingParagraph({
            language,
            mode,
            difficulty: (difficulty as "easy" | "medium" | "hard") || "medium",
            content,
            wordCount,
          });
          
          isGenerated = true;
          console.log(`✅ Force generated and saved new paragraph`);
        } catch (aiError) {
          console.error("❌ Force generation failed:", aiError);
          // Continue to try other methods
        }
      }
      
      // If custom prompt is provided, always generate with AI
      if (!paragraph && customPrompt && customPrompt.trim()) {
        console.log(`🤖 Generating custom AI paragraph: "${customPrompt}"`);
        
        try {
          const content = await generateTypingParagraph(
            language, 
            mode || "general", 
            (difficulty as "easy" | "medium" | "hard") || "medium",
            customPrompt.trim()
          );
          const wordCount = content.split(/\s+/).length;
          
          // Save to database with custom mode name
          paragraph = await storage.createTypingParagraph({
            language,
            mode: `custom_${Date.now()}`, // Unique mode for custom content
            difficulty: (difficulty as "easy" | "medium" | "hard") || "medium",
            content,
            wordCount,
          });
          
          isGenerated = true;
          console.log(`✅ Generated custom paragraph: ${wordCount} words`);
        } catch (aiError) {
          console.error("❌ Custom AI generation failed:", aiError);
          return res.status(500).json({ message: "Failed to generate custom content" });
        }
      } 
      // Check for exact match first (no fallbacks)
      else if (mode) {
        paragraph = await storage.getExactParagraph(language, mode, difficulty);
      }
      
      // If no exact match found and AI generation is requested
      if (!paragraph && generateIfMissing && mode && !customPrompt) {
        console.log(`🤖 Generating AI paragraph for ${language}/${mode}/${difficulty || 'medium'}`);
        
        try {
          const content = await generateTypingParagraph(
            language, 
            mode, 
            (difficulty as "easy" | "medium" | "hard") || "medium"
          );
          const wordCount = content.split(/\s+/).length;
          
          // Save to database
          paragraph = await storage.createTypingParagraph({
            language,
            mode,
            difficulty: (difficulty as "easy" | "medium" | "hard") || "medium",
            content,
            wordCount,
          });
          
          isGenerated = true;
          console.log(`✅ Successfully generated and saved paragraph for ${language}/${mode}`);
        } catch (aiError) {
          console.error("❌ AI generation failed:", aiError);
          // Fall back to existing logic if AI generation fails
          paragraph = await storage.getRandomParagraph(language, mode, difficulty);
        }
      }
      
      // If still no paragraph, use fallback system
      if (!paragraph) {
        paragraph = await storage.getRandomParagraph(language, mode, difficulty);
      }
      
      if (!paragraph) {
        return res.status(500).json({ message: "No paragraphs available in database" });
      }
      
      // Prevent caching so each request gets a new paragraph
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json({ 
        paragraph,
        fallbackUsed: !isGenerated && (paragraph.language !== language || (mode && paragraph.mode !== mode)),
        isGenerated,
      });
    } catch (error: any) {
      console.error("Get paragraph error:", error);
      res.status(500).json({ message: "Failed to fetch paragraph" });
    }
  });

  // Fast batch endpoint - database only, no AI generation (for pre-fetching)
  app.get("/api/typing/paragraphs/batch", async (req, res) => {
    try {
      const language = (req.query.language as string) || "en";
      const mode = req.query.mode as string | undefined;
      const difficulty = req.query.difficulty as string | undefined;
      const count = Math.min(parseInt(req.query.count as string) || 5, 10); // Max 10
      
      // Use efficient batch fetch with single query and shuffle
      const paragraphs = await storage.getRandomParagraphs(language, count, mode, difficulty);
      
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.json({ 
        paragraphs,
        count: paragraphs.length,
      });
    } catch (error: any) {
      console.error("Get batch paragraphs error:", error);
      res.status(500).json({ message: "Failed to fetch paragraphs" });
    }
  });

  app.get("/api/typing/languages", async (req, res) => {
    try {
      const languages = await storage.getAvailableLanguages();
      res.json({ languages });
    } catch (error: any) {
      console.error("Get languages error:", error);
      res.status(500).json({ message: "Failed to fetch languages" });
    }
  });

  app.get("/api/typing/modes", async (req, res) => {
    try {
      const modes = await storage.getAvailableModes();
      res.json({ modes });
    } catch (error: any) {
      console.error("Get modes error:", error);
      res.status(500).json({ message: "Failed to fetch modes" });
    }
  });

  app.get("/api/conversations", isAuthenticated, async (req, res) => {
    try {
      const conversations = await storage.getUserConversations(req.user!.id);
      res.json({ conversations });
    } catch (error: any) {
      console.error("Get conversations error:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", isAuthenticated, async (req, res) => {
    try {
      const conversation = await storage.createConversation({
        userId: req.user!.id,
        title: req.body.title || "New Chat",
        isPinned: 0,
      });
      res.json({ conversation });
    } catch (error: any) {
      console.error("Create conversation error:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.patch("/api/conversations/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.updateConversation(id, req.user!.id, req.body);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json({ conversation });
    } catch (error: any) {
      console.error("Update conversation error:", error);
      res.status(500).json({ message: "Failed to update conversation" });
    }
  });

  app.delete("/api/conversations/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getConversation(id, req.user!.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      await storage.deleteConversation(id, req.user!.id);
      res.json({ message: "Conversation deleted" });
    } catch (error: any) {
      console.error("Delete conversation error:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  app.get("/api/conversations/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getConversation(id, req.user!.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      const messages = await storage.getConversationMessages(id);
      res.json({ messages });
    } catch (error: any) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // File upload middleware - memory storage for immediate processing
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req: any, file: any, cb: any) => {
      const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];

      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only images, PDFs, Word documents, and text files are allowed.'));
      }
    },
  });

  // File analysis endpoint
  app.post("/api/analyze-file", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const analysis = await analyzeFile(req.file);

      res.json({
        success: true,
        analysis,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (error) {
      console.error("File analysis error:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to analyze file",
      });
    }
  });

  app.post("/api/chat", isAuthenticated, chatLimiter, async (req, res) => {
    try {
      const { messages: requestMessages, conversationId } = req.body;

      if (!requestMessages || !Array.isArray(requestMessages)) {
        return res.status(400).json({ message: "Invalid request: messages array required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ message: "AI service not configured" });
      }

      const sanitizedMessages = requestMessages.map((m: ChatMessage) => ({
        ...m,
        content: DOMPurify.sanitize(m.content, { ALLOWED_TAGS: [] }),
      }));

      const lastUserMessage = sanitizedMessages.filter((m: ChatMessage) => m.role === "user").pop();
      if (!lastUserMessage) {
        return res.status(400).json({ message: "No user message found" });
      }

      let convId = conversationId;
      let isNewConversation = false;
      
      if (!convId) {
        // Create conversation with temporary title
        const conversation = await storage.createConversation({
          userId: req.user!.id,
          title: "New Chat",
          isPinned: 0,
        });
        convId = conversation.id;
        isNewConversation = true;
      } else {
        const conversation = await storage.getConversation(convId, req.user!.id);
        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }
        // Check if this is the first message in an existing "New Chat" conversation
        const existingMessages = await storage.getConversationMessages(convId);
        if (existingMessages.length === 0 && conversation.title === "New Chat") {
          isNewConversation = true;
        }
      }

      await storage.createMessage({
        conversationId: convId,
        role: "user",
        content: lastUserMessage.content,
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      try {
        let assistantResponse = "";
        
        for await (const event of streamChatCompletionWithSearch(sanitizedMessages, true)) {
          switch (event.type) {
            case "searching":
              res.write(`data: ${JSON.stringify({ 
                type: "searching", 
                status: event.data.status,
                query: event.data.query,
                conversationId: convId 
              })}\n\n`);
              break;
            case "search_complete":
              res.write(`data: ${JSON.stringify({ 
                type: "search_complete", 
                results: event.data.results,
                query: event.data.query,
                conversationId: convId 
              })}\n\n`);
              break;
            case "content":
              assistantResponse += event.data;
              res.write(`data: ${JSON.stringify({ content: event.data, conversationId: convId })}\n\n`);
              break;
            case "sources":
              res.write(`data: ${JSON.stringify({ 
                type: "sources", 
                sources: event.data,
                conversationId: convId 
              })}\n\n`);
              break;
            case "error":
              res.write(`data: ${JSON.stringify({ error: event.data })}\n\n`);
              break;
          }
        }
        
        await storage.createMessage({
          conversationId: convId,
          role: "assistant",
          content: assistantResponse,
        });

        if (isNewConversation) {
          generateConversationTitle(lastUserMessage.content)
            .then(async (title) => {
              try {
                await storage.updateConversation(convId!, req.user!.id, { title });
                console.log(`[Chat] Generated title for conversation ${convId}: "${title}"`);
              } catch (err) {
                console.error(`[Chat] Failed to update conversation title:`, err);
              }
            })
            .catch((err) => {
              console.error(`[Chat] Title generation failed:`, err);
            });
        }

        res.write("data: [DONE]\n\n");
        res.end();
      } catch (streamError: any) {
        console.error("Streaming error:", streamError);
        res.write(`data: ${JSON.stringify({ error: streamError.message })}\n\n`);
        res.end();
      }
    } catch (error: any) {
      console.error("Chat API error:", error);
      res.status(500).json({ message: "Chat service error" });
    }
  });

  // Multiplayer Racing Routes
  app.post("/api/races/quick-match", async (req, res) => {
    try {
      const user = req.user;
      const { guestId, raceType, timeLimitSeconds } = req.body;
      let username: string;
      
      if (user) {
        username = user.username;
      } else {
        username = generateGuestUsername();
      }
      
      const avatarColor = user?.avatarColor || "bg-primary";
      
      // Default to timed race with 60 seconds if not specified
      const effectiveRaceType = raceType || "timed";
      const effectiveTimeLimit = timeLimitSeconds || 60;

      const activeRaces = await storage.getActiveRaces();
      
      // Find a waiting public race with matching type/duration and available slots
      let availableRace = null;
      for (const r of activeRaces) {
        if (r.status === "waiting" && r.isPrivate === 0) {
          // For timed races, match by duration
          if (effectiveRaceType === "timed") {
            if (r.raceType !== "timed" || r.timeLimitSeconds !== effectiveTimeLimit) {
              continue;
            }
          } else {
            // For standard races, don't match with timed races
            if (r.raceType === "timed") {
              continue;
            }
          }
          
          const participants = await storage.getRaceParticipants(r.id);
          // Count only human participants (bots can be replaced)
          const humanCount = participants.filter(p => p.isBot !== 1).length;
          if (humanCount < r.maxPlayers) {
            availableRace = r;
            break;
          }
        }
      }

      let race;
      let paragraphContent: string;
      let paragraphId: number | undefined;
      
      if (availableRace) {
        race = availableRace;
      } else {
        // For timed races, generate more content
        if (effectiveRaceType === "timed") {
          const paragraphs: string[] = [];
          // Generate enough content for the duration (estimate ~60 WPM, 5 chars/word)
          const estimatedCharsNeeded = Math.ceil((effectiveTimeLimit / 60) * 60 * 5 * 2);
          let totalChars = 0;
          
          while (totalChars < estimatedCharsNeeded) {
            const para = await storage.getRandomParagraph("english", "quote");
            if (para) {
              paragraphs.push(para.content);
              totalChars += para.content.length;
            } else {
              break;
            }
          }
          paragraphContent = paragraphs.join(" ");
        } else {
          const paragraph = await storage.getRandomParagraph("english", "quote");
          if (!paragraph) {
            return res.status(500).json({ message: "No paragraph available" });
          }
          paragraphContent = paragraph.content;
          paragraphId = paragraph.id;
        }

        if (!paragraphContent) {
          return res.status(500).json({ message: "No paragraph available" });
        }

        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        race = await storage.createRace({
          roomCode,
          status: "waiting",
          raceType: effectiveRaceType,
          timeLimitSeconds: effectiveRaceType === "timed" ? effectiveTimeLimit : null,
          paragraphId,
          paragraphContent,
          maxPlayers: 8, // Allow up to 8 players, bots will be replaced when humans join
          isPrivate: 0,
        });
      }

      const participants = await storage.getRaceParticipants(race.id);
      let participant = participants.find(p => {
        if (user) {
          return p.userId === user.id;
        } else {
          return p.guestName === guestId;
        }
      });

      if (!participant) {
        const inactive = await storage.findInactiveParticipant(race.id, user?.id, guestId);
        
        if (inactive) {
          participant = await storage.reactivateRaceParticipant(inactive.id);
        } else {
          // Check if race is full
          if (participants.length >= race.maxPlayers) {
            // Try to replace a bot with the human player
            const botToReplace = participants.find(p => p.isBot === 1);
            if (botToReplace) {
              // Remove the bot to make room for the human
              await storage.deleteRaceParticipant(botToReplace.id);
              console.log(`[Quick Match] Replaced bot ${botToReplace.username} with human ${username}`);
            } else {
              return res.status(400).json({ message: "Race is full" });
            }
          }

          participant = await storage.createRaceParticipant({
            raceId: race.id,
            userId: user?.id,
            guestName: user ? undefined : guestId,
            username,
            avatarColor,
            progress: 0,
            wpm: 0,
            accuracy: 0,
            errors: 0,
            isFinished: 0,
            isBot: 0,
          });
        }
      }

      res.json({ race, participant });
    } catch (error: any) {
      console.error("Quick match error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/races/create", async (req, res) => {
    try {
      const { isPrivate, maxPlayers: rawMaxPlayers, guestId, timeLimitSeconds: rawTimeLimit } = req.body;
      const user = req.user;
      
      // Validate and sanitize room settings
      const maxPlayers = Math.max(2, Math.min(10, Number(rawMaxPlayers) || 4));
      
      // Validate duration (30, 60, 90, 120 seconds)
      const validDurations = [30, 60, 90, 120];
      const timeLimitSeconds = validDurations.includes(Number(rawTimeLimit)) ? Number(rawTimeLimit) : 60;
      
      let username: string;
      
      if (user) {
        username = user.username;
      } else {
        username = generateGuestUsername();
      }
      
      const avatarColor = user?.avatarColor || "bg-primary";

      let paragraphContent = "";
      let paragraphId: number | undefined;
      
      // All races are timed - generate enough content for the maximum duration (120s)
      // Estimate: 80 WPM * 5 chars/word = 400 chars/min, add buffer for 2 min max
      const estimatedChars = Math.ceil((120 / 60) * 400 * 2);
      const paragraphsNeeded = Math.ceil(estimatedChars / 300);
      
      const paragraphs: string[] = [];
      for (let i = 0; i < Math.max(paragraphsNeeded, 3); i++) {
        const p = await storage.getRandomParagraph("english", "quote");
        if (p) {
          paragraphs.push(p.content);
          if (i === 0) paragraphId = p.id;
        }
      }
      paragraphContent = paragraphs.join(" ");

      if (!paragraphContent) {
        return res.status(500).json({ message: "No paragraph available" });
      }

      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const race = await storage.createRace({
        roomCode,
        status: "waiting",
        raceType: "timed",
        timeLimitSeconds,
        paragraphId,
        paragraphContent,
        maxPlayers: maxPlayers || 4,
        isPrivate: isPrivate ? 1 : 0,
      });

      let participant = await storage.createRaceParticipant({
        raceId: race.id,
        userId: user?.id,
        guestName: user ? undefined : guestId,
        username,
        avatarColor,
        progress: 0,
        wpm: 0,
        accuracy: 0,
        errors: 0,
        isFinished: 0,
        isBot: 0,
      });

      // Bots and race duration will be configured by host in waiting room before starting

      res.json({ race, participant });
    } catch (error: any) {
      console.error("Create race error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/races/join/:roomCode", async (req, res) => {
    try {
      const { roomCode } = req.params;
      const { guestId } = req.body;
      const user = req.user;
      let username: string;
      
      if (user) {
        username = user.username;
      } else {
        username = generateGuestUsername();
      }
      
      const avatarColor = user?.avatarColor || "bg-primary";

      const race = await storage.getRaceByCode(roomCode.toUpperCase());
      if (!race) {
        return res.status(404).json({ message: "Race not found" });
      }

      if (race.status !== "waiting") {
        return res.status(400).json({ message: "Race has already started" });
      }

      const participants = await storage.getRaceParticipants(race.id);
      
      let participant = participants.find(p => {
        if (user) {
          return p.userId === user.id;
        } else {
          return p.guestName === guestId;
        }
      });

      if (!participant) {
        const inactive = await storage.findInactiveParticipant(race.id, user?.id, guestId);
        
        if (inactive) {
          participant = await storage.reactivateRaceParticipant(inactive.id);
        } else {
          // Check if race is full
          if (participants.length >= race.maxPlayers) {
            // If there are bots, remove one to make room for the human player
            const botParticipants = participants.filter(p => p.isBot === 1);
            if (botParticipants.length > 0) {
              // Remove a bot to make room for the human
              const botToRemove = botParticipants[botParticipants.length - 1];
              await storage.deleteRaceParticipant(botToRemove.id);
              console.log(`[Join Room] Removed bot ${botToRemove.username} to make room for human player`);
            } else {
              // No bots to remove - race is truly full with humans
              return res.status(400).json({ message: "Race is full" });
            }
          }

          participant = await storage.createRaceParticipant({
            raceId: race.id,
            userId: user?.id,
            guestName: user ? undefined : guestId,
            username,
            avatarColor,
            progress: 0,
            wpm: 0,
            accuracy: 0,
            errors: 0,
            isFinished: 0,
            isBot: 0,
          });
          
          // CRITICAL: Update the race cache with the new participant
          // This ensures WebSocket can find the participant when they connect
          const { raceCache } = await import("./race-cache");
          const updatedParticipants = await storage.getRaceParticipants(race.id);
          raceCache.updateParticipants(race.id, updatedParticipants);
          console.log(`[Join Room] Updated race cache with new participant ${username} (${participant.id})`);
        }
      }

      res.json({ race, participant });
    } catch (error: any) {
      console.error("Join race error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Active races route must be before :id route to avoid matching "active" as an id
  app.get("/api/races/active", async (req, res) => {
    try {
      const { raceCache } = await import("./race-cache");
      const cachedRaces = raceCache.getActiveRaces();
      
      if (cachedRaces.length > 0) {
        return res.json(cachedRaces);
      }
      
      const activeRaces = await storage.getActiveRaces();
      res.json(activeRaces);
    } catch (error: any) {
      console.error("Get active races error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Health check endpoints for load balancers and monitoring
  app.get("/health", async (req, res) => {
    try {
      const { performHealthCheck } = await import("./health-check");
      const includeMetrics = req.query.metrics === "true";
      const result = await performHealthCheck(includeMetrics);
      
      const statusCode = result.status === "healthy" ? 200 : result.status === "degraded" ? 200 : 503;
      res.status(statusCode).json(result);
    } catch (error: any) {
      res.status(503).json({ status: "unhealthy", error: error.message });
    }
  });

  app.get("/health/live", async (req, res) => {
    try {
      const { performLivenessCheck } = await import("./health-check");
      const result = await performLivenessCheck();
      res.status(result.alive ? 200 : 503).json(result);
    } catch (error: any) {
      res.status(503).json({ alive: false, error: error.message });
    }
  });

  app.get("/health/ready", async (req, res) => {
    try {
      const { performReadinessCheck } = await import("./health-check");
      const result = await performReadinessCheck();
      res.status(result.ready ? 200 : 503).json(result);
    } catch (error: any) {
      res.status(503).json({ ready: false, error: error.message });
    }
  });

  // Scalability stats endpoint for monitoring
  app.get("/api/races/stats", async (req, res) => {
    try {
      const { raceWebSocket } = await import("./websocket");
      const { metricsCollector } = await import("./metrics");
      
      res.json({
        websocket: raceWebSocket.getStats(),
        cache: raceWebSocket.getCacheStats(),
        rateLimiter: raceWebSocket.getRateLimiterStats(),
        cleanup: raceWebSocket.getCleanupStats(),
        loadState: raceWebSocket.getLoadState(),
        isUnderPressure: raceWebSocket.isUnderPressure(),
        metrics: metricsCollector.getStats(),
      });
    } catch (error: any) {
      console.error("Get race stats error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/races/:id", async (req, res) => {
    try {
      const id = req.params.id;
      
      let raceData;
      if (/^\d+$/.test(id)) {
        const raceId = parseInt(id);
        raceData = await storage.getRaceWithParticipants(raceId);
      } else {
        const race = await storage.getRaceByCode(id);
        if (race) {
          raceData = await storage.getRaceWithParticipants(race.id);
        }
      }
      
      if (!raceData) {
        return res.status(404).json({ message: "Race not found" });
      }

      res.json(raceData);
    } catch (error: any) {
      console.error("Get race error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================================
  // MULTIPLAYER RACING ENHANCED FEATURES API
  // ============================================================================

  const ratingLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { message: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // User Ratings API
  app.get("/api/ratings/me", isAuthenticated, ratingLimiter, async (req, res) => {
    try {
      const rating = await storage.getOrCreateUserRating(req.user!.id);
      const { eloRatingService } = await import("./elo-rating-service");
      const tierInfo = eloRatingService.getTierInfo(rating.tier);
      res.json({ rating: { ...rating, tierInfo } });
    } catch (error: any) {
      console.error("Get user rating error:", error);
      res.status(500).json({ message: "Failed to fetch rating" });
    }
  });

  app.get("/api/ratings/leaderboard", ratingLimiter, async (req, res) => {
    try {
      const tier = req.query.tier as string | undefined;
      const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 100);
      const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
      const cursor = req.query.cursor as string | undefined;
      
      if (tier && !["bronze", "silver", "gold", "platinum", "diamond", "master", "grandmaster"].includes(tier)) {
        return res.status(400).json({ message: "Invalid tier" });
      }
      
      const actualOffset = cursor ? leaderboardCache.decodeCursor(cursor) : offset;
      
      const result = await leaderboardCache.getRatingLeaderboard({
        tier,
        limit,
        offset: actualOffset,
      });
      
      const { eloRatingService } = await import("./elo-rating-service");
      const enrichedEntries = result.entries.map((entry: any) => ({
        ...entry,
        tierInfo: eloRatingService.getTierInfo(entry.tier),
      }));
      
      res.set('Cache-Control', 'public, max-age=15');
      res.set('X-Cache', result.metadata.cacheHit ? 'HIT' : 'MISS');
      res.set('X-Total-Count', String(result.pagination.total));

      res.json({
        ...result,
        entries: enrichedEntries,
      });
    } catch (error: any) {
      console.error("Get rating leaderboard error:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/ratings/leaderboard/around-me", isAuthenticated, ratingLimiter, async (req, res) => {
    try {
      const tier = req.query.tier as string | undefined;
      const range = Math.min(Math.max(1, parseInt(req.query.range as string) || 5), 20);
      
      const result = await leaderboardCache.getAroundMe("rating", req.user!.id, { tier, range });
      
      res.set('Cache-Control', 'private, max-age=10');
      res.set('X-Cache', result.cacheHit ? 'HIT' : 'MISS');
      
      res.json({
        userRank: result.userRank,
        entries: result.entries,
      });
    } catch (error: any) {
      console.error("Get rating leaderboard around me error:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/ratings/:userId", ratingLimiter, async (req, res) => {
    try {
      const userId = req.params.userId;
      
      if (!userId || typeof userId !== 'string' || userId.length > 100) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const rating = await storage.getUserRating(userId);
      
      if (!rating) {
        return res.status(404).json({ message: "Rating not found" });
      }

      const { eloRatingService } = await import("./elo-rating-service");
      const tierInfo = eloRatingService.getTierInfo(rating.tier);
      res.json({ rating: { ...rating, tierInfo } });
    } catch (error: any) {
      console.error("Get user rating error:", error);
      res.status(500).json({ message: "Failed to fetch rating" });
    }
  });

  // Match History API
  app.get("/api/match-history", isAuthenticated, ratingLimiter, async (req, res) => {
    try {
      const limitParam = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const limit = Math.min(Math.max(1, limitParam), 100);
      const history = await storage.getUserMatchHistory(req.user!.id, limit);
      res.json({ history });
    } catch (error: any) {
      console.error("Get match history error:", error);
      res.status(500).json({ message: "Failed to fetch match history" });
    }
  });

  // Race Replays API
  app.get("/api/replays/public", ratingLimiter, async (req, res) => {
    try {
      const limitParam = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const limit = Math.min(Math.max(1, limitParam), 50);
      const replays = await storage.getPublicReplays(limit);
      res.json({ replays });
    } catch (error: any) {
      console.error("Get public replays error:", error);
      res.status(500).json({ message: "Failed to fetch replays" });
    }
  });

  app.get("/api/replays/:raceId", ratingLimiter, async (req, res) => {
    try {
      const raceIdParam = req.params.raceId;
      
      if (!raceIdParam || !/^\d+$/.test(raceIdParam)) {
        return res.status(400).json({ message: "Invalid race ID" });
      }
      
      const raceId = parseInt(raceIdParam);
      
      if (raceId <= 0 || raceId > 2147483647) {
        return res.status(400).json({ message: "Invalid race ID" });
      }
      
      const replay = await storage.getRaceReplay(raceId);
      
      if (!replay) {
        return res.status(404).json({ message: "Replay not found" });
      }

      if (!replay.isPublic) {
        const race = await storage.getRace(raceId);
        if (race) {
          const participants = await storage.getRaceParticipants(raceId);
          const userId = req.user?.id;
          const isParticipant = userId && participants.some(p => p.userId === userId);
          
          if (!isParticipant) {
            return res.status(403).json({ message: "Access denied: private replay" });
          }
        }
      }

      await storage.incrementReplayViewCount(raceId);
      res.json({ replay });
    } catch (error: any) {
      console.error("Get replay error:", error);
      res.status(500).json({ message: "Failed to fetch replay" });
    }
  });

  // Race Chat History API
  app.get("/api/races/:raceId/chat", ratingLimiter, async (req, res) => {
    try {
      const raceIdParam = req.params.raceId;
      
      if (!raceIdParam || !/^\d+$/.test(raceIdParam)) {
        return res.status(400).json({ message: "Invalid race ID" });
      }
      
      const raceId = parseInt(raceIdParam);
      const limitParam = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const limit = Math.min(Math.max(1, limitParam), 500);
      const messages = await storage.getRaceChatMessages(raceId, limit);
      res.json({ messages });
    } catch (error: any) {
      console.error("Get race chat error:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  // Anti-Cheat Certification API
  app.get("/api/anti-cheat/certification", isAuthenticated, async (req, res) => {
    try {
      const certification = await storage.getUserCertification(req.user!.id);
      res.json({ 
        certified: !!certification,
        certification: certification || null,
      });
    } catch (error: any) {
      console.error("Get certification error:", error);
      res.status(500).json({ message: "Failed to fetch certification" });
    }
  });

  app.post("/api/anti-cheat/challenge", isAuthenticated, async (req, res) => {
    try {
      const { antiCheatService } = await import("./anticheat-service");
      const challengeText = await antiCheatService.triggerVerificationChallenge(
        req.user!.id,
        req.body.triggeredWpm || 100
      );
      res.json({ challengeText });
    } catch (error: any) {
      console.error("Create challenge error:", error);
      res.status(500).json({ message: "Failed to create challenge" });
    }
  });

  // Skill-Based Matchmaking API
  app.get("/api/matchmaking/pool", isAuthenticated, ratingLimiter, async (req, res) => {
    try {
      const toleranceParam = req.query.tolerance ? parseInt(req.query.tolerance as string) : 200;
      const tolerance = Math.min(Math.max(50, toleranceParam), 500);
      const { eloRatingService } = await import("./elo-rating-service");
      const pool = await eloRatingService.getMatchmakingPool(req.user!.id, tolerance);
      
      const enrichedPool = await Promise.all(
        pool.map(async (rating) => {
          const user = await storage.getUser(rating.userId);
          return {
            ...rating,
            username: user?.username || "Unknown",
            avatarColor: user?.avatarColor,
            tierInfo: eloRatingService.getTierInfo(rating.tier),
          };
        })
      );

      res.json({ matchmakingPool: enrichedPool });
    } catch (error: any) {
      console.error("Get matchmaking pool error:", error);
      res.status(500).json({ message: "Failed to fetch matchmaking pool" });
    }
  });

  // Flagged Keystrokes API (Admin)
  app.get("/api/admin/flagged-keystrokes", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const flagged = await storage.getFlaggedKeystrokes(limit);
      res.json({ flagged });
    } catch (error: any) {
      console.error("Get flagged keystrokes error:", error);
      res.status(500).json({ message: "Failed to fetch flagged keystrokes" });
    }
  });

  app.get("/api/code/snippet", aiGenerationLimiter, async (req, res) => {
    try {
      const { z } = await import("zod");
      
      const querySchema = z.object({
        language: z.string().min(1).max(50).regex(/^[a-zA-Z0-9+#_-]+$/),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        framework: z.string().max(50).optional(),
        generate: z.enum(["true", "false"]).optional(),
        forceNew: z.enum(["true", "false"]).optional(),
        timeLimit: z.string().regex(/^\d+$/).optional(),
        testMode: z.enum(["normal", "expert", "master"]).optional(),
        customPrompt: z.string().max(500).optional(),
      });
      
      const parsed = querySchema.safeParse(req.query);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Invalid request parameters",
          errors: fromError(parsed.error).toString()
        });
      }
      
      const { language, difficulty, framework, generate, forceNew, timeLimit, testMode, customPrompt } = parsed.data;
      const timeLimitNum = timeLimit ? parseInt(timeLimit, 10) : 0;

      let snippet = null;
      
      // Only use cached snippets if not forcing new generation
      if (forceNew !== "true") {
        snippet = await storage.getRandomCodeSnippet(language, difficulty, framework);
      }

      // Generate new snippet if none found or force new is requested
      if ((!snippet || forceNew === "true") && generate === "true") {
        console.log(`🤖 Generating fresh code snippet for ${language}/${difficulty || 'medium'} (${timeLimitNum}s, ${testMode || 'normal'} mode)${customPrompt ? ` [Custom: ${customPrompt.substring(0, 50)}...]` : ''}`);
        
        try {
          const { content, description } = await generateCodeSnippet(
            language,
            difficulty || "medium",
            framework,
            timeLimitNum,
            testMode || "normal",
            customPrompt
          );
          
          const lineCount = content.split('\n').length;
          const characterCount = content.length;
          
          snippet = await storage.createCodeSnippet({
            programmingLanguage: language,
            framework,
            difficulty: difficulty || "medium",
            content,
            lineCount,
            characterCount,
            description,
          });
          
          console.log(`✅ Generated and saved ${lineCount}-line ${language} code snippet`);
        } catch (error) {
          console.error("❌ Code generation failed:", error);
          // If generation fails and we have no snippet, try to get a random one as fallback
          if (!snippet) {
            snippet = await storage.getRandomCodeSnippet(language, difficulty, framework);
          }
        }
      }

      if (!snippet) {
        return res.status(404).json({ message: "No code snippets available for these criteria" });
      }

      // Disable caching for this endpoint to ensure fresh responses
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.json({ snippet });
    } catch (error: any) {
      console.error("Get code snippet error:", error);
      res.status(500).json({ message: "Failed to fetch code snippet" });
    }
  });

  app.get("/api/code/languages", async (req, res) => {
    try {
      const languages = await storage.getAvailableProgrammingLanguages();
      res.json({ languages });
    } catch (error: any) {
      console.error("Get programming languages error:", error);
      res.status(500).json({ message: "Failed to fetch programming languages" });
    }
  });

  app.get("/api/code/frameworks", async (req, res) => {
    try {
      const language = req.query.language as string | undefined;
      const frameworks = await storage.getAvailableFrameworks(language);
      res.json({ frameworks });
    } catch (error: any) {
      console.error("Get frameworks error:", error);
      res.status(500).json({ message: "Failed to fetch frameworks" });
    }
  });

  app.post("/api/code/test-results", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertCodeTypingTestSchema.safeParse({
        ...req.body,
        userId: req.user!.id,
      });

      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: fromError(parsed.error).toString(),
        });
      }

      const test = await storage.createCodeTypingTest(parsed.data);

      res.status(201).json({ message: "Code typing test saved", test });
    } catch (error: any) {
      console.error("Save code test error:", error);
      res.status(500).json({ message: "Failed to save code typing test" });
    }
  });

  app.get("/api/code/test-results", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const tests = await storage.getUserCodeTypingTests(req.user!.id, limit);
      res.json({ tests });
    } catch (error: any) {
      console.error("Get code test results error:", error);
      res.status(500).json({ message: "Failed to fetch code test results" });
    }
  });

  app.get("/api/code/stats", isAuthenticated, async (req, res) => {
    try {
      const language = req.query.language as string | undefined;
      const stats = await storage.getUserCodeStats(req.user!.id, language);
      res.json({ stats });
    } catch (error: any) {
      console.error("Get code stats error:", error);
      res.status(500).json({ message: "Failed to fetch code stats" });
    }
  });

  app.get("/api/code/leaderboard", async (req, res) => {
    try {
      const language = req.query.language as string | undefined;
      const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 100);
      const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
      const cursor = req.query.cursor as string | undefined;
      
      const actualOffset = cursor ? leaderboardCache.decodeCursor(cursor) : offset;
      
      const result = await leaderboardCache.getCodeLeaderboard({
        language,
        limit,
        offset: actualOffset,
      });
      
      res.set('Cache-Control', 'public, max-age=30');
      res.set('X-Cache', result.metadata.cacheHit ? 'HIT' : 'MISS');
      res.set('X-Total-Count', String(result.pagination.total));
      
      res.json(result);
    } catch (error: any) {
      console.error("Get code leaderboard error:", error);
      res.status(500).json({ message: "Failed to fetch code leaderboard" });
    }
  });

  app.get("/api/code/leaderboard/around-me", isAuthenticated, async (req, res) => {
    try {
      const language = req.query.language as string | undefined;
      const range = Math.min(Math.max(1, parseInt(req.query.range as string) || 5), 20);
      
      const result = await leaderboardCache.getAroundMe("code", req.user!.id, { language, range });
      
      res.set('Cache-Control', 'private, max-age=10');
      res.set('X-Cache', result.cacheHit ? 'HIT' : 'MISS');
      
      res.json({
        userRank: result.userRank,
        entries: result.entries,
      });
    } catch (error: any) {
      console.error("Get code leaderboard around me error:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.post("/api/code/share", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      const sanitizedCodeContent = DOMPurify.sanitize(req.body.codeContent, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });

      let sharedResult;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        try {
          const shareId = Math.random().toString(36).substring(2, 12).toUpperCase();
          
          const dataToValidate = {
            shareId,
            userId: user.id,
            username: user.username,
            programmingLanguage: req.body.programmingLanguage,
            framework: req.body.framework,
            difficulty: req.body.difficulty,
            testMode: req.body.testMode,
            wpm: req.body.wpm,
            accuracy: req.body.accuracy,
            errors: req.body.errors,
            syntaxErrors: req.body.syntaxErrors,
            duration: req.body.duration,
            codeContent: sanitizedCodeContent,
          };

          const validationResult = insertSharedCodeResultSchema.safeParse(dataToValidate);

          if (!validationResult.success) {
            const validationError = fromError(validationResult.error);
            return res.status(400).json({ 
              message: "Validation error", 
              error: validationError.toString() 
            });
          }
          
          sharedResult = await storage.createSharedCodeResult(validationResult.data);
          
          break;
        } catch (err: any) {
          if (err.code === '23505' && err.constraint === 'shared_code_results_share_id_unique') {
            attempts++;
            if (attempts >= maxAttempts) {
              throw new Error("Failed to generate unique share ID");
            }
            continue;
          }
          throw err;
        }
      }
      
      res.json(sharedResult);
    } catch (error: any) {
      console.error("Share code result error:", error);
      res.status(500).json({ message: error.message || "Failed to share result" });
    }
  });

  app.get("/api/code/share/:shareId", async (req, res) => {
    try {
      const { shareId } = req.params;
      const sharedResult = await storage.getSharedCodeResult(shareId);
      
      if (!sharedResult) {
        return res.status(404).json({ message: "Shared result not found" });
      }
      
      res.json(sharedResult);
    } catch (error: any) {
      console.error("Get shared result error:", error);
      res.status(500).json({ message: "Failed to fetch shared result" });
    }
  });

  app.get("/api/book-paragraphs", async (req, res) => {
    try {
      const difficulty = req.query.difficulty as string | undefined;
      const topic = req.query.topic as string | undefined;
      const durationMode = req.query.durationMode ? parseInt(req.query.durationMode as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({ 
          message: "Invalid difficulty", 
          code: "INVALID_DIFFICULTY",
          validValues: ['easy', 'medium', 'hard'] 
        });
      }
      
      if (durationMode && ![30, 60, 90, 120].includes(durationMode)) {
        return res.status(400).json({ 
          message: "Invalid duration mode",
          code: "INVALID_DURATION",
          validValues: [30, 60, 90, 120]
        });
      }
      
      if (limit < 1 || limit > 100) {
        return res.status(400).json({ 
          message: "Limit must be between 1 and 100",
          code: "INVALID_LIMIT"
        });
      }
      
      const paragraphs = await storage.getBookParagraphs({
        difficulty,
        topic,
        durationMode,
        limit,
      });
      
      res.json({ paragraphs });
    } catch (error: any) {
      console.error("Get book paragraphs error:", error);
      res.status(500).json({ 
        message: "Failed to fetch book paragraphs",
        code: "SERVER_ERROR"
      });
    }
  });

  app.get("/api/book-paragraphs/random", async (req, res) => {
    try {
      const difficulty = req.query.difficulty as string | undefined;
      const topic = req.query.topic as string | undefined;
      const durationMode = req.query.durationMode ? parseInt(req.query.durationMode as string) : undefined;
      
      if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({ 
          message: "Invalid difficulty",
          code: "INVALID_DIFFICULTY",
          validValues: ['easy', 'medium', 'hard']
        });
      }
      
      const paragraph = await storage.getRandomBookParagraph({
        difficulty,
        topic,
        durationMode,
      });
      
      if (!paragraph) {
        return res.status(404).json({ 
          message: "No paragraphs found matching your filters. Try different settings.",
          code: "NO_PARAGRAPHS",
          filters: { difficulty, topic, durationMode }
        });
      }
      
      res.json(paragraph);
    } catch (error: any) {
      console.error("Get random book paragraph error:", error);
      res.status(500).json({ 
        message: "Failed to fetch random book paragraph",
        code: "SERVER_ERROR"
      });
    }
  });

  app.get("/api/book-paragraphs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id) || id < 1) {
        return res.status(400).json({ 
          message: "Invalid paragraph ID. Must be a positive integer.",
          code: "INVALID_ID"
        });
      }
      
      const paragraph = await storage.getBookParagraphById(id);
      
      if (!paragraph) {
        return res.status(404).json({ 
          message: "Book paragraph not found",
          code: "NOT_FOUND",
          id
        });
      }
      
      res.json({ paragraph });
    } catch (error: any) {
      console.error("Get book paragraph by ID error:", error);
      res.status(500).json({ 
        message: "Failed to fetch book paragraph",
        code: "SERVER_ERROR"
      });
    }
  });

  app.get("/api/book-paragraphs/next/:bookId/:paragraphIndex", async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const paragraphIndex = parseInt(req.params.paragraphIndex);
      
      if (isNaN(bookId) || bookId < 1) {
        return res.status(400).json({ 
          message: "Invalid book ID. Must be a positive integer.",
          code: "INVALID_BOOK_ID"
        });
      }
      
      if (isNaN(paragraphIndex) || paragraphIndex < 0) {
        return res.status(400).json({ 
          message: "Invalid paragraph index. Must be a non-negative integer.",
          code: "INVALID_PARAGRAPH_INDEX"
        });
      }
      
      const nextParagraph = await storage.getNextBookParagraph(bookId, paragraphIndex);
      
      if (!nextParagraph) {
        return res.status(404).json({ 
          message: "No more paragraphs available in this book",
          code: "END_OF_BOOK",
          bookId,
          lastIndex: paragraphIndex
        });
      }
      
      res.json(nextParagraph);
    } catch (error: any) {
      console.error("Get next book paragraph error:", error);
      res.status(500).json({ 
        message: "Failed to fetch next book paragraph",
        code: "SERVER_ERROR"
      });
    }
  });

  app.get("/api/book-topics", async (req, res) => {
    try {
      const topics = await storage.getBookTopics();
      
      res.set('Cache-Control', 'public, max-age=300');
      res.json({ topics });
    } catch (error: any) {
      console.error("Get book topics error:", error);
      res.status(500).json({ 
        message: "Failed to fetch book topics",
        code: "SERVER_ERROR"
      });
    }
  });

  app.get("/api/books", async (req, res) => {
    try {
      const books = await storage.getAllBooks();
      
      res.set('Cache-Control', 'public, max-age=60');
      res.json(books);
    } catch (error: any) {
      console.error("Get all books error:", error);
      res.status(500).json({ 
        message: "Failed to fetch books",
        code: "SERVER_ERROR"
      });
    }
  });

  app.get("/api/books/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      
      if (!slug || slug.length < 1 || slug.length > 200) {
        return res.status(400).json({ 
          message: "Invalid book slug",
          code: "INVALID_SLUG"
        });
      }
      
      const book = await storage.getBookBySlug(slug);
      
      if (!book) {
        return res.status(404).json({ 
          message: "Book not found",
          code: "NOT_FOUND",
          slug
        });
      }
      
      res.set('Cache-Control', 'public, max-age=300');
      res.json(book);
    } catch (error: any) {
      console.error("Get book by slug error:", error);
      res.status(500).json({ 
        message: "Failed to fetch book",
        code: "SERVER_ERROR"
      });
    }
  });

  app.get("/api/books/:bookId/chapters", async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      
      if (isNaN(bookId) || bookId < 1) {
        return res.status(400).json({ 
          message: "Invalid book ID. Must be a positive integer.",
          code: "INVALID_BOOK_ID"
        });
      }
      
      const chapters = await storage.getBookChapters(bookId);
      
      if (chapters.length === 0) {
        const bookExists = await storage.getBookById(bookId);
        if (!bookExists) {
          return res.status(404).json({ 
            message: "Book not found",
            code: "BOOK_NOT_FOUND",
            bookId
          });
        }
      }
      
      res.set('Cache-Control', 'public, max-age=300');
      res.json(chapters);
    } catch (error: any) {
      console.error("Get book chapters error:", error);
      res.status(500).json({ 
        message: "Failed to fetch chapters",
        code: "SERVER_ERROR"
      });
    }
  });

  app.get("/api/books/:bookId/chapters/:chapter", async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const chapter = parseInt(req.params.chapter);
      
      if (isNaN(bookId) || bookId < 1) {
        return res.status(400).json({ 
          message: "Invalid book ID. Must be a positive integer.",
          code: "INVALID_BOOK_ID"
        });
      }
      
      if (isNaN(chapter) || chapter < 1) {
        return res.status(400).json({ 
          message: "Invalid chapter number. Must be a positive integer.",
          code: "INVALID_CHAPTER"
        });
      }
      
      const paragraphs = await storage.getChapterParagraphs(bookId, chapter);
      
      if (paragraphs.length === 0) {
        const bookExists = await storage.getBookById(bookId);
        if (!bookExists) {
          return res.status(404).json({ 
            message: "Book not found",
            code: "BOOK_NOT_FOUND",
            bookId
          });
        }
        return res.status(404).json({ 
          message: "Chapter not found",
          code: "CHAPTER_NOT_FOUND",
          bookId,
          chapter
        });
      }
      
      res.set('Cache-Control', 'public, max-age=300');
      res.json(paragraphs);
    } catch (error: any) {
      console.error("Get chapter paragraphs error:", error);
      res.status(500).json({ 
        message: "Failed to fetch chapter paragraphs",
        code: "SERVER_ERROR"
      });
    }
  });

  app.post("/api/book-tests", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertBookTypingTestSchema.safeParse({
        ...req.body,
        userId: req.user!.id,
      });

      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          errors: fromError(parsed.error).toString(),
        });
      }

      if (parsed.data.wpm < 0 || parsed.data.wpm > 500) {
        return res.status(400).json({
          message: "Invalid WPM value. Must be between 0 and 500.",
          code: "INVALID_WPM"
        });
      }
      
      if (parsed.data.accuracy < 0 || parsed.data.accuracy > 100) {
        return res.status(400).json({
          message: "Invalid accuracy value. Must be between 0 and 100.",
          code: "INVALID_ACCURACY"
        });
      }

      const result = await storage.createBookTestResult(parsed.data);
      res.status(201).json({ 
        message: "Book test result saved", 
        result 
      });
    } catch (error: any) {
      console.error("Save book test result error:", error);
      
      if (error.code === '23503') {
        return res.status(400).json({ 
          message: "Invalid paragraph ID",
          code: "INVALID_PARAGRAPH_ID"
        });
      }
      
      res.status(500).json({ 
        message: "Failed to save book test result",
        code: "SERVER_ERROR"
      });
    }
  });

  app.get("/api/book-tests", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      if (limit < 1 || limit > 100) {
        return res.status(400).json({ 
          message: "Limit must be between 1 and 100",
          code: "INVALID_LIMIT"
        });
      }
      
      const results = await storage.getBookTestResults(req.user!.id, limit);
      res.json({ results });
    } catch (error: any) {
      console.error("Get book test results error:", error);
      res.status(500).json({ 
        message: "Failed to fetch book test results",
        code: "SERVER_ERROR"
      });
    }
  });

  app.get("/api/dictation/sentence", async (req, res) => {
    try {
      const difficulty = req.query.difficulty as string | undefined;
      const category = req.query.category as string | undefined;
      const excludeIdsParam = req.query.excludeIds as string | undefined;
      
      let excludeIds: number[] | undefined;
      if (excludeIdsParam) {
        excludeIds = excludeIdsParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      }
      
      const sentence = await storage.getRandomDictationSentence(difficulty, category, excludeIds);
      
      if (!sentence) {
        return res.status(404).json({ message: "No sentences available" });
      }
      
      res.json({ sentence });
    } catch (error: any) {
      console.error("Get dictation sentence error:", error);
      res.status(500).json({ message: "Failed to fetch dictation sentence" });
    }
  });

  app.post("/api/dictation/test", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertDictationTestSchema.safeParse({
        ...req.body,
        userId: req.user!.id,
      });

      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: fromError(parsed.error).toString(),
        });
      }

      const result = await storage.createDictationTest(parsed.data);
      res.status(201).json({ message: "Dictation test saved", result });
    } catch (error: any) {
      console.error("Save dictation test error:", error);
      res.status(500).json({ message: "Failed to save dictation test" });
    }
  });

  app.get("/api/dictation/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getUserDictationStats(req.user!.id);
      res.json({ stats });
    } catch (error: any) {
      console.error("Get dictation stats error:", error);
      res.status(500).json({ message: "Failed to fetch dictation stats" });
    }
  });

  app.get("/api/dictation/leaderboard", async (req, res) => {
    try {
      const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 100);
      const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
      const cursor = req.query.cursor as string | undefined;
      
      const actualOffset = cursor ? leaderboardCache.decodeCursor(cursor) : offset;
      
      const result = await leaderboardCache.getDictationLeaderboard({
        limit,
        offset: actualOffset,
      });
      
      res.set('Cache-Control', 'public, max-age=30');
      res.set('X-Cache', result.metadata.cacheHit ? 'HIT' : 'MISS');
      res.set('X-Total-Count', String(result.pagination.total));
      
      res.json(result);
    } catch (error: any) {
      console.error("Get dictation leaderboard error:", error);
      res.status(500).json({ message: "Failed to fetch dictation leaderboard" });
    }
  });

  app.get("/api/dictation/leaderboard/around-me", isAuthenticated, async (req, res) => {
    try {
      const range = Math.min(Math.max(1, parseInt(req.query.range as string) || 5), 20);
      
      const result = await leaderboardCache.getAroundMe("dictation", req.user!.id, { range });
      
      res.set('Cache-Control', 'private, max-age=10');
      res.set('X-Cache', result.cacheHit ? 'HIT' : 'MISS');
      
      res.json({
        userRank: result.userRank,
        entries: result.entries,
      });
    } catch (error: any) {
      console.error("Get dictation leaderboard around me error:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.post("/api/dictation/tts", async (req, res) => {
    try {
      const { text, voice = "alloy", speed = 1.0 } = req.body;
      
      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ message: "Text is required" });
      }
      
      if (text.length > 1000) {
        return res.status(400).json({ message: "Text too long (max 1000 characters)" });
      }
      
      const apiKey = process.env.OPENAI_TTS_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ 
          message: "TTS not available", 
          fallback: true 
        });
      }
      
      const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
      const selectedVoice = validVoices.includes(voice) ? voice : "alloy";
      const selectedSpeed = Math.max(0.25, Math.min(4.0, speed));
      
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: selectedVoice,
          speed: selectedSpeed,
          response_format: "mp3",
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI TTS error:", response.status, errorText);
        return res.status(503).json({ 
          message: "TTS generation failed", 
          fallback: true 
        });
      }
      
      const audioBuffer = await response.arrayBuffer();
      
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=3600",
      });
      
      res.send(Buffer.from(audioBuffer));
    } catch (error: any) {
      console.error("TTS error:", error);
      res.status(503).json({ 
        message: "TTS service error", 
        fallback: true 
      });
    }
  });

  // Rate limiter for stress test submissions (prevent rapid-fire submissions)
  const stressTestSubmitLimiter = rateLimit({
    windowMs: 30 * 1000, // 30 second window
    max: 5, // Max 5 submissions per 30 seconds per user
    message: { message: "Too many stress test submissions. Please wait before submitting again." },
    keyGenerator: (req) => {
      if (req.user?.id) return req.user.id;
      return 'anonymous';
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
  });

  // Stress Test Routes with anti-cheat validation
  app.post("/api/stress-test", isAuthenticated, stressTestSubmitLimiter, async (req, res) => {
    try {
      const { insertStressTestSchema } = await import("@shared/schema");
      const { validateStressTestSubmission, logSuspiciousSubmission } = await import("./stress-test-anticheat");
      
      const parsed = insertStressTestSchema.safeParse({
        ...req.body,
        userId: req.user!.id,
      });

      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: fromError(parsed.error).toString(),
        });
      }

      // Anti-cheat validation: Check for impossible scores and suspicious patterns
      const antiCheatResult = await validateStressTestSubmission({
        userId: req.user!.id,
        difficulty: parsed.data.difficulty,
        wpm: parsed.data.wpm,
        accuracy: parsed.data.accuracy,
        stressScore: parsed.data.stressScore,
        completionRate: parsed.data.completionRate,
        duration: parsed.data.duration,
        survivalTime: parsed.data.survivalTime,
        totalCharacters: parsed.data.totalCharacters,
        errors: parsed.data.errors,
        maxCombo: parsed.data.maxCombo,
      });

      // Log any suspicious submissions for monitoring
      logSuspiciousSubmission(req.user!.id, parsed.data, antiCheatResult);

      // Reject invalid submissions (impossible scores)
      if (!antiCheatResult.isValid) {
        console.warn(`[ANTI-CHEAT] Rejected invalid stress test from user ${req.user!.id}:`, antiCheatResult.errors);
        return res.status(400).json({
          message: "Score validation failed",
          errors: antiCheatResult.errors.join("; "),
        });
      }

      // Production-ready: Use upsert pattern to update if new score is higher
      // This prevents duplicate entries while maintaining the best score per difficulty
      const { result, isNewPersonalBest } = await storage.upsertStressTestBestScore(parsed.data);
      
      // Check if this score makes it to the leaderboard (top 50)
      const leaderboard = await storage.getStressTestLeaderboard(parsed.data.difficulty, 50);
      const isLeaderboardEntry = leaderboard.length < 50 || 
        parsed.data.stressScore > (leaderboard[leaderboard.length - 1]?.stressScore || 0);
      
      res.status(201).json({ 
        message: isNewPersonalBest ? "New personal best saved!" : "Score recorded", 
        result,
        isNewPersonalBest,
        isLeaderboardEntry,
        // Include anti-cheat flags in response (for admin debugging)
        ...(antiCheatResult.flags.length > 0 && { _flags: antiCheatResult.flags }),
      });
    } catch (error: any) {
      console.error("Save stress test error:", error);
      res.status(500).json({ message: "Failed to save stress test result" });
    }
  });

  app.get("/api/stress-test/leaderboard", async (req, res) => {
    try {
      const difficulty = req.query.difficulty as string | undefined;
      const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 100);
      const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
      const cursor = req.query.cursor as string | undefined;
      
      const actualOffset = cursor ? leaderboardCache.decodeCursor(cursor) : offset;
      
      const result = await leaderboardCache.getStressLeaderboard({
        difficulty,
        limit,
        offset: actualOffset,
      });
      
      res.set('Cache-Control', 'public, max-age=5');
      res.set('X-Cache', result.metadata.cacheHit ? 'HIT' : 'MISS');
      res.set('X-Total-Count', String(result.pagination.total));
      
      res.json(result);
    } catch (error: any) {
      console.error("Get stress test leaderboard error:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/stress-test/leaderboard/around-me", isAuthenticated, async (req, res) => {
    try {
      const difficulty = req.query.difficulty as string | undefined;
      const range = Math.min(Math.max(1, parseInt(req.query.range as string) || 5), 20);
      
      const result = await leaderboardCache.getAroundMe("stress", req.user!.id, { difficulty, range });
      
      res.set('Cache-Control', 'private, max-age=10');
      res.set('X-Cache', result.cacheHit ? 'HIT' : 'MISS');
      
      res.json({
        userRank: result.userRank,
        entries: result.entries,
      });
    } catch (error: any) {
      console.error("Get stress leaderboard around me error:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/stress-test/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getUserStressStats(req.user!.id);
      res.json({ stats });
    } catch (error: any) {
      console.error("Get stress test stats error:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Social Sharing Routes
  app.post("/api/share", async (req, res) => {
    try {
      const { insertSharedResultSchema } = await import("@shared/schema");
      const { mode, resultId, isAnonymous } = req.body;

      // Validate input
      if (!mode || !resultId) {
        return res.status(400).json({ message: "Mode and resultId are required" });
      }

      let statsData;
      let username = req.user?.username || null;

      // Fetch verified stats from database based on mode
      switch (mode) {
        case 'dictation':
          const dictationTest = await storage.getDictationTestById(resultId);
          if (!dictationTest) {
            return res.status(404).json({ message: "Test result not found" });
          }
          if (!req.user || dictationTest.userId !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized" });
          }
          
          statsData = {
            wpm: dictationTest.wpm,
            accuracy: dictationTest.accuracy,
            errors: dictationTest.errors,
            duration: dictationTest.duration,
            characters: dictationTest.actualSentence.length,
            metadata: {
              speedLevel: dictationTest.speedLevel,
              difficulty: 'medium', // Default difficulty
              replayCount: dictationTest.replayCount,
              hintUsed: dictationTest.hintUsed,
            }
          };
          break;

        case 'normal':
        case 'timed':
        case 'practice':
        case 'challenge':
        case 'typing':
          const testResult = await storage.getTestResultById(resultId);
          if (!testResult) {
            return res.status(404).json({ message: "Test result not found" });
          }
          if (!req.user || testResult.userId !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized" });
          }
          
          // Map integer mode to string (best-effort)
          const modeMap: Record<number, string> = {
            0: 'normal',
            1: 'timed',
            2: 'practice',
            3: 'challenge',
          };
          
          const storedMode = modeMap[testResult.mode] || 'typing';
          
          statsData = {
            wpm: testResult.wpm,
            accuracy: testResult.accuracy,
            errors: testResult.errors,
            duration: 60, // Standard test duration fallback
            characters: testResult.characters,
            metadata: {
              mode: storedMode,
              testType: 'typing'
            }
          };
          break;

        // TODO: Add support for code, book, and multiplayer modes
        case 'code':
        case 'book':
        case 'multiplayer':
          return res.status(501).json({ 
            message: `Sharing for ${mode} mode is not yet implemented. Currently supported: dictation, normal, timed, practice, challenge` 
          });

        default:
          return res.status(400).json({ message: `Unsupported mode: ${mode}` });
      }

      // Validate stats are plausible
      if (statsData.wpm < 0 || statsData.wpm > 300 ||
          statsData.accuracy < 0 || statsData.accuracy > 100 ||
          statsData.errors < 0 ||
          (statsData.duration && statsData.duration < 0)) {
        return res.status(400).json({ message: "Invalid stats detected" });
      }

      // Generate unique share token (12 chars)
      const shareToken = Math.random().toString(36).substring(2, 14);
      
      const shareData = {
        shareToken,
        userId: req.user?.id || null,
        username: isAnonymous ? null : username,
        mode,
        ...statsData,
        isAnonymous: isAnonymous || false,
      };

      const parsed = insertSharedResultSchema.safeParse(shareData);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: fromError(parsed.error).toString(),
        });
      }

      const sharedResult = await storage.createSharedResult(parsed.data);
      res.status(201).json({ 
        message: "Result shared successfully",
        shareToken: sharedResult.shareToken,
        shareUrl: `${req.protocol}://${req.get('host')}/result/${sharedResult.shareToken}`
      });
    } catch (error: any) {
      console.error("Create shared result error:", error);
      res.status(500).json({ message: "Failed to create shared result" });
    }
  });

  app.get("/api/share/:shareToken", async (req, res) => {
    try {
      const { shareToken } = req.params;
      
      const sharedResult = await storage.getSharedResult(shareToken);
      if (!sharedResult) {
        return res.status(404).json({ message: "Shared result not found" });
      }

      // Increment view count
      await storage.incrementShareViewCount(shareToken);

      res.json({ result: sharedResult });
    } catch (error: any) {
      console.error("Get shared result error:", error);
      res.status(500).json({ message: "Failed to fetch shared result" });
    }
  });

  // Keystroke Analytics Routes
  app.post("/api/analytics/save", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Must be logged in to save analytics" });
    }

    try {
      const { keystrokeEvents, analytics } = req.body;

      // Save keystroke events if provided
      if (keystrokeEvents && Array.isArray(keystrokeEvents)) {
        await storage.saveKeystrokeEvents(keystrokeEvents);
      }

      // Save analytics summary
      if (analytics) {
        const analyticsData = {
          ...analytics,
          userId: req.user.id,
        };
        const savedAnalytics = await storage.saveTypingAnalytics(analyticsData);
        return res.json({ 
          message: "Analytics saved successfully",
          analyticsId: savedAnalytics.id
        });
      }

      res.json({ message: "Data saved successfully" });
    } catch (error: any) {
      console.error("Save analytics error:", error);
      res.status(500).json({ message: "Failed to save analytics" });
    }
  });

  app.get("/api/analytics/user", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Must be logged in" });
    }

    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const analytics = await storage.getUserTypingAnalytics(req.user.id, limit);
      res.json({ analytics });
    } catch (error: any) {
      console.error("Get analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const analytics = await storage.getTypingAnalyticsById(id);
      
      if (!analytics) {
        return res.status(404).json({ message: "Analytics not found" });
      }

      res.json({ analytics });
    } catch (error: any) {
      console.error("Get analytics by ID error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/insights/user", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Must be logged in" });
    }

    try {
      const insights = await storage.getUserTypingInsights(req.user.id);
      res.json({ insights });
    } catch (error: any) {
      console.error("Get insights error:", error);
      res.status(500).json({ message: "Failed to fetch insights" });
    }
  });

  app.post("/api/insights/:id/dismiss", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Must be logged in" });
    }

    try {
      const id = parseInt(req.params.id);
      await storage.dismissInsight(id);
      res.json({ message: "Insight dismissed" });
    } catch (error: any) {
      console.error("Dismiss insight error:", error);
      res.status(500).json({ message: "Failed to dismiss insight" });
    }
  });

  app.get("/api/practice/recommendations", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Must be logged in" });
    }

    try {
      const recommendations = await storage.getUserPracticeRecommendations(req.user.id);
      res.json({ recommendations });
    } catch (error: any) {
      console.error("Get recommendations error:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  app.post("/api/practice/:id/complete", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Must be logged in" });
    }

    try {
      const id = parseInt(req.params.id);
      await storage.completePracticeRecommendation(id);
      res.json({ message: "Practice recommendation completed" });
    } catch (error: any) {
      console.error("Complete recommendation error:", error);
      res.status(500).json({ message: "Failed to complete recommendation" });
    }
  });

  // Mount notification routes
  app.use(createNotificationRoutes(storage));

  const httpServer = createServer(app);
  
  raceWebSocket.initialize(httpServer);

  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, stopping notification scheduler...');
    notificationScheduler.stop();
  });

  return httpServer;
}
