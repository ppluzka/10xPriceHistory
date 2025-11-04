-- ============================================================================
-- migration: fix user_offer update policy
-- purpose: ensure UPDATE policy allows soft-delete operations
-- issue: with check clause was failing on UPDATE operations
-- ============================================================================

-- Drop the existing update policy
drop policy if exists user_offer_update_authenticated on user_offer;

-- Recreate the update policy with explicit handling for soft-delete
-- The using clause checks the existing row (before update)
-- The with check clause checks the new row (after update)
-- Both should allow the update as long as user_id matches auth.uid()
create policy user_offer_update_authenticated on user_offer
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Note: The policy allows updating any column as long as user_id matches
-- This includes setting deleted_at for soft-delete operations

