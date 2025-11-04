-- ============================================================================
-- migration: add upsert user_offer function
-- purpose: handle subscription creation/reactivation that bypasses RLS
-- issue: RLS SELECT policy filters out soft-deleted records, causing duplicate key errors
-- solution: use SECURITY DEFINER function to check and reactivate soft-deleted subscriptions
-- ============================================================================

-- ============================================================================
-- function: upsert_user_offer
-- purpose: securely create or reactivate a user's subscription to an offer
-- security: uses SECURITY DEFINER to bypass RLS, but verifies auth.uid() internally
--           ensures users can only create/reactivate their own subscriptions
-- returns: 
--   'created' - new subscription was created
--   'reactivated' - existing soft-deleted subscription was reactivated
--   'exists' - active subscription already exists (error condition)
-- ============================================================================

create or replace function upsert_user_offer(
  p_offer_id integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_subscription_exists boolean;
  v_is_deleted boolean;
begin
  -- get the current authenticated user id
  -- this is critical for security - we verify ownership even though we bypass RLS
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  -- check if subscription exists (including soft-deleted ones)
  -- this bypasses RLS because the function uses SECURITY DEFINER
  select exists (
    select 1
    from user_offer
    where user_id = v_user_id
      and offer_id = p_offer_id
  ) into v_subscription_exists;

  -- if subscription exists, check if it's soft-deleted
  if v_subscription_exists then
    select deleted_at is not null
    into v_is_deleted
    from user_offer
    where user_id = v_user_id
      and offer_id = p_offer_id;

    -- if subscription is active, return error
    if not v_is_deleted then
      return 'exists';
    end if;

    -- if subscription is soft-deleted, reactivate it
    update user_offer
    set deleted_at = null
    where user_id = v_user_id
      and offer_id = p_offer_id
      and deleted_at is not null;

    return 'reactivated';
  end if;

  -- subscription doesn't exist, create new one
  insert into user_offer (user_id, offer_id)
  values (v_user_id, p_offer_id);

  return 'created';
end;
$$;

-- grant execute permission to authenticated users
-- the function itself verifies ownership, so this is safe
grant execute on function upsert_user_offer(integer) to authenticated;

-- add comment explaining the function's purpose and security model
comment on function upsert_user_offer(integer) is 
  'Creates or reactivates a user subscription to an offer. Uses SECURITY DEFINER to bypass RLS but verifies auth.uid() internally. Returns "created" for new subscriptions, "reactivated" for soft-deleted ones, or "exists" if already active.';

