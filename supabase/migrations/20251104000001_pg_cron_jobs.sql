-- ============================================================================
-- Migration: pg_cron Scheduled Jobs for Price Monitoring
-- Purpose: Setup scheduled jobs to trigger price checking at various intervals
-- Requirements: pg_cron extension must be enabled
-- Special Considerations:
--   - Requires pg_net extension for HTTP requests
--   - CRON_SECRET must be configured in app settings
--   - Adjust schedule times based on traffic patterns
-- ============================================================================

-- ============================================================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- ============================================================================

-- Enable pg_cron extension for scheduled jobs
create extension if not exists pg_cron;

-- Enable pg_net extension for HTTP requests from database
create extension if not exists pg_net;

-- ============================================================================
-- 2. CREATE FUNCTION TO TRIGGER PRICE CHECKS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: check_offer_prices
-- Purpose: Makes HTTP POST request to /api/cron/check-prices endpoint
-- Notes:
--   - Uses pg_net to make asynchronous HTTP requests
--   - Reads CRON_SECRET from app.cron_secret setting
--   - Endpoint URL should be configured for your domain
-- ----------------------------------------------------------------------------
create or replace function check_offer_prices()
returns void
language plpgsql
security definer
as $$
declare
  api_url text;
  cron_secret text;
begin
  -- Configure your domain here
  -- For development: 'http://localhost:4321/api/cron/check-prices'
  -- For production: 'https://your-domain.com/api/cron/check-prices'
  api_url := 'http://localhost:3001/api/cron/check-prices';
  
  -- Get CRON_SECRET from app settings
  -- Set this with: ALTER DATABASE postgres SET app.cron_secret = 'your-secret';
  cron_secret := current_setting('app.cron_secret', true);
  
  if cron_secret is null or cron_secret = '' then
    raise warning 'CRON_SECRET not configured in app.cron_secret setting';
    return;
  end if;
  
  -- Make asynchronous HTTP POST request
  perform
    net.http_post(
      url := api_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || cron_secret
      ),
      body := jsonb_build_object('triggered_by', 'pg_cron')
    );
    
  raise notice 'Price check job triggered at %', now();
end;
$$;

-- Comment for documentation
comment on function check_offer_prices is 'Triggers HTTP request to /api/cron/check-prices endpoint for scheduled price checking';

-- ============================================================================
-- 3. SCHEDULE CRON JOBS
-- ============================================================================

-- Note: Schedules use standard cron syntax: minute hour day month weekday
-- Times are in UTC

-- ----------------------------------------------------------------------------
-- Schedule: Every 6 hours
-- Pattern: 0 */6 * * *
-- Description: Runs at 00:00, 06:00, 12:00, 18:00 UTC daily
-- ----------------------------------------------------------------------------
select cron.schedule(
  'check_prices_6h',
  '0 */6 * * *',
  $$select check_offer_prices()$$
);

-- ----------------------------------------------------------------------------
-- Schedule: Every 12 hours
-- Pattern: 0 */12 * * *
-- Description: Runs at 00:00 and 12:00 UTC daily
-- ----------------------------------------------------------------------------
select cron.schedule(
  'check_prices_12h',
  '0 */12 * * *',
  $$select check_offer_prices()$$
);

-- ----------------------------------------------------------------------------
-- Schedule: Every 24 hours (daily)
-- Pattern: 0 0 * * *
-- Description: Runs at midnight UTC daily
-- ----------------------------------------------------------------------------
select cron.schedule(
  'check_prices_24h',
  '0 0 * * *',
  $$select check_offer_prices()$$
);

-- ----------------------------------------------------------------------------
-- Schedule: Every 48 hours (every other day)
-- Pattern: 0 0 */2 * *
-- Description: Runs at midnight UTC every 2 days
-- ----------------------------------------------------------------------------
select cron.schedule(
  'check_prices_48h',
  '0 0 */2 * *',
  $$select check_offer_prices()$$
);

-- ============================================================================
-- 4. UTILITY QUERIES FOR MANAGEMENT
-- ============================================================================

-- View all scheduled jobs
-- select * from cron.job;

-- View job execution history
-- select * from cron.job_run_details order by start_time desc limit 20;

-- Unschedule a job (if needed)
-- select cron.unschedule('check_prices_6h');

-- Update job schedule (if needed)
-- select cron.schedule('check_prices_6h', '0 */6 * * *', $$select check_offer_prices()$$);

-- ============================================================================
-- 5. SETUP INSTRUCTIONS
-- ============================================================================

-- Before running this migration:
-- 1. Enable pg_cron in Supabase dashboard (Database > Extensions)
-- 2. Enable pg_net in Supabase dashboard (Database > Extensions)
-- 3. Set CRON_SECRET in database settings:
--    ALTER DATABASE postgres SET app.cron_secret = 'your-secure-secret-here';
-- 4. Update api_url in check_offer_prices() function with your actual domain
-- 5. Set CRON_SECRET environment variable in your Astro app (.env)

-- To set CRON_SECRET (run this in SQL Editor):
-- ALTER DATABASE postgres SET app.cron_secret = 'your-secure-secret-here';

-- To verify setting:
-- SELECT current_setting('app.cron_secret', true);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

