# E2E Test Teardown Documentation

## Overview

The E2E test teardown automatically cleans up the Supabase database after all Playwright tests have completed. This ensures a clean state for subsequent test runs and prevents test data accumulation.

## Implementation

### Files

- **`e2e/global-teardown.ts`**: Main teardown script that connects to Supabase and removes test data
- **`playwright.config.ts`**: Updated with `globalTeardown` configuration pointing to the teardown script

### How It Works

1. **Triggered After All Tests**: The teardown runs automatically after ALL E2E tests complete (success or failure)
2. **Connects to Supabase**: Uses environment variables to connect to the test database
3. **Cleans Up Data**: Removes test data from the `offers` and `user_offer` tables
4. **Scoped by User**: When `E2E_USERNAME_ID` is set, only cleans data for that specific test user

## Environment Variables

The teardown script requires these environment variables from `.env.test`:

```bash
SUPABASE_URL=###           # Supabase instance URL
SUPABASE_KEY=###           # Supabase anon key  
E2E_USERNAME_ID=###        # Test user ID (optional but recommended)
```

### ⚠️ Important: E2E_USERNAME_ID

- **With E2E_USERNAME_ID**: Only cleans data associated with the test user (SAFE)
- **Without E2E_USERNAME_ID**: Cleans ALL data from offers and user_offer tables (DANGEROUS - only for isolated test environments)

## Cleanup Strategy

### When E2E_USERNAME_ID is Set (Recommended)

1. **Soft-delete user subscriptions**: Sets `deleted_at` timestamp on `user_offer` records for the test user
2. **Delete orphaned offers**: Removes offers that have no active user_offer relationships

```typescript
// Soft-delete user's offer subscriptions
await supabase
  .from('user_offer')
  .update({ deleted_at: new Date().toISOString() })
  .eq('user_id', e2eUserId)
  .is('deleted_at', null);

// Clean up orphaned offers
await supabase
  .from('offers')
  .delete()
  .not('id', 'in', /* active user_offer offer_ids */);
```

### When E2E_USERNAME_ID is NOT Set (Use with Caution)

1. **Delete ALL offers**: Removes every row from the `offers` table
2. **Delete ALL user_offer records**: Removes every row from the `user_offer` table

⚠️ **WARNING**: This should ONLY be used in completely isolated test databases!

## Configuration

### Playwright Config

```typescript
export default defineConfig({
  // ... other config
  
  /* Global teardown - runs after all tests complete */
  globalTeardown: "./e2e/global-teardown.ts",
  
  // ... rest of config
});
```

## Running Tests

The teardown runs automatically when you execute E2E tests:

```bash
# Run E2E tests - teardown runs automatically after completion
npm run test:e2e

# Run in UI mode - teardown runs when tests finish
npm run test:e2e:ui

# Run in headed mode
npm run test:e2e:headed
```

## Console Output

The teardown script provides detailed console output:

```
🧹 Starting E2E test teardown...
🔌 Connected to Supabase
🗑️  Deleting offers for test user: abc-123-def
✅ Soft-deleted 5 user offer subscriptions
🗑️  Found 3 orphaned offers, cleaning up...
✅ Deleted 3 orphaned offers
✨ E2E test teardown completed successfully
```

## Error Handling

- **Missing environment variables**: Script exits with error code 1 and detailed error message
- **Database errors**: Logged but don't fail the test run (tests are already complete)
- **Connection issues**: Caught and logged, allowing test results to be preserved

```typescript
try {
  // Cleanup logic
} catch (error) {
  console.error('❌ Error during teardown:', error);
  // Don't fail - tests are already complete
  console.error('⚠️  Teardown failed but not blocking test results');
}
```

## Best Practices

### 1. Always Set E2E_USERNAME_ID

Create a dedicated test user and set the ID in `.env.test`:

```bash
E2E_USERNAME_ID=00000000-0000-0000-0000-000000000001
```

### 2. Use Separate Test Database

- **Local Development**: Use Supabase local instance (Docker)
- **CI/CD**: Use dedicated test database or ephemeral database instance
- **Never**: Point to production database!

### 3. Verify Test Data Isolation

Ensure your tests:
- Use the test user ID from environment variables
- Don't create data outside the test user scope
- Clean up any custom test data in test-specific `afterAll` hooks if needed

### 4. Review Teardown Logs

Check the console output after test runs to verify:
- Correct number of records cleaned
- No unexpected errors
- Data being removed matches test expectations

## Troubleshooting

### Teardown Not Running

**Problem**: Global teardown doesn't execute

**Solutions**:
- Verify `globalTeardown` is set in `playwright.config.ts`
- Check that the path `./e2e/global-teardown.ts` is correct
- Ensure TypeScript compilation is successful

### Environment Variables Not Found

**Problem**: Script reports missing SUPABASE_URL or SUPABASE_KEY

**Solutions**:
- Verify `.env.test` file exists in project root
- Check environment variables are not commented out
- Ensure dotenv is loading the file: `dotenv.config({ path: '.env.test' })`

### Too Much/Too Little Data Cleaned

**Problem**: Teardown removes more or less data than expected

**Solutions**:
- Verify `E2E_USERNAME_ID` matches your test user
- Check test data is being created with correct user association
- Review console logs to see what was cleaned
- Consider adding logging to your tests to track data creation

### Database Permission Errors

**Problem**: Supabase returns permission errors during cleanup

**Solutions**:
- Verify the SUPABASE_KEY has appropriate permissions
- Check Row Level Security (RLS) policies allow deletion
- For test environments, consider using service role key (with caution)
- Ensure the test user has proper access rights

## Maintenance

### Adding Additional Cleanup

If your tests create data in other tables, extend the teardown script:

```typescript
// Example: Also clean up price_history table
if (e2eUserId) {
  const { error } = await supabase
    .from('price_history')
    .delete()
    .in('offer_id', /* offer IDs from test user */);
    
  if (error) {
    console.error('Error cleaning price_history:', error);
  }
}
```

### Monitoring Cleanup Performance

For large datasets, you may want to:
1. Add timing logs to track cleanup duration
2. Implement batch deletion for large record counts
3. Consider database-level cleanup (SQL scripts) for CI environments

## Related Documentation

- **Playwright Global Teardown**: https://playwright.dev/docs/test-global-setup-teardown
- **Supabase JavaScript Client**: https://supabase.com/docs/reference/javascript/introduction
- **E2E Testing Guide**: `e2e/README.md`
- **Test Plan**: `.ai/test-plan.md`

## Example: Complete Test Flow

```typescript
// 1. Test runs (creates data)
test('should add offer', async ({ page }) => {
  // ... test creates offers in database
});

// 2. All tests complete
// ... (Playwright finishes all test files)

// 3. Global teardown runs automatically
// e2e/global-teardown.ts executes
// - Connects to Supabase
// - Deletes test user's data
// - Logs results

// 4. Next test run starts with clean database
```

## Security Considerations

### Production Safety

- ✅ Never set production credentials in `.env.test`
- ✅ Use separate Supabase project/instance for testing
- ✅ Always set `E2E_USERNAME_ID` to limit cleanup scope
- ✅ Use RLS policies to prevent accidental data deletion
- ⚠️ Never use service role key in local `.env.test` files

### CI/CD Safety

For GitHub Actions or other CI:

```yaml
# .github/workflows/e2e.yml
env:
  SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
  SUPABASE_KEY: ${{ secrets.TEST_SUPABASE_KEY }}
  E2E_USERNAME_ID: ${{ secrets.TEST_USER_ID }}
```

Store test credentials as secrets, never commit them to repository.

---

**Last Updated**: November 2, 2025  
**Implemented By**: AI Assistant  
**Status**: ✅ Active and Configured

