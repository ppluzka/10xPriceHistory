-- ============================================================================
-- migration: add soft delete user_offer function
-- purpose: create a secure function to handle soft-delete of user subscriptions
-- issue: RLS with check clause fails on UPDATE operations even with valid auth.uid()
-- solution: use SECURITY DEFINER function that bypasses RLS but verifies ownership
-- ============================================================================

-- ============================================================================
-- function: soft_delete_user_offer
-- purpose: securely soft-delete a user's subscription to an offer
-- security: uses SECURITY DEFINER to bypass RLS, but verifies auth.uid() internally
--           ensures users can only soft-delete their own subscriptions
-- ============================================================================

create or replace function soft_delete_user_offer(
  p_offer_id integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_subscription_exists boolean;
begin
  -- get the current authenticated user id
  -- this is critical for security - we verify ownership even though we bypass RLS
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  -- check if active subscription exists for this user and offer
  select exists (
    select 1
    from user_offer
    where user_id = v_user_id
      and offer_id = p_offer_id
      and deleted_at is null
  ) into v_subscription_exists;

  -- if subscription doesn't exist or is already deleted, return false
  if not v_subscription_exists then
    return false;
  end if;

  -- perform soft-delete by setting deleted_at timestamp
  -- this bypasses RLS because the function uses SECURITY DEFINER
  -- but we've already verified ownership above
  update user_offer
  set deleted_at = now()
  where user_id = v_user_id
    and offer_id = p_offer_id
    and deleted_at is null;

  -- return true if update was successful
  return found;
end;
$$;

-- grant execute permission to authenticated users
-- the function itself verifies ownership, so this is safe
grant execute on function soft_delete_user_offer(integer) to authenticated;

-- add comment explaining the function's purpose and security model
comment on function soft_delete_user_offer(integer) is 
  'Soft-deletes a user subscription to an offer. Uses SECURITY DEFINER to bypass RLS but verifies auth.uid() internally to ensure users can only delete their own subscriptions.';

