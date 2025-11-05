# E2E Tests with Real Authentication - Setup Guide

## Overview

E2E tests now use **real Supabase authentication** instead of mocks. This provides more realistic test scenarios and catches auth-related bugs.

## Prerequisites

### 1. Create a Test User in Supabase

You need a dedicated test user account in your Supabase project:

1. **Go to Supabase Dashboard** → Your Project → Authentication → Users
2. **Click "Add User"** or use SQL:

   ```sql
   -- Option A: Via Supabase Dashboard UI
   -- Email: e2e-test@yourproject.com
   -- Password: (generate a strong password)
   -- Auto-confirm: YES (important!)

   -- Option B: Via SQL (run in Supabase SQL Editor)
   -- This creates a user with confirmed email
   SELECT extensions.create_user(
     'e2e-test@yourproject.com',  -- your test email
     'your-secure-password-here',   -- your test password
     true                             -- email_confirmed = true
   );
   ```

3. **Copy the User ID** - you'll need this for `.env.test`

### 2. Configure Environment Variables

Create or update `/Users/pp/Projects/10xPriceHistory/.env.test`:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Test User Credentials (for E2E authentication)
E2E_TEST_USER_EMAIL=e2e-test@yourproject.com
E2E_TEST_USER_PASSWORD=your-secure-password-here
E2E_USERNAME_ID=00000000-0000-0000-0000-000000000001  # User ID from Supabase

# OpenRouter (for scraping with AI)
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_TIMEOUT_MS=30000
OPENROUTER_MAX_RETRIES=3
```

### 3. Verify Test User Setup

Run this verification script to check your setup:

```bash
# Test login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e-test@yourproject.com","password":"your-password"}'

# Expected response:
# {
#   "message": "Login successful",
#   "user": {
#     "id": "...",
#     "email": "e2e-test@yourproject.com"
#   }
# }
```

## How It Works

### Authentication Flow

1. **Before Each Test:**

   ```typescript
   await loginAsTestUser(page); // Real API call to /api/auth/login
   await dashboardPage.navigate(); // Session cookies are set
   ```

2. **Middleware validates real JWT tokens** from Supabase
3. **Tests interact with real database** using test user's data
4. **After Each Test:** `await logoutUser(page);` cleans up

### Test User Isolation

The global teardown script (`e2e/global-teardown.ts`) uses `E2E_USERNAME_ID` to:

- Delete only offers created by the test user
- Keep other users' data intact
- Clean up test data after all tests complete

## Running Tests

```bash
# Make sure dev server is running
npm run dev:e2e  # Starts on port 3002

# Run tests (in another terminal)
npm run test:e2e       # Headless mode
npm run test:e2e:ui    # UI mode
npm run test:e2e:debug # Debug mode
```

## Test Files Updated

### 1. `e2e/helpers/auth.helper.ts` (Rewritten)

- ✅ Removed: `mockAuthSession()` with fake cookies
- ✅ Added: `loginAsTestUser()` - real API authentication
- ✅ Added: `loginUser(email, password)` - flexible login
- ✅ Added: `logoutUser()` - cleanup
- ✅ Added: `getTestUserCredentials()` - from env vars

### 2. `src/middleware/index.ts` (Restored)

- ✅ Removed: Mock auth bypass logic
- ✅ Now: Only validates real Supabase JWT tokens

### 3. `e2e/dashboard-add-offer.spec.ts` (Updated)

- ✅ Uses `loginAsTestUser()` instead of mocks
- ✅ Removed: API mocking (uses real APIs)
- ✅ Added: `logoutUser()` in `afterEach`
- ⚠️ **Note:** Tests now make real API calls including:
  - Scraping otomoto.pl
  - Calling OpenRouter AI
  - Database operations

## Important Notes

### ⚠️ Test Performance

- **Real API calls are slower** than mocks
- Tests now depend on:
  - Internet connection (for scraping)
  - OpenRouter API availability
  - Supabase database performance
- Consider using `test.setTimeout(60000)` for tests that scrape

### ⚠️ Test Data Cleanup

- Global teardown runs after ALL tests
- Deletes offers where `user_id = E2E_USERNAME_ID`
- **Always use the same test user** to avoid orphaned data

### ⚠️ Rate Limiting

- Your app may have rate limits (database triggers)
- Tests might fail if running too frequently
- Solution: Add delays between tests or increase rate limits for test user

## Troubleshooting

### Tests Skip: "Login failed"

**Cause:** Invalid credentials or user not found

**Fix:**

```bash
# 1. Check .env.test file exists and has correct values
cat .env.test | grep E2E_TEST

# 2. Verify user exists in Supabase
# Go to Supabase Dashboard → Authentication → Users
# Search for your test email

# 3. Verify email is confirmed
# User must have email_confirmed_at set (not null)
```

### Tests Timeout on "Add Offer"

**Cause:** OpenRouter API or otomoto.pl scraping is slow/failing

**Fix:**

```typescript
// Increase timeout in specific tests
test("should successfully add a new offer", async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ... rest of test
});
```

### "Rate limit exceeded" Error

**Cause:** Database trigger blocking rapid inserts

**Fix:**

- Wait a few seconds between test runs
- Or disable rate limiting for test user:
  ```sql
  -- In Supabase SQL Editor
  -- Adjust your rate limit trigger to exclude test user
  ```

### Tests Pass But Data Not Cleaned

**Cause:** `E2E_USERNAME_ID` doesn't match logged-in user

**Fix:**

```bash
# Get user ID from login response
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e-test@yourproject.com","password":"pass"}' \
  | jq '.user.id'

# Update .env.test with the correct ID
E2E_USERNAME_ID=<the-id-from-above>
```

## Security Considerations

### ✅ Safe Practices

- Test user has minimal permissions
- Test data is isolated by user ID
- Credentials in `.env.test` (gitignored)
- Test user can be disabled/deleted anytime

### ⚠️ Don't

- Don't use production user accounts for testing
- Don't commit `.env.test` to git
- Don't use admin/superuser accounts
- Don't share test credentials

## Migration from Mock Auth

If you have existing tests using old mock auth:

```typescript
// OLD (mocks)
await mockAuthSession(page, 'test-user-123', 'test@example.com');
await page.route('**/api/dashboard', ...);  // Mock API

// NEW (real auth)
await loginAsTestUser(page);
// No API mocking - uses real endpoints
```

## Benefits of Real Auth

✅ **More realistic** - Tests actual authentication flow  
✅ **Catches auth bugs** - Validates JWT tokens, cookies, middleware  
✅ **Tests database** - Real queries, constraints, triggers  
✅ **No mock maintenance** - No need to update mocks when API changes  
✅ **CI/CD ready** - Can run in isolated test environments

## Next Steps

1. ✅ Set up test user in Supabase
2. ✅ Configure `.env.test` with credentials
3. ✅ Run tests: `npm run test:e2e:ui`
4. ✅ Verify data cleanup after tests
5. 🔄 Add more test scenarios as needed

## Related Files

- `e2e/helpers/auth.helper.ts` - Authentication utilities
- `e2e/dashboard-add-offer.spec.ts` - Example test using real auth
- `e2e/global-teardown.ts` - Cleanup script
- `.env.test` - Test configuration (not in git)
- `src/middleware/index.ts` - Auth validation
