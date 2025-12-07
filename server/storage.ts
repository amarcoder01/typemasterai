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
  stressTests,
  keystrokeEvents,
  typingAnalytics,
  typingInsights,
  practiceRecommendations,
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
  type StressTest,
  type InsertStressTest,
  type KeystrokeEvent,
  type InsertKeystrokeEvent,
  type TypingAnalytics,
  type InsertTypingAnalytics,
  type TypingInsight,
  type InsertTypingInsight,
  type PracticeRecommendation,
  type InsertPracticeRecommendation,
  pushSubscriptions,
  notificationPreferences,
  notificationHistory,
  notificationJobs,
  achievements,
  userAchievements,
  challenges,
  userChallenges,
  userGamification,
  type PushSubscription,
  type InsertPushSubscription,
  type NotificationPreferences,
  type InsertNotificationPreferences,
  type NotificationHistory,
  type InsertNotificationHistory,
  type NotificationJob,
  type InsertNotificationJob,
  type Achievement,
  type InsertAchievement,
  type UserAchievement,
  type InsertUserAchievement,
  type Challenge,
  type InsertChallenge,
  type UserChallenge,
  type InsertUserChallenge,
  type UserGamification,
  type InsertUserGamification,
  loginHistory,
  accountLockouts,
  emailVerificationTokens,
  passwordResetTokens,
  userSessions,
  securitySettings,
  oauthAccounts,
  persistentLogins,
  oauthStates,
  auditLogs,
  type LoginHistory,
  type InsertLoginHistory,
  type AccountLockout,
  type InsertAccountLockout,
  type EmailVerificationToken,
  type InsertEmailVerificationToken,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type UserSession,
  type InsertUserSession,
  type SecuritySettings,
  type InsertSecuritySettings,
  type OAuthAccount,
  type InsertOAuthAccount,
  type OAuthProvider,
  type PersistentLogin,
  type InsertPersistentLogin,
  type OAuthState,
  type InsertOAuthState,
  type AuditLog,
  type InsertAuditLog,
  userRatings,
  raceMatchHistory,
  raceKeystrokes,
  raceChatMessages,
  raceSpectators,
  raceReplays,
  antiCheatChallenges,
  type UserRating,
  type InsertUserRating,
  type RaceMatchHistory,
  type InsertRaceMatchHistory,
  type RaceKeystrokes,
  type InsertRaceKeystrokes,
  type RaceChatMessage,
  type InsertRaceChatMessage,
  type RaceSpectator,
  type InsertRaceSpectator,
  type RaceReplay,
  type InsertRaceReplay,
  type AntiCheatChallenge,
  type InsertAntiCheatChallenge,
} from "@shared/schema";
import { eq, desc, sql, and, notInArray, or } from "drizzle-orm";

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
  verifyUserEmail(userId: string): Promise<void>;
  
  // Login History & Security
  createLoginHistory(history: InsertLoginHistory): Promise<LoginHistory>;
  getUserLoginHistory(userId: string, limit?: number): Promise<LoginHistory[]>;
  getRecentFailedLogins(userId: string, minutes: number): Promise<LoginHistory[]>;
  handleFailedLoginTransaction(
    userId: string,
    email: string,
    req: any,
    reason: string,
    windowMinutes: number,
    maxAttempts: number,
    lockoutMinutes: number
  ): Promise<void>;
  
  // Account Lockout
  getAccountLockout(userId: string): Promise<AccountLockout | undefined>;
  createOrUpdateAccountLockout(userId: string, failedAttempts: number, lockedUntil?: Date): Promise<AccountLockout>;
  clearAccountLockout(userId: string): Promise<void>;
  isAccountLocked(userId: string): Promise<boolean>;
  
  // Email Verification
  createEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<EmailVerificationToken>;
  getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  markEmailVerified(userId: string, token: string): Promise<void>;
  deleteEmailVerificationToken(userId: string): Promise<void>;
  
  // Password Reset
  createPasswordResetToken(userId: string, token: string, expiresAt: Date, ipAddress?: string): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  deletePasswordResetTokens(userId: string): Promise<void>;
  
  // User Sessions
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getUserSessions(userId: string): Promise<UserSession[]>;
  updateSessionActivity(sessionId: string): Promise<void>;
  revokeSession(sessionId: string): Promise<void>;
  revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void>;
  
  // Security Settings
  getSecuritySettings(userId: string): Promise<SecuritySettings | undefined>;
  createSecuritySettings(userId: string): Promise<SecuritySettings>;
  updateSecuritySettings(userId: string, settings: Partial<SecuritySettings>): Promise<SecuritySettings>;
  enable2FA(userId: string, secret: string, backupCodes: string[]): Promise<void>;
  disable2FA(userId: string): Promise<void>;
  verify2FABackupCode(userId: string, code: string): Promise<boolean>;
  use2FABackupCode(userId: string, code: string): Promise<void>;
  
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

  getLeaderboardPaginated(limit: number, offset: number, timeframe?: string): Promise<Array<{
    userId: string;
    username: string;
    wpm: number;
    accuracy: number;
    createdAt: Date;
    mode: number;
    avatarColor: string | null;
    totalTests: number;
    rank: number;
    isVerified: boolean;
  }>>;
  getLeaderboardCount(timeframe?: string): Promise<number>;
  getLeaderboardAroundUser(userId: string, range?: number, timeframe?: string): Promise<{ userRank: number; entries: any[] }>;

  getStressTestLeaderboardPaginated(difficulty: string | undefined, limit: number, offset: number): Promise<Array<{
    userId: string;
    username: string;
    difficulty: string;
    stressScore: number;
    wpm: number;
    accuracy: number;
    completionRate: number;
    avatarColor: string | null;
    createdAt: Date;
    rank: number;
    isVerified: boolean;
  }>>;
  getStressTestLeaderboardCount(difficulty?: string): Promise<number>;
  getStressLeaderboardAroundUser(userId: string, difficulty: string | undefined, range?: number): Promise<{ userRank: number; entries: any[] }>;

  getCodeLeaderboardPaginated(language: string | undefined, limit: number, offset: number): Promise<Array<{
    userId: string;
    username: string;
    wpm: number;
    accuracy: number;
    programmingLanguage: string;
    framework: string | null;
    createdAt: Date;
    avatarColor: string | null;
    totalTests: number;
    rank: number;
    isVerified: boolean;
  }>>;
  getCodeLeaderboardCount(language?: string): Promise<number>;
  getCodeLeaderboardAroundUser(userId: string, language: string | undefined, range?: number): Promise<{ userRank: number; entries: any[] }>;

  getRatingLeaderboardPaginated(tier: string | undefined, limit: number, offset: number): Promise<any[]>;
  getRatingLeaderboardCount(tier?: string): Promise<number>;
  getRatingLeaderboardAroundUser(userId: string, tier: string | undefined, range?: number): Promise<{ userRank: number; entries: any[] }>;

  getDictationLeaderboardPaginated(limit: number, offset: number): Promise<Array<{
    userId: string;
    username: string;
    wpm: number;
    accuracy: number;
    speedLevel: string;
    createdAt: Date;
    avatarColor: string | null;
    totalTests: number;
    rank: number;
  }>>;
  getDictationLeaderboardCount(): Promise<number>;
  getDictationLeaderboardAroundUser(userId: string, range?: number): Promise<{ userRank: number; entries: any[] }>;

  getTimeBasedLeaderboard(timeframe: "daily" | "weekly" | "monthly", limit: number, offset: number): Promise<Array<{
    userId: string;
    username: string;
    wpm: number;
    accuracy: number;
    createdAt: Date;
    avatarColor: string | null;
    testsInPeriod: number;
    rank: number;
  }>>;
  getTimeBasedLeaderboardCount(timeframe: "daily" | "weekly" | "monthly"): Promise<number>;
  
  getPlatformStats(): Promise<{
    totalUsers: number;
    totalTests: number;
    totalLanguages: number;
  }>;
  
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getUserConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: number, userId: string): Promise<Conversation | undefined>;
  updateConversation(id: number, userId: string, data: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: number, userId: string): Promise<void>;
  
  createMessage(message: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: number): Promise<Message[]>;
  
  getRandomParagraph(language: string, mode?: string, difficulty?: string): Promise<TypingParagraph | undefined>;
  getRandomParagraphs(language: string, count: number, mode?: string, difficulty?: string): Promise<TypingParagraph[]>;
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
  
  getHistoricalTrends(userId: string): Promise<{
    weeklyAggregates: Array<{
      weekStart: string;
      weekEnd: string;
      avgWpm: number;
      avgAccuracy: number;
      testCount: number;
      bestWpm: number;
    }>;
    monthlyAggregates: Array<{
      month: string;
      avgWpm: number;
      avgAccuracy: number;
      testCount: number;
      bestWpm: number;
    }>;
    improvement: {
      weekOverWeek: { wpm: number; accuracy: number };
      monthOverMonth: { wpm: number; accuracy: number };
      allTime: { firstWpm: number; currentWpm: number; improvementPercent: number };
    };
    milestones: Array<{
      type: string;
      value: number;
      achievedAt: string;
    }>;
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
  updateRaceTimeLimitSeconds(id: number, timeLimitSeconds: number): Promise<void>;
  extendRaceParagraph(id: number, additionalContent: string): Promise<Race | undefined>;
  getActiveRaces(): Promise<Race[]>;
  
  createRaceParticipant(participant: InsertRaceParticipant): Promise<RaceParticipant>;
  getRaceParticipants(raceId: number): Promise<RaceParticipant[]>;
  updateParticipantProgress(id: number, progress: number, wpm: number, accuracy: number, errors: number): Promise<void>;
  updateParticipantFinishPosition(id: number, position: number): Promise<void>;
  finishParticipant(id: number): Promise<{ position: number; isNewFinish: boolean }>;
  deleteRaceParticipant(id: number): Promise<void>;
  reactivateRaceParticipant(id: number): Promise<RaceParticipant>;
  findInactiveParticipant(raceId: number, userId?: string, guestName?: string): Promise<RaceParticipant | undefined>;
  getRaceWithParticipants(raceId: number): Promise<{ race: Race; participants: RaceParticipant[] } | undefined>;
  
  // Scalability methods for race cache
  getStaleRaces(waitingTimeout: number, countdownTimeout: number, racingTimeout: number): Promise<Race[]>;
  cleanupOldFinishedRaces(retentionMs: number): Promise<number>;
  bulkUpdateParticipantProgress(updates: Map<number, { progress: number; wpm: number; accuracy: number; errors: number }>): Promise<void>;
  
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
  getBookById(id: number): Promise<Book | null>;
  getBookBySlug(slug: string): Promise<Book | null>;
  getBookChapters(bookId: number): Promise<Array<{ chapter: number; title: string | null; paragraphCount: number }>>;
  getChapterParagraphs(bookId: number, chapter: number): Promise<BookParagraph[]>;
  createBookTestResult(result: InsertBookTypingTest): Promise<BookTypingTest>;
  getBookTestResults(userId: string, limit?: number): Promise<BookTypingTest[]>;
  
  getRandomDictationSentence(difficulty?: string, category?: string, excludeIds?: number[]): Promise<DictationSentence | undefined>;
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
  
  createStressTest(test: InsertStressTest): Promise<StressTest>;
  upsertStressTestBestScore(test: InsertStressTest): Promise<{ result: StressTest; isNewPersonalBest: boolean }>;
  getUserStressTests(userId: string, limit?: number): Promise<StressTest[]>;
  getStressTestLeaderboard(difficulty?: string, limit?: number): Promise<Array<{
    userId: string;
    username: string;
    difficulty: string;
    stressScore: number;
    wpm: number;
    accuracy: number;
    completionRate: number;
    avatarColor: string | null;
    createdAt: Date;
    rank: number;
  }>>;
  getUserStressStats(userId: string): Promise<{
    totalTests: number;
    bestScore: number;
    avgScore: number;
    completedTests: number;
    difficultiesCompleted: string[];
  } | null>;
  
  createSharedResult(result: InsertSharedResult): Promise<SharedResult>;
  getSharedResult(shareToken: string): Promise<SharedResult | undefined>;
  incrementShareViewCount(shareToken: string): Promise<void>;
  
  saveKeystrokeEvents(events: InsertKeystrokeEvent[]): Promise<void>;
  saveTypingAnalytics(analytics: InsertTypingAnalytics): Promise<TypingAnalytics>;
  getUserTypingAnalytics(userId: string, limit?: number): Promise<TypingAnalytics[]>;
  getTypingAnalyticsById(id: number): Promise<TypingAnalytics | undefined>;
  saveTypingInsight(insight: InsertTypingInsight): Promise<TypingInsight>;
  getUserTypingInsights(userId: string): Promise<TypingInsight[]>;
  dismissInsight(insightId: number): Promise<void>;
  savePracticeRecommendation(recommendation: InsertPracticeRecommendation): Promise<PracticeRecommendation>;
  getUserPracticeRecommendations(userId: string): Promise<PracticeRecommendation[]>;
  completePracticeRecommendation(recommendationId: number): Promise<void>;
  
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getUserPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  deletePushSubscription(id: number): Promise<void>;
  findExistingSubscription(userId: string, endpoint: string): Promise<PushSubscription | undefined>;
  
  getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined>;
  createNotificationPreferences(prefs: InsertNotificationPreferences): Promise<NotificationPreferences>;
  updateNotificationPreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences>;
  
  createNotificationHistory(history: InsertNotificationHistory): Promise<NotificationHistory>;
  getUserNotificationHistory(userId: string, limit?: number): Promise<NotificationHistory[]>;
  markNotificationDelivered(id: number): Promise<void>;
  markNotificationClicked(id: number): Promise<void>;
  
  createNotificationJobs(jobs: InsertNotificationJob[]): Promise<NotificationJob[]>;
  claimDueNotificationJobs(beforeUtc: Date, limit: number): Promise<NotificationJob[]>;
  markJobCompleted(jobId: number): Promise<void>;
  markJobFailed(jobId: number, errorMessage: string): Promise<void>;
  rescheduleJob(jobId: number, newSendAtUtc: Date): Promise<void>;
  deleteCompletedJobsOlderThan(daysAgo: number): Promise<number>;
  
  getUsersWithNotificationPreferences(notificationType: string, offset: number, limit: number): Promise<Array<{
    user: User;
    preferences: NotificationPreferences;
  }>>;
  getUsersForDailyReminders(currentHour: number): Promise<Array<{ id: string; username: string; currentStreak: number }>>;
  getUsersWithStreakAtRisk(): Promise<Array<{ id: string; username: string; currentStreak: number }>>;
  getUsersForWeeklySummary(): Promise<Array<{ id: string; username: string }>>;
  
  getUserAverageWpm(userId: string): Promise<number>;
  getWeeklySummaryStats(userId: string): Promise<{
    testsCompleted: number;
    avgWpm: number;
    avgAccuracy: number;
    improvement: number;
    rank: number;
  }>;
  
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  getAllAchievements(): Promise<Achievement[]>;
  getAchievementByKey(key: string): Promise<Achievement | undefined>;
  unlockAchievement(userId: string, achievementId: number, testResultId?: number): Promise<UserAchievement>;
  getUserAchievements(userId: string): Promise<Array<UserAchievement & { achievement: Achievement }>>;
  
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;
  getActiveChallenge(type: 'daily' | 'weekly'): Promise<Challenge | undefined>;
  getUserChallengeProgress(userId: string, challengeId: number): Promise<UserChallenge | undefined>;
  updateChallengeProgress(userId: string, challengeId: number, progress: number): Promise<UserChallenge>;
  completeChallenge(userId: string, challengeId: number): Promise<UserChallenge>;
  
  getUserGamification(userId: string): Promise<UserGamification | undefined>;
  createUserGamification(gamification: InsertUserGamification): Promise<UserGamification>;
  updateUserGamification(userId: string, updates: Partial<UserGamification>): Promise<UserGamification>;
  
  // OAuth Accounts
  createOAuthAccount(account: InsertOAuthAccount): Promise<OAuthAccount>;
  getOAuthAccount(provider: OAuthProvider, providerUserId: string): Promise<OAuthAccount | undefined>;
  getUserOAuthAccounts(userId: string): Promise<OAuthAccount[]>;
  linkOAuthAccount(userId: string, account: Omit<InsertOAuthAccount, 'userId'>): Promise<OAuthAccount>;
  unlinkOAuthAccount(userId: string, provider: OAuthProvider): Promise<void>;
  findUserByOAuthProvider(provider: OAuthProvider, providerUserId: string): Promise<User | undefined>;
  
  // Persistent Login (Remember Me)
  createPersistentLogin(login: InsertPersistentLogin): Promise<PersistentLogin>;
  getPersistentLogin(series: string): Promise<PersistentLogin | undefined>;
  updatePersistentLoginToken(series: string, newTokenHash: string, lastUsed: Date): Promise<void>;
  deletePersistentLogin(series: string): Promise<void>;
  deleteAllUserPersistentLogins(userId: string): Promise<void>;
  deleteExpiredPersistentLogins(): Promise<number>;
  getUserPersistentLogins(userId: string): Promise<PersistentLogin[]>;
  
  // OAuth States (CSRF protection - database persisted for multi-instance support)
  createOAuthState(state: InsertOAuthState): Promise<OAuthState>;
  getOAuthState(state: string): Promise<OAuthState | undefined>;
  deleteOAuthState(state: string): Promise<void>;
  deleteExpiredOAuthStates(): Promise<number>;
  
  // Audit Logs (Security event tracking - database persisted for compliance)
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { userId?: string; eventType?: string; limit?: number }): Promise<AuditLog[]>;
  getUserAuditLogs(userId: string, limit?: number): Promise<AuditLog[]>;

  // ============================================================================
  // MULTIPLAYER RACING ENHANCED FEATURES
  // ============================================================================

  // User Rating (ELO System)
  getUserRating(userId: string): Promise<UserRating | undefined>;
  createUserRating(userId: string): Promise<UserRating>;
  updateUserRating(userId: string, updates: Partial<UserRating>): Promise<UserRating>;
  getOrCreateUserRating(userId: string): Promise<UserRating>;
  getRatingLeaderboard(tier?: string, limit?: number): Promise<UserRating[]>;
  getUsersForMatchmaking(targetRating: number, tolerance: number, excludeUserIds: string[]): Promise<UserRating[]>;

  // Race Match History
  createRaceMatchHistory(history: InsertRaceMatchHistory): Promise<RaceMatchHistory>;
  getRaceMatchHistory(raceId: number): Promise<RaceMatchHistory[]>;
  getUserMatchHistory(userId: string, limit?: number): Promise<RaceMatchHistory[]>;

  // Race Keystrokes (Anti-cheat & Replays)
  saveRaceKeystrokes(keystrokes: InsertRaceKeystrokes): Promise<RaceKeystrokes>;
  getRaceKeystrokes(raceId: number): Promise<RaceKeystrokes[]>;
  getParticipantKeystrokes(participantId: number): Promise<RaceKeystrokes | undefined>;
  getFlaggedKeystrokes(limit?: number): Promise<RaceKeystrokes[]>;

  // Race Chat Messages
  createRaceChatMessage(message: InsertRaceChatMessage): Promise<RaceChatMessage>;
  getRaceChatMessages(raceId: number, limit?: number): Promise<RaceChatMessage[]>;

  // Race Spectators
  addRaceSpectator(spectator: InsertRaceSpectator): Promise<RaceSpectator>;
  removeRaceSpectator(raceId: number, sessionId: string): Promise<void>;
  getRaceSpectators(raceId: number): Promise<RaceSpectator[]>;
  getActiveSpectatorCount(raceId: number): Promise<number>;

  // Race Replays
  createRaceReplay(replay: InsertRaceReplay): Promise<RaceReplay>;
  getRaceReplay(raceId: number): Promise<RaceReplay | undefined>;
  getPublicReplays(limit?: number): Promise<RaceReplay[]>;
  incrementReplayViewCount(raceId: number): Promise<void>;

  // Anti-Cheat Challenges
  createAntiCheatChallenge(challenge: InsertAntiCheatChallenge): Promise<AntiCheatChallenge>;
  getUserCertification(userId: string): Promise<AntiCheatChallenge | undefined>;
  updateChallengePassed(challengeId: number, passed: boolean, wpm: number, certifiedWpm: number): Promise<void>;
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
    // Use transaction to create user and initialize account_lockouts row
    return await db.transaction(async (tx) => {
      const result = await tx.insert(users).values(insertUser).returning();
      const newUser = result[0];
      
      // Pre-create account_lockouts row to enable row-level locking for concurrent failed logins
      await tx.insert(accountLockouts).values({
        userId: newUser.id,
        failedAttempts: 0,
        lockedUntil: null,
        lastFailedAt: null,
      });
      
      return newUser;
    });
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

  async verifyUserEmail(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, userId));
  }

  // Login History & Security
  async createLoginHistory(history: InsertLoginHistory): Promise<LoginHistory> {
    const inserted = await db.insert(loginHistory).values(history).returning();
    return inserted[0];
  }

  async getUserLoginHistory(userId: string, limit: number = 20): Promise<LoginHistory[]> {
    return await db
      .select()
      .from(loginHistory)
      .where(eq(loginHistory.userId, userId))
      .orderBy(desc(loginHistory.createdAt))
      .limit(limit);
  }

  async getRecentFailedLogins(userId: string, minutes: number): Promise<LoginHistory[]> {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return await db
      .select()
      .from(loginHistory)
      .where(
        and(
          eq(loginHistory.userId, userId),
          eq(loginHistory.success, false),
          sql`${loginHistory.createdAt} > ${cutoffTime}`
        )
      )
      .orderBy(desc(loginHistory.createdAt));
  }

  async handleFailedLoginTransaction(
    userId: string,
    email: string,
    req: any,
    reason: string,
    windowMinutes: number,
    maxAttempts: number,
    lockoutMinutes: number
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // 1. Ensure account_lockouts row exists for this user (handles legacy users)
      //    Try to lock the row; if it doesn't exist, create it
      let lockoutRow = await tx
        .select()
        .from(accountLockouts)
        .where(eq(accountLockouts.userId, userId))
        .for('update')
        .limit(1);

      if (lockoutRow.length === 0) {
        // Row doesn't exist (legacy user) - create it with conflict handling
        // If a concurrent transaction already created it, DO NOTHING and proceed to lock
        await tx
          .insert(accountLockouts)
          .values({
            userId,
            failedAttempts: 0,
            lockedUntil: null,
            lastFailedAt: null,
          })
          .onConflictDoNothing({ target: accountLockouts.userId });
        
        // Now lock the row (exists either from our insert or a concurrent one)
        lockoutRow = await tx
          .select()
          .from(accountLockouts)
          .where(eq(accountLockouts.userId, userId))
          .for('update')
          .limit(1);
      }

      // 2. Record the failed login attempt
      await tx.insert(loginHistory).values({
        userId,
        email,
        success: false,
        ipAddress: (req.ip || req.headers['x-forwarded-for'] || 'unknown') as string,
        userAgent: req.headers['user-agent'] || 'unknown',
        deviceFingerprint: req.headers['x-device-fingerprint'] as string || null,
        failureReason: reason,
      });

      // 3. Count recent failed attempts (now includes the one we just inserted)
      const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000);
      const countResult = await tx
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(loginHistory)
        .where(
          and(
            eq(loginHistory.userId, userId),
            eq(loginHistory.success, false),
            sql`${loginHistory.createdAt} > ${cutoffTime}`
          )
        );

      const failedAttempts = countResult[0]?.count || 0;

      // 4. Update the locked row with accurate count and lockout status
      const lockedUntil = failedAttempts >= maxAttempts
        ? new Date(Date.now() + lockoutMinutes * 60 * 1000)
        : null;

      const now = new Date();
      
      await tx
        .update(accountLockouts)
        .set({
          failedAttempts,
          lockedUntil,
          lastFailedAt: now,
          updatedAt: now,
        })
        .where(eq(accountLockouts.userId, userId));
    });
  }

  // Account Lockout
  async getAccountLockout(userId: string): Promise<AccountLockout | undefined> {
    const result = await db
      .select()
      .from(accountLockouts)
      .where(eq(accountLockouts.userId, userId))
      .limit(1);
    return result[0];
  }

  async createOrUpdateAccountLockout(
    userId: string,
    failedAttempts: number,
    lockedUntil?: Date
  ): Promise<AccountLockout> {
    const existing = await this.getAccountLockout(userId);
    
    if (existing) {
      const updated = await db
        .update(accountLockouts)
        .set({
          failedAttempts,
          lockedUntil,
          lastFailedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(accountLockouts.userId, userId))
        .returning();
      return updated[0];
    } else {
      const inserted = await db
        .insert(accountLockouts)
        .values({
          userId,
          failedAttempts,
          lockedUntil,
          lastFailedAt: new Date(),
        })
        .returning();
      return inserted[0];
    }
  }

  async clearAccountLockout(userId: string): Promise<void> {
    await db
      .update(accountLockouts)
      .set({
        failedAttempts: 0,
        lockedUntil: null,
        lastFailedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(accountLockouts.userId, userId));
  }

  async isAccountLocked(userId: string): Promise<boolean> {
    const lockout = await this.getAccountLockout(userId);
    if (!lockout || !lockout.lockedUntil) {
      return false;
    }
    return lockout.lockedUntil > new Date();
  }

  // Email Verification
  async createEmailVerificationToken(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<EmailVerificationToken> {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
    const inserted = await db
      .insert(emailVerificationTokens)
      .values({ userId, token, expiresAt })
      .returning();
    return inserted[0];
  }

  async getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    const result = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token))
      .limit(1);
    return result[0];
  }

  async markEmailVerified(userId: string, token: string): Promise<void> {
    await db
      .update(emailVerificationTokens)
      .set({ verified: true, verifiedAt: new Date() })
      .where(
        and(
          eq(emailVerificationTokens.userId, userId),
          eq(emailVerificationTokens.token, token)
        )
      );
    await this.verifyUserEmail(userId);
  }

  async deleteEmailVerificationToken(userId: string): Promise<void> {
    await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.userId, userId));
  }

  // Password Reset
  async createPasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date,
    ipAddress?: string
  ): Promise<PasswordResetToken> {
    const inserted = await db
      .insert(passwordResetTokens)
      .values({ userId, token, expiresAt, ipAddress })
      .returning();
    return inserted[0];
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const result = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);
    return result[0];
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true, usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token));
  }

  async deletePasswordResetTokens(userId: string): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));
  }

  // User Sessions
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const inserted = await db.insert(userSessions).values(session).returning();
    return inserted[0];
  }

  async getUserSessions(userId: string): Promise<UserSession[]> {
    return await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.isActive, true)
        )
      )
      .orderBy(desc(userSessions.lastActivity));
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    await db
      .update(userSessions)
      .set({ lastActivity: new Date() })
      .where(eq(userSessions.sessionId, sessionId));
  }

  async revokeSession(sessionId: string): Promise<void> {
    await db
      .update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.sessionId, sessionId));
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    if (exceptSessionId) {
      await db
        .update(userSessions)
        .set({ isActive: false })
        .where(
          and(
            eq(userSessions.userId, userId),
            sql`${userSessions.sessionId} != ${exceptSessionId}`
          )
        );
    } else {
      await db
        .update(userSessions)
        .set({ isActive: false })
        .where(eq(userSessions.userId, userId));
    }
  }

  // Security Settings
  async getSecuritySettings(userId: string): Promise<SecuritySettings | undefined> {
    const result = await db
      .select()
      .from(securitySettings)
      .where(eq(securitySettings.userId, userId))
      .limit(1);
    return result[0];
  }

  async createSecuritySettings(userId: string): Promise<SecuritySettings> {
    const inserted = await db
      .insert(securitySettings)
      .values({ userId })
      .returning();
    return inserted[0];
  }

  async updateSecuritySettings(
    userId: string,
    settings: Partial<SecuritySettings>
  ): Promise<SecuritySettings> {
    const updated = await db
      .update(securitySettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(securitySettings.userId, userId))
      .returning();
    return updated[0];
  }

  async enable2FA(userId: string, secret: string, backupCodes: string[]): Promise<void> {
    await db
      .update(securitySettings)
      .set({
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        backupCodes,
        updatedAt: new Date(),
      })
      .where(eq(securitySettings.userId, userId));
  }

  async disable2FA(userId: string): Promise<void> {
    await db
      .update(securitySettings)
      .set({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: null,
        updatedAt: new Date(),
      })
      .where(eq(securitySettings.userId, userId));
  }

  async verify2FABackupCode(userId: string, code: string): Promise<boolean> {
    const settings = await this.getSecuritySettings(userId);
    if (!settings || !settings.backupCodes) {
      return false;
    }
    return settings.backupCodes.includes(code);
  }

  async use2FABackupCode(userId: string, code: string): Promise<void> {
    const settings = await this.getSecuritySettings(userId);
    if (!settings || !settings.backupCodes) {
      return;
    }
    const updatedCodes = settings.backupCodes.filter((c) => c !== code);
    await db
      .update(securitySettings)
      .set({
        backupCodes: updatedCodes,
        updatedAt: new Date(),
      })
      .where(eq(securitySettings.userId, userId));
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

  async getLeaderboardPaginated(limit: number, offset: number, timeframe?: string): Promise<Array<{
    userId: string;
    username: string;
    wpm: number;
    accuracy: number;
    createdAt: Date;
    mode: number;
    avatarColor: string | null;
    totalTests: number;
    rank: number;
    isVerified: boolean;
  }>> {
    const dateFilter = this.getTimeframeDateFilter(timeframe);
    
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
          ) as user_rank
        FROM test_results tr
        WHERE tr.created_at >= ${dateFilter}
      ),
      test_counts AS (
        SELECT 
          user_id,
          COUNT(*)::int as total_tests
        FROM test_results
        WHERE created_at >= ${dateFilter}
        GROUP BY user_id
      ),
      final_ranking AS (
        SELECT 
          rr.user_id,
          rr.wpm,
          rr.accuracy,
          rr.created_at,
          rr.mode,
          tc.total_tests,
          DENSE_RANK() OVER (ORDER BY rr.wpm DESC, rr.created_at ASC) as rank
        FROM ranked_results rr
        LEFT JOIN test_counts tc ON rr.user_id = tc.user_id
        WHERE rr.user_rank = 1
      )
      SELECT 
        fr.user_id as "userId",
        u.username,
        fr.wpm,
        fr.accuracy,
        fr.created_at as "createdAt",
        fr.mode,
        u.avatar_color as "avatarColor",
        COALESCE(fr.total_tests, 1) as "totalTests",
        fr.rank,
        COALESCE(acc.certified_wpm IS NOT NULL, false) as "isVerified"
      FROM final_ranking fr
      INNER JOIN users u ON fr.user_id = u.id
      LEFT JOIN anti_cheat_challenges acc ON fr.user_id = acc.user_id AND acc.passed = true
      ORDER BY fr.rank ASC, fr.wpm DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    return leaderboard.rows as any[];
  }

  async getLeaderboardCount(timeframe?: string): Promise<number> {
    const dateFilter = this.getTimeframeDateFilter(timeframe);
    
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id)::int as count
      FROM test_results
      WHERE created_at >= ${dateFilter}
    `);
    
    return (result.rows[0] as any)?.count || 0;
  }

  async getLeaderboardAroundUser(userId: string, range: number = 5, timeframe?: string): Promise<{ userRank: number; entries: any[] }> {
    const dateFilter = this.getTimeframeDateFilter(timeframe);
    
    const rankResult = await db.execute(sql`
      WITH ranked_results AS (
        SELECT 
          tr.user_id,
          tr.wpm,
          ROW_NUMBER() OVER (
            PARTITION BY tr.user_id 
            ORDER BY tr.wpm DESC
          ) as user_rank
        FROM test_results tr
        WHERE tr.created_at >= ${dateFilter}
      ),
      user_best AS (
        SELECT user_id, wpm FROM ranked_results WHERE user_rank = 1
      ),
      final_ranking AS (
        SELECT 
          user_id,
          wpm,
          DENSE_RANK() OVER (ORDER BY wpm DESC) as rank
        FROM user_best
      )
      SELECT rank FROM final_ranking WHERE user_id = ${userId}
    `);

    const userRank = (rankResult.rows[0] as any)?.rank || -1;
    
    if (userRank === -1) {
      return { userRank: -1, entries: [] };
    }

    const startRank = Math.max(1, userRank - range);
    const endRank = userRank + range;

    const entries = await db.execute(sql`
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
          ) as user_rank
        FROM test_results tr
        WHERE tr.created_at >= ${dateFilter}
      ),
      test_counts AS (
        SELECT user_id, COUNT(*)::int as total_tests 
        FROM test_results 
        WHERE created_at >= ${dateFilter}
        GROUP BY user_id
      ),
      final_ranking AS (
        SELECT 
          rr.user_id,
          rr.wpm,
          rr.accuracy,
          rr.created_at,
          rr.mode,
          tc.total_tests,
          DENSE_RANK() OVER (ORDER BY rr.wpm DESC) as rank
        FROM ranked_results rr
        LEFT JOIN test_counts tc ON rr.user_id = tc.user_id
        WHERE rr.user_rank = 1
      )
      SELECT 
        fr.user_id as "userId",
        u.username,
        fr.wpm,
        fr.accuracy,
        fr.created_at as "createdAt",
        fr.mode,
        u.avatar_color as "avatarColor",
        COALESCE(fr.total_tests, 1) as "totalTests",
        fr.rank
      FROM final_ranking fr
      INNER JOIN users u ON fr.user_id = u.id
      WHERE fr.rank >= ${startRank} AND fr.rank <= ${endRank}
      ORDER BY fr.rank ASC
    `);

    return { userRank, entries: entries.rows as any[] };
  }

  async getStressTestLeaderboardPaginated(difficulty: string | undefined, limit: number, offset: number): Promise<Array<{
    userId: string;
    username: string;
    difficulty: string;
    stressScore: number;
    wpm: number;
    accuracy: number;
    completionRate: number;
    avatarColor: string | null;
    createdAt: Date;
    rank: number;
    isVerified: boolean;
  }>> {
    const difficultyFilter = difficulty ? sql`AND st.difficulty = ${difficulty}` : sql``;
    
    const leaderboard = await db.execute(sql`
      WITH ranked_scores AS (
        SELECT 
          st.user_id,
          st.difficulty,
          st.stress_score,
          st.wpm,
          st.accuracy,
          st.completion_rate,
          st.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY st.user_id, st.difficulty
            ORDER BY st.stress_score DESC, st.wpm DESC, st.created_at DESC
          ) as user_rank
        FROM stress_tests st
        WHERE 1=1 ${difficultyFilter}
      ),
      best_scores AS (
        SELECT * FROM ranked_scores WHERE user_rank = 1
      ),
      final_ranking AS (
        SELECT 
          bs.*,
          DENSE_RANK() OVER (
            ORDER BY bs.stress_score DESC, bs.wpm DESC, bs.created_at ASC
          ) as rank
        FROM best_scores bs
      )
      SELECT 
        fr.user_id as "userId",
        u.username,
        fr.difficulty,
        fr.stress_score as "stressScore",
        fr.wpm,
        fr.accuracy,
        fr.completion_rate as "completionRate",
        u.avatar_color as "avatarColor",
        fr.created_at as "createdAt",
        fr.rank,
        COALESCE(acc.certified_wpm IS NOT NULL, false) as "isVerified"
      FROM final_ranking fr
      INNER JOIN users u ON fr.user_id = u.id
      LEFT JOIN anti_cheat_challenges acc ON fr.user_id = acc.user_id AND acc.passed = true
      ORDER BY fr.rank ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    return leaderboard.rows as any[];
  }

  async getStressTestLeaderboardCount(difficulty?: string): Promise<number> {
    const difficultyFilter = difficulty ? sql`AND difficulty = ${difficulty}` : sql``;
    
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id)::int as count
      FROM stress_tests
      WHERE 1=1 ${difficultyFilter}
    `);
    
    return (result.rows[0] as any)?.count || 0;
  }

  async getStressLeaderboardAroundUser(userId: string, difficulty: string | undefined, range: number = 5): Promise<{ userRank: number; entries: any[] }> {
    const difficultyFilter = difficulty ? sql`AND st.difficulty = ${difficulty}` : sql``;
    
    const rankResult = await db.execute(sql`
      WITH ranked_scores AS (
        SELECT 
          st.user_id,
          st.stress_score,
          ROW_NUMBER() OVER (
            PARTITION BY st.user_id
            ORDER BY st.stress_score DESC
          ) as user_rank
        FROM stress_tests st
        WHERE 1=1 ${difficultyFilter}
      ),
      user_best AS (
        SELECT user_id, stress_score FROM ranked_scores WHERE user_rank = 1
      ),
      final_ranking AS (
        SELECT 
          user_id,
          stress_score,
          DENSE_RANK() OVER (ORDER BY stress_score DESC) as rank
        FROM user_best
      )
      SELECT rank FROM final_ranking WHERE user_id = ${userId}
    `);

    const userRank = (rankResult.rows[0] as any)?.rank || -1;
    
    if (userRank === -1) {
      return { userRank: -1, entries: [] };
    }

    const startRank = Math.max(1, userRank - range);
    const endRank = userRank + range;

    const entries = await db.execute(sql`
      WITH ranked_scores AS (
        SELECT 
          st.user_id,
          st.difficulty,
          st.stress_score,
          st.wpm,
          st.accuracy,
          st.completion_rate,
          st.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY st.user_id
            ORDER BY st.stress_score DESC
          ) as user_rank
        FROM stress_tests st
        WHERE 1=1 ${difficultyFilter}
      ),
      best_scores AS (
        SELECT * FROM ranked_scores WHERE user_rank = 1
      ),
      final_ranking AS (
        SELECT 
          bs.*,
          DENSE_RANK() OVER (ORDER BY bs.stress_score DESC) as rank
        FROM best_scores bs
      )
      SELECT 
        fr.user_id as "userId",
        u.username,
        fr.difficulty,
        fr.stress_score as "stressScore",
        fr.wpm,
        fr.accuracy,
        fr.completion_rate as "completionRate",
        u.avatar_color as "avatarColor",
        fr.created_at as "createdAt",
        fr.rank
      FROM final_ranking fr
      INNER JOIN users u ON fr.user_id = u.id
      WHERE fr.rank >= ${startRank} AND fr.rank <= ${endRank}
      ORDER BY fr.rank ASC
    `);

    return { userRank, entries: entries.rows as any[] };
  }

  async getCodeLeaderboardPaginated(language: string | undefined, limit: number, offset: number): Promise<Array<{
    userId: string;
    username: string;
    wpm: number;
    accuracy: number;
    programmingLanguage: string;
    framework: string | null;
    createdAt: Date;
    avatarColor: string | null;
    totalTests: number;
    rank: number;
    isVerified: boolean;
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
          ) as user_rank
        FROM code_typing_tests ct
        WHERE 1=1 ${languageFilter}
      ),
      test_counts AS (
        SELECT 
          user_id,
          COUNT(*)::int as total_tests
        FROM code_typing_tests
        WHERE 1=1 ${languageFilter}
        GROUP BY user_id
      ),
      final_ranking AS (
        SELECT 
          rr.user_id,
          rr.wpm,
          rr.accuracy,
          rr.programming_language,
          rr.framework,
          rr.created_at,
          tc.total_tests,
          DENSE_RANK() OVER (ORDER BY rr.wpm DESC, rr.created_at ASC) as rank
        FROM ranked_results rr
        LEFT JOIN test_counts tc ON rr.user_id = tc.user_id
        WHERE rr.user_rank = 1
      )
      SELECT 
        fr.user_id as "userId",
        u.username,
        fr.wpm,
        fr.accuracy,
        fr.programming_language as "programmingLanguage",
        fr.framework,
        fr.created_at as "createdAt",
        u.avatar_color as "avatarColor",
        COALESCE(fr.total_tests, 1) as "totalTests",
        fr.rank,
        COALESCE(acc.certified_wpm IS NOT NULL, false) as "isVerified"
      FROM final_ranking fr
      INNER JOIN users u ON fr.user_id = u.id
      LEFT JOIN anti_cheat_challenges acc ON fr.user_id = acc.user_id AND acc.passed = true
      ORDER BY fr.rank ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    return leaderboard.rows as any[];
  }

  async getCodeLeaderboardCount(language?: string): Promise<number> {
    const languageFilter = language ? sql`AND programming_language = ${language}` : sql``;
    
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id)::int as count
      FROM code_typing_tests
      WHERE 1=1 ${languageFilter}
    `);
    
    return (result.rows[0] as any)?.count || 0;
  }

  async getCodeLeaderboardAroundUser(userId: string, language: string | undefined, range: number = 5): Promise<{ userRank: number; entries: any[] }> {
    const languageFilter = language ? sql`AND ct.programming_language = ${language}` : sql``;
    
    const rankResult = await db.execute(sql`
      WITH ranked_results AS (
        SELECT 
          ct.user_id,
          ct.wpm,
          ROW_NUMBER() OVER (
            PARTITION BY ct.user_id
            ORDER BY ct.wpm DESC
          ) as user_rank
        FROM code_typing_tests ct
        WHERE 1=1 ${languageFilter}
      ),
      user_best AS (
        SELECT user_id, wpm FROM ranked_results WHERE user_rank = 1
      ),
      final_ranking AS (
        SELECT 
          user_id,
          wpm,
          DENSE_RANK() OVER (ORDER BY wpm DESC) as rank
        FROM user_best
      )
      SELECT rank FROM final_ranking WHERE user_id = ${userId}
    `);

    const userRank = (rankResult.rows[0] as any)?.rank || -1;
    
    if (userRank === -1) {
      return { userRank: -1, entries: [] };
    }

    const startRank = Math.max(1, userRank - range);
    const endRank = userRank + range;

    const entries = await db.execute(sql`
      WITH ranked_results AS (
        SELECT 
          ct.user_id,
          ct.wpm,
          ct.accuracy,
          ct.programming_language,
          ct.framework,
          ct.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY ct.user_id
            ORDER BY ct.wpm DESC
          ) as user_rank
        FROM code_typing_tests ct
        WHERE 1=1 ${languageFilter}
      ),
      test_counts AS (
        SELECT user_id, COUNT(*)::int as total_tests FROM code_typing_tests GROUP BY user_id
      ),
      final_ranking AS (
        SELECT 
          rr.user_id,
          rr.wpm,
          rr.accuracy,
          rr.programming_language,
          rr.framework,
          rr.created_at,
          tc.total_tests,
          DENSE_RANK() OVER (ORDER BY rr.wpm DESC) as rank
        FROM ranked_results rr
        LEFT JOIN test_counts tc ON rr.user_id = tc.user_id
        WHERE rr.user_rank = 1
      )
      SELECT 
        fr.user_id as "userId",
        u.username,
        fr.wpm,
        fr.accuracy,
        fr.programming_language as "programmingLanguage",
        fr.framework,
        fr.created_at as "createdAt",
        u.avatar_color as "avatarColor",
        COALESCE(fr.total_tests, 1) as "totalTests",
        fr.rank
      FROM final_ranking fr
      INNER JOIN users u ON fr.user_id = u.id
      WHERE fr.rank >= ${startRank} AND fr.rank <= ${endRank}
      ORDER BY fr.rank ASC
    `);

    return { userRank, entries: entries.rows as any[] };
  }

  async getRatingLeaderboardPaginated(tier: string | undefined, limit: number, offset: number): Promise<any[]> {
    let query = db.select().from(userRatings);
    
    if (tier) {
      query = query.where(eq(userRatings.tier, tier)) as typeof query;
    }
    
    const ratings = await query
      .orderBy(desc(userRatings.rating))
      .limit(limit)
      .offset(offset);
    
    const enrichedRatings = await Promise.all(
      ratings.map(async (rating, index) => {
        const user = await this.getUser(rating.userId);
        return {
          ...rating,
          username: user?.username || "Unknown",
          avatarColor: user?.avatarColor,
          rank: offset + index + 1,
        };
      })
    );

    return enrichedRatings;
  }

  async getRatingLeaderboardCount(tier?: string): Promise<number> {
    let query = db.select({ count: sql<number>`count(*)::int` }).from(userRatings);
    
    if (tier) {
      query = query.where(eq(userRatings.tier, tier)) as typeof query;
    }
    
    const result = await query;
    return result[0]?.count || 0;
  }

  async getRatingLeaderboardAroundUser(userId: string, tier: string | undefined, range: number = 5): Promise<{ userRank: number; entries: any[] }> {
    const tierFilter = tier ? sql`WHERE tier = ${tier}` : sql``;
    
    const rankResult = await db.execute(sql`
      WITH ranked_ratings AS (
        SELECT 
          user_id,
          rating,
          DENSE_RANK() OVER (ORDER BY rating DESC) as rank
        FROM user_ratings
        ${tierFilter}
      )
      SELECT rank FROM ranked_ratings WHERE user_id = ${userId}
    `);

    const userRank = (rankResult.rows[0] as any)?.rank || -1;
    
    if (userRank === -1) {
      return { userRank: -1, entries: [] };
    }

    const startRank = Math.max(1, userRank - range);
    const endRank = userRank + range;

    const entries = await db.execute(sql`
      WITH ranked_ratings AS (
        SELECT 
          ur.user_id,
          ur.rating,
          ur.tier,
          ur.total_races,
          ur.wins,
          ur.losses,
          DENSE_RANK() OVER (ORDER BY ur.rating DESC) as rank
        FROM user_ratings ur
        ${tierFilter}
      )
      SELECT 
        rr.user_id as "userId",
        u.username,
        rr.rating,
        rr.tier,
        rr.total_races as "totalRaces",
        rr.wins,
        rr.losses,
        u.avatar_color as "avatarColor",
        rr.rank
      FROM ranked_ratings rr
      INNER JOIN users u ON rr.user_id = u.id
      WHERE rr.rank >= ${startRank} AND rr.rank <= ${endRank}
      ORDER BY rr.rank ASC
    `);

    return { userRank, entries: entries.rows as any[] };
  }

  async getDictationLeaderboardPaginated(limit: number, offset: number): Promise<Array<{
    userId: string;
    username: string;
    wpm: number;
    accuracy: number;
    speedLevel: string;
    createdAt: Date;
    avatarColor: string | null;
    totalTests: number;
    rank: number;
  }>> {
    const leaderboard = await db.execute(sql`
      WITH ranked_results AS (
        SELECT 
          dt.user_id,
          dt.wpm,
          dt.accuracy,
          dt.speed_level,
          dt.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY dt.user_id 
            ORDER BY dt.wpm DESC, dt.created_at DESC
          ) as user_rank
        FROM dictation_tests dt
      ),
      test_counts AS (
        SELECT user_id, COUNT(*)::int as total_tests FROM dictation_tests GROUP BY user_id
      ),
      final_ranking AS (
        SELECT 
          rr.user_id,
          rr.wpm,
          rr.accuracy,
          rr.speed_level,
          rr.created_at,
          tc.total_tests,
          DENSE_RANK() OVER (ORDER BY rr.wpm DESC, rr.created_at ASC) as rank
        FROM ranked_results rr
        LEFT JOIN test_counts tc ON rr.user_id = tc.user_id
        WHERE rr.user_rank = 1
      )
      SELECT 
        fr.user_id as "userId",
        u.username,
        fr.wpm,
        fr.accuracy,
        fr.speed_level as "speedLevel",
        fr.created_at as "createdAt",
        u.avatar_color as "avatarColor",
        COALESCE(fr.total_tests, 1) as "totalTests",
        fr.rank
      FROM final_ranking fr
      INNER JOIN users u ON fr.user_id = u.id
      ORDER BY fr.rank ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    return leaderboard.rows as any[];
  }

  async getDictationLeaderboardCount(): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id)::int as count FROM dictation_tests
    `);
    
    return (result.rows[0] as any)?.count || 0;
  }

  async getDictationLeaderboardAroundUser(userId: string, range: number = 5): Promise<{ userRank: number; entries: any[] }> {
    const rankResult = await db.execute(sql`
      WITH ranked_results AS (
        SELECT 
          dt.user_id,
          dt.wpm,
          ROW_NUMBER() OVER (
            PARTITION BY dt.user_id
            ORDER BY dt.wpm DESC
          ) as user_rank
        FROM dictation_tests dt
      ),
      user_best AS (
        SELECT user_id, wpm FROM ranked_results WHERE user_rank = 1
      ),
      final_ranking AS (
        SELECT 
          user_id,
          wpm,
          DENSE_RANK() OVER (ORDER BY wpm DESC) as rank
        FROM user_best
      )
      SELECT rank FROM final_ranking WHERE user_id = ${userId}
    `);

    const userRank = (rankResult.rows[0] as any)?.rank || -1;
    
    if (userRank === -1) {
      return { userRank: -1, entries: [] };
    }

    const startRank = Math.max(1, userRank - range);
    const endRank = userRank + range;

    const entries = await db.execute(sql`
      WITH ranked_results AS (
        SELECT 
          dt.user_id,
          dt.wpm,
          dt.accuracy,
          dt.speed_level,
          dt.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY dt.user_id
            ORDER BY dt.wpm DESC
          ) as user_rank
        FROM dictation_tests dt
      ),
      test_counts AS (
        SELECT user_id, COUNT(*)::int as total_tests FROM dictation_tests GROUP BY user_id
      ),
      final_ranking AS (
        SELECT 
          rr.user_id,
          rr.wpm,
          rr.accuracy,
          rr.speed_level,
          rr.created_at,
          tc.total_tests,
          DENSE_RANK() OVER (ORDER BY rr.wpm DESC) as rank
        FROM ranked_results rr
        LEFT JOIN test_counts tc ON rr.user_id = tc.user_id
        WHERE rr.user_rank = 1
      )
      SELECT 
        fr.user_id as "userId",
        u.username,
        fr.wpm,
        fr.accuracy,
        fr.speed_level as "speedLevel",
        fr.created_at as "createdAt",
        u.avatar_color as "avatarColor",
        COALESCE(fr.total_tests, 1) as "totalTests",
        fr.rank
      FROM final_ranking fr
      INNER JOIN users u ON fr.user_id = u.id
      WHERE fr.rank >= ${startRank} AND fr.rank <= ${endRank}
      ORDER BY fr.rank ASC
    `);

    return { userRank, entries: entries.rows as any[] };
  }

  async getTimeBasedLeaderboard(timeframe: "daily" | "weekly" | "monthly", limit: number, offset: number): Promise<Array<{
    userId: string;
    username: string;
    wpm: number;
    accuracy: number;
    createdAt: Date;
    avatarColor: string | null;
    testsInPeriod: number;
    rank: number;
  }>> {
    const dateFilter = this.getTimeframeDateFilter(timeframe);
    
    const leaderboard = await db.execute(sql`
      WITH period_results AS (
        SELECT 
          tr.user_id,
          tr.wpm,
          tr.accuracy,
          tr.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY tr.user_id 
            ORDER BY tr.wpm DESC, tr.created_at DESC
          ) as user_rank
        FROM test_results tr
        WHERE tr.created_at >= ${dateFilter}
      ),
      test_counts AS (
        SELECT 
          user_id,
          COUNT(*)::int as tests_in_period
        FROM test_results
        WHERE created_at >= ${dateFilter}
        GROUP BY user_id
      ),
      final_ranking AS (
        SELECT 
          pr.user_id,
          pr.wpm,
          pr.accuracy,
          pr.created_at,
          tc.tests_in_period,
          DENSE_RANK() OVER (ORDER BY pr.wpm DESC, pr.created_at ASC) as rank
        FROM period_results pr
        LEFT JOIN test_counts tc ON pr.user_id = tc.user_id
        WHERE pr.user_rank = 1
      )
      SELECT 
        fr.user_id as "userId",
        u.username,
        fr.wpm,
        fr.accuracy,
        fr.created_at as "createdAt",
        u.avatar_color as "avatarColor",
        COALESCE(fr.tests_in_period, 1) as "testsInPeriod",
        fr.rank
      FROM final_ranking fr
      INNER JOIN users u ON fr.user_id = u.id
      ORDER BY fr.rank ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    return leaderboard.rows as any[];
  }

  async getTimeBasedLeaderboardCount(timeframe: "daily" | "weekly" | "monthly"): Promise<number> {
    const dateFilter = this.getTimeframeDateFilter(timeframe);
    
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id)::int as count
      FROM test_results
      WHERE created_at >= ${dateFilter}
    `);
    
    return (result.rows[0] as any)?.count || 0;
  }

  private getTimeframeDateFilter(timeframe?: string): Date {
    const now = new Date();
    
    switch (timeframe) {
      case "daily":
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        return today;
      case "weekly":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
      case "monthly":
        return new Date(now.getFullYear(), now.getMonth(), 1);
      default:
        return new Date(0);
    }
  }

  async getPlatformStats(): Promise<{
    totalUsers: number;
    totalTests: number;
    totalLanguages: number;
  }> {
    const usersResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);
    
    const testsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(testResults);
    
    const languagesResult = await db
      .select({ count: sql<number>`count(distinct language)::int` })
      .from(typingParagraphs);

    return {
      totalUsers: usersResult[0]?.count || 0,
      totalTests: testsResult[0]?.count || 0,
      totalLanguages: languagesResult[0]?.count || 23, // Default to 23 if no paragraphs
    };
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

  async getRandomParagraphs(language: string, count: number, mode?: string, difficulty?: string): Promise<TypingParagraph[]> {
    // Build conditions for the query
    const conditions = [eq(typingParagraphs.language, language)];
    
    if (mode) {
      conditions.push(eq(typingParagraphs.mode, mode));
    }
    
    if (difficulty) {
      conditions.push(eq(typingParagraphs.difficulty, difficulty));
    }
    
    // Get all matching paragraphs in a single query
    const allParagraphs = await db
      .select()
      .from(typingParagraphs)
      .where(and(...conditions));
    
    // If we have enough paragraphs, shuffle and take the requested count
    if (allParagraphs.length > 0) {
      // Fisher-Yates shuffle for random selection
      const shuffled = [...allParagraphs];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled.slice(0, count);
    }
    
    // Fallback to any paragraph in the requested language
    const languageParagraphs = await db
      .select()
      .from(typingParagraphs)
      .where(eq(typingParagraphs.language, language));
    
    if (languageParagraphs.length > 0) {
      const shuffled = [...languageParagraphs];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled.slice(0, count);
    }
    
    // Final fallback to English paragraphs
    const englishParagraphs = await db
      .select()
      .from(typingParagraphs)
      .where(eq(typingParagraphs.language, 'en'));
    
    if (englishParagraphs.length > 0) {
      const shuffled = [...englishParagraphs];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled.slice(0, count);
    }
    
    return [];
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
    // Filter out custom modes (generated with timestamps) to keep the dropdown clean
    return result
      .map(r => r.mode)
      .filter(mode => !mode.startsWith('custom_'));
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
    // Validate and clamp days to safe range to prevent SQL injection
    const safeDays = Math.max(1, Math.min(365, Math.floor(days)));
    
    // Calculate the cutoff date server-side (safer than using INTERVAL with sql.raw)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - safeDays);
    
    // Get WPM over time (grouped by date)
    const wpmDataQuery = await db.execute(sql`
      SELECT 
        TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as date,
        AVG(wpm)::int as wpm,
        AVG(accuracy)::numeric(5,2) as accuracy,
        COUNT(*)::int as test_count
      FROM test_results
      WHERE user_id = ${userId}
        AND created_at >= ${cutoffDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    
    const wpmOverTime = wpmDataQuery.rows.map((row: any) => ({
      date: row.date,
      wpm: Number(row.wpm) || 0,
      accuracy: Number(row.accuracy) || 0,
      testCount: Number(row.test_count) || 0,
    }));

    // Get mistakes heatmap (errors per key) - join keystroke_events with test_results to filter by user
    const heatmapQuery = await db.execute(sql`
      SELECT 
        ke.expected_key as key,
        COUNT(CASE WHEN ke.is_correct = false THEN 1 END)::int as error_count,
        COUNT(*)::int as total_count,
        (COUNT(CASE WHEN ke.is_correct = false THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100)::numeric(5,2) as error_rate
      FROM keystroke_events ke
      JOIN test_results tr ON ke.test_result_id = tr.id
      WHERE tr.user_id = ${userId}
        AND ke.created_at >= ${cutoffDate}
        AND ke.expected_key IS NOT NULL
      GROUP BY ke.expected_key
      HAVING COUNT(CASE WHEN ke.is_correct = false THEN 1 END) > 0
      ORDER BY error_count DESC
      LIMIT 50
    `);

    const mistakesHeatmap = heatmapQuery.rows.map((row: any) => ({
      key: row.key || '',
      errorCount: Number(row.error_count) || 0,
      totalCount: Number(row.total_count) || 0,
      errorRate: Number(row.error_rate) || 0,
    }));

    // Get consistency metrics
    const consistencyQuery = await db.execute(sql`
      SELECT 
        COALESCE(AVG(wpm), 0)::numeric(10,2) as avg_wpm,
        COALESCE(STDDEV(wpm), 0)::numeric(10,2) as std_deviation,
        COALESCE(MIN(wpm), 0)::int as min_wpm,
        COALESCE(MAX(wpm), 0)::int as max_wpm
      FROM test_results
      WHERE user_id = ${userId}
        AND created_at >= ${cutoffDate}
    `);

    const consistencyData = consistencyQuery.rows[0] as any;
    const consistency = {
      avgWpm: Number(consistencyData?.avg_wpm) || 0,
      stdDeviation: Number(consistencyData?.std_deviation) || 0,
      minWpm: Number(consistencyData?.min_wpm) || 0,
      maxWpm: Number(consistencyData?.max_wpm) || 0,
    };

    // Get common mistakes (expected key vs typed key) - join keystroke_events with test_results
    const mistakesQuery = await db.execute(sql`
      SELECT 
        ke.expected_key,
        ke.key as typed_key,
        COUNT(*)::int as count
      FROM keystroke_events ke
      JOIN test_results tr ON ke.test_result_id = tr.id
      WHERE tr.user_id = ${userId}
        AND ke.is_correct = false
        AND ke.created_at >= ${cutoffDate}
        AND ke.expected_key IS NOT NULL
      GROUP BY ke.expected_key, ke.key
      ORDER BY count DESC
      LIMIT 20
    `);

    const commonMistakes = mistakesQuery.rows.map((row: any) => ({
      expectedKey: row.expected_key || '',
      typedKey: row.typed_key || '',
      count: Number(row.count) || 0,
    }));

    return {
      wpmOverTime,
      mistakesHeatmap,
      consistency,
      commonMistakes,
    };
  }

  async getHistoricalTrends(userId: string): Promise<{
    weeklyAggregates: Array<{
      weekStart: string;
      weekEnd: string;
      avgWpm: number;
      avgAccuracy: number;
      testCount: number;
      bestWpm: number;
    }>;
    monthlyAggregates: Array<{
      month: string;
      avgWpm: number;
      avgAccuracy: number;
      testCount: number;
      bestWpm: number;
    }>;
    improvement: {
      weekOverWeek: { wpm: number; accuracy: number };
      monthOverMonth: { wpm: number; accuracy: number };
      allTime: { firstWpm: number; currentWpm: number; improvementPercent: number };
    };
    milestones: Array<{
      type: string;
      value: number;
      achievedAt: string;
    }>;
  }> {
    const weeklyQuery = await db.execute(sql`
      SELECT 
        DATE_TRUNC('week', created_at)::date as week_start,
        (DATE_TRUNC('week', created_at) + INTERVAL '6 days')::date as week_end,
        ROUND(AVG(wpm))::int as avg_wpm,
        ROUND(AVG(accuracy)::numeric, 1) as avg_accuracy,
        COUNT(*)::int as test_count,
        MAX(wpm)::int as best_wpm
      FROM test_results
      WHERE user_id = ${userId}
        AND created_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week_start ASC
    `);

    const weeklyAggregates = weeklyQuery.rows.map((row: any) => ({
      weekStart: row.week_start?.toISOString?.()?.split('T')[0] || String(row.week_start),
      weekEnd: row.week_end?.toISOString?.()?.split('T')[0] || String(row.week_end),
      avgWpm: Number(row.avg_wpm) || 0,
      avgAccuracy: Number(row.avg_accuracy) || 0,
      testCount: Number(row.test_count) || 0,
      bestWpm: Number(row.best_wpm) || 0,
    }));

    const monthlyQuery = await db.execute(sql`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
        ROUND(AVG(wpm))::int as avg_wpm,
        ROUND(AVG(accuracy)::numeric, 1) as avg_accuracy,
        COUNT(*)::int as test_count,
        MAX(wpm)::int as best_wpm
      FROM test_results
      WHERE user_id = ${userId}
        AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `);

    const monthlyAggregates = monthlyQuery.rows.map((row: any) => ({
      month: row.month || '',
      avgWpm: Number(row.avg_wpm) || 0,
      avgAccuracy: Number(row.avg_accuracy) || 0,
      testCount: Number(row.test_count) || 0,
      bestWpm: Number(row.best_wpm) || 0,
    }));

    let weekOverWeek = { wpm: 0, accuracy: 0 };
    if (weeklyAggregates.length >= 2) {
      const current = weeklyAggregates[weeklyAggregates.length - 1];
      const previous = weeklyAggregates[weeklyAggregates.length - 2];
      weekOverWeek = {
        wpm: current.avgWpm - previous.avgWpm,
        accuracy: current.avgAccuracy - previous.avgAccuracy,
      };
    }

    let monthOverMonth = { wpm: 0, accuracy: 0 };
    if (monthlyAggregates.length >= 2) {
      const current = monthlyAggregates[monthlyAggregates.length - 1];
      const previous = monthlyAggregates[monthlyAggregates.length - 2];
      monthOverMonth = {
        wpm: current.avgWpm - previous.avgWpm,
        accuracy: current.avgAccuracy - previous.avgAccuracy,
      };
    }

    const allTimeQuery = await db.execute(sql`
      WITH first_last AS (
        SELECT 
          (SELECT wpm FROM test_results WHERE user_id = ${userId} ORDER BY created_at ASC LIMIT 1) as first_wpm,
          (SELECT AVG(wpm)::int FROM test_results WHERE user_id = ${userId} AND created_at >= NOW() - INTERVAL '7 days') as current_wpm
      )
      SELECT first_wpm, current_wpm FROM first_last
    `);

    const allTimeRow = allTimeQuery.rows[0] as any;
    const firstWpm = Number(allTimeRow?.first_wpm) || 0;
    const currentWpm = Number(allTimeRow?.current_wpm) || 0;
    const improvementPercent = firstWpm > 0 ? Math.round(((currentWpm - firstWpm) / firstWpm) * 100) : 0;

    const milestonesQuery = await db.execute(sql`
      SELECT 
        'wpm_record' as type,
        wpm as value,
        TO_CHAR(created_at, 'YYYY-MM-DD') as achieved_at
      FROM test_results
      WHERE user_id = ${userId}
        AND wpm = (SELECT MAX(wpm) FROM test_results WHERE user_id = ${userId})
      ORDER BY created_at ASC
      LIMIT 1
    `);

    const milestones = milestonesQuery.rows.map((row: any) => ({
      type: row.type || 'wpm_record',
      value: Number(row.value) || 0,
      achievedAt: row.achieved_at || '',
    }));

    return {
      weeklyAggregates,
      monthlyAggregates,
      improvement: {
        weekOverWeek,
        monthOverMonth,
        allTime: { firstWpm, currentWpm, improvementPercent },
      },
      milestones,
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

  async updateRaceTimeLimitSeconds(id: number, timeLimitSeconds: number): Promise<void> {
    await db.update(races).set({ timeLimitSeconds }).where(eq(races.id, id));
  }

  async extendRaceParagraph(id: number, additionalContent: string): Promise<Race | undefined> {
    const race = await this.getRace(id);
    if (!race) return undefined;
    
    const newContent = race.paragraphContent + " " + additionalContent;
    await db.update(races).set({ paragraphContent: newContent }).where(eq(races.id, id));
    
    return { ...race, paragraphContent: newContent };
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

  async updateParticipantFinishPosition(id: number, position: number): Promise<void> {
    await db
      .update(raceParticipants)
      .set({ finishPosition: position })
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

  async getStaleRaces(waitingTimeout: number, countdownTimeout: number, racingTimeout: number): Promise<Race[]> {
    const now = new Date();
    const waitingCutoff = new Date(now.getTime() - waitingTimeout);
    const countdownCutoff = new Date(now.getTime() - countdownTimeout);
    const racingCutoff = new Date(now.getTime() - racingTimeout);

    return await db
      .select()
      .from(races)
      .where(
        or(
          and(eq(races.status, "waiting"), sql`${races.createdAt} < ${waitingCutoff}`),
          and(eq(races.status, "countdown"), sql`${races.createdAt} < ${countdownCutoff}`),
          and(eq(races.status, "racing"), sql`${races.startedAt} < ${racingCutoff}`)
        )
      )
      .limit(100);
  }

  async cleanupOldFinishedRaces(retentionMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - retentionMs);
    
    const result = await db
      .delete(races)
      .where(
        and(
          eq(races.status, "finished"),
          sql`${races.finishedAt} < ${cutoff}`
        )
      )
      .returning({ id: races.id });
    
    return result.length;
  }

  async bulkUpdateParticipantProgress(updates: Map<number, { progress: number; wpm: number; accuracy: number; errors: number }>): Promise<void> {
    if (updates.size === 0) return;

    const entries = Array.from(updates.entries());
    
    if (entries.length === 1) {
      const [id, data] = entries[0];
      await db
        .update(raceParticipants)
        .set({
          progress: data.progress,
          wpm: data.wpm,
          accuracy: data.accuracy,
          errors: data.errors,
        })
        .where(eq(raceParticipants.id, id));
      return;
    }

    const BATCH_SIZE = 10;
    const MAX_CONCURRENT = 3;

    const batches: typeof entries[] = [];
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      batches.push(entries.slice(i, i + BATCH_SIZE));
    }

    for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
      const concurrentBatches = batches.slice(i, i + MAX_CONCURRENT);
      
      await Promise.all(concurrentBatches.map(async (batch) => {
        for (const [id, data] of batch) {
          await db
            .update(raceParticipants)
            .set({
              progress: data.progress,
              wpm: data.wpm,
              accuracy: data.accuracy,
              errors: data.errors,
            })
            .where(eq(raceParticipants.id, id));
        }
      }));
    }
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

  async getBookById(id: number): Promise<Book | null> {
    const result = await db.select().from(books).where(eq(books.id, id)).limit(1);
    return result[0] || null;
  }

  async getBookBySlug(slug: string): Promise<Book | null> {
    const result = await db.select().from(books).where(eq(books.slug, slug)).limit(1);
    return result[0] || null;
  }

  async getBookChapters(bookId: number): Promise<Array<{ chapter: number; title: string | null; paragraphCount: number }>> {
    // Group only by chapter number, and get the first non-null title using MIN
    // This prevents duplicates when different paragraphs have different titles
    const result = await db
      .select({
        chapter: bookParagraphs.chapter,
        title: sql<string | null>`MIN(${bookParagraphs.chapterTitle})`,
        paragraphCount: sql<number>`count(*)::int`,
      })
      .from(bookParagraphs)
      .where(eq(bookParagraphs.bookId, bookId))
      .groupBy(bookParagraphs.chapter)
      .orderBy(bookParagraphs.chapter);
    
    // Clean up noisy titles that look like content snippets instead of real chapter titles
    const isValidTitle = (title: string | null): boolean => {
      if (!title) return false;
      // Reject titles that look like dialogue or content (start with lowercase, contain quotes, etc.)
      if (/^[a-z]/.test(title)) return false; // Starts with lowercase
      if (/^["']/.test(title)) return false; // Starts with quote
      if (title.length > 80) return false; // Too long to be a chapter title
      return true;
    };
    
    return result.map(r => ({
      chapter: r.chapter || 1,
      title: isValidTitle(r.title) ? r.title : null,
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

  async getRandomDictationSentence(difficulty?: string, category?: string, excludeIds?: number[]): Promise<DictationSentence | undefined> {
    const conditions = [];
    
    if (difficulty) {
      conditions.push(eq(dictationSentences.difficulty, difficulty));
    }
    
    if (category) {
      conditions.push(eq(dictationSentences.category, category));
    }
    
    if (excludeIds && excludeIds.length > 0) {
      conditions.push(notInArray(dictationSentences.id, excludeIds));
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

  async createStressTest(test: InsertStressTest): Promise<StressTest> {
    // Production-ready upsert: Keep all test history for stats but use
    // INSERT ON CONFLICT to optimize storage for leaderboard entries
    // For leaderboard: only keep best score per user per difficulty
    // For stats: we keep all records to track total tests, averages, etc.
    
    // First, check if user already has an entry for this difficulty with a LOWER score
    // If so, and the new score is higher, we can optionally update or just insert
    // For now, we insert all records for accurate stats (total tests, avg score)
    // The leaderboard query already handles showing only the best score
    const inserted = await db.insert(stressTests).values(test).returning();
    return inserted[0];
  }
  
  async upsertStressTestBestScore(test: InsertStressTest): Promise<{ result: StressTest; isNewPersonalBest: boolean }> {
    // Production-ready atomic upsert using PostgreSQL's INSERT ON CONFLICT
    // Uses WHERE clause to compare EXCLUDED vs existing row at conflict time (not pre-insert)
    // This ensures race-safe atomic updates - only updates when new score beats existing
    
    const result = await db.execute(sql`
      INSERT INTO stress_tests (
        user_id, difficulty, enabled_effects, wpm, accuracy, errors,
        max_combo, total_characters, duration, survival_time,
        completion_rate, stress_score, created_at
      )
      VALUES (
        ${test.userId}, ${test.difficulty}, ${JSON.stringify(test.enabledEffects)}::jsonb,
        ${test.wpm}, ${test.accuracy}, ${test.errors}, ${test.maxCombo},
        ${test.totalCharacters}, ${test.duration}, ${test.survivalTime},
        ${test.completionRate}, ${test.stressScore}, NOW()
      )
      ON CONFLICT (user_id, difficulty) 
      DO UPDATE SET
        enabled_effects = EXCLUDED.enabled_effects,
        wpm = EXCLUDED.wpm,
        accuracy = EXCLUDED.accuracy,
        errors = EXCLUDED.errors,
        max_combo = EXCLUDED.max_combo,
        total_characters = EXCLUDED.total_characters,
        duration = EXCLUDED.duration,
        survival_time = EXCLUDED.survival_time,
        completion_rate = EXCLUDED.completion_rate,
        stress_score = EXCLUDED.stress_score,
        created_at = EXCLUDED.created_at
      WHERE 
        EXCLUDED.stress_score > stress_tests.stress_score 
        OR (EXCLUDED.stress_score = stress_tests.stress_score AND EXCLUDED.wpm > stress_tests.wpm)
      RETURNING *, (xmax = 0) as is_insert
    `);
    
    // If no rows returned, the WHERE condition failed (existing score is better)
    // Need to fetch the existing record
    if (result.rows.length === 0) {
      const existing = await db
        .select()
        .from(stressTests)
        .where(
          and(
            eq(stressTests.userId, test.userId),
            eq(stressTests.difficulty, test.difficulty)
          )
        )
        .limit(1);
      
      return {
        result: existing[0],
        isNewPersonalBest: false,
      };
    }
    
    const row = result.rows[0] as any;
    // If row was returned, it means either:
    // 1. New insert (is_insert = true, xmax = 0)
    // 2. Update occurred because WHERE condition passed (xmax != 0)
    // Either way, this is a new personal best
    const isNewPersonalBest = true;
    
    return {
      result: {
        id: row.id,
        userId: row.user_id,
        difficulty: row.difficulty,
        enabledEffects: row.enabled_effects,
        wpm: row.wpm,
        accuracy: row.accuracy,
        errors: row.errors,
        maxCombo: row.max_combo,
        totalCharacters: row.total_characters,
        duration: row.duration,
        survivalTime: row.survival_time,
        completionRate: row.completion_rate,
        stressScore: row.stress_score,
        createdAt: row.created_at,
      },
      isNewPersonalBest,
    };
  }

  async getUserStressTests(userId: string, limit: number = 10): Promise<StressTest[]> {
    return await db
      .select()
      .from(stressTests)
      .where(eq(stressTests.userId, userId))
      .orderBy(desc(stressTests.createdAt))
      .limit(limit);
  }

  async getStressTestLeaderboard(difficulty?: string, limit: number = 50): Promise<Array<{
    userId: string;
    username: string;
    difficulty: string;
    stressScore: number;
    wpm: number;
    accuracy: number;
    completionRate: number;
    avatarColor: string | null;
    createdAt: Date;
    rank: number;
  }>> {
    // Production-ready leaderboard query using ROW_NUMBER() to guarantee exactly
    // one entry per user per difficulty, with proper tiebreaking by WPM and date
    const difficultyFilter = difficulty ? sql`AND st.difficulty = ${difficulty}` : sql``;
    
    const leaderboard = await db.execute(sql`
      WITH ranked_scores AS (
        SELECT 
          st.user_id,
          st.difficulty,
          st.stress_score,
          st.wpm,
          st.accuracy,
          st.completion_rate,
          st.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY st.user_id, st.difficulty
            ORDER BY st.stress_score DESC, st.wpm DESC, st.created_at DESC
          ) as user_rank
        FROM stress_tests st
        WHERE 1=1 ${difficultyFilter}
      ),
      best_scores AS (
        SELECT * FROM ranked_scores WHERE user_rank = 1
      ),
      final_ranking AS (
        SELECT 
          bs.user_id as "userId",
          u.username,
          bs.difficulty,
          bs.stress_score as "stressScore",
          bs.wpm,
          bs.accuracy,
          bs.completion_rate as "completionRate",
          u.avatar_color as "avatarColor",
          bs.created_at as "createdAt",
          DENSE_RANK() OVER (
            ORDER BY bs.stress_score DESC, bs.wpm DESC, bs.created_at ASC
          ) as rank
        FROM best_scores bs
        INNER JOIN users u ON bs.user_id = u.id
      )
      SELECT * FROM final_ranking
      ORDER BY rank ASC, "stressScore" DESC, wpm DESC
      LIMIT ${limit}
    `);

    return leaderboard.rows as any[];
  }

  async getUserStressStats(userId: string): Promise<{
    totalTests: number;
    bestScore: number;
    avgScore: number;
    completedTests: number;
    difficultiesCompleted: string[];
  } | null> {
    const tests = await db
      .select()
      .from(stressTests)
      .where(eq(stressTests.userId, userId));

    if (tests.length === 0) return null;

    const completedTests = tests.filter(t => t.completionRate >= 100).length;
    const difficultiesSet = new Set(
      tests.filter(t => t.completionRate >= 100).map(t => t.difficulty)
    );
    const difficultiesCompleted = Array.from(difficultiesSet);

    return {
      totalTests: tests.length,
      bestScore: Math.max(...tests.map(t => t.stressScore)),
      avgScore: Math.round(tests.reduce((sum, t) => sum + t.stressScore, 0) / tests.length),
      completedTests,
      difficultiesCompleted,
    };
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

  async saveKeystrokeEvents(events: InsertKeystrokeEvent[]): Promise<void> {
    if (events.length === 0) return;
    await db.insert(keystrokeEvents).values(events);
  }

  async saveTypingAnalytics(analytics: InsertTypingAnalytics): Promise<TypingAnalytics> {
    const inserted = await db.insert(typingAnalytics).values(analytics).returning();
    return inserted[0];
  }

  async getUserTypingAnalytics(userId: string, limit: number = 20): Promise<TypingAnalytics[]> {
    const results = await db
      .select()
      .from(typingAnalytics)
      .where(eq(typingAnalytics.userId, userId))
      .orderBy(desc(typingAnalytics.createdAt))
      .limit(limit);
    return results;
  }

  async getTypingAnalyticsById(id: number): Promise<TypingAnalytics | undefined> {
    const result = await db
      .select()
      .from(typingAnalytics)
      .where(eq(typingAnalytics.id, id))
      .limit(1);
    return result[0];
  }

  async saveTypingInsight(insight: InsertTypingInsight): Promise<TypingInsight> {
    const inserted = await db.insert(typingInsights).values(insight).returning();
    return inserted[0];
  }

  async getUserTypingInsights(userId: string): Promise<TypingInsight[]> {
    const results = await db
      .select()
      .from(typingInsights)
      .where(and(
        eq(typingInsights.userId, userId),
        eq(typingInsights.dismissed, false)
      ))
      .orderBy(desc(typingInsights.createdAt));
    return results;
  }

  async dismissInsight(insightId: number): Promise<void> {
    await db
      .update(typingInsights)
      .set({ dismissed: true, updatedAt: new Date() })
      .where(eq(typingInsights.id, insightId));
  }

  async savePracticeRecommendation(recommendation: InsertPracticeRecommendation): Promise<PracticeRecommendation> {
    const inserted = await db.insert(practiceRecommendations).values(recommendation).returning();
    return inserted[0];
  }

  async getUserPracticeRecommendations(userId: string): Promise<PracticeRecommendation[]> {
    const results = await db
      .select()
      .from(practiceRecommendations)
      .where(and(
        eq(practiceRecommendations.userId, userId),
        eq(practiceRecommendations.completed, false)
      ))
      .orderBy(desc(practiceRecommendations.createdAt));
    return results;
  }

  async completePracticeRecommendation(recommendationId: number): Promise<void> {
    await db
      .update(practiceRecommendations)
      .set({ completed: true, completedAt: new Date() })
      .where(eq(practiceRecommendations.id, recommendationId));
  }

  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const inserted = await db.insert(pushSubscriptions).values(subscription).returning();
    return inserted[0];
  }

  async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    const results = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
    return results;
  }

  async deletePushSubscription(id: number): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
  }

  async findExistingSubscription(userId: string, endpoint: string): Promise<PushSubscription | undefined> {
    const result = await db
      .select()
      .from(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint)
      ))
      .limit(1);
    return result[0];
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    const result = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);
    return result[0];
  }

  async createNotificationPreferences(prefs: InsertNotificationPreferences): Promise<NotificationPreferences> {
    const inserted = await db.insert(notificationPreferences).values(prefs).returning();
    return inserted[0];
  }

  async updateNotificationPreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const { id, userId: _, createdAt, updatedAt: __, ...updateFields } = prefs;
    const updated = await db
      .update(notificationPreferences)
      .set({ ...updateFields, updatedAt: new Date() })
      .where(eq(notificationPreferences.userId, userId))
      .returning();
    return updated[0];
  }

  async createNotificationHistory(history: InsertNotificationHistory): Promise<NotificationHistory> {
    const inserted = await db.insert(notificationHistory).values(history).returning();
    return inserted[0];
  }

  async getUserNotificationHistory(userId: string, limit: number = 50): Promise<NotificationHistory[]> {
    const results = await db
      .select()
      .from(notificationHistory)
      .where(eq(notificationHistory.userId, userId))
      .orderBy(desc(notificationHistory.createdAt))
      .limit(limit);
    return results;
  }

  async markNotificationDelivered(id: number): Promise<void> {
    await db
      .update(notificationHistory)
      .set({ status: 'delivered', deliveredAt: new Date() })
      .where(eq(notificationHistory.id, id));
  }

  async markNotificationClicked(id: number): Promise<void> {
    await db
      .update(notificationHistory)
      .set({ status: 'clicked', clickedAt: new Date() })
      .where(eq(notificationHistory.id, id));
  }

  async createNotificationJobs(jobs: InsertNotificationJob[]): Promise<NotificationJob[]> {
    if (jobs.length === 0) return [];
    const inserted = await db.insert(notificationJobs).values(jobs).returning();
    return inserted;
  }

  async claimDueNotificationJobs(beforeUtc: Date, limit: number): Promise<NotificationJob[]> {
    const claimed = await db.transaction(async (tx) => {
      const dueJobs = await tx
        .select()
        .from(notificationJobs)
        .where(
          and(
            sql`${notificationJobs.sendAtUtc} <= ${beforeUtc}`,
            eq(notificationJobs.status, 'pending')
          )
        )
        .orderBy(notificationJobs.sendAtUtc)
        .limit(limit)
        .for('update', { skipLocked: true });
      
      if (dueJobs.length === 0) return [];
      
      const jobIds = dueJobs.map(j => j.id);
      const updated = await tx
        .update(notificationJobs)
        .set({ 
          status: 'claimed', 
          claimedAt: new Date(),
          attemptCount: sql`${notificationJobs.attemptCount} + 1`,
          lastAttemptAt: new Date()
        })
        .where(sql`${notificationJobs.id} = ANY(${jobIds})`)
        .returning();
      
      return updated;
    });
    
    return claimed;
  }

  async markJobCompleted(jobId: number): Promise<void> {
    await db
      .update(notificationJobs)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(notificationJobs.id, jobId));
  }

  async markJobFailed(jobId: number, errorMessage: string): Promise<void> {
    await db
      .update(notificationJobs)
      .set({ 
        status: 'failed', 
        errorMessage,
        lastAttemptAt: new Date()
      })
      .where(eq(notificationJobs.id, jobId));
  }

  async rescheduleJob(jobId: number, newSendAtUtc: Date): Promise<void> {
    await db
      .update(notificationJobs)
      .set({ 
        status: 'pending', 
        sendAtUtc: newSendAtUtc,
        claimedAt: null,
        errorMessage: null
      })
      .where(eq(notificationJobs.id, jobId));
  }

  async deleteCompletedJobsOlderThan(daysAgo: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    
    const deleted = await db
      .delete(notificationJobs)
      .where(
        and(
          eq(notificationJobs.status, 'completed'),
          sql`${notificationJobs.completedAt} < ${cutoffDate}`
        )
      )
      .returning({ id: notificationJobs.id });
    
    return deleted.length;
  }

  async getUsersWithNotificationPreferences(notificationType: string, offset: number, limit: number): Promise<Array<{
    user: User;
    preferences: NotificationPreferences;
  }>> {
    const preferenceColumn = notificationType === 'daily_reminder' ? 'daily_reminder'
      : notificationType === 'streak_warning' ? 'streak_warning'
      : notificationType === 'weekly_summary' ? 'weekly_summary'
      : null;
    
    if (!preferenceColumn) return [];
    
    const results = await db.execute<{
      u_id: string;
      u_username: string;
      u_email: string;
      u_password: string;
      u_email_verified: boolean;
      u_is_active: boolean;
      u_avatar_color: string | null;
      u_bio: string | null;
      u_country: string | null;
      u_keyboard_layout: string | null;
      u_timezone: string;
      u_current_streak: number;
      u_best_streak: number;
      u_last_test_date: Date | null;
      u_created_at: Date;
      p_id: number;
      p_user_id: string;
      p_daily_reminder: boolean;
      p_daily_reminder_time: string | null;
      p_streak_warning: boolean;
      p_weekly_summary: boolean;
      p_created_at: Date;
      p_updated_at: Date;
    }>(sql`
      SELECT DISTINCT ON (u.id)
        u.id as u_id, u.username as u_username, u.email as u_email, 
        u.password as u_password, u.email_verified as u_email_verified, 
        u.is_active as u_is_active, u.avatar_color as u_avatar_color,
        u.bio as u_bio, u.country as u_country, u.keyboard_layout as u_keyboard_layout,
        u.timezone as u_timezone, u.current_streak as u_current_streak,
        u.best_streak as u_best_streak, u.last_test_date as u_last_test_date,
        u.created_at as u_created_at,
        np.id as p_id, np.user_id as p_user_id, np.daily_reminder as p_daily_reminder,
        np.daily_reminder_time as p_daily_reminder_time, np.streak_warning as p_streak_warning,
        np.weekly_summary as p_weekly_summary,
        np.created_at as p_created_at, np.updated_at as p_updated_at
      FROM users u
      INNER JOIN notification_preferences np ON np.user_id = u.id
      INNER JOIN push_subscriptions ps ON ps.user_id = u.id
      WHERE np.${sql.identifier(preferenceColumn)} = true
        AND ps.is_active = true
        AND u.is_active = true
      OFFSET ${offset}
      LIMIT ${limit}
    `);
    
    return results.rows.map(r => ({
      user: {
        id: r.u_id,
        username: r.u_username,
        email: r.u_email,
        password: r.u_password,
        emailVerified: r.u_email_verified,
        isActive: r.u_is_active,
        avatarColor: r.u_avatar_color,
        bio: r.u_bio,
        country: r.u_country,
        keyboardLayout: r.u_keyboard_layout,
        timezone: r.u_timezone,
        currentStreak: r.u_current_streak,
        bestStreak: r.u_best_streak,
        lastTestDate: r.u_last_test_date,
        createdAt: r.u_created_at,
      },
      preferences: {
        id: r.p_id,
        userId: r.p_user_id,
        dailyReminder: r.p_daily_reminder,
        dailyReminderTime: r.p_daily_reminder_time,
        streakWarning: r.p_streak_warning,
        streakMilestone: false,
        weeklySummary: r.p_weekly_summary,
        weeklySummaryDay: 'sunday',
        achievementUnlocked: false,
        challengeInvite: false,
        challengeComplete: false,
        leaderboardChange: false,
        newPersonalRecord: false,
        raceInvite: false,
        raceStarting: false,
        socialUpdates: false,
        tipOfTheDay: false,
        timezone: null,
        quietHoursStart: null,
        quietHoursEnd: null,
        createdAt: r.p_created_at,
        updatedAt: r.p_updated_at,
      },
    }));
  }

  async getUsersForDailyReminders(currentHour: number): Promise<Array<{ id: string; username: string; currentStreak: number }>> {
    const currentHourStr = `${String(currentHour).padStart(2, '0')}:%`;
    
    const results = await db
      .select({
        id: users.id,
        username: users.username,
        currentStreak: users.currentStreak,
      })
      .from(users)
      .innerJoin(notificationPreferences, eq(notificationPreferences.userId, users.id))
      .innerJoin(pushSubscriptions, eq(pushSubscriptions.userId, users.id))
      .where(
        and(
          eq(notificationPreferences.dailyReminder, true),
          sql`${notificationPreferences.dailyReminderTime} LIKE ${currentHourStr}`,
          eq(pushSubscriptions.isActive, true)
        )
      )
      .groupBy(users.id, users.username, users.currentStreak);
    
    return results.map(r => ({
      id: r.id,
      username: r.username,
      currentStreak: r.currentStreak || 0,
    }));
  }

  async getUsersWithStreakAtRisk(): Promise<Array<{ id: string; username: string; currentStreak: number }>> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const results = await db
      .select({
        id: users.id,
        username: users.username,
        currentStreak: users.currentStreak,
      })
      .from(users)
      .innerJoin(notificationPreferences, eq(notificationPreferences.userId, users.id))
      .innerJoin(pushSubscriptions, eq(pushSubscriptions.userId, users.id))
      .where(
        and(
          sql`${users.currentStreak} > 0`,
          eq(notificationPreferences.streakWarning, true),
          eq(pushSubscriptions.isActive, true),
          sql`NOT EXISTS (
            SELECT 1 FROM ${testResults} 
            WHERE ${testResults.userId} = ${users.id} 
            AND ${testResults.createdAt} BETWEEN ${todayStart} AND ${todayEnd}
          )`
        )
      )
      .groupBy(users.id, users.username, users.currentStreak);
    
    return results.map(r => ({
      id: r.id,
      username: r.username,
      currentStreak: r.currentStreak || 0,
    }));
  }

  async getUsersForWeeklySummary(): Promise<Array<{ id: string; username: string }>> {
    const results = await db
      .select({
        id: users.id,
        username: users.username,
      })
      .from(users)
      .innerJoin(notificationPreferences, eq(notificationPreferences.userId, users.id))
      .innerJoin(pushSubscriptions, eq(pushSubscriptions.userId, users.id))
      .where(
        and(
          eq(notificationPreferences.weeklySummary, true),
          eq(pushSubscriptions.isActive, true)
        )
      )
      .groupBy(users.id, users.username);
    
    return results;
  }

  async getUserAverageWpm(userId: string): Promise<number> {
    const results = await db
      .select({
        avgWpm: sql<number>`ROUND(AVG(${testResults.wpm}))`,
      })
      .from(testResults)
      .where(eq(testResults.userId, userId));
    
    return results[0]?.avgWpm || 0;
  }

  async getWeeklySummaryStats(userId: string): Promise<{
    testsCompleted: number;
    avgWpm: number;
    avgAccuracy: number;
    improvement: number;
    rank: number;
  }> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const currentWeekResults = await db
      .select({
        count: sql<number>`CAST(COUNT(*) AS INTEGER)`,
        avgWpm: sql<number>`COALESCE(ROUND(AVG(${testResults.wpm})), 0)`,
        avgAccuracy: sql<number>`COALESCE(ROUND(AVG(${testResults.accuracy}), 1), 0)`,
      })
      .from(testResults)
      .where(
        and(
          eq(testResults.userId, userId),
          sql`${testResults.createdAt} >= ${oneWeekAgo}`
        )
      );
    
    const testsCompleted = currentWeekResults[0]?.count || 0;
    const avgWpm = currentWeekResults[0]?.avgWpm || 0;
    const avgAccuracy = currentWeekResults[0]?.avgAccuracy || 0;
    
    if (testsCompleted === 0) {
      return {
        testsCompleted: 0,
        avgWpm: 0,
        avgAccuracy: 0,
        improvement: 0,
        rank: 0,
      };
    }
    
    const previousWeekResults = await db
      .select({
        avgWpm: sql<number>`COALESCE(ROUND(AVG(${testResults.wpm})), 0)`,
      })
      .from(testResults)
      .where(
        and(
          eq(testResults.userId, userId),
          sql`${testResults.createdAt} >= ${twoWeeksAgo}`,
          sql`${testResults.createdAt} < ${oneWeekAgo}`
        )
      );
    
    const weeklyRankResults = await db
      .select({
        rank: sql<number>`CAST(COUNT(DISTINCT ${users.id}) + 1 AS INTEGER)`,
      })
      .from(users)
      .innerJoin(testResults, eq(testResults.userId, users.id))
      .innerJoin(pushSubscriptions, eq(pushSubscriptions.userId, users.id))
      .where(
        and(
          sql`${testResults.createdAt} >= ${oneWeekAgo}`,
          eq(pushSubscriptions.isActive, true),
          sql`${users.id} != ${userId}`
        )
      )
      .groupBy(users.id)
      .having(sql`AVG(${testResults.wpm}) > ${avgWpm}`);
    
    const previousWpm = previousWeekResults[0]?.avgWpm || avgWpm;
    const improvement = avgWpm - previousWpm;
    const rank = weeklyRankResults[0]?.rank || 1;
    
    return {
      testsCompleted,
      avgWpm,
      avgAccuracy,
      improvement,
      rank,
    };
  }

  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const inserted = await db.insert(achievements).values(achievement).returning();
    return inserted[0];
  }

  async getAllAchievements(): Promise<Achievement[]> {
    const results = await db
      .select()
      .from(achievements)
      .where(eq(achievements.isActive, true))
      .orderBy(achievements.tier, achievements.points);
    return results;
  }

  async getAchievementByKey(key: string): Promise<Achievement | undefined> {
    const result = await db
      .select()
      .from(achievements)
      .where(eq(achievements.key, key))
      .limit(1);
    return result[0];
  }

  async unlockAchievement(userId: string, achievementId: number, testResultId?: number): Promise<UserAchievement> {
    const inserted = await db
      .insert(userAchievements)
      .values({
        userId,
        achievementId,
        testResultId: testResultId || null,
        notified: false,
      })
      .returning();
    return inserted[0];
  }

  async getUserAchievements(userId: string): Promise<Array<UserAchievement & { achievement: Achievement }>> {
    const results = await db
      .select()
      .from(userAchievements)
      .leftJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.unlockedAt));
    
    return results.map(row => ({
      ...row.user_achievements,
      achievement: row.achievements!,
    }));
  }

  async createChallenge(challenge: InsertChallenge): Promise<Challenge> {
    const inserted = await db.insert(challenges).values(challenge).returning();
    return inserted[0];
  }

  async getActiveChallenge(type: 'daily' | 'weekly'): Promise<Challenge | undefined> {
    const now = new Date();
    const result = await db
      .select()
      .from(challenges)
      .where(and(
        eq(challenges.type, type),
        eq(challenges.isActive, true),
        sql`${challenges.startDate} <= ${now}`,
        sql`${challenges.endDate} >= ${now}`
      ))
      .orderBy(desc(challenges.startDate))
      .limit(1);
    return result[0];
  }

  async getUserChallengeProgress(userId: string, challengeId: number): Promise<UserChallenge | undefined> {
    const result = await db
      .select()
      .from(userChallenges)
      .where(and(
        eq(userChallenges.userId, userId),
        eq(userChallenges.challengeId, challengeId)
      ))
      .limit(1);
    return result[0];
  }

  async updateChallengeProgress(userId: string, challengeId: number, progress: number): Promise<UserChallenge> {
    const existing = await this.getUserChallengeProgress(userId, challengeId);
    
    if (existing) {
      const updated = await db
        .update(userChallenges)
        .set({ progress, updatedAt: new Date() })
        .where(and(
          eq(userChallenges.userId, userId),
          eq(userChallenges.challengeId, challengeId)
        ))
        .returning();
      return updated[0];
    } else {
      const inserted = await db
        .insert(userChallenges)
        .values({
          userId,
          challengeId,
          progress,
          isCompleted: false,
        })
        .returning();
      return inserted[0];
    }
  }

  async completeChallenge(userId: string, challengeId: number): Promise<UserChallenge> {
    const updated = await db
      .update(userChallenges)
      .set({
        isCompleted: true,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(userChallenges.userId, userId),
        eq(userChallenges.challengeId, challengeId)
      ))
      .returning();
    return updated[0];
  }

  async getUserGamification(userId: string): Promise<UserGamification | undefined> {
    const result = await db
      .select()
      .from(userGamification)
      .where(eq(userGamification.userId, userId))
      .limit(1);
    return result[0];
  }

  async createUserGamification(gamification: InsertUserGamification): Promise<UserGamification> {
    const inserted = await db.insert(userGamification).values(gamification).returning();
    return inserted[0];
  }

  async updateUserGamification(userId: string, updates: Partial<UserGamification>): Promise<UserGamification> {
    const updated = await db
      .update(userGamification)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userGamification.userId, userId))
      .returning();
    return updated[0];
  }

  // OAuth Accounts
  async createOAuthAccount(account: InsertOAuthAccount): Promise<OAuthAccount> {
    const inserted = await db.insert(oauthAccounts).values(account).returning();
    return inserted[0];
  }

  async getOAuthAccount(provider: OAuthProvider, providerUserId: string): Promise<OAuthAccount | undefined> {
    const result = await db
      .select()
      .from(oauthAccounts)
      .where(and(
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.providerUserId, providerUserId)
      ))
      .limit(1);
    return result[0];
  }

  async getUserOAuthAccounts(userId: string): Promise<OAuthAccount[]> {
    return await db
      .select()
      .from(oauthAccounts)
      .where(eq(oauthAccounts.userId, userId))
      .orderBy(desc(oauthAccounts.linkedAt));
  }

  async linkOAuthAccount(userId: string, account: Omit<InsertOAuthAccount, 'userId'>): Promise<OAuthAccount> {
    const inserted = await db
      .insert(oauthAccounts)
      .values({ ...account, userId })
      .returning();
    return inserted[0];
  }

  async unlinkOAuthAccount(userId: string, provider: OAuthProvider): Promise<void> {
    await db
      .delete(oauthAccounts)
      .where(and(
        eq(oauthAccounts.userId, userId),
        eq(oauthAccounts.provider, provider)
      ));
  }

  async findUserByOAuthProvider(provider: OAuthProvider, providerUserId: string): Promise<User | undefined> {
    const result = await db
      .select({ user: users })
      .from(oauthAccounts)
      .innerJoin(users, eq(oauthAccounts.userId, users.id))
      .where(and(
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.providerUserId, providerUserId)
      ))
      .limit(1);
    return result[0]?.user;
  }

  // Persistent Login (Remember Me)
  async createPersistentLogin(login: InsertPersistentLogin): Promise<PersistentLogin> {
    const inserted = await db.insert(persistentLogins).values(login).returning();
    return inserted[0];
  }

  async getPersistentLogin(series: string): Promise<PersistentLogin | undefined> {
    const result = await db
      .select()
      .from(persistentLogins)
      .where(eq(persistentLogins.series, series))
      .limit(1);
    return result[0];
  }

  async updatePersistentLoginToken(series: string, newTokenHash: string, lastUsed: Date): Promise<void> {
    await db
      .update(persistentLogins)
      .set({ tokenHash: newTokenHash, lastUsed })
      .where(eq(persistentLogins.series, series));
  }

  async deletePersistentLogin(series: string): Promise<void> {
    await db.delete(persistentLogins).where(eq(persistentLogins.series, series));
  }

  async deleteAllUserPersistentLogins(userId: string): Promise<void> {
    await db.delete(persistentLogins).where(eq(persistentLogins.userId, userId));
  }

  async deleteExpiredPersistentLogins(): Promise<number> {
    const now = new Date();
    const result = await db
      .delete(persistentLogins)
      .where(sql`${persistentLogins.expiresAt} < ${now}`)
      .returning();
    return result.length;
  }

  async getUserPersistentLogins(userId: string): Promise<PersistentLogin[]> {
    return await db
      .select()
      .from(persistentLogins)
      .where(eq(persistentLogins.userId, userId))
      .orderBy(desc(persistentLogins.lastUsed));
  }
  
  // OAuth States (CSRF protection - database persisted for multi-instance support)
  async createOAuthState(state: InsertOAuthState): Promise<OAuthState> {
    const inserted = await db.insert(oauthStates).values(state).returning();
    return inserted[0];
  }
  
  async getOAuthState(state: string): Promise<OAuthState | undefined> {
    const result = await db
      .select()
      .from(oauthStates)
      .where(eq(oauthStates.state, state))
      .limit(1);
    return result[0];
  }
  
  async deleteOAuthState(state: string): Promise<void> {
    await db.delete(oauthStates).where(eq(oauthStates.state, state));
  }
  
  async deleteExpiredOAuthStates(): Promise<number> {
    const now = new Date();
    const result = await db
      .delete(oauthStates)
      .where(sql`${oauthStates.expiresAt} < ${now}`)
      .returning();
    return result.length;
  }
  
  // Audit Logs (Security event tracking - database persisted for compliance)
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const inserted = await db.insert(auditLogs).values(log).returning();
    return inserted[0];
  }
  
  async getAuditLogs(filters?: { userId?: string; eventType?: string; limit?: number }): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs);
    
    const conditions = [];
    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters?.eventType) {
      conditions.push(eq(auditLogs.eventType, filters.eventType));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    
    return await query
      .orderBy(desc(auditLogs.createdAt))
      .limit(filters?.limit || 100);
  }
  
  async getUserAuditLogs(userId: string, limit: number = 50): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  // ============================================================================
  // MULTIPLAYER RACING ENHANCED FEATURES IMPLEMENTATIONS
  // ============================================================================

  // User Rating (ELO System)
  async getUserRating(userId: string): Promise<UserRating | undefined> {
    const result = await db
      .select()
      .from(userRatings)
      .where(eq(userRatings.userId, userId))
      .limit(1);
    return result[0];
  }

  async createUserRating(userId: string): Promise<UserRating> {
    const inserted = await db
      .insert(userRatings)
      .values({ userId })
      .returning();
    return inserted[0];
  }

  async updateUserRating(userId: string, updates: Partial<UserRating>): Promise<UserRating> {
    const updated = await db
      .update(userRatings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userRatings.userId, userId))
      .returning();
    return updated[0];
  }

  async getOrCreateUserRating(userId: string): Promise<UserRating> {
    const existing = await this.getUserRating(userId);
    if (existing) return existing;
    return await this.createUserRating(userId);
  }

  async getRatingLeaderboard(tier?: string, limit: number = 100): Promise<UserRating[]> {
    let query = db.select().from(userRatings);
    
    if (tier) {
      query = query.where(eq(userRatings.tier, tier)) as typeof query;
    }
    
    return await query
      .orderBy(desc(userRatings.rating))
      .limit(limit);
  }

  async getUsersForMatchmaking(targetRating: number, tolerance: number, excludeUserIds: string[]): Promise<UserRating[]> {
    const minRating = targetRating - tolerance;
    const maxRating = targetRating + tolerance;
    
    const baseCondition = and(
      sql`${userRatings.rating} >= ${minRating}`,
      sql`${userRatings.rating} <= ${maxRating}`
    );
    
    const whereCondition = excludeUserIds.length > 0
      ? and(baseCondition, notInArray(userRatings.userId, excludeUserIds))
      : baseCondition;
    
    return await db
      .select()
      .from(userRatings)
      .where(whereCondition)
      .orderBy(sql`ABS(${userRatings.rating} - ${targetRating})`)
      .limit(10);
  }

  // Race Match History
  async createRaceMatchHistory(history: InsertRaceMatchHistory): Promise<RaceMatchHistory> {
    const inserted = await db
      .insert(raceMatchHistory)
      .values(history)
      .returning();
    return inserted[0];
  }

  async getRaceMatchHistory(raceId: number): Promise<RaceMatchHistory[]> {
    return await db
      .select()
      .from(raceMatchHistory)
      .where(eq(raceMatchHistory.raceId, raceId))
      .orderBy(raceMatchHistory.finishPosition);
  }

  async getUserMatchHistory(userId: string, limit: number = 50): Promise<RaceMatchHistory[]> {
    return await db
      .select()
      .from(raceMatchHistory)
      .where(eq(raceMatchHistory.userId, userId))
      .orderBy(desc(raceMatchHistory.createdAt))
      .limit(limit);
  }

  // Race Keystrokes (Anti-cheat & Replays)
  async saveRaceKeystrokes(keystrokes: InsertRaceKeystrokes): Promise<RaceKeystrokes> {
    const inserted = await db
      .insert(raceKeystrokes)
      .values(keystrokes)
      .returning();
    return inserted[0];
  }

  async getRaceKeystrokes(raceId: number): Promise<RaceKeystrokes[]> {
    return await db
      .select()
      .from(raceKeystrokes)
      .where(eq(raceKeystrokes.raceId, raceId));
  }

  async getParticipantKeystrokes(participantId: number): Promise<RaceKeystrokes | undefined> {
    const result = await db
      .select()
      .from(raceKeystrokes)
      .where(eq(raceKeystrokes.participantId, participantId))
      .limit(1);
    return result[0];
  }

  async getFlaggedKeystrokes(limit: number = 50): Promise<RaceKeystrokes[]> {
    return await db
      .select()
      .from(raceKeystrokes)
      .where(eq(raceKeystrokes.isFlagged, true))
      .orderBy(desc(raceKeystrokes.createdAt))
      .limit(limit);
  }

  // Race Chat Messages
  async createRaceChatMessage(message: InsertRaceChatMessage): Promise<RaceChatMessage> {
    const inserted = await db
      .insert(raceChatMessages)
      .values(message)
      .returning();
    return inserted[0];
  }

  async getRaceChatMessages(raceId: number, limit: number = 100): Promise<RaceChatMessage[]> {
    return await db
      .select()
      .from(raceChatMessages)
      .where(eq(raceChatMessages.raceId, raceId))
      .orderBy(raceChatMessages.createdAt)
      .limit(limit);
  }

  // Race Spectators
  async addRaceSpectator(spectator: InsertRaceSpectator): Promise<RaceSpectator> {
    const inserted = await db
      .insert(raceSpectators)
      .values(spectator)
      .returning();
    return inserted[0];
  }

  async removeRaceSpectator(raceId: number, sessionId: string): Promise<void> {
    await db
      .update(raceSpectators)
      .set({ isActive: false, leftAt: new Date() })
      .where(
        and(
          eq(raceSpectators.raceId, raceId),
          eq(raceSpectators.sessionId, sessionId)
        )
      );
  }

  async getRaceSpectators(raceId: number): Promise<RaceSpectator[]> {
    return await db
      .select()
      .from(raceSpectators)
      .where(
        and(
          eq(raceSpectators.raceId, raceId),
          eq(raceSpectators.isActive, true)
        )
      );
  }

  async getActiveSpectatorCount(raceId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(raceSpectators)
      .where(
        and(
          eq(raceSpectators.raceId, raceId),
          eq(raceSpectators.isActive, true)
        )
      );
    return result[0]?.count || 0;
  }

  // Race Replays
  async createRaceReplay(replay: InsertRaceReplay): Promise<RaceReplay> {
    const inserted = await db
      .insert(raceReplays)
      .values(replay)
      .returning();
    return inserted[0];
  }

  async getRaceReplay(raceId: number): Promise<RaceReplay | undefined> {
    const result = await db
      .select()
      .from(raceReplays)
      .where(eq(raceReplays.raceId, raceId))
      .limit(1);
    return result[0];
  }

  async getPublicReplays(limit: number = 20): Promise<RaceReplay[]> {
    return await db
      .select()
      .from(raceReplays)
      .where(eq(raceReplays.isPublic, true))
      .orderBy(desc(raceReplays.createdAt))
      .limit(limit);
  }

  async incrementReplayViewCount(raceId: number): Promise<void> {
    await db
      .update(raceReplays)
      .set({ viewCount: sql`${raceReplays.viewCount} + 1` })
      .where(eq(raceReplays.raceId, raceId));
  }

  // Anti-Cheat Challenges
  async createAntiCheatChallenge(challenge: InsertAntiCheatChallenge): Promise<AntiCheatChallenge> {
    const inserted = await db
      .insert(antiCheatChallenges)
      .values(challenge)
      .returning();
    return inserted[0];
  }

  async getUserCertification(userId: string): Promise<AntiCheatChallenge | undefined> {
    const now = new Date();
    const result = await db
      .select()
      .from(antiCheatChallenges)
      .where(
        and(
          eq(antiCheatChallenges.userId, userId),
          eq(antiCheatChallenges.passed, true),
          sql`${antiCheatChallenges.certifiedUntil} > ${now}`
        )
      )
      .orderBy(desc(antiCheatChallenges.certifiedWpm))
      .limit(1);
    return result[0];
  }

  async updateChallengePassed(challengeId: number, passed: boolean, wpm: number, certifiedWpm: number): Promise<void> {
    const certifiedUntil = new Date();
    certifiedUntil.setDate(certifiedUntil.getDate() + 7); // Certification valid for 7 days
    
    await db
      .update(antiCheatChallenges)
      .set({
        passed,
        challengeWpm: wpm,
        certifiedWpm: passed ? certifiedWpm : null,
        certifiedUntil: passed ? certifiedUntil : null,
        completedAt: new Date(),
      })
      .where(eq(antiCheatChallenges.id, challengeId));
  }
}

export const storage = new DatabaseStorage();
