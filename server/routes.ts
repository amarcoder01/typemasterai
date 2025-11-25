import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { streamChatCompletion, shouldPerformWebSearch, type ChatMessage } from "./chat-service";
import { generateTypingParagraph } from "./ai-paragraph-generator";
import { generateCodeSnippet } from "./ai-code-generator";
import { analyzeFile } from "./file-analyzer";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { insertUserSchema, loginSchema, insertTestResultSchema, updateProfileSchema, insertKeystrokeAnalyticsSchema, insertCodeTypingTestSchema, insertSharedCodeResultSchema, insertBookTypingTestSchema, type User } from "@shared/schema";
import { fromError } from "zod-validation-error";
import ConnectPgSimple from "connect-pg-simple";
import { Pool } from "@neondatabase/serverless";
import rateLimit from "express-rate-limit";
import DOMPurify from "isomorphic-dompurify";
import { raceWebSocket } from "./websocket";
import { botNamePool } from "./bot-name-pool";
import multer from "multer";

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
  
  botNamePool.initialize().catch(error => {
    console.error("Failed to initialize bot name pool:", error);
  });
  
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

  // Multiplayer Racing Routes
  app.post("/api/races/quick-match", async (req, res) => {
    try {
      const user = req.user;
      const { guestId } = req.body;
      let username: string;
      
      if (user) {
        username = user.username;
      } else if (guestId) {
        username = `Guest_${guestId}`;
      } else {
        username = `Guest_${Math.random().toString(36).substring(2, 8)}`;
      }
      
      const avatarColor = user?.avatarColor || "bg-primary";

      const activeRaces = await storage.getActiveRaces();
      const availableRace = activeRaces.find(r => r.status === "waiting" && r.isPrivate === 0);

      let race;
      if (availableRace) {
        race = availableRace;
      } else {
        const paragraph = await storage.getRandomParagraph("english", "quote");
        if (!paragraph) {
          return res.status(500).json({ message: "No paragraph available" });
        }

        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        race = await storage.createRace({
          roomCode,
          status: "waiting",
          paragraphId: paragraph.id,
          paragraphContent: paragraph.content,
          maxPlayers: 4,
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
          if (participants.length >= race.maxPlayers) {
            return res.status(400).json({ message: "Race is full" });
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
      const { isPrivate, maxPlayers, guestId } = req.body;
      const user = req.user;
      let username: string;
      
      if (user) {
        username = user.username;
      } else if (guestId) {
        username = `Guest_${guestId}`;
      } else {
        username = `Guest_${Math.random().toString(36).substring(2, 8)}`;
      }
      
      const avatarColor = user?.avatarColor || "bg-primary";

      const paragraph = await storage.getRandomParagraph("english", "quote");
      if (!paragraph) {
        return res.status(500).json({ message: "No paragraph available" });
      }

      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const race = await storage.createRace({
        roomCode,
        status: "waiting",
        paragraphId: paragraph.id,
        paragraphContent: paragraph.content,
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
      } else if (guestId) {
        username = `Guest_${guestId}`;
      } else {
        username = `Guest_${Math.random().toString(36).substring(2, 8)}`;
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
          if (participants.length >= race.maxPlayers) {
            return res.status(400).json({ message: "Race is full" });
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
      console.error("Join race error:", error);
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

  app.get("/api/races/active", async (req, res) => {
    try {
      const activeRaces = await storage.getActiveRaces();
      res.json(activeRaces);
    } catch (error: any) {
      console.error("Get active races error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/code/snippet", aiGenerationLimiter, async (req, res) => {
    try {
      const language = req.query.language as string;
      const difficulty = req.query.difficulty as string | undefined;
      const framework = req.query.framework as string | undefined;
      const generate = req.query.generate === "true";

      if (!language) {
        return res.status(400).json({ message: "Programming language is required" });
      }

      let snippet = await storage.getRandomCodeSnippet(language, difficulty, framework);

      if (!snippet && generate) {
        console.log(`🤖 Generating code snippet for ${language}/${difficulty || 'medium'}`);
        
        try {
          const { content, description } = await generateCodeSnippet(
            language,
            (difficulty as "easy" | "medium" | "hard") || "medium",
            framework
          );
          
          const lineCount = content.split('\n').length;
          const characterCount = content.length;
          
          snippet = await storage.createCodeSnippet({
            programmingLanguage: language,
            framework,
            difficulty: (difficulty as "easy" | "medium" | "hard") || "medium",
            content,
            lineCount,
            characterCount,
            description,
          });
          
          console.log(`✅ Generated and saved ${lineCount}-line ${language} code snippet`);
        } catch (error) {
          console.error("❌ Code generation failed:", error);
        }
      }

      if (!snippet) {
        return res.status(404).json({ message: "No code snippets available for these criteria" });
      }

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
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const leaderboard = await storage.getCodeLeaderboard(language, limit);
      res.json({ leaderboard });
    } catch (error: any) {
      console.error("Get code leaderboard error:", error);
      res.status(500).json({ message: "Failed to fetch code leaderboard" });
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
      
      const paragraphs = await storage.getBookParagraphs({
        difficulty,
        topic,
        durationMode,
        limit,
      });
      
      res.json({ paragraphs });
    } catch (error: any) {
      console.error("Get book paragraphs error:", error);
      res.status(500).json({ message: "Failed to fetch book paragraphs" });
    }
  });

  app.get("/api/book-paragraphs/random", async (req, res) => {
    try {
      const difficulty = req.query.difficulty as string | undefined;
      const topic = req.query.topic as string | undefined;
      const durationMode = req.query.durationMode ? parseInt(req.query.durationMode as string) : undefined;
      
      const paragraph = await storage.getRandomBookParagraph({
        difficulty,
        topic,
        durationMode,
      });
      
      if (!paragraph) {
        return res.status(404).json({ message: "No book paragraph found" });
      }
      
      res.json({ paragraph });
    } catch (error: any) {
      console.error("Get random book paragraph error:", error);
      res.status(500).json({ message: "Failed to fetch random book paragraph" });
    }
  });

  app.get("/api/book-paragraphs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid paragraph ID" });
      }
      
      const paragraph = await storage.getBookParagraphById(id);
      
      if (!paragraph) {
        return res.status(404).json({ message: "Book paragraph not found" });
      }
      
      res.json({ paragraph });
    } catch (error: any) {
      console.error("Get book paragraph by ID error:", error);
      res.status(500).json({ message: "Failed to fetch book paragraph" });
    }
  });

  app.get("/api/book-paragraphs/next/:bookId/:paragraphIndex", async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const paragraphIndex = parseInt(req.params.paragraphIndex);
      
      if (isNaN(bookId) || isNaN(paragraphIndex)) {
        return res.status(400).json({ message: "Invalid bookId or paragraphIndex" });
      }
      
      const nextParagraph = await storage.getNextBookParagraph(bookId, paragraphIndex);
      
      if (!nextParagraph) {
        return res.status(404).json({ message: "Next paragraph not found" });
      }
      
      res.json({ paragraph: nextParagraph });
    } catch (error: any) {
      console.error("Get next book paragraph error:", error);
      res.status(500).json({ message: "Failed to fetch next book paragraph" });
    }
  });

  app.get("/api/book-topics", async (req, res) => {
    try {
      const topics = await storage.getBookTopics();
      res.json({ topics });
    } catch (error: any) {
      console.error("Get book topics error:", error);
      res.status(500).json({ message: "Failed to fetch book topics" });
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
          errors: fromError(parsed.error).toString(),
        });
      }

      const result = await storage.createBookTestResult(parsed.data);
      res.status(201).json({ message: "Book test result saved", result });
    } catch (error: any) {
      console.error("Save book test result error:", error);
      res.status(500).json({ message: "Failed to save book test result" });
    }
  });

  app.get("/api/book-tests", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const results = await storage.getBookTestResults(req.user!.id, limit);
      res.json({ results });
    } catch (error: any) {
      console.error("Get book test results error:", error);
      res.status(500).json({ message: "Failed to fetch book test results" });
    }
  });

  const httpServer = createServer(app);
  
  raceWebSocket.initialize(httpServer);

  return httpServer;
}
