-- ============================================================================
-- Migration: Disable RLS Policies for user_preferences
-- Purpose: Drop all RLS policies from user_preferences table and disable RLS
-- Affected: user_preferences table
-- Rationale: Application currently uses default user ID without proper auth,
--            RLS policies prevent INSERT operations with auth.uid() checks
-- ============================================================================

-- ============================================================================
-- 1. DROP POLICIES FOR USER_PREFERENCES TABLE
-- ============================================================================

-- Drop authenticated select policy
drop policy if exists user_preferences_select_authenticated on user_preferences;

-- Drop authenticated insert policy
drop policy if exists user_preferences_insert_authenticated on user_preferences;

-- Drop authenticated update policy
drop policy if exists user_preferences_update_authenticated on user_preferences;

-- ============================================================================
-- 2. DISABLE RLS ON USER_PREFERENCES TABLE
-- ============================================================================

-- Disable RLS on user_preferences table
alter table user_preferences disable row level security;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

