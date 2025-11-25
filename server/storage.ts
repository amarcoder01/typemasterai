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
  codeSnippets,
  codeTypingTests,
  sharedCodeResults,
  sharedResults,
  books,
  bookParagraphs,
  bookTypingTests,
  dictationSentences,
  dictationTests,
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
  type CodeSnippet,
  type InsertCodeSnippet,
  type CodeTypingTest,
  type InsertCodeTypingTest,
  type SharedCodeResult,
  type InsertSharedCodeResult,
  type SharedResult,
  type InsertSharedResult,
  type Book,
  type InsertBook,
  type BookParagraph,
  type InsertBookParagraph,
  type BookTypingTest,
  type InsertBookTypingTest,
  type DictationSentence,
  type InsertDictationSentence,
  type DictationTest,
  type InsertDictationTest,
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
  getTestResultById(testResultId: number): Promise<TestResult | undefined>;
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
  
  createCodeSnippet(snippet: InsertCodeSnippet): Promise<CodeSnippet>;
  getCodeSnippet(id: number): Promise<CodeSnippet | undefined>;
  getRandomCodeSnippet(language: string, difficulty?: string, framework?: string): Promise<CodeSnippet | undefined>;
  getAvailableProgrammingLanguages(): Promise<string[]>;
  getAvailableFrameworks(language?: string): Promise<string[]>;
  
  createCodeTypingTest(test: InsertCodeTypingTest): Promise<CodeTypingTest>;
  getUserCodeTypingTests(userId: string, limit?: number): Promise<CodeTypingTest[]>;
  getUserCodeStats(userId: string, language?: string): Promise<{
    totalTests: number;
    bestWpm: number;
    avgWpm: number;
    avgAccuracy: number;
    totalSyntaxErrors: number;
  } | null>;
  getCodeLeaderboard(language?: string, limit?: number): Promise<Array<{
    userId: string;
    username: string;
    wpm: number;
    accuracy: number;
    programmingLanguage: string;
    framework: string | null;
    createdAt: Date;
    avatarColor: string | null;
    totalTests: number;
  }>>;
  createSharedCodeResult(result: InsertSharedCodeResult): Promise<SharedCodeResult>;
  getSharedCodeResult(shareId: string): Promise<SharedCodeResult | undefined>;
  
  getBookParagraphs(filters: { difficulty?: string; topic?: string; durationMode?: number; limit?: number }): Promise<BookParagraph[]>;
  getRandomBookParagraph(filters?: { difficulty?: string; topic?: string; durationMode?: number }): Promise<BookParagraph | null>;
  getBookTopics(): Promise<string[]>;
  getBookParagraphById(id: number): Promise<BookParagraph | null>;
  getNextBookParagraph(bookId: number, currentParagraphIndex: number): Promise<BookParagraph | null>;
  insertBook(book: InsertBook): Promise<void>;
  insertBookParagraphs(paragraphs: InsertBookParagraph[]): Promise<void>;
  getAllBooks(): Promise<Book[]>;
  getBookBySlug(slug: string): Promise<Book | null>;
  getBookChapters(bookId: number): Promise<Array<{ chapter: number; title: string | null; paragraphCount: number }>>;
  getChapterParagraphs(bookId: number, chapter: number): Promise<BookParagraph[]>;
  createBookTestResult(result: InsertBookTypingTest): Promise<BookTypingTest>;
  getBookTestResults(userId: string, limit?: number): Promise<BookTypingTest[]>;
  
  getRandomDictationSentence(difficulty?: string, category?: string): Promise<DictationSentence | undefined>;
  createDictationTest(test: InsertDictationTest): Promise<DictationTest>;
  getDictationTestById(testId: number): Promise<DictationTest | undefined>;
  getUserDictationStats(userId: string): Promise<{
    totalTests: number;
    bestWpm: number;
    avgWpm: number;
    avgAccuracy: number;
    totalReplays: number;
  } | null>;
  getDictationLeaderboard(limit?: number): Promise<Array<{
    userId: string;
    username: string;
    wpm: number;
    accuracy: number;
    speedLevel: string;
    createdAt: Date;
    avatarColor: string | null;
    totalTests: number;
  }>>;

  createSharedResult(result: InsertSharedResult): Promise<SharedResult>;
  getSharedResult(shareToken: string): Promise<SharedResult | undefined>;
  incrementShareViewCount(shareToken: string): Promise<void>;
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

  async getTestResultById(testResultId: number): Promise<TestResult | undefined> {
    const result = await db
      .select()
      .from(testResults)
      .where(eq(testResults.id, testResultId))
      .limit(1);
    return result[0];
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

  async createCodeSnippet(snippet: InsertCodeSnippet): Promise<CodeSnippet> {
    const result = await db.insert(codeSnippets).values(snippet).returning();
    return result[0];
  }

  async getCodeSnippet(id: number): Promise<CodeSnippet | undefined> {
    const result = await db.select().from(codeSnippets).where(eq(codeSnippets.id, id)).limit(1);
    return result[0];
  }

  async getRandomCodeSnippet(language: string, difficulty?: string, framework?: string): Promise<CodeSnippet | undefined> {
    const conditions = [eq(codeSnippets.programmingLanguage, language)];
    
    if (difficulty) {
      conditions.push(eq(codeSnippets.difficulty, difficulty));
    }
    
    if (framework) {
      conditions.push(eq(codeSnippets.framework, framework));
    }
    
    const snippets = await db
      .select()
      .from(codeSnippets)
      .where(and(...conditions));
    
    if (snippets.length > 0) {
      const randomIndex = Math.floor(Math.random() * snippets.length);
      return snippets[randomIndex];
    }
    
    return undefined;
  }

  async getAvailableProgrammingLanguages(): Promise<string[]> {
    const result = await db
      .selectDistinct({ language: codeSnippets.programmingLanguage })
      .from(codeSnippets);
    return result.map(r => r.language);
  }

  async getAvailableFrameworks(language?: string): Promise<string[]> {
    let query = db.selectDistinct({ framework: codeSnippets.framework }).from(codeSnippets);
    
    if (language) {
      query = query.where(and(
        eq(codeSnippets.programmingLanguage, language),
        sql`${codeSnippets.framework} IS NOT NULL`
      )) as any;
    } else {
      query = query.where(sql`${codeSnippets.framework} IS NOT NULL`) as any;
    }
    
    const result = await query;
    return result.map(r => r.framework).filter(f => f !== null) as string[];
  }

  async createCodeTypingTest(test: InsertCodeTypingTest): Promise<CodeTypingTest> {
    const result = await db.insert(codeTypingTests).values(test).returning();
    return result[0];
  }

  async getUserCodeTypingTests(userId: string, limit: number = 10): Promise<CodeTypingTest[]> {
    return await db
      .select()
      .from(codeTypingTests)
      .where(eq(codeTypingTests.userId, userId))
      .orderBy(desc(codeTypingTests.createdAt))
      .limit(limit);
  }

  async getUserCodeStats(userId: string, language?: string): Promise<{
    totalTests: number;
    bestWpm: number;
    avgWpm: number;
    avgAccuracy: number;
    totalSyntaxErrors: number;
  } | null> {
    const conditions = [eq(codeTypingTests.userId, userId)];
    if (language) {
      conditions.push(eq(codeTypingTests.programmingLanguage, language));
    }

    const result = await db
      .select({
        totalTests: sql<number>`count(*)::int`,
        bestWpm: sql<number>`COALESCE(max(${codeTypingTests.wpm}), 0)::int`,
        avgWpm: sql<number>`COALESCE(avg(${codeTypingTests.wpm}), 0)::int`,
        avgAccuracy: sql<number>`COALESCE(avg(${codeTypingTests.accuracy}), 0)::float`,
        totalSyntaxErrors: sql<number>`COALESCE(sum(${codeTypingTests.syntaxErrors}), 0)::int`,
      })
      .from(codeTypingTests)
      .where(and(...conditions));

    if (!result[0] || result[0].totalTests === 0) {
      return null;
    }

    return result[0];
  }

  async getCodeLeaderboard(language?: string, limit: number = 20): Promise<Array<{
    userId: string;
    username: string;
    wpm: number;
    accuracy: number;
    programmingLanguage: string;
    framework: string | null;
    createdAt: Date;
    avatarColor: string | null;
    totalTests: number;
  }>> {
    const languageFilter = language ? sql`AND ct.programming_language = ${language}` : sql``;

    const leaderboard = await db.execute(sql`
      WITH ranked_results AS (
        SELECT 
          ct.user_id,
          ct.wpm,
          ct.accuracy,
          ct.programming_language,
          ct.framework,
          ct.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY ct.user_id ${language ? sql`, ct.programming_language` : sql``}
            ORDER BY ct.wpm DESC, ct.created_at DESC
          ) as rank
        FROM code_typing_tests ct
        WHERE 1=1 ${languageFilter}
      ),
      test_counts AS (
        SELECT 
          user_id,
          ${language ? sql`programming_language,` : sql``}
          COUNT(*)::int as total_tests
        FROM code_typing_tests
        WHERE 1=1 ${languageFilter}
        GROUP BY user_id ${language ? sql`, programming_language` : sql``}
      )
      SELECT 
        rr.user_id as "userId",
        u.username,
        rr.wpm,
        rr.accuracy,
        rr.programming_language as "programmingLanguage",
        rr.framework,
        rr.created_at as "createdAt",
        u.avatar_color as "avatarColor",
        COALESCE(tc.total_tests, 1) as "totalTests"
      FROM ranked_results rr
      INNER JOIN users u ON rr.user_id = u.id
      LEFT JOIN test_counts tc ON rr.user_id = tc.user_id ${language ? sql`AND rr.programming_language = tc.programming_language` : sql``}
      WHERE rr.rank = 1
      ORDER BY rr.wpm DESC, rr.created_at DESC
      LIMIT ${limit}
    `);

    return leaderboard.rows as any[];
  }

  async createSharedCodeResult(result: InsertSharedCodeResult): Promise<SharedCodeResult> {
    const inserted = await db.insert(sharedCodeResults).values(result).returning();
    return inserted[0];
  }

  async getSharedCodeResult(shareId: string): Promise<SharedCodeResult | undefined> {
    const result = await db
      .select()
      .from(sharedCodeResults)
      .where(eq(sharedCodeResults.shareId, shareId))
      .limit(1);
    return result[0];
  }

  async getBookParagraphs(filters: { difficulty?: string; topic?: string; durationMode?: number; limit?: number }): Promise<BookParagraph[]> {
    const conditions = [];
    
    if (filters.difficulty) {
      conditions.push(eq(bookParagraphs.difficulty, filters.difficulty));
    }
    
    if (filters.topic) {
      conditions.push(eq(bookParagraphs.topic, filters.topic));
    }
    
    if (filters.durationMode) {
      conditions.push(eq(bookParagraphs.durationMode, filters.durationMode));
    }
    
    const limit = filters.limit || 10;
    
    let query = db.select().from(bookParagraphs);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const result = await query.orderBy(sql`RANDOM()`).limit(limit);
    return result;
  }

  async getRandomBookParagraph(filters?: { difficulty?: string; topic?: string; durationMode?: number }): Promise<BookParagraph | null> {
    const conditions = [];
    
    if (filters?.difficulty) {
      conditions.push(eq(bookParagraphs.difficulty, filters.difficulty));
    }
    
    if (filters?.topic) {
      conditions.push(eq(bookParagraphs.topic, filters.topic));
    }
    
    if (filters?.durationMode) {
      conditions.push(eq(bookParagraphs.durationMode, filters.durationMode));
    }
    
    let query = db.select().from(bookParagraphs);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const result = await query.orderBy(sql`RANDOM()`).limit(1);
    return result[0] || null;
  }

  async getBookTopics(): Promise<string[]> {
    const result = await db
      .selectDistinct({ topic: bookParagraphs.topic })
      .from(bookParagraphs)
      .orderBy(bookParagraphs.topic);
    return result.map(r => r.topic);
  }

  async getBookParagraphById(id: number): Promise<BookParagraph | null> {
    const result = await db
      .select()
      .from(bookParagraphs)
      .where(eq(bookParagraphs.id, id))
      .limit(1);
    return result[0] || null;
  }

  async getNextBookParagraph(bookId: number, currentParagraphIndex: number): Promise<BookParagraph | null> {
    const result = await db
      .select()
      .from(bookParagraphs)
      .where(and(
        eq(bookParagraphs.bookId, bookId),
        eq(bookParagraphs.paragraphIndex, currentParagraphIndex + 1)
      ))
      .limit(1);
    return result[0] || null;
  }

  async insertBook(book: InsertBook): Promise<void> {
    try {
      await db.insert(books).values(book).onConflictDoNothing();
    } catch (error) {
      console.error("Error inserting book:", error);
      throw new Error("Failed to insert book");
    }
  }

  async insertBookParagraphs(paragraphs: InsertBookParagraph[]): Promise<void> {
    if (paragraphs.length === 0) return;
    
    try {
      await db.insert(bookParagraphs).values(paragraphs);
    } catch (error) {
      console.error("Error inserting book paragraphs:", error);
      throw new Error("Failed to insert book paragraphs");
    }
  }

  async getAllBooks(): Promise<Book[]> {
    return await db.select().from(books).orderBy(books.title);
  }

  async getBookBySlug(slug: string): Promise<Book | null> {
    const result = await db.select().from(books).where(eq(books.slug, slug)).limit(1);
    return result[0] || null;
  }

  async getBookChapters(bookId: number): Promise<Array<{ chapter: number; title: string | null; paragraphCount: number }>> {
    const result = await db
      .select({
        chapter: bookParagraphs.chapter,
        title: bookParagraphs.chapterTitle,
        paragraphCount: sql<number>`count(*)::int`,
      })
      .from(bookParagraphs)
      .where(eq(bookParagraphs.bookId, bookId))
      .groupBy(bookParagraphs.chapter, bookParagraphs.chapterTitle)
      .orderBy(bookParagraphs.chapter);
    
    return result.map(r => ({
      chapter: r.chapter || 1,
      title: r.title,
      paragraphCount: r.paragraphCount,
    }));
  }

  async getChapterParagraphs(bookId: number, chapter: number): Promise<BookParagraph[]> {
    return await db
      .select()
      .from(bookParagraphs)
      .where(and(
        eq(bookParagraphs.bookId, bookId),
        eq(bookParagraphs.chapter, chapter)
      ))
      .orderBy(bookParagraphs.paragraphIndex);
  }

  async createBookTestResult(result: InsertBookTypingTest): Promise<BookTypingTest> {
    const inserted = await db.insert(bookTypingTests).values(result).returning();
    return inserted[0];
  }

  async getBookTestResults(userId: string, limit: number = 20): Promise<BookTypingTest[]> {
    return await db
      .select()
      .from(bookTypingTests)
      .where(eq(bookTypingTests.userId, userId))
      .orderBy(desc(bookTypingTests.createdAt))
      .limit(limit);
  }

  async getRandomDictationSentence(difficulty?: string, category?: string): Promise<DictationSentence | undefined> {
    const conditions = [];
    
    if (difficulty) {
      conditions.push(eq(dictationSentences.difficulty, difficulty));
    }
    
    if (category) {
      conditions.push(eq(dictationSentences.category, category));
    }
    
    let query = db.select().from(dictationSentences);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const result = await query.orderBy(sql`RANDOM()`).limit(1);
    return result[0];
  }

  async createDictationTest(test: InsertDictationTest): Promise<DictationTest> {
    const inserted = await db.insert(dictationTests).values(test).returning();
    return inserted[0];
  }

  async getDictationTestById(testId: number): Promise<DictationTest | undefined> {
    const result = await db
      .select()
      .from(dictationTests)
      .where(eq(dictationTests.id, testId))
      .limit(1);
    return result[0];
  }

  async getUserDictationStats(userId: string): Promise<{
    totalTests: number;
    bestWpm: number;
    avgWpm: number;
    avgAccuracy: number;
    totalReplays: number;
  } | null> {
    const result = await db
      .select({
        totalTests: sql<number>`count(*)::int`,
        bestWpm: sql<number>`max(${dictationTests.wpm})::int`,
        avgWpm: sql<number>`round(avg(${dictationTests.wpm}))::int`,
        avgAccuracy: sql<number>`round(avg(${dictationTests.accuracy}))`,
        totalReplays: sql<number>`sum(${dictationTests.replayCount})::int`,
      })
      .from(dictationTests)
      .where(eq(dictationTests.userId, userId));

    if (!result[0] || result[0].totalTests === 0) {
      return null;
    }

    return {
      totalTests: result[0].totalTests,
      bestWpm: result[0].bestWpm || 0,
      avgWpm: result[0].avgWpm || 0,
      avgAccuracy: result[0].avgAccuracy || 0,
      totalReplays: result[0].totalReplays || 0,
    };
  }

  async getDictationLeaderboard(limit: number = 10): Promise<Array<{
    userId: string;
    username: string;
    wpm: number;
    accuracy: number;
    speedLevel: string;
    createdAt: Date;
    avatarColor: string | null;
    totalTests: number;
  }>> {
    const topScores = await db
      .select({
        userId: dictationTests.userId,
        username: users.username,
        wpm: dictationTests.wpm,
        accuracy: dictationTests.accuracy,
        speedLevel: dictationTests.speedLevel,
        createdAt: dictationTests.createdAt,
        avatarColor: users.avatarColor,
        totalTests: sql<number>`count(*) OVER (PARTITION BY ${dictationTests.userId})::int`,
      })
      .from(dictationTests)
      .innerJoin(users, eq(dictationTests.userId, users.id))
      .orderBy(desc(dictationTests.wpm), desc(dictationTests.accuracy))
      .limit(limit);

    return topScores.map(score => ({
      userId: score.userId,
      username: score.username,
      wpm: score.wpm,
      accuracy: score.accuracy,
      speedLevel: score.speedLevel,
      createdAt: score.createdAt,
      avatarColor: score.avatarColor,
      totalTests: score.totalTests,
    }));
  }

  async createSharedResult(result: InsertSharedResult): Promise<SharedResult> {
    const inserted = await db.insert(sharedResults).values(result).returning();
    return inserted[0];
  }

  async getSharedResult(shareToken: string): Promise<SharedResult | undefined> {
    const result = await db
      .select()
      .from(sharedResults)
      .where(eq(sharedResults.shareToken, shareToken))
      .limit(1);
    return result[0];
  }

  async incrementShareViewCount(shareToken: string): Promise<void> {
    await db
      .update(sharedResults)
      .set({ viewCount: sql`${sharedResults.viewCount} + 1` })
      .where(eq(sharedResults.shareToken, shareToken));
  }
}

export const storage = new DatabaseStorage();
