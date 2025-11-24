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
