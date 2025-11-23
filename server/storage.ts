import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import {
  users,
  testResults,
  conversations,
  messages,
  type User,
  type InsertUser,
  type TestResult,
  type InsertTestResult,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
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
  }>>;
  
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getUserConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: number, userId: string): Promise<Conversation | undefined>;
  updateConversation(id: number, userId: string, data: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: number, userId: string): Promise<void>;
  
  createMessage(message: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: number): Promise<Message[]>;
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
  }>> {
    return await db
      .select({
        userId: testResults.userId,
        username: users.username,
        wpm: testResults.wpm,
        accuracy: testResults.accuracy,
        createdAt: testResults.createdAt,
      })
      .from(testResults)
      .innerJoin(users, eq(testResults.userId, users.id))
      .orderBy(desc(testResults.wpm))
      .limit(limit);
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
}

export const storage = new DatabaseStorage();
