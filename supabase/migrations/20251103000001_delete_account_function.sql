-- ============================================================================
-- Migration: Delete Account Function
-- Purpose: Secure function to anonymize user account (implements US-006)
-- Dependencies: Requires auth.users, user_offer, system_logs tables
-- ============================================================================

-- ============================================================================
-- 1. DELETE ACCOUNT FUNCTION
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: delete_user_account
-- Purpose: Anonymize and soft-delete user account data
-- Security: SECURITY DEFINER allows access to auth.users, but auth.uid() ensures
--           users can only delete their own account
-- 
-- What it does:
--   1. Soft-deletes all user's offers (sets deleted_at)
--   2. Anonymizes email in auth.users
--   3. Removes encrypted password
--   4. Logs the deletion for audit
--
-- Usage: Called from /api/auth/delete-account endpoint after user confirmation
-- 
-- Example:
--   SELECT delete_user_account();
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void AS $$
DECLARE
  user_id_param UUID;
  timestamp_val BIGINT;
  affected_offers INT;
BEGIN
  -- Get current user ID from JWT (Supabase Auth automatically provides this)
  user_id_param := auth.uid();
  
  -- Security check: Ensure user is authenticated
  IF user_id_param IS NULL THEN
    RAISE EXCEPTION 'Not authenticated - cannot delete account';
  END IF;

  -- Generate timestamp for anonymized email
  timestamp_val := EXTRACT(EPOCH FROM NOW())::BIGINT;

  -- Step 1: Soft delete all user's offer subscriptions
  -- Sets deleted_at timestamp instead of actually deleting the records
  -- This preserves historical data while making offers inaccessible to user
  UPDATE user_offer 
  SET deleted_at = NOW() 
  WHERE user_id = user_id_param
    AND deleted_at IS NULL;
  
  -- Get count of affected offers for logging
  GET DIAGNOSTICS affected_offers = ROW_COUNT;

  -- Step 2: Anonymize email and remove password in auth.users
  -- This is the critical step that makes the account unusable
  -- Note: Using SECURITY DEFINER allows this function to modify auth.users
  UPDATE auth.users 
  SET 
    email = 'deleted_' || timestamp_val || '@deleted.com',
    encrypted_password = NULL,
    email_confirmed_at = NULL,
    phone = NULL,
    phone_confirmed_at = NULL,
    -- Also clear any additional personal data
    raw_user_meta_data = '{}'::jsonb,
    raw_app_meta_data = '{}'::jsonb
  WHERE id = user_id_param;

  -- Step 3: Log the account deletion for audit trail
  INSERT INTO system_logs (level, message, context)
  VALUES (
    'info',
    'User account deleted',
    jsonb_build_object(
      'user_id', user_id_param,
      'timestamp', NOW(),
      'anonymized_email', 'deleted_' || timestamp_val || '@deleted.com',
      'affected_offers', affected_offers
    )
  );

  -- Optional: Also log in password_change_log to track this security event
  INSERT INTO password_change_log (user_id, changed_at, ip_address)
  VALUES (user_id_param, NOW(), NULL);

EXCEPTION
  WHEN OTHERS THEN
    -- Log any errors that occur during deletion
    INSERT INTO system_logs (level, message, context)
    VALUES (
      'error',
      'Failed to delete user account',
      jsonb_build_object(
        'user_id', user_id_param,
        'error', SQLERRM,
        'timestamp', NOW()
      )
    );
    
    -- Re-raise the exception so API can handle it
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_user_account() IS 
  'Anonymizes user account data (soft delete). Callable by authenticated user to delete their own account. Uses auth.uid() for security.';

-- ============================================================================
-- 2. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permission to authenticated users
-- Security: Function uses auth.uid() internally, so users can only delete their own account
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- ============================================================================
-- 3. ADDITIONAL HELPER FUNCTION (OPTIONAL)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: can_delete_account
-- Purpose: Pre-check if account can be safely deleted
-- Returns: JSON with status and any warnings
-- Usage: Can be called from UI to warn user about consequences
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_delete_account()
RETURNS jsonb AS $$
DECLARE
  user_id_param UUID;
  offer_count INT;
  result jsonb;
BEGIN
  user_id_param := auth.uid();
  
  IF user_id_param IS NULL THEN
    RETURN jsonb_build_object(
      'can_delete', false,
      'reason', 'Not authenticated'
    );
  END IF;

  -- Count active offers
  SELECT COUNT(*)
  INTO offer_count
  FROM user_offer
  WHERE user_id = user_id_param
    AND deleted_at IS NULL;

  -- Build result
  result := jsonb_build_object(
    'can_delete', true,
    'active_offers', offer_count,
    'warnings', jsonb_build_array(
      'All your tracked offers will be removed',
      'Price history data will be preserved but anonymized',
      'This action cannot be undone'
    )
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_delete_account() IS 
  'Pre-check function to show user what will happen if they delete their account';

GRANT EXECUTE ON FUNCTION can_delete_account() TO authenticated;

-- ============================================================================
-- 4. USAGE EXAMPLES AND TESTING
-- ============================================================================

-- Example 1: Call from authenticated user session
-- SELECT delete_user_account();

-- Example 2: Check if can delete (pre-check)
-- SELECT can_delete_account();
-- Returns: {"can_delete": true, "active_offers": 5, "warnings": [...]}

-- Example 3: Verify deletion worked (as admin or in tests)
-- SELECT 
--   email,
--   encrypted_password IS NULL as password_removed,
--   email_confirmed_at IS NULL as email_confirmation_removed
-- FROM auth.users
-- WHERE email LIKE 'deleted_%@deleted.com';

-- ============================================================================
-- 5. ROLLBACK PROCEDURE (IF NEEDED)
-- ============================================================================

-- If you need to rollback this migration:
-- DROP FUNCTION IF EXISTS delete_user_account();
-- DROP FUNCTION IF EXISTS can_delete_account();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

