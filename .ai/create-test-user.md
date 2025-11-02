# Quick Setup: Create E2E Test User

## Option 1: Via Supabase Dashboard (Easiest)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication**
   - Click "Authentication" in left sidebar
   - Click "Users" tab

3. **Add User**
   - Click "Add User" button
   - Email: `e2e-test@yourproject.com` (or your preferred email)
   - Password: Generate a strong password
   - ✅ **IMPORTANT:** Check "Auto Confirm User" (so email is verified immediately)
   - Click "Create User"

4. **Copy User ID**
   - After creation, click on the user
   - Copy the UUID (something like `a1b2c3d4-1234-5678-90ab-cdef12345678`)

5. **Update `.env.test`**
   ```bash
   E2E_TEST_USER_EMAIL=e2e-test@yourproject.com
   E2E_TEST_USER_PASSWORD=your-password-here
   E2E_USERNAME_ID=a1b2c3d4-1234-5678-90ab-cdef12345678
   ```

## Option 2: Via Supabase SQL Editor

1. **Open SQL Editor in Supabase Dashboard**
   - Authentication → SQL Editor
   - Click "New Query"

2. **Run this SQL** (replace email/password):
   ```sql
   -- Create test user with confirmed email
   INSERT INTO auth.users (
     instance_id,
     id,
     aud,
     role,
     email,
     encrypted_password,
     email_confirmed_at,
     created_at,
     updated_at,
     confirmation_token,
     recovery_token,
     email_change_token_new,
     email_change
   )
   VALUES (
     '00000000-0000-0000-0000-000000000000',
     gen_random_uuid(),  -- This will be your E2E_USERNAME_ID
     'authenticated',
     'authenticated',
     'e2e-test@yourproject.com',  -- Your test email
     crypt('YOUR_PASSWORD_HERE', gen_salt('bf')),  -- Your test password
     NOW(),  -- Email confirmed immediately
     NOW(),
     NOW(),
     '',
     '',
     '',
     ''
   )
   RETURNING id;  -- Copy this ID to E2E_USERNAME_ID
   ```

3. **Copy the returned ID** and add to `.env.test`

## Option 3: Via API (For Automation)

```bash
# 1. Start your dev server
npm run dev:e2e

# 2. Register user via API
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "e2e-test@yourproject.com",
    "password": "your-secure-password"
  }'

# 3. This will require email verification
# You'll need to either:
# - Check email and click verification link
# - Or manually confirm in Supabase Dashboard
#   (Authentication → Users → Find user → Confirm Email)

# 4. Test login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "e2e-test@yourproject.com",
    "password": "your-secure-password"
  }'
```

## Verify Setup

After creating the user, verify everything works:

```bash
# 1. Check .env.test file
cat .env.test | grep E2E_

# Should show:
# E2E_TEST_USER_EMAIL=e2e-test@yourproject.com
# E2E_TEST_USER_PASSWORD=***
# E2E_USERNAME_ID=a1b2c3d4-1234-5678-90ab-cdef12345678

# 2. Run a simple test
npm run test:e2e:ui

# 3. Check if login works
# Tests should NOT be skipped with "Login failed" message
```

## Template .env.test File

Create `/Users/pp/Projects/10xPriceHistory/.env.test`:

```bash
# ==================================
# E2E Test Configuration
# ==================================

# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=your_anon_key_here

# Test User (created in Supabase)
E2E_TEST_USER_EMAIL=e2e-test@yourproject.com
E2E_TEST_USER_PASSWORD=your_secure_password_here
E2E_USERNAME_ID=00000000-0000-0000-0000-000000000000

# OpenRouter (for AI scraping)
OPENROUTER_API_KEY=your_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_TIMEOUT_MS=30000
OPENROUTER_MAX_RETRIES=3

# Server
PORT=3002
```

## Security Notes

- ✅ `.env.test` is already in `.gitignore`
- ✅ Test user should have NO special privileges
- ✅ Use a unique email (not your personal email)
- ✅ Use a strong, unique password
- ⚠️ Never commit credentials to git
- ⚠️ Don't use production user accounts

## Troubleshooting

### "Email not confirmed" Error
**Solution:** In Supabase Dashboard → Authentication → Users → Find your test user → Click "..." → Confirm Email

### "Invalid credentials" Error
**Solution:** Double-check email/password in `.env.test` match what's in Supabase

### "User not found" Error
**Solution:** Create the user first using one of the options above

### Tests skip with "Login failed"
**Solution:** 
1. Verify `.env.test` exists
2. Verify all environment variables are set
3. Verify Supabase URL and KEY are correct
4. Check server is running on correct port (3002)

## Next Steps

After setup:
1. ✅ User created in Supabase
2. ✅ `.env.test` configured
3. ✅ Run tests: `npm run test:e2e:ui`
4. ✅ Tests should pass (not skip)
5. ✅ Verify data is cleaned up after tests

Happy testing! 🎉

