-- ============================================================================
-- migration: enable comprehensive rls policies
-- purpose: re-enable row level security with complete crud policies for all tables
-- affected tables: offers, user_offer, price_history, user_preferences, api_usage
-- special considerations:
--   - follows granular policy pattern (one policy per operation per role)
--   - maintains data isolation between users where appropriate
--   - allows public read access for offers and price_history
--   - service-level operations handled via service_role bypass
-- ============================================================================

-- ============================================================================
-- 1. enable rls on all tables
-- ============================================================================

-- enable rls on offers table
-- rationale: offers should be publicly readable but modifications controlled
alter table offers enable row level security;

-- enable rls on user_offer table
-- rationale: user subscriptions must be isolated per user
alter table user_offer enable row level security;

-- enable rls on price_history table
-- rationale: price data is public but insertions controlled
alter table price_history enable row level security;

-- enable rls on user_preferences table
-- rationale: user settings must be private to each user
alter table user_preferences enable row level security;

-- enable rls on api_usage table (if not already enabled)
-- rationale: api usage data must be private to each user
alter table api_usage enable row level security;

-- ============================================================================
-- 2. rls policies: offers table
-- ============================================================================

-- policy: allow anonymous users to select offers
-- rationale: public read access to browse available offers without authentication
create policy offers_select_anon on offers
  for select
  to anon
  using (true);

-- policy: allow authenticated users to select offers
-- rationale: authenticated users can browse all active offers
create policy offers_select_authenticated on offers
  for select
  to authenticated
  using (true);

-- policy: allow authenticated users to insert offers
-- rationale: authenticated users can add new offers to the system for tracking
create policy offers_insert_authenticated on offers
  for insert
  to authenticated
  with check (true);

-- policy: allow authenticated users to update their subscribed offers
-- rationale: users can modify offer metadata (title, selector, frequency) only for offers they track
-- security: ensures users cannot modify offers they don't subscribe to
create policy offers_update_authenticated on offers
  for update
  to authenticated
  using (
    exists (
      select 1 from user_offer
      where user_offer.offer_id = offers.id
        and user_offer.user_id = auth.uid()
        and user_offer.deleted_at is null
    )
  );

-- policy: allow authenticated users to delete offers they own
-- rationale: users can remove offers if they are the only subscriber
-- security: prevents deletion if other users are tracking the offer
-- note: this is a destructive operation, use carefully
create policy offers_delete_authenticated on offers
  for delete
  to authenticated
  using (
    exists (
      select 1 from user_offer
      where user_offer.offer_id = offers.id
        and user_offer.user_id = auth.uid()
        and user_offer.deleted_at is null
    )
    and not exists (
      select 1 from user_offer uo2
      where uo2.offer_id = offers.id
        and uo2.user_id != auth.uid()
        and uo2.deleted_at is null
    )
  );

-- ============================================================================
-- 3. rls policies: user_offer table
-- ============================================================================

-- policy: allow authenticated users to select their own subscriptions
-- rationale: users can view only their own offer subscriptions
-- security: filters by user_id and excludes soft-deleted records
create policy user_offer_select_authenticated on user_offer
  for select
  to authenticated
  using (user_id = auth.uid() and deleted_at is null);

-- policy: allow authenticated users to insert their own subscriptions
-- rationale: users can subscribe to new offers to start tracking prices
-- security: enforces user_id matches authenticated user
create policy user_offer_insert_authenticated on user_offer
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- policy: allow authenticated users to update their own subscriptions
-- rationale: users can modify their subscriptions (primarily for soft-delete via deleted_at)
-- security: both using and with check clauses ensure user owns the record
create policy user_offer_update_authenticated on user_offer
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- policy: allow authenticated users to delete their own subscriptions
-- rationale: users can permanently remove their subscription records if needed
-- security: ensures users can only delete their own subscriptions
-- note: soft-delete via update is preferred, this is for hard deletion
create policy user_offer_delete_authenticated on user_offer
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- 4. rls policies: price_history table
-- ============================================================================

-- policy: allow anonymous users to select price history
-- rationale: public read access to price data for browsing and charts
-- security: read-only access, no user context needed
create policy price_history_select_anon on price_history
  for select
  to anon
  using (true);

-- policy: allow authenticated users to select price history
-- rationale: authenticated users can view price history for any offer
-- note: could be restricted to subscribed offers only if needed
create policy price_history_select_authenticated on price_history
  for select
  to authenticated
  using (true);

-- note: insert/update/delete on price_history is handled by backend service
-- using service_role which bypasses rls. no user-facing policies needed.
-- if direct user access is required, add policies here with appropriate checks.

-- ============================================================================
-- 5. rls policies: user_preferences table
-- ============================================================================

-- policy: allow authenticated users to select their own preferences
-- rationale: users can view their own settings and default configurations
-- security: filters by user_id to ensure privacy
create policy user_preferences_select_authenticated on user_preferences
  for select
  to authenticated
  using (user_id = auth.uid());

-- policy: allow authenticated users to insert their own preferences
-- rationale: users can create their preferences on first login or registration
-- security: enforces user_id matches authenticated user
create policy user_preferences_insert_authenticated on user_preferences
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- policy: allow authenticated users to update their own preferences
-- rationale: users can modify their settings at any time
-- security: both using and with check ensure user owns the record
create policy user_preferences_update_authenticated on user_preferences
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- policy: allow authenticated users to delete their own preferences
-- rationale: users can reset or remove their preferences if needed
-- security: ensures users can only delete their own settings
create policy user_preferences_delete_authenticated on user_preferences
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- 6. rls policies: api_usage table
-- ============================================================================

-- drop existing policies to recreate with consistent naming
drop policy if exists "Users can view their own API usage" on api_usage;
drop policy if exists "Service role can insert API usage" on api_usage;

-- policy: allow authenticated users to select their own api usage
-- rationale: users can view their own api consumption and costs for transparency
-- security: filters by user_id to ensure privacy
create policy api_usage_select_authenticated on api_usage
  for select
  to authenticated
  using (user_id = auth.uid());

-- policy: allow insert for service operations
-- rationale: backend services need to log api usage regardless of user context
-- security: insert-only access, all records allowed for logging purposes
-- note: service_role bypasses rls, this is for potential authenticated context
create policy api_usage_insert_all on api_usage
  for insert
  to authenticated, anon
  with check (true);

-- note: update/delete on api_usage should be restricted
-- api usage logs should be immutable for audit purposes
-- only service_role (which bypasses rls) should modify historical logs

-- ============================================================================
-- end of migration
-- ============================================================================

