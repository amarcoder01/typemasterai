import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, real, index, jsonb, boolean } from "drizzle-orm/pg-core";
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
  difficulty: text("difficulty").notNull(), // beginner, intermediate, expert, nightmare
  enabledEffects: jsonb("enabled_effects").notNull(), // {screenShake, distractions, sounds, speedIncrease, limitedVisibility, etc}
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
  difficulty: z.enum(["beginner", "intermediate", "expert", "nightmare"]),
  enabledEffects: z.object({
    screenShake: z.boolean(),
    distractions: z.boolean(),
    sounds: z.boolean(),
    speedIncrease: z.boolean(),
    limitedVisibility: z.boolean(),
    colorShift: z.boolean(),
    gravity: z.boolean(),
    rotation: z.boolean(),
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
