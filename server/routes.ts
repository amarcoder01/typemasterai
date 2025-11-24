import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { streamChatCompletion, shouldPerformWebSearch, type ChatMessage } from "./chat-service";
import { generateTypingParagraph } from "./ai-paragraph-generator";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { insertUserSchema, loginSchema, insertTestResultSchema, updateProfileSchema, type User } from "@shared/schema";
import { fromError } from "zod-validation-error";
import ConnectPgSimple from "connect-pg-simple";
import { Pool } from "@neondatabase/serverless";

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

  const sessionPool = new Pool({ connectionString: process.env.DATABASE_URL });

  app.use(
    session({
      store: new PgSession({
        pool: sessionPool,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "typeflow-secret-key-change-in-production",
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

  app.post("/api/auth/register", async (req, res, next) => {
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

  app.post("/api/auth/login", (req, res, next) => {
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

  app.patch("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: fromError(parsed.error).toString(),
        });
      }

      const updatedUser = await storage.updateUserProfile(req.user!.id, parsed.data);
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

  app.get("/api/typing/paragraph", async (req, res) => {
    try {
      const language = (req.query.language as string) || "en";
      const mode = req.query.mode as string | undefined;
      const generateIfMissing = req.query.generate === "true";
      
      let paragraph: any = undefined;
      let isGenerated = false;
      
      // Check for exact match first (no fallbacks)
      if (mode) {
        paragraph = await storage.getExactParagraph(language, mode);
      }
      
      // If no exact match found and AI generation is requested
      if (!paragraph && generateIfMissing && mode) {
        console.log(`🤖 Generating AI paragraph for ${language}/${mode}`);
        
        try {
          const content = await generateTypingParagraph(language, mode, "medium");
          const wordCount = content.split(/\s+/).length;
          
          // Save to database
          paragraph = await storage.createTypingParagraph({
            language,
            mode,
            difficulty: "medium",
            content,
            wordCount,
          });
          
          isGenerated = true;
          console.log(`✅ Successfully generated and saved paragraph for ${language}/${mode}`);
        } catch (aiError) {
          console.error("❌ AI generation failed:", aiError);
          // Fall back to existing logic if AI generation fails
          paragraph = await storage.getRandomParagraph(language, mode);
        }
      }
      
      // If still no paragraph, use fallback system
      if (!paragraph) {
        paragraph = await storage.getRandomParagraph(language, mode);
      }
      
      if (!paragraph) {
        return res.status(500).json({ message: "No paragraphs available in database" });
      }
      
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

  app.post("/api/chat", isAuthenticated, async (req, res) => {
    try {
      const { messages: requestMessages, conversationId } = req.body;

      if (!requestMessages || !Array.isArray(requestMessages)) {
        return res.status(400).json({ message: "Invalid request: messages array required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ message: "AI service not configured" });
      }

      const lastUserMessage = requestMessages.filter((m: ChatMessage) => m.role === "user").pop();
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
        for await (const chunk of streamChatCompletion(requestMessages, performSearch)) {
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
