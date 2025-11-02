-- ============================================================================
-- Migration: Auth Supporting Tables
-- Purpose: Add tables for rate limiting and audit logging for auth operations
-- Dependencies: Requires auth.users table from Supabase Auth
-- ============================================================================

-- ============================================================================
-- 1. SYSTEM LOGGING TABLE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: system_logs
-- Purpose: General system logging table (used by delete_user_account function and other operations)
-- Notes:
--   - Stores logs from auth operations, scraping errors, and system events
--   - Retention policy: 90 days (handled by cleanup function)
--   - JSONB context field for flexible structured data
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error')),
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for filtering by level and sorting by time
CREATE INDEX idx_system_logs_level_time 
  ON system_logs(level, created_at DESC);

-- Index for general time-based queries
CREATE INDEX idx_system_logs_time 
  ON system_logs(created_at DESC);

COMMENT ON TABLE system_logs IS 
  'General system logging for all operations including auth, scraping, and errors';

COMMENT ON COLUMN system_logs.context IS 
  'JSONB field for structured log data (user_id, IP, error details, etc.)';

-- ============================================================================
-- 2. AUTHENTICATION RATE LIMITING TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: registration_attempts
-- Purpose: Track registration attempts for rate limiting (3/24h per IP)
-- Notes:
--   - Logs both successful and failed registration attempts
--   - Used to enforce rate limit: max 3 registrations per IP per 24h
--   - user_id is NULL for failed attempts
-- ----------------------------------------------------------------------------
CREATE TABLE registration_attempts (
  id SERIAL PRIMARY KEY,
  ip_address INET NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_code TEXT
);

-- Index for rate limiting queries (find attempts by IP in last 24h)
CREATE INDEX idx_registration_attempts_ip_time 
  ON registration_attempts(ip_address, attempted_at DESC);

-- Index for security monitoring (track attempts by email)
CREATE INDEX idx_registration_attempts_email_time 
  ON registration_attempts(email, attempted_at DESC);

COMMENT ON TABLE registration_attempts IS 
  'Logs all registration attempts for rate limiting and security monitoring';

COMMENT ON COLUMN registration_attempts.error_code IS 
  'Error code if registration failed (e.g., EMAIL_ALREADY_EXISTS, WEAK_PASSWORD)';

-- ----------------------------------------------------------------------------
-- Table: login_attempts
-- Purpose: Track login attempts for security and rate limiting
-- Notes:
--   - Logs both successful and failed login attempts
--   - Used for security monitoring and brute force protection
--   - Rate limit: 5 attempts per 15 minutes per IP
-- ----------------------------------------------------------------------------
CREATE TABLE login_attempts (
  id SERIAL PRIMARY KEY,
  ip_address INET NOT NULL,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_code TEXT
);

-- Index for rate limiting queries
CREATE INDEX idx_login_attempts_ip_time 
  ON login_attempts(ip_address, attempted_at DESC);

-- Index for security monitoring by email
CREATE INDEX idx_login_attempts_email_time 
  ON login_attempts(email, attempted_at DESC);

COMMENT ON TABLE login_attempts IS 
  'Logs all login attempts for security monitoring and rate limiting';

COMMENT ON COLUMN login_attempts.error_code IS 
  'Error code if login failed (e.g., INVALID_CREDENTIALS, EMAIL_NOT_VERIFIED)';

-- ----------------------------------------------------------------------------
-- Table: password_change_log
-- Purpose: Audit log for password changes
-- Notes:
--   - Security audit trail for password modifications
--   - Includes IP and user agent for forensics
--   - Retention: 90 days
-- ----------------------------------------------------------------------------
CREATE TABLE password_change_log (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Index for user-specific password history
CREATE INDEX idx_password_change_log_user_time 
  ON password_change_log(user_id, changed_at DESC);

COMMENT ON TABLE password_change_log IS 
  'Audit log of password changes for security purposes';

-- ----------------------------------------------------------------------------
-- Table: email_verification_resends
-- Purpose: Track verification email resends for rate limiting (1/minute)
-- Notes:
--   - Prevents spam and abuse of email system
--   - Rate limit: 1 resend per email per minute
--   - Retention: 7 days (shorter than other logs)
-- ----------------------------------------------------------------------------
CREATE TABLE email_verification_resends (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  resent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for rate limiting queries (find recent resends by email)
CREATE INDEX idx_email_verification_resends_email_time 
  ON email_verification_resends(email, resent_at DESC);

COMMENT ON TABLE email_verification_resends IS 
  'Tracks verification email resends for rate limiting';

-- ============================================================================
-- 3. CLEANUP FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: cleanup_auth_logs
-- Purpose: Delete old logs according to retention policy
-- Retention Policy:
--   - registration_attempts: 90 days
--   - login_attempts: 90 days
--   - password_change_log: 90 days
--   - email_verification_resends: 7 days
--   - system_logs: 90 days
-- Usage: Should be scheduled to run daily (e.g., via pg_cron or external job)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_auth_logs()
RETURNS void AS $$
BEGIN
  -- Delete old registration attempts (90 days)
  DELETE FROM registration_attempts 
  WHERE attempted_at < NOW() - INTERVAL '90 days';
  
  -- Delete old login attempts (90 days)
  DELETE FROM login_attempts 
  WHERE attempted_at < NOW() - INTERVAL '90 days';
  
  -- Delete old password change logs (90 days)
  DELETE FROM password_change_log 
  WHERE changed_at < NOW() - INTERVAL '90 days';
  
  -- Delete old email resend logs (7 days - shorter retention)
  DELETE FROM email_verification_resends 
  WHERE resent_at < NOW() - INTERVAL '7 days';
  
  -- Delete old system logs (90 days)
  DELETE FROM system_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Log the cleanup operation
  INSERT INTO system_logs (level, message, context)
  VALUES (
    'info',
    'Auth logs cleanup completed',
    jsonb_build_object(
      'timestamp', NOW(),
      'retention_days', 90
    )
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_auth_logs() IS 
  'Cleans up old auth logs according to retention policy (90 days for most, 7 days for email resends)';

-- ============================================================================
-- 4. HELPER FUNCTIONS FOR RATE LIMITING
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: check_registration_rate_limit
-- Purpose: Check if IP address has exceeded registration rate limit
-- Returns: TRUE if rate limit exceeded, FALSE if OK to proceed
-- Rate Limit: 3 successful registrations per 24 hours per IP
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_registration_rate_limit(ip INET)
RETURNS BOOLEAN AS $$
DECLARE
  attempt_count INT;
BEGIN
  -- Count successful registrations from this IP in last 24 hours
  SELECT COUNT(*)
  INTO attempt_count
  FROM registration_attempts
  WHERE ip_address = ip
    AND success = TRUE
    AND attempted_at > NOW() - INTERVAL '24 hours';
  
  -- Return TRUE if limit exceeded
  RETURN attempt_count >= 3;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_registration_rate_limit(INET) IS 
  'Returns TRUE if IP has exceeded registration rate limit (3/24h)';

-- ----------------------------------------------------------------------------
-- Function: check_login_rate_limit
-- Purpose: Check if IP address has exceeded login attempt rate limit
-- Returns: TRUE if rate limit exceeded, FALSE if OK to proceed
-- Rate Limit: 5 attempts per 15 minutes per IP
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_login_rate_limit(ip INET)
RETURNS BOOLEAN AS $$
DECLARE
  attempt_count INT;
BEGIN
  -- Count all login attempts (successful or not) from this IP in last 15 minutes
  SELECT COUNT(*)
  INTO attempt_count
  FROM login_attempts
  WHERE ip_address = ip
    AND attempted_at > NOW() - INTERVAL '15 minutes';
  
  -- Return TRUE if limit exceeded
  RETURN attempt_count >= 5;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_login_rate_limit(INET) IS 
  'Returns TRUE if IP has exceeded login rate limit (5/15min)';

-- ----------------------------------------------------------------------------
-- Function: check_email_resend_cooldown
-- Purpose: Check if email is in cooldown period for verification resend
-- Returns: TRUE if in cooldown (cannot resend), FALSE if OK to resend
-- Cooldown: 1 minute between resends
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_email_resend_cooldown(email_address TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  last_resend TIMESTAMPTZ;
BEGIN
  -- Find most recent resend for this email
  SELECT MAX(resent_at)
  INTO last_resend
  FROM email_verification_resends
  WHERE email = email_address;
  
  -- If never sent, or sent more than 1 minute ago, OK to send
  IF last_resend IS NULL OR last_resend < NOW() - INTERVAL '1 minute' THEN
    RETURN FALSE;
  END IF;
  
  -- In cooldown period
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_email_resend_cooldown(TEXT) IS 
  'Returns TRUE if email is in cooldown period for resend (1 minute)';

-- ============================================================================
-- 5. LOGGING HELPER FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: log_registration_attempt
-- Purpose: Log a registration attempt (success or failure)
-- Usage: Called from API endpoint after registration attempt
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_registration_attempt(
  p_ip_address INET,
  p_email TEXT,
  p_user_id UUID DEFAULT NULL,
  p_success BOOLEAN DEFAULT FALSE,
  p_error_code TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO registration_attempts (
    ip_address,
    email,
    user_id,
    success,
    error_code
  ) VALUES (
    p_ip_address,
    p_email,
    p_user_id,
    p_success,
    p_error_code
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_registration_attempt IS 
  'Logs a registration attempt with outcome and error code if failed';

-- ----------------------------------------------------------------------------
-- Function: log_login_attempt
-- Purpose: Log a login attempt (success or failure)
-- Usage: Called from API endpoint after login attempt
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_login_attempt(
  p_ip_address INET,
  p_email TEXT,
  p_user_id UUID DEFAULT NULL,
  p_success BOOLEAN DEFAULT FALSE,
  p_error_code TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO login_attempts (
    ip_address,
    email,
    user_id,
    success,
    error_code
  ) VALUES (
    p_ip_address,
    p_email,
    p_user_id,
    p_success,
    p_error_code
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_login_attempt IS 
  'Logs a login attempt with outcome and error code if failed';

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users for rate limit checks
-- These functions are safe to expose as they only read data
GRANT EXECUTE ON FUNCTION check_registration_rate_limit(INET) TO authenticated;
GRANT EXECUTE ON FUNCTION check_login_rate_limit(INET) TO authenticated;
GRANT EXECUTE ON FUNCTION check_email_resend_cooldown(TEXT) TO authenticated;

-- Grant execute permissions for logging functions
-- These will be called from API endpoints (server-side)
GRANT EXECUTE ON FUNCTION log_registration_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION log_login_attempt TO authenticated;

-- ============================================================================
-- 7. SCHEDULING (OPTIONAL - REQUIRES pg_cron EXTENSION)
-- ============================================================================

-- Uncomment the following line if pg_cron extension is available
-- This will automatically clean up old logs every day at 2 AM
-- 
-- SELECT cron.schedule(
--   'cleanup-auth-logs',
--   '0 2 * * *',  -- Every day at 2:00 AM
--   'SELECT cleanup_auth_logs()'
-- );
--
-- Note: If pg_cron is not available, cleanup_auth_logs() should be called
-- manually or via external cron job/scheduled task

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

