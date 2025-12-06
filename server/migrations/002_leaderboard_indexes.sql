-- Migration: Add production-ready indexes for all leaderboard types
-- Description: Creates optimized covering indexes for leaderboard queries
-- Date: 2025-12-06
-- 
-- These indexes enable efficient queries for:
-- 1. Global typing test leaderboards (filtered by timeframe)
-- 2. Code typing leaderboards (filtered by language)
-- 3. Dictation leaderboards
-- 4. Rating leaderboards
-- 5. Stress test leaderboards

-- Global typing test leaderboard indexes
CREATE INDEX IF NOT EXISTS idx_test_results_leaderboard 
ON test_results (wpm DESC, created_at DESC, user_id);

CREATE INDEX IF NOT EXISTS idx_test_results_user_best 
ON test_results (user_id, wpm DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_results_timeframe 
ON test_results (created_at DESC, user_id, wpm DESC);

-- Code typing leaderboard indexes
CREATE INDEX IF NOT EXISTS idx_code_typing_tests_leaderboard 
ON code_typing_tests (wpm DESC, accuracy DESC, created_at ASC, user_id);

CREATE INDEX IF NOT EXISTS idx_code_typing_tests_language 
ON code_typing_tests (programming_language, wpm DESC, accuracy DESC, created_at ASC, user_id);

-- Dictation leaderboard indexes
CREATE INDEX IF NOT EXISTS idx_dictation_tests_leaderboard 
ON dictation_tests (wpm DESC, accuracy DESC, created_at ASC, user_id);

-- Rating leaderboard indexes
CREATE INDEX IF NOT EXISTS idx_user_ratings_leaderboard 
ON user_ratings (rating DESC, wins DESC, user_id);

CREATE INDEX IF NOT EXISTS idx_user_ratings_tier 
ON user_ratings (tier, rating DESC, user_id);

-- Stress test leaderboard indexes
CREATE INDEX IF NOT EXISTS idx_stress_tests_leaderboard 
ON stress_tests (wpm DESC, accuracy DESC, created_at ASC, user_id);

-- Note: These indexes were applied to the database on 2025-12-06
-- Run individual statements if applying manually (avoid transactions for CONCURRENTLY option)
