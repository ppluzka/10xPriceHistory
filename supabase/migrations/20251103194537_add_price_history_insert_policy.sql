-- ============================================================================
-- migration: add price_history insert policy
-- purpose: allow authenticated users to insert price history entries
-- affected tables: price_history
-- rationale: 
--   - authenticated users need to insert initial price when adding offers
--   - users can only insert price_history for offers they subscribe to
--   - this fixes the RLS violation error when adding new offers
-- ============================================================================

-- ============================================================================
-- 1. add insert policy for price_history
-- ============================================================================

-- policy: allow authenticated users to insert price history for their subscribed offers
-- rationale: users need to insert initial price when adding a new offer
-- security: ensures users can only insert price_history for offers they track
create policy price_history_insert_authenticated on price_history
  for insert
  to authenticated
  with check (
    exists (
      select 1 from user_offer
      where user_offer.offer_id = price_history.offer_id
        and user_offer.user_id = auth.uid()
        and user_offer.deleted_at is null
    )
  );

-- ============================================================================
-- end of migration
-- ============================================================================

