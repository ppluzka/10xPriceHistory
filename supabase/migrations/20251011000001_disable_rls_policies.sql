-- ============================================================================
-- Migration: Disable RLS Policies
-- Purpose: Drop all RLS policies from offers, user_offer, and price_history tables
-- Affected: offers, user_offer, price_history tables
-- ============================================================================

-- ============================================================================
-- 1. DROP POLICIES FOR OFFERS TABLE
-- ============================================================================

-- Drop anonymous select policy
drop policy if exists offers_select_anon on offers;

-- Drop authenticated select policy
drop policy if exists offers_select_authenticated on offers;

-- Drop authenticated insert policy
drop policy if exists offers_insert_authenticated on offers;

-- Drop authenticated update policy
drop policy if exists offers_update_authenticated on offers;

-- ============================================================================
-- 2. DROP POLICIES FOR USER_OFFER TABLE
-- ============================================================================

-- Drop authenticated select policy
drop policy if exists user_offer_select_authenticated on user_offer;

-- Drop authenticated insert policy
drop policy if exists user_offer_insert_authenticated on user_offer;

-- Drop authenticated update policy
drop policy if exists user_offer_update_authenticated on user_offer;

-- ============================================================================
-- 3. DROP POLICIES FOR PRICE_HISTORY TABLE
-- ============================================================================

-- Drop anonymous select policy
drop policy if exists price_history_select_anon on price_history;

-- Drop authenticated select policy
drop policy if exists price_history_select_authenticated on price_history;

-- ============================================================================
-- 4. DISABLE RLS ON ALL TABLES
-- ============================================================================

-- Disable RLS on offers table
alter table offers disable row level security;

-- Disable RLS on user_offer table
alter table user_offer disable row level security;

-- Disable RLS on price_history table
alter table price_history disable row level security;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

