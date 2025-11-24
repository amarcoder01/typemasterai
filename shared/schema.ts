import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  avatarColor: text("avatar_color").default("bg-primary"),
  bio: text("bio"),
  country: text("country"),
  keyboardLayout: text("keyboard_layout").default("QWERTY"),
  currentStreak: integer("current_streak").default(0).notNull(),
  bestStreak: integer("best_streak").default(0).notNull(),
  lastTestDate: timestamp("last_test_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must be less than 30 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100, "Password must be less than 100 characters"),
}).omit({ id: true, createdAt: true });

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
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
  timestamp: integer("timestamp").notNull(),
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
  timestamp: z.number().int().min(0),
}).omit({ id: true, createdAt: true });

export type InsertKeystrokeAnalytics = z.infer<typeof insertKeystrokeAnalyticsSchema>;
export type KeystrokeAnalytics = typeof keystrokeAnalytics.$inferSelect;

// Multiplayer Racing System
export const races = pgTable("races", {
  id: serial("id").primaryKey(),
  roomCode: varchar("room_code", { length: 6 }).notNull().unique(),
  status: text("status").notNull().default("waiting"), // waiting, countdown, racing, finished
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
  accuracy: real("accuracy").notNull().default(0),
  errors: integer("errors").notNull().default(0),
  isFinished: integer("is_finished").notNull().default(0),
  finishPosition: integer("finish_position"),
  finishedAt: timestamp("finished_at"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (table) => ({
  raceIdIdx: index("participant_race_id_idx").on(table.raceId),
  userIdIdx: index("participant_user_id_idx").on(table.userId),
  raceStatusIdx: index("participant_race_status_idx").on(table.raceId, table.isFinished),
}));

export const insertRaceSchema = createInsertSchema(races, {
  roomCode: z.string().length(6),
  status: z.enum(["waiting", "countdown", "racing", "finished"]),
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
