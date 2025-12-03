-- Migration: Add production-ready indexes for stress test leaderboard
-- Description: Creates optimized covering indexes for leaderboard queries
-- Date: 2025-12-03
-- 
-- These indexes enable Index-Only Scans for the ROW_NUMBER() + DENSE_RANK() 
-- leaderboard queries, dramatically improving performance for:
-- 1. Filtered leaderboards by difficulty
-- 2. User's personal test history
-- 3. Global leaderboard rankings

-- Composite index for leaderboard queries filtered by difficulty
-- Supports: getStressTestLeaderboard(difficulty, limit)
CREATE INDEX IF NOT EXISTS idx_stress_tests_leaderboard 
ON stress_tests (difficulty, stress_score DESC, wpm DESC, created_at ASC, user_id);

-- Index for user-specific queries (get user's tests sorted by date)
-- Supports: getUserStressTests(userId, limit)
CREATE INDEX IF NOT EXISTS idx_stress_tests_user_created 
ON stress_tests (user_id, created_at DESC);

-- Index for the global leaderboard (all difficulties)
-- Supports: getStressTestLeaderboard(undefined, limit)
CREATE INDEX IF NOT EXISTS idx_stress_tests_global_rank 
ON stress_tests (stress_score DESC, wpm DESC, created_at ASC);

-- Note: Run these indexes using CONCURRENTLY in production to avoid locking:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stress_tests_leaderboard ...
