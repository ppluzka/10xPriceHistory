-- ============================================================================
-- Seed File: Development Test Data
-- Purpose: Insert initial test data for development
-- ============================================================================

-- ============================================================================
-- 1. INSERT DEFAULT TEST USER
-- ============================================================================

-- Insert default test user into auth.users for development (before full auth is implemented)
-- This user ID matches DEFAULT_USER_ID in src/db/supabase.client.ts
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'test@example.com',
  '', -- Empty password for test user
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

-- ============================================================================
-- END OF SEED FILE
-- ============================================================================

