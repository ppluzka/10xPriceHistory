-- ============================================================================
-- Migration: Initial Schema for PriceHistory Application
-- Purpose: Create base schema including enums, tables, indexes, and RLS policies
-- Affected: All core tables (offers, user_offer, price_history, user_preferences)
-- Special Considerations: 
--   - RLS enabled on all user-facing tables
--   - Soft-delete pattern on user_offer
--   - Rate limiting trigger for offer additions
-- ============================================================================

-- ============================================================================
-- 1. ENUMERATED TYPES
-- ============================================================================

-- Supported currencies for price entries
-- Used in price_history table to standardize currency representation
create type currency as enum ('PLN', 'EUR', 'USD', 'GBP');

-- Status of an offer
-- Tracks whether offer is actively monitored, removed, or has scraping errors
create type offer_status as enum ('active', 'removed', 'error');

-- Allowed checking frequencies
-- Determines how often an offer should be checked for price updates
create type frequency as enum ('6h', '12h', '24h', '48h');

-- ============================================================================
-- 2. CORE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: offers
-- Purpose: Stores offer URLs and metadata for price tracking
-- Notes: 
--   - url is unique to prevent duplicate tracking
--   - selector is CSS selector for scraping price from page
--   - status tracks if offer is still valid and scrapeable
-- ----------------------------------------------------------------------------
create table offers (
  id serial primary key,
  url text not null unique,
  title text not null,
  image_url text,
  selector text not null,
  city text not null,
  status offer_status not null default 'active',
  frequency frequency not null default '24h',
  last_checked timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on offers table
alter table offers enable row level security;

-- ----------------------------------------------------------------------------
-- Table: user_offer (Subscription/Junction Table)
-- Purpose: Many-to-many relationship between users and offers
-- Notes: 
--   - Implements soft-delete pattern via deleted_at column
--   - Composite primary key ensures no duplicate subscriptions
--   - References auth.users managed by Supabase Auth
-- ----------------------------------------------------------------------------
create table user_offer (
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id int not null references offers(id) on delete cascade,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, offer_id),
  unique (user_id, offer_id)
);

-- Enable RLS on user_offer table
alter table user_offer enable row level security;

-- ----------------------------------------------------------------------------
-- Table: price_history
-- Purpose: Stores historical price data points for each offer
-- Notes:
--   - High-volume table, consider partitioning by checked_at in future
--   - price uses NUMERIC for precise decimal representation
--   - Cascading delete ensures cleanup when offer is removed
-- ----------------------------------------------------------------------------
create table price_history (
  id serial primary key,
  offer_id int not null references offers(id) on delete cascade,
  price numeric(12,2) not null,
  currency currency not null,
  checked_at timestamptz not null default now()
);

-- Enable RLS on price_history table
alter table price_history enable row level security;

-- ----------------------------------------------------------------------------
-- Table: user_preferences
-- Purpose: Stores per-user configuration settings
-- Notes:
--   - One-to-one relationship with auth.users
--   - default_frequency applies to new offer subscriptions
-- ----------------------------------------------------------------------------
create table user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_frequency frequency not null default '24h',
  updated_at timestamptz not null default now()
);

-- Enable RLS on user_preferences table
alter table user_preferences enable row level security;

-- ============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Fast lookup of active subscriptions for a user
-- Used when displaying user's tracked offers (filters out soft-deleted)
create index idx_user_offer_user_deleted on user_offer(user_id, deleted_at);

-- Efficient retrieval of recent price history points per offer
-- Optimizes queries for price charts and latest price lookups
create index idx_price_history_offer_checked_desc on price_history(offer_id, checked_at desc);

-- Query offers by status and last_checked time
-- Used by background job to find offers needing price checks
create index idx_offers_status_checked on offers(status, last_checked);

-- Additional index for retention/archival by date
-- Supports efficient cleanup of old price history data
create index idx_price_history_checked_at on price_history(checked_at);

-- Index for user preferences lookup
-- Optimizes fetching user settings on login/offer creation
create index idx_user_preferences_user_id on user_preferences(user_id);

-- ============================================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- RLS Policies: offers
-- ----------------------------------------------------------------------------

-- Policy: Allow anonymous users to SELECT offers
-- Rationale: Public read access to browse available offers
create policy offers_select_anon on offers
  for select
  to anon
  using (true);

-- Policy: Allow authenticated users to SELECT offers
-- Rationale: Authenticated users can browse all offers
create policy offers_select_authenticated on offers
  for select
  to authenticated
  using (true);

-- Policy: Allow authenticated users to INSERT offers
-- Rationale: Users can add new offers to track
create policy offers_insert_authenticated on offers
  for insert
  to authenticated
  with check (true);

-- Policy: Allow authenticated users to UPDATE offers they subscribe to
-- Rationale: Users can update metadata for offers they track
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

-- ----------------------------------------------------------------------------
-- RLS Policies: user_offer
-- ----------------------------------------------------------------------------

-- Policy: Allow authenticated users to SELECT their own subscriptions
-- Rationale: Users can view only their own offer subscriptions (non-deleted)
create policy user_offer_select_authenticated on user_offer
  for select
  to authenticated
  using (user_id = auth.uid() and deleted_at is null);

-- Policy: Allow authenticated users to INSERT their own subscriptions
-- Rationale: Users can subscribe to new offers
create policy user_offer_insert_authenticated on user_offer
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Policy: Allow authenticated users to UPDATE their own subscriptions
-- Rationale: Users can modify their subscriptions (primarily for soft-delete)
create policy user_offer_update_authenticated on user_offer
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- RLS Policies: price_history
-- ----------------------------------------------------------------------------

-- Policy: Allow anonymous users to SELECT price history for any offer
-- Rationale: Public read access to price data for browsing
create policy price_history_select_anon on price_history
  for select
  to anon
  using (true);

-- Policy: Allow authenticated users to SELECT price history for subscribed offers
-- Rationale: Users can view price history for offers they track
create policy price_history_select_authenticated on price_history
  for select
  to authenticated
  using (
    exists (
      select 1 from user_offer
      where user_offer.offer_id = price_history.offer_id
        and user_offer.user_id = auth.uid()
        and user_offer.deleted_at is null
    )
  );

-- Note: INSERT/UPDATE/DELETE on price_history should be handled by backend service
-- No user-facing policies for modifications

-- ----------------------------------------------------------------------------
-- RLS Policies: user_preferences
-- ----------------------------------------------------------------------------

-- Policy: Allow authenticated users to SELECT their own preferences
-- Rationale: Users can view their own settings
create policy user_preferences_select_authenticated on user_preferences
  for select
  to authenticated
  using (user_id = auth.uid());

-- Policy: Allow authenticated users to INSERT their own preferences
-- Rationale: Users can create their preferences on first login
create policy user_preferences_insert_authenticated on user_preferences
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Policy: Allow authenticated users to UPDATE their own preferences
-- Rationale: Users can modify their settings
create policy user_preferences_update_authenticated on user_preferences
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================================
-- 5. TRIGGERS AND FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: update_updated_at_column
-- Purpose: Automatically update updated_at timestamp on row modification
-- ----------------------------------------------------------------------------
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply auto-update trigger to offers table
create trigger update_offers_updated_at
  before update on offers
  for each row
  execute function update_updated_at_column();

-- Apply auto-update trigger to user_preferences table
create trigger update_user_preferences_updated_at
  before update on user_preferences
  for each row
  execute function update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Function: check_offer_addition_limit
-- Purpose: Enforce maximum 10 offer additions per user per 24 hours
-- Rationale: Prevent abuse and excessive scraping
-- Note: This is a DESTRUCTIVE operation that will reject INSERT if limit exceeded
-- ----------------------------------------------------------------------------
create or replace function check_offer_addition_limit()
returns trigger as $$
declare
  addition_count int;
begin
  -- Count non-deleted subscriptions created in last 24 hours
  select count(*)
  into addition_count
  from user_offer
  where user_id = new.user_id
    and created_at > now() - interval '24 hours'
    and deleted_at is null;

  -- Reject if limit exceeded
  if addition_count >= 10 then
    raise exception 'Rate limit exceeded: maximum 10 offer additions per 24 hours';
  end if;

  return new;
end;
$$ language plpgsql;

-- Apply rate limiting trigger to user_offer table
create trigger enforce_offer_addition_limit
  before insert on user_offer
  for each row
  execute function check_offer_addition_limit();

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

comment on table offers is 'Stores offer URLs and metadata for price tracking';
comment on table user_offer is 'Junction table for user-offer subscriptions with soft-delete support';
comment on table price_history is 'Historical price data points for tracked offers';
comment on table user_preferences is 'Per-user configuration and default settings';

comment on column user_offer.deleted_at is 'Soft-delete timestamp - NULL means active subscription';
comment on column offers.selector is 'CSS selector used to scrape price from offer page';
comment on column offers.last_checked is 'Timestamp of last successful price check';
comment on column price_history.checked_at is 'Timestamp when price was scraped';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

