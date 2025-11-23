import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;

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
