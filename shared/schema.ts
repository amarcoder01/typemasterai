import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, real, index, jsonb, boolean, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  avatarColor: text("avatar_color").default("bg-primary"),
  bio: text("bio"),
  country: text("country"),
  keyboardLayout: text("keyboard_layout").default("QWERTY"),
  timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  bestStreak: integer("best_streak").default(0).notNull(),
  lastTestDate: timestamp("last_test_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be less than 100 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must be less than 30 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema.nullable().optional(),
}).omit({ id: true, createdAt: true });

export { passwordSchema };

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  twoFactorCode: z.string().optional(),
});

export const updateProfileSchema = z.object({
  avatarColor: z.string().optional(),
  bio: z.string().max(200, "Bio must be less than 200 characters").optional(),
  country: z.string().optional(),
  keyboardLayout: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;

// Authentication Security Tables
export const loginHistory = pgTable("login_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  deviceFingerprint: varchar("device_fingerprint", { length: 64 }),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
  countryCode: varchar("country_code", { length: 2 }),
  latitude: real("latitude"),
  longitude: real("longitude"),
  success: boolean("success").notNull(),
  failureReason: varchar("failure_reason", { length: 200 }),
  isSuspicious: boolean("is_suspicious").default(false).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("login_history_user_id_idx").on(table.userId),
  emailIdx: index("login_history_email_idx").on(table.email),
  createdAtIdx: index("login_history_created_at_idx").on(table.createdAt),
}));

export const accountLockouts = pgTable("account_lockouts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  failedAttempts: integer("failed_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  lastFailedAt: timestamp("last_failed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("account_lockouts_user_id_idx").on(table.userId),
}));

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false).notNull(),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tokenIdx: index("email_verification_tokens_token_idx").on(table.token),
}));

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  usedAt: timestamp("used_at"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tokenIdx: index("password_reset_tokens_token_idx").on(table.token),
  userIdIdx: index("password_reset_tokens_user_id_idx").on(table.userId),
}));

export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 128 }).notNull().unique(),
  deviceName: varchar("device_name", { length: 200 }),
  deviceType: varchar("device_type", { length: 50 }),
  browser: varchar("browser", { length: 100 }),
  browserVersion: varchar("browser_version", { length: 20 }),
  os: varchar("os", { length: 100 }),
  osVersion: varchar("os_version", { length: 20 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
  lastActivity: timestamp("last_activity").notNull().defaultNow(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("user_sessions_user_id_idx").on(table.userId),
  sessionIdIdx: index("user_sessions_session_id_idx").on(table.sessionId),
}));

export const securitySettings = pgTable("security_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  twoFactorSecret: varchar("two_factor_secret", { length: 32 }),
  backupCodes: jsonb("backup_codes").$type<string[]>(),
  suspiciousLoginAlerts: boolean("suspicious_login_alerts").default(true).notNull(),
  newDeviceAlerts: boolean("new_device_alerts").default(true).notNull(),
  passwordChangedAt: timestamp("password_changed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLoginHistorySchema = createInsertSchema(loginHistory).omit({ id: true, createdAt: true });
export const insertAccountLockoutSchema = createInsertSchema(accountLockouts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({ id: true, createdAt: true });
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });
export const insertUserSessionSchema = createInsertSchema(userSessions).omit({ id: true, createdAt: true });
export const insertSecuritySettingsSchema = createInsertSchema(securitySettings).omit({ id: true, createdAt: true, updatedAt: true });

export type LoginHistory = typeof loginHistory.$inferSelect;
export type InsertLoginHistory = z.infer<typeof insertLoginHistorySchema>;
export type AccountLockout = typeof accountLockouts.$inferSelect;
export type InsertAccountLockout = z.infer<typeof insertAccountLockoutSchema>;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type SecuritySettings = typeof securitySettings.$inferSelect;
export type InsertSecuritySettings = z.infer<typeof insertSecuritySettingsSchema>;

// OAuth Accounts - Links social providers to users
export const oauthProviderEnum = z.enum(["google", "github", "facebook"]);
export type OAuthProvider = z.infer<typeof oauthProviderEnum>;

export const oauthAccounts = pgTable("oauth_accounts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 20 }).notNull(), // google, github, facebook
  providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  profileName: varchar("profile_name", { length: 100 }),
  avatarUrl: text("avatar_url"),
  accessTokenHash: varchar("access_token_hash", { length: 64 }),
  refreshTokenHash: varchar("refresh_token_hash", { length: 64 }),
  linkedAt: timestamp("linked_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("oauth_accounts_user_id_idx").on(table.userId),
  providerIdx: index("oauth_accounts_provider_idx").on(table.provider),
  providerUserIdIdx: index("oauth_accounts_provider_user_id_idx").on(table.provider, table.providerUserId),
}));

export const insertOAuthAccountSchema = createInsertSchema(oauthAccounts, {
  provider: oauthProviderEnum,
  providerUserId: z.string().min(1).max(255),
  email: z.string().email().nullable().optional(),
  profileName: z.string().max(100).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
}).omit({ id: true, linkedAt: true });

export type OAuthAccount = typeof oauthAccounts.$inferSelect;
export type InsertOAuthAccount = z.infer<typeof insertOAuthAccountSchema>;

// Persistent Login Tokens - Remember Me functionality
export const persistentLogins = pgTable("persistent_logins", {
  series: varchar("series", { length: 64 }).primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull(),
  deviceName: varchar("device_name", { length: 200 }),
  deviceFingerprint: varchar("device_fingerprint", { length: 64 }),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  lastUsed: timestamp("last_used").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => ({
  userIdIdx: index("persistent_logins_user_id_idx").on(table.userId),
  expiresAtIdx: index("persistent_logins_expires_at_idx").on(table.expiresAt),
}));

export const insertPersistentLoginSchema = createInsertSchema(persistentLogins, {
  series: z.string().length(64),
  tokenHash: z.string().length(64),
  deviceName: z.string().max(200).nullable().optional(),
  deviceFingerprint: z.string().max(64).nullable().optional(),
  userAgent: z.string().nullable().optional(),
  ipAddress: z.string().max(45).nullable().optional(),
}).omit({ createdAt: true });

export type PersistentLogin = typeof persistentLogins.$inferSelect;
export type InsertPersistentLogin = z.infer<typeof insertPersistentLoginSchema>;

// OAuth States - CSRF protection for OAuth flows (database-persisted for multi-instance support)
export const oauthStates = pgTable("oauth_states", {
  state: varchar("state", { length: 64 }).primaryKey(),
  provider: varchar("provider", { length: 20 }).notNull(),
  codeVerifier: varchar("code_verifier", { length: 128 }),
  redirectTo: varchar("redirect_to", { length: 255 }),
  linkUserId: varchar("link_user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => ({
  expiresAtIdx: index("oauth_states_expires_at_idx").on(table.expiresAt),
}));

export const insertOAuthStateSchema = createInsertSchema(oauthStates).omit({ createdAt: true });
export type OAuthState = typeof oauthStates.$inferSelect;
export type InsertOAuthState = z.infer<typeof insertOAuthStateSchema>;

// Audit Logs - Security event tracking (database-persisted for compliance and querying)
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  deviceFingerprint: varchar("device_fingerprint", { length: 64 }),
  provider: varchar("provider", { length: 20 }),
  success: boolean("success").notNull(),
  failureReason: varchar("failure_reason", { length: 200 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  eventTypeIdx: index("audit_logs_event_type_idx").on(table.eventType),
  userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
  createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
}));

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export const testResults = pgTable("test_results", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  wpm: integer("wpm").notNull(),
  accuracy: real("accuracy").notNull(),
  mode: integer("mode").notNull(),
  characters: integer("characters").notNull(),
  errors: integer("errors").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("user_id_idx").on(table.userId),
  wpmIdx: index("wpm_idx").on(table.wpm),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export const insertTestResultSchema = createInsertSchema(testResults, {
  wpm: z.number().int().min(0).max(500),
  accuracy: z.number().min(0).max(100),
  mode: z.number().int().positive(),
  characters: z.number().int().min(0),
  errors: z.number().int().min(0),
}).omit({ id: true, createdAt: true });

export type InsertTestResult = z.infer<typeof insertTestResultSchema>;
export type TestResult = typeof testResults.$inferSelect;

export const sharedResults = pgTable("shared_results", {
  id: serial("id").primaryKey(),
  shareToken: varchar("share_token", { length: 12 }).notNull().unique(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  username: text("username"),
  mode: text("mode").notNull(),
  wpm: integer("wpm").notNull(),
  accuracy: real("accuracy").notNull(),
  errors: integer("errors").notNull(),
  duration: integer("duration"),
  characters: integer("characters"),
  metadata: jsonb("metadata"),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  shareTokenIdx: index("share_token_idx").on(table.shareToken),
  modeIdx: index("shared_mode_idx").on(table.mode),
  createdAtIdx: index("shared_created_at_idx").on(table.createdAt),
}));

export const insertSharedResultSchema = createInsertSchema(sharedResults, {
  shareToken: z.string().length(12),
  mode: z.string().min(1),
  wpm: z.number().int().min(0).max(500),
  accuracy: z.number().min(0).max(100),
  errors: z.number().int().min(0),
  isAnonymous: z.boolean().optional(),
}).omit({ id: true, createdAt: true, viewCount: true });

export type InsertSharedResult = z.infer<typeof insertSharedResultSchema>;
export type SharedResult = typeof sharedResults.$inferSelect;

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New Chat"),
  isPinned: integer("is_pinned").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("conversation_user_id_idx").on(table.userId),
  updatedAtIdx: index("conversation_updated_at_idx").on(table.updatedAt),
}));

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  conversationIdIdx: index("message_conversation_id_idx").on(table.conversationId),
}));

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages, {
  role: z.enum(["user", "assistant", "system"]),
}).omit({ id: true, createdAt: true });

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const typingParagraphs = pgTable("typing_paragraphs", {
  id: serial("id").primaryKey(),
  language: text("language").notNull(),
  mode: text("mode").notNull(),
  difficulty: text("difficulty").notNull().default("medium"),
  content: text("content").notNull(),
  wordCount: integer("word_count").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  languageIdx: index("paragraph_language_idx").on(table.language),
  modeIdx: index("paragraph_mode_idx").on(table.mode),
  languageModeIdx: index("paragraph_language_mode_idx").on(table.language, table.mode),
}));

export const insertTypingParagraphSchema = createInsertSchema(typingParagraphs, {
  language: z.string().min(2).max(10),
  mode: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  content: z.string().min(50),
  wordCount: z.number().int().positive(),
}).omit({ id: true, createdAt: true });

export type InsertTypingParagraph = z.infer<typeof insertTypingParagraphSchema>;
export type TypingParagraph = typeof typingParagraphs.$inferSelect;

export const keystrokeAnalytics = pgTable("keystroke_analytics", {
  id: serial("id").primaryKey(),
  testResultId: integer("test_result_id").notNull().references(() => testResults.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expectedKey: text("expected_key").notNull(),
  typedKey: text("typed_key").notNull(),
  isCorrect: integer("is_correct").notNull(),
  position: integer("position").notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("keystroke_user_id_idx").on(table.userId),
  testResultIdIdx: index("keystroke_test_result_id_idx").on(table.testResultId),
  expectedKeyIdx: index("keystroke_expected_key_idx").on(table.expectedKey),
}));

export const insertKeystrokeAnalyticsSchema = createInsertSchema(keystrokeAnalytics, {
  expectedKey: z.string().min(1),
  typedKey: z.string().min(1),
  isCorrect: z.number().int().min(0).max(1),
  position: z.number().int().min(0),
  timestamp: z.number().int(),
}).omit({ id: true, createdAt: true });

export type InsertKeystrokeAnalytics = z.infer<typeof insertKeystrokeAnalyticsSchema>;
export type KeystrokeAnalytics = typeof keystrokeAnalytics.$inferSelect;

// Multiplayer Racing System
export const races = pgTable("races", {
  id: serial("id").primaryKey(),
  roomCode: varchar("room_code", { length: 6 }).notNull().unique(),
  status: text("status").notNull().default("waiting"), // waiting, countdown, racing, finished
  raceType: text("race_type").notNull().default("standard"), // standard (finish paragraph) or timed (race for duration)
  timeLimitSeconds: integer("time_limit_seconds"), // null for standard, 30/60/120/180 for timed
  paragraphId: integer("paragraph_id").references(() => typingParagraphs.id),
  paragraphContent: text("paragraph_content").notNull(),
  maxPlayers: integer("max_players").notNull().default(4),
  isPrivate: integer("is_private").notNull().default(0),
  finishCounter: integer("finish_counter").notNull().default(0),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  roomCodeIdx: index("race_room_code_idx").on(table.roomCode),
  statusIdx: index("race_status_idx").on(table.status),
  createdAtIdx: index("race_created_at_idx").on(table.createdAt),
  raceTypeIdx: index("race_type_idx").on(table.raceType),
}));

export const raceParticipants = pgTable("race_participants", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").notNull().references(() => races.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  guestName: text("guest_name"),
  username: text("username").notNull(),
  avatarColor: text("avatar_color").default("bg-primary"),
  isBot: integer("is_bot").notNull().default(0),
  isActive: integer("is_active").notNull().default(1),
  progress: integer("progress").notNull().default(0), // characters typed
  wpm: integer("wpm").notNull().default(0),
  accuracy: real("accuracy").notNull().default(100), // 100% = no errors (not started yet)
  errors: integer("errors").notNull().default(0),
  isFinished: integer("is_finished").notNull().default(0),
  finishPosition: integer("finish_position"),
  finishedAt: timestamp("finished_at"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (table) => ({
  raceIdIdx: index("participant_race_id_idx").on(table.raceId),
  userIdIdx: index("participant_user_id_idx").on(table.userId),
  raceStatusIdx: index("participant_race_status_idx").on(table.raceId, table.isFinished),
  raceActiveIdx: index("participant_race_active_idx").on(table.raceId, table.isActive),
}));

export const insertRaceSchema = createInsertSchema(races, {
  roomCode: z.string().length(6),
  status: z.enum(["waiting", "countdown", "racing", "finished"]),
  raceType: z.enum(["standard", "timed"]).optional(),
  timeLimitSeconds: z.number().int().min(15).max(300).nullable().optional(),
  paragraphContent: z.string().min(50),
  maxPlayers: z.number().int().min(2).max(10),
  isPrivate: z.number().int().min(0).max(1),
}).omit({ id: true, createdAt: true });

export const insertRaceParticipantSchema = createInsertSchema(raceParticipants, {
  username: z.string().min(1).max(30),
  isBot: z.number().int().min(0).max(1),
  progress: z.number().int().min(0),
  wpm: z.number().int().min(0).max(500),
  accuracy: z.number().min(0).max(100),
  errors: z.number().int().min(0),
  isFinished: z.number().int().min(0).max(1),
}).omit({ id: true, joinedAt: true });

export type InsertRace = z.infer<typeof insertRaceSchema>;
export type Race = typeof races.$inferSelect;
export type InsertRaceParticipant = z.infer<typeof insertRaceParticipantSchema>;
export type RaceParticipant = typeof raceParticipants.$inferSelect;

// ============================================================================
// MULTIPLAYER RACING ENHANCED FEATURES
// ============================================================================

// User ELO Rating System
export const userRatings = pgTable("user_ratings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  
  // ELO Rating
  rating: integer("rating").notNull().default(1200),
  peakRating: integer("peak_rating").notNull().default(1200),
  
  // Rating tier (calculated from rating)
  tier: varchar("tier", { length: 20 }).notNull().default("bronze"), // bronze, silver, gold, platinum, diamond, master, grandmaster
  
  // Stats
  totalRaces: integer("total_races").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  winStreak: integer("win_streak").notNull().default(0),
  bestWinStreak: integer("best_win_streak").notNull().default(0),
  
  // Provisional status (first 10 games have higher K-factor)
  isProvisional: boolean("is_provisional").default(true).notNull(),
  provisionalGames: integer("provisional_games").notNull().default(0),
  
  // Decay tracking
  lastRaceAt: timestamp("last_race_at"),
  ratingDecay: integer("rating_decay").notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  ratingIdx: index("user_ratings_rating_idx").on(table.rating),
  tierIdx: index("user_ratings_tier_idx").on(table.tier),
  winsIdx: index("user_ratings_wins_idx").on(table.wins),
}));

// Race Match History (for ELO calculations and stats)
export const raceMatchHistory = pgTable("race_match_history", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").notNull().references(() => races.id, { onDelete: "cascade" }),
  
  // Player info
  participantId: integer("participant_id").notNull().references(() => raceParticipants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Result
  finishPosition: integer("finish_position").notNull(),
  wpm: integer("wpm").notNull(),
  accuracy: real("accuracy").notNull(),
  
  // Rating change
  ratingBefore: integer("rating_before"),
  ratingAfter: integer("rating_after"),
  ratingChange: integer("rating_change"),
  
  // Opponents info (stored for historical reference)
  opponentCount: integer("opponent_count").notNull().default(0),
  avgOpponentRating: integer("avg_opponent_rating"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  raceIdIdx: index("race_match_race_id_idx").on(table.raceId),
  userIdIdx: index("race_match_user_id_idx").on(table.userId),
  createdAtIdx: index("race_match_created_at_idx").on(table.createdAt),
  raceParticipantUnique: index("race_match_race_participant_unique_idx").on(table.raceId, table.participantId),
}));

// Race Keystroke Log (for anti-cheat and replays)
export const raceKeystrokes = pgTable("race_keystrokes", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").notNull().references(() => races.id, { onDelete: "cascade" }),
  participantId: integer("participant_id").notNull().references(() => raceParticipants.id, { onDelete: "cascade" }),
  
  // Keystroke data (stored as JSON array for efficiency)
  keystrokes: jsonb("keystrokes").notNull(), // [{key, expected, timestamp, correct, position}]
  
  // Content hash for integrity verification
  contentHash: varchar("content_hash", { length: 64 }),
  
  // Anti-cheat metrics (calculated server-side)
  avgInterval: real("avg_interval"), // average ms between keystrokes
  minInterval: real("min_interval"), // minimum ms between keystrokes
  stdDevInterval: real("std_dev_interval"), // consistency of typing rhythm
  suspiciousPatterns: integer("suspicious_patterns").notNull().default(0),
  
  // Validation
  serverCalculatedWpm: integer("server_calculated_wpm"),
  clientReportedWpm: integer("client_reported_wpm"),
  wpmDiscrepancy: real("wpm_discrepancy"),
  
  // Anti-cheat flags
  isFlagged: boolean("is_flagged").default(false).notNull(),
  flagReasons: jsonb("flag_reasons"), // ["inhuman_speed", "perfect_accuracy", etc.]
  requiresReview: boolean("requires_review").default(false).notNull(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  raceIdIdx: index("race_keystrokes_race_id_idx").on(table.raceId),
  participantIdIdx: index("race_keystrokes_participant_id_idx").on(table.participantId),
  flaggedIdx: index("race_keystrokes_flagged_idx").on(table.isFlagged),
  raceParticipantUnique: index("race_keystrokes_race_participant_unique_idx").on(table.raceId, table.participantId),
}));

// Race Chat Messages
export const raceChatMessages = pgTable("race_chat_messages", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").notNull().references(() => races.id, { onDelete: "cascade" }),
  participantId: integer("participant_id").references(() => raceParticipants.id, { onDelete: "set null" }),
  
  // Message content
  messageType: varchar("message_type", { length: 20 }).notNull().default("text"), // text, emote, system
  content: text("content").notNull(),
  
  // For emotes
  emoteCode: varchar("emote_code", { length: 50 }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  raceIdIdx: index("race_chat_race_id_idx").on(table.raceId),
  createdAtIdx: index("race_chat_created_at_idx").on(table.createdAt),
}));

// Race Spectators
export const raceSpectators = pgTable("race_spectators", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").notNull().references(() => races.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Guest spectator tracking
  sessionId: varchar("session_id", { length: 64 }),
  
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  leftAt: timestamp("left_at"),
  
  isActive: boolean("is_active").default(true).notNull(),
}, (table) => ({
  raceIdIdx: index("race_spectators_race_id_idx").on(table.raceId),
  activeIdx: index("race_spectators_active_idx").on(table.raceId, table.isActive),
}));

// Race Replays (stored for completed races)
export const raceReplays = pgTable("race_replays", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").notNull().unique().references(() => races.id, { onDelete: "cascade" }),
  
  // Race metadata snapshot
  paragraphContent: text("paragraph_content").notNull(),
  duration: integer("duration"), // total race duration in ms
  
  // All participants' keystroke data for replay
  participantData: jsonb("participant_data").notNull(), // [{participantId, username, keystrokes, wpm, accuracy, position}]
  
  // Replay accessibility
  isPublic: boolean("is_public").default(false).notNull(),
  viewCount: integer("view_count").notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  raceIdIdx: index("race_replays_race_id_idx").on(table.raceId),
  publicIdx: index("race_replays_public_idx").on(table.isPublic),
}));

// Anti-Cheat Verification Challenges (CAPTCHA for high WPM)
export const antiCheatChallenges = pgTable("anti_cheat_challenges", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Challenge details
  challengeText: text("challenge_text").notNull(),
  challengeType: varchar("challenge_type", { length: 20 }).notNull().default("typing"), // typing, captcha
  
  // Result
  triggered: boolean("triggered").default(false).notNull(),
  triggeredWpm: integer("triggered_wpm"),
  passed: boolean("passed"),
  challengeWpm: integer("challenge_wpm"),
  
  // Certification (if passed, user is certified up to 25% above their challenge WPM)
  certifiedWpm: integer("certified_wpm"),
  certifiedUntil: timestamp("certified_until"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  userIdIdx: index("anti_cheat_user_id_idx").on(table.userId),
  certifiedIdx: index("anti_cheat_certified_idx").on(table.userId, table.certifiedUntil),
}));

// Insert schemas and types for new tables
export const insertUserRatingSchema = createInsertSchema(userRatings, {
  rating: z.number().int().min(0).max(5000),
  tier: z.enum(["bronze", "silver", "gold", "platinum", "diamond", "master", "grandmaster"]),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertRaceMatchHistorySchema = createInsertSchema(raceMatchHistory, {
  finishPosition: z.number().int().min(1),
  wpm: z.number().int().min(0).max(500),
  accuracy: z.number().min(0).max(100),
}).omit({ id: true, createdAt: true });

export const insertRaceKeystrokesSchema = createInsertSchema(raceKeystrokes).omit({ id: true, createdAt: true });

export const insertRaceChatMessageSchema = createInsertSchema(raceChatMessages, {
  messageType: z.enum(["text", "emote", "system"]),
  content: z.string().min(1).max(500),
}).omit({ id: true, createdAt: true });

export const insertRaceSpectatorSchema = createInsertSchema(raceSpectators).omit({ id: true, joinedAt: true });

export const insertRaceReplaySchema = createInsertSchema(raceReplays).omit({ id: true, createdAt: true, viewCount: true });

export const insertAntiCheatChallengeSchema = createInsertSchema(antiCheatChallenges).omit({ id: true, createdAt: true, completedAt: true });

export type UserRating = typeof userRatings.$inferSelect;
export type InsertUserRating = z.infer<typeof insertUserRatingSchema>;
export type RaceMatchHistory = typeof raceMatchHistory.$inferSelect;
export type InsertRaceMatchHistory = z.infer<typeof insertRaceMatchHistorySchema>;
export type RaceKeystrokes = typeof raceKeystrokes.$inferSelect;
export type InsertRaceKeystrokes = z.infer<typeof insertRaceKeystrokesSchema>;
export type RaceChatMessage = typeof raceChatMessages.$inferSelect;
export type InsertRaceChatMessage = z.infer<typeof insertRaceChatMessageSchema>;
export type RaceSpectator = typeof raceSpectators.$inferSelect;
export type InsertRaceSpectator = z.infer<typeof insertRaceSpectatorSchema>;
export type RaceReplay = typeof raceReplays.$inferSelect;
export type InsertRaceReplay = z.infer<typeof insertRaceReplaySchema>;
export type AntiCheatChallenge = typeof antiCheatChallenges.$inferSelect;
export type InsertAntiCheatChallenge = z.infer<typeof insertAntiCheatChallengeSchema>;

export const codeSnippets = pgTable("code_snippets", {
  id: serial("id").primaryKey(),
  programmingLanguage: text("programming_language").notNull(),
  framework: text("framework"),
  difficulty: text("difficulty").notNull().default("medium"),
  content: text("content").notNull(),
  lineCount: integer("line_count").notNull(),
  characterCount: integer("character_count").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  langIdx: index("code_language_idx").on(table.programmingLanguage),
  difficultyIdx: index("code_difficulty_idx").on(table.difficulty),
  langDiffIdx: index("code_language_difficulty_idx").on(table.programmingLanguage, table.difficulty),
}));

export const insertCodeSnippetSchema = createInsertSchema(codeSnippets, {
  programmingLanguage: z.string().min(1),
  framework: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  content: z.string().min(10),
  lineCount: z.number().int().positive(),
  characterCount: z.number().int().positive(),
  description: z.string().optional(),
}).omit({ id: true, createdAt: true });

export type InsertCodeSnippet = z.infer<typeof insertCodeSnippetSchema>;
export type CodeSnippet = typeof codeSnippets.$inferSelect;

export const codeTypingTests = pgTable("code_typing_tests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  codeSnippetId: integer("code_snippet_id").references(() => codeSnippets.id, { onDelete: "set null" }),
  programmingLanguage: text("programming_language").notNull(),
  framework: text("framework"),
  wpm: integer("wpm").notNull(),
  accuracy: real("accuracy").notNull(),
  characters: integer("characters").notNull(),
  errors: integer("errors").notNull(),
  syntaxErrors: integer("syntax_errors").notNull().default(0),
  duration: integer("duration").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("code_test_user_id_idx").on(table.userId),
  langIdx: index("code_test_language_idx").on(table.programmingLanguage),
  wpmIdx: index("code_test_wpm_idx").on(table.wpm),
  userLangIdx: index("code_test_user_language_idx").on(table.userId, table.programmingLanguage),
  createdAtIdx: index("code_test_created_at_idx").on(table.createdAt),
}));

export const insertCodeTypingTestSchema = createInsertSchema(codeTypingTests, {
  codeSnippetId: z.number().int().positive().nullable().optional(),
  programmingLanguage: z.string().min(1).max(50),
  framework: z.string().max(50).nullable().optional(),
  wpm: z.number().int().min(0).max(500),
  accuracy: z.number().min(0).max(100),
  characters: z.number().int().min(1),
  errors: z.number().int().min(0),
  syntaxErrors: z.number().int().min(0),
  duration: z.number().int().min(1).max(3600),
}).omit({ id: true, createdAt: true });

export type InsertCodeTypingTest = z.infer<typeof insertCodeTypingTestSchema>;
export type CodeTypingTest = typeof codeTypingTests.$inferSelect;

// Shared Code Typing Results
export const sharedCodeResults = pgTable("shared_code_results", {
  id: serial("id").primaryKey(),
  shareId: varchar("share_id", { length: 10 }).notNull().unique(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  username: text("username").notNull(),
  programmingLanguage: text("programming_language").notNull(),
  framework: text("framework"),
  difficulty: text("difficulty").notNull(),
  testMode: text("test_mode").notNull(), // normal, expert, master
  wpm: integer("wpm").notNull(),
  accuracy: real("accuracy").notNull(),
  errors: integer("errors").notNull(),
  syntaxErrors: integer("syntax_errors").notNull().default(0),
  duration: integer("duration").notNull(), // in seconds
  codeContent: text("code_content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  shareIdIdx: index("shared_code_share_id_idx").on(table.shareId),
  createdAtIdx: index("shared_code_created_at_idx").on(table.createdAt),
}));

export const insertSharedCodeResultSchema = createInsertSchema(sharedCodeResults, {
  shareId: z.string().length(10),
  username: z.string().min(1).max(30),
  programmingLanguage: z.string().min(1),
  framework: z.string().nullable(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  testMode: z.enum(["normal", "expert", "master"]),
  wpm: z.number().int().min(0).max(500),
  accuracy: z.number().min(0).max(100),
  errors: z.number().int().min(0),
  syntaxErrors: z.number().int().min(0),
  duration: z.number().int().positive(),
  codeContent: z.string().min(10),
}).omit({ id: true, createdAt: true });

export type InsertSharedCodeResult = z.infer<typeof insertSharedCodeResultSchema>;
export type SharedCodeResult = typeof sharedCodeResults.$inferSelect;

// Books metadata for Book Library
export const books = pgTable("books", {
  id: integer("id").primaryKey(), // Gutendex book ID
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  language: text("language").notNull().default("en"),
  topic: text("topic").notNull(),
  difficulty: text("difficulty").notNull(), // easy, medium, hard (dominant difficulty)
  totalParagraphs: integer("total_paragraphs").notNull(),
  totalChapters: integer("total_chapters").notNull().default(1),
  coverImageUrl: text("cover_image_url"),
  description: text("description"),
  estimatedDurationMap: jsonb("estimated_duration_map"), // JSON object: {30: count, 60: count, 90: count, 120: count}
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  slugIdx: index("book_slug_idx").on(table.slug),
  topicIdx: index("book_meta_topic_idx").on(table.topic),
  difficultyIdx: index("book_meta_difficulty_idx").on(table.difficulty),
  languageIdx: index("book_meta_language_idx").on(table.language),
}));

// Book Paragraphs for Book Typing Mode
export const bookParagraphs = pgTable("book_paragraphs", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  difficulty: text("difficulty").notNull(), // easy, medium, hard
  topic: text("topic").notNull(), // fiction, classics, adventure, etc.
  durationMode: integer("duration_mode").notNull(), // estimated seconds to type
  lengthWords: integer("length_words").notNull(),
  source: text("source").notNull(), // "Title by Author"
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }), // FK to books table
  paragraphIndex: integer("paragraph_index").notNull(), // position in book (0-indexed)
  chapter: integer("chapter"), // chapter number (1-indexed, null for unchapterized books)
  sectionIndex: integer("section_index"), // section within chapter (0-indexed)
  chapterTitle: text("chapter_title"), // optional chapter heading text
  language: text("language").notNull().default("en"),
  metadata: text("metadata"), // JSON string for additional info
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  topicDifficultyDurationIdx: index("book_topic_difficulty_duration_idx").on(table.topic, table.difficulty, table.durationMode),
  bookIdParagraphIdx: index("book_id_paragraph_idx").on(table.bookId, table.paragraphIndex),
  bookIdChapterIdx: index("book_id_chapter_idx").on(table.bookId, table.chapter),
  difficultyIdx: index("book_difficulty_idx").on(table.difficulty),
  topicIdx: index("book_topic_idx").on(table.topic),
  durationIdx: index("book_duration_idx").on(table.durationMode),
}));

// User book progress tracking
export const userBookProgress = pgTable("user_book_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  lastParagraphIndex: integer("last_paragraph_index").notNull().default(0),
  completedParagraphs: jsonb("completed_paragraphs").default([]), // array of paragraph indices
  wordsTyped: integer("words_typed").notNull().default(0),
  totalTests: integer("total_tests").notNull().default(0),
  averageWpm: real("average_wpm").default(0),
  averageAccuracy: real("average_accuracy").default(100),
  isCompleted: boolean("is_completed").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("user_book_progress_user_id_idx").on(table.userId),
  bookIdIdx: index("user_book_progress_book_id_idx").on(table.bookId),
  userBookIdx: index("user_book_progress_user_book_idx").on(table.userId, table.bookId),
}));

export const insertBookSchema = createInsertSchema(books, {
  id: z.number().int().positive(),
  slug: z.string().min(1),
  title: z.string().min(1),
  author: z.string().min(1),
  language: z.string().length(2),
  topic: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  totalParagraphs: z.number().int().positive(),
  totalChapters: z.number().int().positive(),
  coverImageUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  estimatedDurationMap: z.any().nullable().optional(),
}).omit({ createdAt: true });

export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof books.$inferSelect;

export const insertBookParagraphSchema = createInsertSchema(bookParagraphs, {
  text: z.string().min(50),
  difficulty: z.enum(["easy", "medium", "hard"]),
  topic: z.string().min(1),
  durationMode: z.number().int().positive(),
  lengthWords: z.number().int().positive(),
  source: z.string().min(1),
  bookId: z.number().int().positive(),
  paragraphIndex: z.number().int().min(0),
  chapter: z.number().int().positive().nullable().optional(),
  sectionIndex: z.number().int().min(0).nullable().optional(),
  chapterTitle: z.string().nullable().optional(),
  language: z.string().length(2),
  metadata: z.string().nullable().optional(),
}).omit({ id: true, createdAt: true });

export type InsertBookParagraph = z.infer<typeof insertBookParagraphSchema>;
export type BookParagraph = typeof bookParagraphs.$inferSelect;

export const insertUserBookProgressSchema = createInsertSchema(userBookProgress, {
  bookId: z.number().int().positive(),
  lastParagraphIndex: z.number().int().min(0),
  completedParagraphs: z.any().nullable().optional(),
  wordsTyped: z.number().int().min(0),
  totalTests: z.number().int().min(0),
  averageWpm: z.number().min(0).max(500),
  averageAccuracy: z.number().min(0).max(100),
  isCompleted: z.boolean(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertUserBookProgress = z.infer<typeof insertUserBookProgressSchema>;
export type UserBookProgress = typeof userBookProgress.$inferSelect;

// Book Typing Test Results
export const bookTypingTests = pgTable("book_typing_tests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  paragraphId: integer("paragraph_id").notNull().references(() => bookParagraphs.id),
  wpm: integer("wpm").notNull(),
  accuracy: real("accuracy").notNull(),
  characters: integer("characters").notNull(),
  errors: integer("errors").notNull(),
  duration: integer("duration").notNull(), // actual time taken in seconds
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("book_test_user_id_idx").on(table.userId),
  paragraphIdIdx: index("book_test_paragraph_id_idx").on(table.paragraphId),
  wpmIdx: index("book_test_wpm_idx").on(table.wpm),
  createdAtIdx: index("book_test_created_at_idx").on(table.createdAt),
}));

export const insertBookTypingTestSchema = createInsertSchema(bookTypingTests, {
  paragraphId: z.number().int().positive(),
  wpm: z.number().int().min(0).max(500),
  accuracy: z.number().min(0).max(100),
  characters: z.number().int().min(1),
  errors: z.number().int().min(0),
  duration: z.number().int().positive(),
}).omit({ id: true, createdAt: true });

export type InsertBookTypingTest = z.infer<typeof insertBookTypingTestSchema>;
export type BookTypingTest = typeof bookTypingTests.$inferSelect;

// Dictation Mode - Sentence Bank
export const dictationSentences = pgTable("dictation_sentences", {
  id: serial("id").primaryKey(),
  sentence: text("sentence").notNull(),
  difficulty: text("difficulty").notNull(), // easy, medium, hard
  category: text("category").default("general"),
  wordCount: integer("word_count").notNull(),
  characterCount: integer("character_count").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  difficultyIdx: index("dictation_sentence_difficulty_idx").on(table.difficulty),
  categoryIdx: index("dictation_sentence_category_idx").on(table.category),
  difficultyCategoryIdx: index("dictation_sentence_difficulty_category_idx").on(table.difficulty, table.category),
}));

export const insertDictationSentenceSchema = createInsertSchema(dictationSentences, {
  sentence: z.string().min(10).max(500),
  difficulty: z.enum(["easy", "medium", "hard"]),
  category: z.string().min(1),
  wordCount: z.number().int().positive(),
  characterCount: z.number().int().positive(),
}).omit({ id: true, createdAt: true });

export type InsertDictationSentence = z.infer<typeof insertDictationSentenceSchema>;
export type DictationSentence = typeof dictationSentences.$inferSelect;

// Dictation Mode - Test Results
export const dictationTests = pgTable("dictation_tests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sentenceId: integer("sentence_id").notNull().references(() => dictationSentences.id),
  speedLevel: text("speed_level").notNull(), // slow, medium, fast, random
  actualSpeed: real("actual_speed").notNull(), // actual rate value used (0.7-1.5)
  actualSentence: text("actual_sentence").notNull(),
  typedText: text("typed_text").notNull(),
  wpm: integer("wpm").notNull(),
  accuracy: real("accuracy").notNull(),
  errors: integer("errors").notNull(),
  replayCount: integer("replay_count").notNull().default(0),
  hintUsed: integer("hint_used").notNull().default(0),
  duration: integer("duration").notNull(), // seconds
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("dictation_test_user_id_idx").on(table.userId),
  sentenceIdIdx: index("dictation_test_sentence_id_idx").on(table.sentenceId),
  wpmIdx: index("dictation_test_wpm_idx").on(table.wpm),
  accuracyIdx: index("dictation_test_accuracy_idx").on(table.accuracy),
  speedLevelIdx: index("dictation_test_speed_level_idx").on(table.speedLevel),
  createdAtIdx: index("dictation_test_created_at_idx").on(table.createdAt),
}));

export const insertDictationTestSchema = createInsertSchema(dictationTests, {
  sentenceId: z.number().int().positive(),
  speedLevel: z.enum(["slow", "medium", "fast", "random"]),
  actualSpeed: z.number().min(0.5).max(2.0),
  actualSentence: z.string().min(1),
  typedText: z.string(),
  wpm: z.number().int().min(0).max(500),
  accuracy: z.number().min(0).max(100),
  errors: z.number().int().min(0),
  replayCount: z.number().int().min(0),
  hintUsed: z.number().int().min(0).max(1),
  duration: z.number().int().positive(),
}).omit({ id: true, createdAt: true });

export type InsertDictationTest = z.infer<typeof insertDictationTestSchema>;
export type DictationTest = typeof dictationTests.$inferSelect;

// Stress Test Mode - For Advanced Users
export const stressTests = pgTable("stress_tests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  difficulty: text("difficulty").notNull(), // beginner, intermediate, expert, nightmare, impossible
  enabledEffects: jsonb("enabled_effects").notNull(), // {screenShake, distractions, sounds, speedIncrease, limitedVisibility, glitch, textFade, reverseText, randomJumps, etc}
  wpm: integer("wpm").notNull(),
  accuracy: real("accuracy").notNull(),
  errors: integer("errors").notNull(),
  maxCombo: integer("max_combo").notNull().default(0),
  totalCharacters: integer("total_characters").notNull(),
  duration: integer("duration").notNull(), // seconds
  survivalTime: integer("survival_time").notNull(), // how long they lasted before failing
  completionRate: real("completion_rate").notNull(), // percentage of test completed
  stressScore: integer("stress_score").notNull(), // calculated score based on difficulty + performance
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("stress_test_user_id_idx").on(table.userId),
  difficultyIdx: index("stress_test_difficulty_idx").on(table.difficulty),
  stressScoreIdx: index("stress_test_score_idx").on(table.stressScore),
  wpmIdx: index("stress_test_wpm_idx").on(table.wpm),
  createdAtIdx: index("stress_test_created_at_idx").on(table.createdAt),
}));

export const insertStressTestSchema = createInsertSchema(stressTests, {
  difficulty: z.enum(["beginner", "intermediate", "expert", "nightmare", "impossible"]),
  enabledEffects: z.object({
    screenShake: z.boolean(),
    distractions: z.boolean(),
    sounds: z.boolean(),
    speedIncrease: z.boolean(),
    limitedVisibility: z.boolean(),
    colorShift: z.boolean(),
    gravity: z.boolean(),
    rotation: z.boolean(),
    glitch: z.boolean(),
    textFade: z.boolean(),
    reverseText: z.boolean(),
    randomJumps: z.boolean(),
    screenInvert: z.boolean(),
    zoomChaos: z.boolean(),
    screenFlip: z.boolean(),
  }),
  wpm: z.number().int().min(0).max(500),
  accuracy: z.number().min(0).max(100),
  errors: z.number().int().min(0),
  maxCombo: z.number().int().min(0),
  totalCharacters: z.number().int().min(0),
  duration: z.number().int().positive(),
  survivalTime: z.number().int().min(0),
  completionRate: z.number().min(0).max(100),
  stressScore: z.number().int().min(0),
}).omit({ id: true, createdAt: true });

export type InsertStressTest = z.infer<typeof insertStressTestSchema>;
export type StressTest = typeof stressTests.$inferSelect;

// Keystroke Analytics - Advanced Typing Performance Tracking
export const keystrokeEvents = pgTable("keystroke_events", {
  id: serial("id").primaryKey(),
  testResultId: integer("test_result_id").references(() => testResults.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 10 }).notNull(),
  keyCode: varchar("key_code", { length: 50 }).notNull(),
  pressTime: bigint("press_time", { mode: "number" }).notNull(), // ms timestamp
  releaseTime: bigint("release_time", { mode: "number" }), // ms timestamp (null if still pressed)
  dwellTime: integer("dwell_time"), // time key was held down (ms)
  flightTime: integer("flight_time"), // time since previous key release (ms)
  isCorrect: boolean("is_correct").notNull(),
  expectedKey: varchar("expected_key", { length: 10 }),
  position: integer("position").notNull(), // position in text
  finger: varchar("finger", { length: 20 }), // which finger used
  hand: varchar("hand", { length: 10 }), // left/right
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const typingAnalytics = pgTable("typing_analytics", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  testResultId: integer("test_result_id").references(() => testResults.id, { onDelete: "cascade" }),
  
  // Core Metrics
  wpm: integer("wpm").notNull(),
  rawWpm: integer("raw_wpm").notNull(), // includes errors
  accuracy: real("accuracy").notNull(),
  consistency: real("consistency"), // coefficient of variation (0-100)
  
  // Advanced Timing Metrics
  avgDwellTime: real("avg_dwell_time"), // average key hold time
  avgFlightTime: real("avg_flight_time"), // average inter-key latency
  stdDevFlightTime: real("std_dev_flight_time"), // rhythm variance
  fastestDigraph: varchar("fastest_digraph", { length: 10 }),
  slowestDigraph: varchar("slowest_digraph", { length: 10 }),
  
  // Finger Usage Distribution (JSON)
  fingerUsage: jsonb("finger_usage"), // {L_Pinky: 50, L_Ring: 30, ...}
  handBalance: real("hand_balance"), // % left vs right hand usage
  
  // Error Analysis
  totalErrors: integer("total_errors").notNull(),
  errorsByType: jsonb("errors_by_type"), // {substitution: 5, adjacent: 3, doublet: 2}
  errorKeys: jsonb("error_keys"), // array of problematic keys
  
  // Speed Variation
  wpmByPosition: jsonb("wpm_by_position"), // speed across text chunks
  slowestWords: jsonb("slowest_words"), // words typed slower than average
  
  // Keyboard Heatmap Data
  keyHeatmap: jsonb("key_heatmap"), // {A: 50, B: 12, ...} frequency counts
  
  // Enhanced Industry-Standard Metrics (Production-Ready)
  burstWpm: integer("burst_wpm"), // Peak 5-second WPM (like Monkeytype)
  adjustedWpm: integer("adjusted_wpm"), // WPM with error penalty
  consistencyPercentile: integer("consistency_percentile"), // Estimated ranking (0-100)
  rollingAccuracy: jsonb("rolling_accuracy"), // Accuracy across 5 chunks
  topDigraphs: jsonb("top_digraphs"), // Top 5 fastest digraphs with timing
  bottomDigraphs: jsonb("bottom_digraphs"), // Top 5 slowest digraphs with timing  
  typingRhythm: real("typing_rhythm"), // Rhythm score (0-100)
  peakPerformanceWindow: jsonb("peak_performance_window"), // Best 20% window
  fatigueIndicator: real("fatigue_indicator"), // Speed drop % (positive=fatigue)
  errorBurstCount: integer("error_burst_count"), // Consecutive error sequences
  
  // Anti-Cheat Validation Flags (Production-Ready)
  isSuspicious: boolean("is_suspicious").default(false), // Overall suspicious flag
  suspiciousFlags: jsonb("suspicious_flags"), // Array of detected anomalies
  validationScore: integer("validation_score"), // 0-100 trustworthiness score
  minKeystrokeInterval: integer("min_keystroke_interval"), // Fastest interval (ms) - for inhuman detection
  keystrokeVariance: real("keystroke_variance"), // Variance in timing - too consistent = bot
  syntheticInputDetected: boolean("synthetic_input_detected").default(false), // Clipboard/macro detection
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const typingInsights = pgTable("typing_insights", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  
  // AI-Generated Insights
  insightType: varchar("insight_type", { length: 50 }).notNull(), // "weakness", "strength", "recommendation"
  category: varchar("category", { length: 50 }).notNull(), // "speed", "accuracy", "rhythm", "ergonomics"
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  actionable: text("actionable"), // specific action to take
  
  // Supporting Data
  confidence: real("confidence"), // AI confidence score
  affectedKeys: jsonb("affected_keys"), // keys related to this insight
  metric: varchar("metric", { length: 50 }), // which metric triggered this
  metricValue: real("metric_value"),
  
  // Status
  dismissed: boolean("dismissed").default(false),
  resolved: boolean("resolved").default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const practiceRecommendations = pgTable("practice_recommendations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  
  // Recommendation Details
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  difficulty: varchar("difficulty", { length: 20 }).notNull(), // easy, medium, hard
  
  // Practice Content
  practiceText: text("practice_text"), // custom generated text
  focusKeys: jsonb("focus_keys"), // keys to practice
  focusDigraphs: jsonb("focus_digraphs"), // letter combinations
  
  // Metrics
  estimatedDuration: integer("estimated_duration"), // minutes
  targetWpm: integer("target_wpm"),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Push Notification Subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  
  // Web Push subscription data (JSON)
  endpoint: text("endpoint").notNull(),
  expirationTime: bigint("expiration_time", { mode: "number" }),
  keys: jsonb("keys").notNull(), // { p256dh, auth }
  
  // Metadata
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true).notNull(),
  lastUsed: timestamp("last_used"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User Notification Preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  
  // Daily Reminders
  dailyReminder: boolean("daily_reminder").default(true).notNull(),
  dailyReminderTime: varchar("daily_reminder_time", { length: 5 }).default("09:00"), // HH:MM format
  
  // Streak Notifications
  streakWarning: boolean("streak_warning").default(true).notNull(),
  streakMilestone: boolean("streak_milestone").default(true).notNull(),
  
  // Weekly Summaries
  weeklySummary: boolean("weekly_summary").default(true).notNull(),
  weeklySummaryDay: varchar("weekly_summary_day", { length: 10 }).default("sunday"), // day of week
  
  // Achievements & Challenges
  achievementUnlocked: boolean("achievement_unlocked").default(true).notNull(),
  challengeInvite: boolean("challenge_invite").default(true).notNull(),
  challengeComplete: boolean("challenge_complete").default(true).notNull(),
  
  // Leaderboard & Social
  leaderboardChange: boolean("leaderboard_change").default(false).notNull(),
  newPersonalRecord: boolean("new_personal_record").default(true).notNull(),
  
  // Multiplayer
  raceInvite: boolean("race_invite").default(true).notNull(),
  raceStarting: boolean("race_starting").default(true).notNull(),
  
  // Community & Learning
  socialUpdates: boolean("social_updates").default(true).notNull(),
  tipOfTheDay: boolean("tip_of_the_day").default(true).notNull(),
  
  // User Preferences
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }), // HH:MM format
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }), // HH:MM format
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notification History (for tracking and preventing duplicates)
export const notificationHistory = pgTable("notification_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  
  // Notification Details
  type: varchar("type", { length: 50 }).notNull(), // daily_reminder, streak_warning, weekly_summary, etc.
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull(),
  data: jsonb("data"), // Additional context data
  
  // Delivery Status
  status: varchar("status", { length: 20 }).default("sent").notNull(), // sent, delivered, failed, clicked
  errorMessage: text("error_message"),
  
  // Engagement Tracking
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at"),
  clickedAt: timestamp("clicked_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notification Jobs Queue (for scheduled notifications)
export const notificationJobs = pgTable("notification_jobs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  
  // Job Details
  notificationType: varchar("notification_type", { length: 50 }).notNull(), // daily_reminder, streak_warning, weekly_summary
  sendAtUtc: timestamp("send_at_utc").notNull(), // When to send in UTC
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, claimed, completed, failed
  
  // Retry Logic
  attemptCount: integer("attempt_count").default(0).notNull(),
  lastAttemptAt: timestamp("last_attempt_at"),
  errorMessage: text("error_message"),
  
  // Payload Metadata (cached to avoid requerying)
  payloadMeta: jsonb("payload_meta"), // { streak, avgWpm, etc. }
  
  // Timestamps
  claimedAt: timestamp("claimed_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sendAtStatusIdx: index("notification_jobs_send_at_status_idx").on(table.sendAtUtc, table.status),
  userIdTypeIdx: index("notification_jobs_user_id_type_idx").on(table.userId, table.notificationType),
}));

// Achievements & Badges System
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  
  // Achievement Details
  key: varchar("key", { length: 50 }).notNull().unique(), // speedster_100, streak_master_30, etc.
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // speed, accuracy, consistency, streak, social
  
  // Requirements
  tier: varchar("tier", { length: 20 }).default("bronze").notNull(), // bronze, silver, gold, platinum, diamond
  requirement: jsonb("requirement").notNull(), // { type: "wpm", value: 100 } or { type: "streak", value: 30 }
  points: integer("points").default(10).notNull(), // gamification points
  
  // Visual
  icon: varchar("icon", { length: 50 }).notNull(), // lucide icon name
  color: varchar("color", { length: 50 }).notNull(), // tailwind color class
  
  // Metadata
  isSecret: boolean("is_secret").default(false).notNull(), // hidden until unlocked
  isActive: boolean("is_active").default(true).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Achievements (unlocked badges)
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  achievementId: integer("achievement_id").references(() => achievements.id, { onDelete: "cascade" }).notNull(),
  
  // Unlock Details
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  testResultId: integer("test_result_id").references(() => testResults.id, { onDelete: "set null" }),
  
  // Notification
  notified: boolean("notified").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Daily/Weekly Challenges
export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  
  // Challenge Details
  type: varchar("type", { length: 20 }).notNull(), // daily, weekly, special
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  
  // Requirements
  goal: jsonb("goal").notNull(), // { type: "tests_completed", target: 5 } or { type: "wpm_reached", target: 80 }
  difficulty: varchar("difficulty", { length: 20 }).default("medium").notNull(), // easy, medium, hard, expert
  
  // Rewards
  pointsReward: integer("points_reward").default(50).notNull(),
  badgeReward: varchar("badge_reward", { length: 50 }), // optional achievement unlock
  
  // Timing
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  // Metadata
  isActive: boolean("is_active").default(true).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // speed, accuracy, consistency, endurance
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Challenge Progress
export const userChallenges = pgTable("user_challenges", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  challengeId: integer("challenge_id").references(() => challenges.id, { onDelete: "cascade" }).notNull(),
  
  // Progress
  progress: integer("progress").default(0).notNull(), // current count toward goal
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  
  // Notifications
  startNotified: boolean("start_notified").default(false).notNull(),
  completionNotified: boolean("completion_notified").default(false).notNull(),
  
  // Metadata
  startedAt: timestamp("started_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User Gamification Profile
export const userGamification = pgTable("user_gamification", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  
  // Points & Level
  totalPoints: integer("total_points").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  experiencePoints: integer("experience_points").default(0).notNull(), // XP toward next level
  
  // Statistics
  totalAchievements: integer("total_achievements").default(0).notNull(),
  totalChallengesCompleted: integer("total_challenges_completed").default(0).notNull(),
  totalShares: integer("total_shares").default(0).notNull(), // Social sharing count
  
  // Titles & Badges
  currentTitle: varchar("current_title", { length: 100 }), // "Speed Demon", "Accuracy Master", etc.
  featuredBadges: jsonb("featured_badges"), // array of achievement IDs to display on profile
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertKeystrokeEventSchema = createInsertSchema(keystrokeEvents).omit({ id: true, createdAt: true });
export const insertTypingAnalyticsSchema = createInsertSchema(typingAnalytics).omit({ id: true, createdAt: true });
export const insertTypingInsightSchema = createInsertSchema(typingInsights).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPracticeRecommendationSchema = createInsertSchema(practiceRecommendations).omit({ id: true, createdAt: true });
export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true, updatedAt: true, expirationTime: true });
export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export const updateNotificationPreferencesSchema = insertNotificationPreferencesSchema.omit({ userId: true }).partial();
export const insertNotificationHistorySchema = createInsertSchema(notificationHistory).omit({ id: true, createdAt: true });
export const insertNotificationJobSchema = createInsertSchema(notificationJobs).omit({ id: true, createdAt: true, claimedAt: true, completedAt: true });
export const insertAchievementSchema = createInsertSchema(achievements).omit({ id: true, createdAt: true });
export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({ id: true, createdAt: true, unlockedAt: true });
export const insertChallengeSchema = createInsertSchema(challenges).omit({ id: true, createdAt: true });
export const insertUserChallengeSchema = createInsertSchema(userChallenges).omit({ id: true, startedAt: true, updatedAt: true });
export const insertUserGamificationSchema = createInsertSchema(userGamification).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertKeystrokeEvent = z.infer<typeof insertKeystrokeEventSchema>;
export type KeystrokeEvent = typeof keystrokeEvents.$inferSelect;
export type InsertTypingAnalytics = z.infer<typeof insertTypingAnalyticsSchema>;
export type TypingAnalytics = typeof typingAnalytics.$inferSelect;
export type InsertTypingInsight = z.infer<typeof insertTypingInsightSchema>;
export type TypingInsight = typeof typingInsights.$inferSelect;
export type InsertPracticeRecommendation = z.infer<typeof insertPracticeRecommendationSchema>;
export type PracticeRecommendation = typeof practiceRecommendations.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationHistory = z.infer<typeof insertNotificationHistorySchema>;
export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type InsertNotificationJob = z.infer<typeof insertNotificationJobSchema>;
export type NotificationJob = typeof notificationJobs.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challenges.$inferSelect;
export type InsertUserChallenge = z.infer<typeof insertUserChallengeSchema>;
export type UserChallenge = typeof userChallenges.$inferSelect;
export type InsertUserGamification = z.infer<typeof insertUserGamificationSchema>;
export type UserGamification = typeof userGamification.$inferSelect;
