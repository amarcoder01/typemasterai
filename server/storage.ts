import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import {
  users,
  testResults,
  conversations,
  messages,
  typingParagraphs,
  keystrokeAnalytics,
  races,
  raceParticipants,
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
  type KeystrokeAnalytics,
  type InsertKeystrokeAnalytics,
  type Race,
  type InsertRace,
  type RaceParticipant,
  type InsertRaceParticipant,
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
  verifyTestResultOwnership(testResultId: number, userId: string): Promise<boolean>;
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
  
  saveKeystrokeAnalytics(keystroke: InsertKeystrokeAnalytics): Promise<KeystrokeAnalytics>;
  saveBulkKeystrokeAnalytics(keystrokes: InsertKeystrokeAnalytics[]): Promise<void>;
  getUserAnalytics(userId: string, days?: number): Promise<{
    wpmOverTime: Array<{ date: string; wpm: number; accuracy: number; testCount: number }>;
    mistakesHeatmap: Array<{ key: string; errorCount: number; totalCount: number; errorRate: number }>;
    consistency: {
      avgWpm: number;
      stdDeviation: number;
      minWpm: number;
      maxWpm: number;
    };
    commonMistakes: Array<{ expectedKey: string; typedKey: string; count: number }>;
  }>;
  
  getUserBadgeData(userId: string): Promise<{
    bestWpm: number;
    bestAccuracy: number;
    totalTests: number;
    currentStreak: number;
    bestStreak: number;
  }>;
  updateUserStreak(userId: string): Promise<void>;
  
  // Multiplayer Racing
  createRace(race: InsertRace): Promise<Race>;
  getRace(id: number): Promise<Race | undefined>;
  getRaceByCode(roomCode: string): Promise<Race | undefined>;
  updateRaceStatus(id: number, status: string, startedAt?: Date, finishedAt?: Date): Promise<void>;
  getActiveRaces(): Promise<Race[]>;
  
  createRaceParticipant(participant: InsertRaceParticipant): Promise<RaceParticipant>;
  getRaceParticipants(raceId: number): Promise<RaceParticipant[]>;
  updateParticipantProgress(id: number, progress: number, wpm: number, accuracy: number, errors: number): Promise<void>;
  finishParticipant(id: number): Promise<{ position: number; isNewFinish: boolean }>;
  deleteRaceParticipant(id: number): Promise<void>;
  reactivateRaceParticipant(id: number): Promise<RaceParticipant>;
  findInactiveParticipant(raceId: number, userId?: string, guestName?: string): Promise<RaceParticipant | undefined>;
  getRaceWithParticipants(raceId: number): Promise<{ race: Race; participants: RaceParticipant[] } | undefined>;
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

  async verifyTestResultOwnership(testResultId: number, userId: string): Promise<boolean> {
    const result = await db
      .select({ id: testResults.id })
      .from(testResults)
      .where(and(eq(testResults.id, testResultId), eq(testResults.userId, userId)))
      .limit(1);
    
    return result.length > 0;
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

  async saveKeystrokeAnalytics(keystroke: InsertKeystrokeAnalytics): Promise<KeystrokeAnalytics> {
    const result = await db.insert(keystrokeAnalytics).values(keystroke).returning();
    return result[0];
  }

  async saveBulkKeystrokeAnalytics(keystrokes: InsertKeystrokeAnalytics[]): Promise<void> {
    if (keystrokes.length === 0) return;
    await db.insert(keystrokeAnalytics).values(keystrokes);
  }

  async getUserAnalytics(userId: string, days: number = 30): Promise<{
    wpmOverTime: Array<{ date: string; wpm: number; accuracy: number; testCount: number }>;
    mistakesHeatmap: Array<{ key: string; errorCount: number; totalCount: number; errorRate: number }>;
    consistency: {
      avgWpm: number;
      stdDeviation: number;
      minWpm: number;
      maxWpm: number;
    };
    commonMistakes: Array<{ expectedKey: string; typedKey: string; count: number }>;
  }> {
    // Get WPM over time (grouped by date)
    const wpmDataQuery = await db.execute(sql`
      SELECT 
        DATE(created_at) as date,
        AVG(wpm)::int as wpm,
        AVG(accuracy)::numeric(5,2) as accuracy,
        COUNT(*)::int as test_count
      FROM test_results
      WHERE user_id = ${userId}
        AND created_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    
    const wpmOverTime = wpmDataQuery.rows.map((row: any) => ({
      date: row.date,
      wpm: Number(row.wpm),
      accuracy: Number(row.accuracy),
      testCount: Number(row.test_count),
    }));

    // Get mistakes heatmap (errors per key)
    const heatmapQuery = await db.execute(sql`
      SELECT 
        expected_key as key,
        COUNT(CASE WHEN is_correct = 0 THEN 1 END)::int as error_count,
        COUNT(*)::int as total_count,
        (COUNT(CASE WHEN is_correct = 0 THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100)::numeric(5,2) as error_rate
      FROM keystroke_analytics
      WHERE user_id = ${userId}
        AND created_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
      GROUP BY expected_key
      HAVING COUNT(CASE WHEN is_correct = 0 THEN 1 END) > 0
      ORDER BY error_count DESC
      LIMIT 50
    `);

    const mistakesHeatmap = heatmapQuery.rows.map((row: any) => ({
      key: row.key,
      errorCount: Number(row.error_count),
      totalCount: Number(row.total_count),
      errorRate: Number(row.error_rate),
    }));

    // Get consistency metrics
    const consistencyQuery = await db.execute(sql`
      SELECT 
        AVG(wpm)::numeric(10,2) as avg_wpm,
        STDDEV(wpm)::numeric(10,2) as std_deviation,
        MIN(wpm)::int as min_wpm,
        MAX(wpm)::int as max_wpm
      FROM test_results
      WHERE user_id = ${userId}
        AND created_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
    `);

    const consistencyData = consistencyQuery.rows[0] as any;
    const consistency = {
      avgWpm: Number(consistencyData?.avg_wpm || 0),
      stdDeviation: Number(consistencyData?.std_deviation || 0),
      minWpm: Number(consistencyData?.min_wpm || 0),
      maxWpm: Number(consistencyData?.max_wpm || 0),
    };

    // Get common mistakes (expected key vs typed key)
    const mistakesQuery = await db.execute(sql`
      SELECT 
        expected_key,
        typed_key,
        COUNT(*)::int as count
      FROM keystroke_analytics
      WHERE user_id = ${userId}
        AND is_correct = 0
        AND created_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
      GROUP BY expected_key, typed_key
      ORDER BY count DESC
      LIMIT 20
    `);

    const commonMistakes = mistakesQuery.rows.map((row: any) => ({
      expectedKey: row.expected_key,
      typedKey: row.typed_key,
      count: Number(row.count),
    }));

    return {
      wpmOverTime,
      mistakesHeatmap,
      consistency,
      commonMistakes,
    };
  }

  async getUserBadgeData(userId: string): Promise<{
    bestWpm: number;
    bestAccuracy: number;
    totalTests: number;
    currentStreak: number;
    bestStreak: number;
  }> {
    // Get user stats for badges
    const statsResult = await db
      .select({
        totalTests: sql<number>`count(*)::int`,
        bestWpm: sql<number>`max(${testResults.wpm})::int`,
        bestAccuracy: sql<number>`max(${testResults.accuracy})::float`,
      })
      .from(testResults)
      .where(eq(testResults.userId, userId));

    const stats = statsResult[0];

    // Get streak data from user table
    const user = await this.getUser(userId);

    return {
      bestWpm: stats?.bestWpm || 0,
      bestAccuracy: stats?.bestAccuracy || 0,
      totalTests: stats?.totalTests || 0,
      currentStreak: user?.currentStreak || 0,
      bestStreak: user?.bestStreak || 0,
    };
  }

  async updateUserStreak(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let newStreak = 1;
    let newBestStreak = user.bestStreak;

    if (user.lastTestDate) {
      const lastTestDate = new Date(user.lastTestDate);
      const lastTest = new Date(lastTestDate.getFullYear(), lastTestDate.getMonth(), lastTestDate.getDate());
      const daysDiff = Math.floor((today.getTime() - lastTest.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        // Same day, don't update streak
        return;
      } else if (daysDiff === 1) {
        // Consecutive day, increment streak
        newStreak = user.currentStreak + 1;
      }
      // If daysDiff > 1, streak is broken, reset to 1
    }

    // Update best streak if current is higher
    if (newStreak > newBestStreak) {
      newBestStreak = newStreak;
    }

    await db
      .update(users)
      .set({
        currentStreak: newStreak,
        bestStreak: newBestStreak,
        lastTestDate: now,
      })
      .where(eq(users.id, userId));
  }

  // Multiplayer Racing Methods
  async createRace(race: InsertRace): Promise<Race> {
    const result = await db.insert(races).values(race).returning();
    return result[0];
  }

  async getRace(id: number): Promise<Race | undefined> {
    const result = await db.select().from(races).where(eq(races.id, id)).limit(1);
    return result[0];
  }

  async getRaceByCode(roomCode: string): Promise<Race | undefined> {
    const result = await db.select().from(races).where(eq(races.roomCode, roomCode)).limit(1);
    return result[0];
  }

  async updateRaceStatus(id: number, status: string, startedAt?: Date, finishedAt?: Date): Promise<void> {
    const updateData: any = { status };
    if (startedAt) updateData.startedAt = startedAt;
    if (finishedAt) updateData.finishedAt = finishedAt;
    await db.update(races).set(updateData).where(eq(races.id, id));
  }

  async getActiveRaces(): Promise<Race[]> {
    return await db
      .select()
      .from(races)
      .where(sql`${races.status} IN ('waiting', 'countdown', 'racing')`)
      .orderBy(desc(races.createdAt));
  }

  async createRaceParticipant(participant: InsertRaceParticipant): Promise<RaceParticipant> {
    const result = await db.insert(raceParticipants).values(participant).returning();
    return result[0];
  }

  async getRaceParticipants(raceId: number): Promise<RaceParticipant[]> {
    return await db
      .select()
      .from(raceParticipants)
      .where(and(
        eq(raceParticipants.raceId, raceId),
        eq(raceParticipants.isActive, 1)
      ))
      .orderBy(raceParticipants.joinedAt);
  }

  async updateParticipantProgress(id: number, progress: number, wpm: number, accuracy: number, errors: number): Promise<void> {
    await db
      .update(raceParticipants)
      .set({ progress, wpm, accuracy, errors })
      .where(eq(raceParticipants.id, id));
  }

  async finishParticipant(id: number): Promise<{ position: number; isNewFinish: boolean }> {
    return await db.transaction(async (tx) => {
      const participant = await tx
        .select()
        .from(raceParticipants)
        .where(eq(raceParticipants.id, id))
        .for("update")
        .limit(1);

      if (!participant || participant.length === 0) {
        throw new Error("Participant not found");
      }

      if (participant[0].isFinished === 1 && participant[0].finishPosition !== null) {
        return { position: participant[0].finishPosition, isNewFinish: false };
      }

      const result = await tx.execute(sql`
        UPDATE races
        SET finish_counter = finish_counter + 1
        WHERE id = ${participant[0].raceId}
        RETURNING finish_counter as position
      `);

      const rows = result.rows as Array<{ position: number }>;
      const position = rows[0].position;

      await tx
        .update(raceParticipants)
        .set({ 
          isFinished: 1, 
          finishPosition: position,
          finishedAt: new Date()
        })
        .where(eq(raceParticipants.id, id));

      return { position, isNewFinish: true };
    });
  }

  async deleteRaceParticipant(id: number): Promise<void> {
    await db
      .update(raceParticipants)
      .set({ isActive: 0 })
      .where(eq(raceParticipants.id, id));
  }

  async reactivateRaceParticipant(id: number): Promise<RaceParticipant> {
    const result = await db
      .update(raceParticipants)
      .set({ 
        isActive: 1,
        progress: 0,
        wpm: 0,
        accuracy: 0,
        errors: 0,
        isFinished: 0,
        finishPosition: null,
        finishedAt: null,
        joinedAt: new Date()
      })
      .where(eq(raceParticipants.id, id))
      .returning();
    return result[0];
  }

  async findInactiveParticipant(raceId: number, userId?: string, guestName?: string): Promise<RaceParticipant | undefined> {
    const conditions = [
      eq(raceParticipants.raceId, raceId),
      eq(raceParticipants.isActive, 0)
    ];
    
    if (userId) {
      conditions.push(eq(raceParticipants.userId, userId));
    } else if (guestName) {
      conditions.push(eq(raceParticipants.guestName, guestName));
    }
    
    const result = await db
      .select()
      .from(raceParticipants)
      .where(and(...conditions))
      .limit(1);
    
    return result[0];
  }

  async getRaceWithParticipants(raceId: number): Promise<{ race: Race; participants: RaceParticipant[] } | undefined> {
    const race = await this.getRace(raceId);
    if (!race) return undefined;

    const participants = await this.getRaceParticipants(raceId);
    return { race, participants };
  }
}

export const storage = new DatabaseStorage();
