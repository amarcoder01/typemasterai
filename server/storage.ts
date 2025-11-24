import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import {
  users,
  testResults,
  conversations,
  messages,
  typingParagraphs,
  type User,
  type InsertUser,
  type TestResult,
  type InsertTestResult,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type TypingParagraph,
  type InsertTypingParagraph,
} from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool });

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(userId: string, profile: Partial<User>): Promise<User>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  
  createTestResult(result: InsertTestResult): Promise<TestResult>;
  getUserTestResults(userId: string, limit?: number): Promise<TestResult[]>;
  getUserStats(userId: string): Promise<{
    totalTests: number;
    bestWpm: number;
    avgWpm: number;
    avgAccuracy: number;
  } | null>;
  getLeaderboard(limit?: number): Promise<Array<{
    userId: string;
    username: string;
    wpm: number;
    accuracy: number;
    createdAt: Date;
    mode: number;
    avatarColor: string | null;
    totalTests: number;
  }>>;
  
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getUserConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: number, userId: string): Promise<Conversation | undefined>;
  updateConversation(id: number, userId: string, data: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: number, userId: string): Promise<void>;
  
  createMessage(message: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: number): Promise<Message[]>;
  
  getRandomParagraph(language: string, mode?: string, difficulty?: string): Promise<TypingParagraph | undefined>;
  getExactParagraph(language: string, mode: string, difficulty?: string): Promise<TypingParagraph | undefined>;
  getAvailableLanguages(): Promise<string[]>;
  getAvailableModes(): Promise<string[]>;
  createTypingParagraph(paragraph: InsertTypingParagraph): Promise<TypingParagraph>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserProfile(userId: string, profile: Partial<User>): Promise<User> {
    const result = await db
      .update(users)
      .set(profile)
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  async createTestResult(result: InsertTestResult): Promise<TestResult> {
    const inserted = await db.insert(testResults).values(result).returning();
    return inserted[0];
  }

  async getUserTestResults(userId: string, limit: number = 10): Promise<TestResult[]> {
    return await db
      .select()
      .from(testResults)
      .where(eq(testResults.userId, userId))
      .orderBy(desc(testResults.createdAt))
      .limit(limit);
  }

  async getUserStats(userId: string): Promise<{
    totalTests: number;
    bestWpm: number;
    avgWpm: number;
    avgAccuracy: number;
  } | null> {
    const result = await db
      .select({
        totalTests: sql<number>`count(*)::int`,
        bestWpm: sql<number>`max(${testResults.wpm})::int`,
        avgWpm: sql<number>`avg(${testResults.wpm})::int`,
        avgAccuracy: sql<number>`avg(${testResults.accuracy})::float`,
      })
      .from(testResults)
      .where(eq(testResults.userId, userId));

    if (!result[0] || result[0].totalTests === 0) {
      return null;
    }

    return result[0];
  }

  async getLeaderboard(limit: number = 20): Promise<Array<{
    userId: string;
    username: string;
    wpm: number;
    accuracy: number;
    createdAt: Date;
    mode: number;
    avatarColor: string | null;
    totalTests: number;
  }>> {
    // Use a CTE (Common Table Expression) with window function to get best score per user efficiently
    // This is a single query that:
    // 1. Ranks each user's tests by WPM (descending) and date (descending for ties)
    // 2. Selects only the best test per user (rank = 1)
    // 3. Joins with test counts
    // 4. Orders by WPM and limits results
    const leaderboard = await db.execute(sql`
      WITH ranked_results AS (
        SELECT 
          tr.user_id,
          tr.wpm,
          tr.accuracy,
          tr.created_at,
          tr.mode,
          ROW_NUMBER() OVER (
            PARTITION BY tr.user_id 
            ORDER BY tr.wpm DESC, tr.created_at DESC
          ) as rank
        FROM test_results tr
      ),
      test_counts AS (
        SELECT 
          user_id,
          COUNT(*)::int as total_tests
        FROM test_results
        GROUP BY user_id
      )
      SELECT 
        rr.user_id as "userId",
        u.username,
        rr.wpm,
        rr.accuracy,
        rr.created_at as "createdAt",
        rr.mode,
        u.avatar_color as "avatarColor",
        COALESCE(tc.total_tests, 1) as "totalTests"
      FROM ranked_results rr
      INNER JOIN users u ON rr.user_id = u.id
      LEFT JOIN test_counts tc ON rr.user_id = tc.user_id
      WHERE rr.rank = 1
      ORDER BY rr.wpm DESC, rr.created_at DESC
      LIMIT ${limit}
    `);

    return leaderboard.rows as any[];
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const result = await db.insert(conversations).values(conversation).returning();
    return result[0];
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: number, userId: string): Promise<Conversation | undefined> {
    const result = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .limit(1);
    return result[0];
  }

  async updateConversation(id: number, userId: string, data: Partial<Conversation>): Promise<Conversation | undefined> {
    const result = await db
      .update(conversations)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteConversation(id: number, userId: string): Promise<void> {
    await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }

  async getConversationMessages(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async getExactParagraph(language: string, mode: string, difficulty?: string): Promise<TypingParagraph | undefined> {
    // Get ONLY exact language + mode + difficulty match, no fallbacks
    const conditions = [
      eq(typingParagraphs.language, language),
      eq(typingParagraphs.mode, mode)
    ];
    
    if (difficulty) {
      conditions.push(eq(typingParagraphs.difficulty, difficulty));
    }
    
    const specificParagraphs = await db
      .select()
      .from(typingParagraphs)
      .where(and(...conditions));
    
    if (specificParagraphs.length > 0) {
      const randomIndex = Math.floor(Math.random() * specificParagraphs.length);
      return specificParagraphs[randomIndex];
    }
    
    return undefined;
  }

  async getRandomParagraph(language: string, mode?: string, difficulty?: string): Promise<TypingParagraph | undefined> {
    // Try with language, mode, and difficulty
    if (mode) {
      const conditions = [
        eq(typingParagraphs.language, language),
        eq(typingParagraphs.mode, mode)
      ];
      
      if (difficulty) {
        conditions.push(eq(typingParagraphs.difficulty, difficulty));
      }
      
      const specificParagraphs = await db
        .select()
        .from(typingParagraphs)
        .where(and(...conditions));
      
      if (specificParagraphs.length > 0) {
        const randomIndex = Math.floor(Math.random() * specificParagraphs.length);
        return specificParagraphs[randomIndex];
      }
    }
    
    // Fallback to any paragraph in the requested language
    const languageParagraphs = await db
      .select()
      .from(typingParagraphs)
      .where(eq(typingParagraphs.language, language));
    
    if (languageParagraphs.length > 0) {
      const randomIndex = Math.floor(Math.random() * languageParagraphs.length);
      return languageParagraphs[randomIndex];
    }
    
    // Final fallback to any English paragraph
    const englishParagraphs = await db
      .select()
      .from(typingParagraphs)
      .where(eq(typingParagraphs.language, 'en'));
    
    if (englishParagraphs.length > 0) {
      const randomIndex = Math.floor(Math.random() * englishParagraphs.length);
      return englishParagraphs[randomIndex];
    }
    
    return undefined;
  }

  async getAvailableLanguages(): Promise<string[]> {
    const result = await db
      .selectDistinct({ language: typingParagraphs.language })
      .from(typingParagraphs);
    return result.map(r => r.language);
  }

  async getAvailableModes(): Promise<string[]> {
    const result = await db
      .selectDistinct({ mode: typingParagraphs.mode })
      .from(typingParagraphs);
    return result.map(r => r.mode);
  }

  async createTypingParagraph(paragraph: InsertTypingParagraph): Promise<TypingParagraph> {
    const result = await db.insert(typingParagraphs).values(paragraph).returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
