-- ============================================================================
-- Migration: Monitoring and Error Logging Tables
-- Purpose: Create tables for system monitoring, logging, and error tracking
-- Affected: system_logs, error_log
-- Special Considerations: 
--   - These tables are service-level, not user-facing (no RLS needed)
--   - Indexes optimized for time-based queries
--   - Consider retention policies for log cleanup
-- ============================================================================

-- ============================================================================
-- 1. SYSTEM LOGS TABLE (ALTER EXISTING)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: system_logs (modifications to existing table)
-- Purpose: Extend existing auth logging table to also support price monitoring
-- Notes:
--   - Table already exists from auth_support_tables migration
--   - Adding columns for price checking and monitoring functionality
--   - Maintains backward compatibility with auth logging (level, context)
--   - New monitoring logs will use (event_type, offer_id, metadata)
-- ----------------------------------------------------------------------------

-- Add new columns for monitoring functionality
-- These columns are nullable to maintain compatibility with existing auth logs
ALTER TABLE system_logs 
  ADD COLUMN IF NOT EXISTS offer_id int REFERENCES offers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Make 'level' column nullable since monitoring logs won't use it
ALTER TABLE system_logs 
  ALTER COLUMN level DROP NOT NULL;

-- Update table comment
COMMENT ON TABLE system_logs IS 
  'System events including auth operations, price monitoring, and operational logs';

-- Add comments for new columns
COMMENT ON COLUMN system_logs.offer_id IS 
  'Reference to offer (for price check logs only, NULL for auth logs)';

COMMENT ON COLUMN system_logs.event_type IS 
  'Event category for monitoring: price_check_success, price_check_failed, alert_sent, price_anomaly_detected, etc. (NULL for auth logs)';

COMMENT ON COLUMN system_logs.metadata IS 
  'Additional monitoring data (used by price check logs, similar to context field used by auth logs)';

-- ============================================================================
-- 2. ERROR LOG TABLE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: error_log
-- Purpose: Stores detailed error information for failed price checks
-- Notes:
--   - Tracks retry attempts to diagnose recurring issues
--   - error_stack provides full stack trace for debugging
--   - Links to offers for error analysis per offer
-- ----------------------------------------------------------------------------
create table if not exists error_log (
  id uuid primary key default gen_random_uuid(),
  offer_id int references offers(id) on delete cascade,
  error_message text not null,
  error_stack text,
  attempt_number int,
  created_at timestamptz not null default now()
);

-- Comment for documentation
comment on table error_log is 'Detailed error information for failed price checks and scraping attempts';
comment on column error_log.attempt_number is 'Which retry attempt this error occurred on (1-3)';
comment on column error_log.error_stack is 'Full stack trace for debugging purposes';

-- ============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for time-based queries on system_logs
-- Used by MonitoringService to calculate success rates
create index if not exists idx_system_logs_created_at 
  on system_logs(created_at desc);

-- Index for filtering logs by event type
-- Optimizes queries for specific event categories
create index if not exists idx_system_logs_event_type 
  on system_logs(event_type);

-- Composite index for offer-specific logs
-- Used to analyze history for specific offers
create index if not exists idx_system_logs_offer_created 
  on system_logs(offer_id, created_at desc) 
  where offer_id is not null;

-- Index for error_log time-based queries
-- Used for error rate calculations and debugging
create index if not exists idx_error_log_created_at 
  on error_log(created_at desc);

-- Composite index for offer-specific errors
-- Used to identify problematic offers
create index if not exists idx_error_log_offer_created 
  on error_log(offer_id, created_at desc) 
  where offer_id is not null;

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

-- Note: RLS is NOT enabled on system_logs and error_log
-- These are service-level tables accessed only by backend services
-- and admin users, not by regular authenticated users

-- If admin access is needed in the future, enable RLS with:
-- alter table system_logs enable row level security;
-- alter table error_log enable row level security;
-- Then create appropriate policies for admin role

-- ============================================================================
-- 5. DATA RETENTION (OPTIONAL)
-- ============================================================================

-- Optional: Create function to clean up old logs (30 days for system_logs, 90 days for error_log)
-- Uncomment if automatic cleanup is desired

-- create or replace function cleanup_old_logs()
-- returns void as $$
-- begin
--   -- Delete system_logs older than 30 days
--   delete from system_logs
--   where created_at < now() - interval '30 days';
--   
--   -- Delete error_log older than 90 days
--   delete from error_log
--   where created_at < now() - interval '90 days';
-- end;
-- $$ language plpgsql;

-- Optional: Schedule cleanup with pg_cron (requires pg_cron extension)
-- select cron.schedule(
--   'cleanup_old_logs',
--   '0 2 * * *', -- Run at 2 AM daily
--   'select cleanup_old_logs()'
-- );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

