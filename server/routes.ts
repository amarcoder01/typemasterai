import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { streamChatCompletion, shouldPerformWebSearch, type ChatMessage } from "./chat-service";
import { generateTypingParagraph } from "./ai-paragraph-generator";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { insertUserSchema, loginSchema, insertTestResultSchema, updateProfileSchema, insertKeystrokeAnalyticsSchema, type User } from "@shared/schema";
import { fromError } from "zod-validation-error";
import ConnectPgSimple from "connect-pg-simple";
import { Pool } from "@neondatabase/serverless";
import rateLimit from "express-rate-limit";
import DOMPurify from "isomorphic-dompurify";

const PgSession = ConnectPgSimple(session);

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

  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    console.warn("⚠️ WARNING: SESSION_SECRET is not set in production. Using fallback value is insecure.");
  }

  const sessionSecret = process.env.SESSION_SECRET || "typemasterai-secret-key-change-in-production";
  
  if (sessionSecret === "typemasterai-secret-key-change-in-production" && process.env.NODE_ENV === "production") {
    console.error("🚨 SECURITY ALERT: Production is using the default SESSION_SECRET. This is highly insecure!");
  }

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
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          const isValidPassword = await bcrypt.compare(password, user.password);
          
          if (!isValidPassword) {
            return done(null, false, { message: "Invalid email or password" });
          }

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
            message: "Registration successful",
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
        }
      );
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", authLimiter, (req, res, next) => {
    const parsed = loginSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: fromError(parsed.error).toString(),
      });
    }

    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      req.login(user, (err) => {
        if (err) {
          return next(err);
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

  app.post("/api/auth/logout", (req, res) => {
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
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const leaderboard = await storage.getLeaderboard(limit);
      res.json({ leaderboard });
    } catch (error: any) {
      console.error("Get leaderboard error:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
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
      if (!convId) {
        const conversation = await storage.createConversation({
          userId: req.user!.id,
          title: lastUserMessage.content.substring(0, 100),
          isPinned: 0,
        });
        convId = conversation.id;
      } else {
        const conversation = await storage.getConversation(convId, req.user!.id);
        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }
      }

      await storage.createMessage({
        conversationId: convId,
        role: "user",
        content: lastUserMessage.content,
      });

      const performSearch = shouldPerformWebSearch(lastUserMessage.content);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      try {
        let assistantResponse = "";
        for await (const chunk of streamChatCompletion(sanitizedMessages, performSearch)) {
          assistantResponse += chunk;
          res.write(`data: ${JSON.stringify({ content: chunk, conversationId: convId })}\n\n`);
        }
        
        await storage.createMessage({
          conversationId: convId,
          role: "assistant",
          content: assistantResponse,
        });

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

  const httpServer = createServer(app);

  return httpServer;
}
