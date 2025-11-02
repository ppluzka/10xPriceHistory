# Testing Setup - E2E Tests (Playwright)

This directory contains end-to-end tests using Playwright with the Page Object Model pattern.

## Directory Structure

```
e2e/
├── pages/               # Page Object Models
│   ├── BasePage.ts      # Base class with common functionality
│   ├── LoginPage.ts     # Login page object
│   └── DashboardPage.ts # Dashboard page object
├── fixtures/            # Test fixtures and helpers
│   └── auth.fixture.ts  # Authentication fixtures
├── auth.spec.ts         # Authentication E2E tests
└── README.md
```

## Running Tests

```bash
# Install Playwright browsers (first time only)
npm run playwright:install

# Run all E2E tests
npm run test:e2e

# Run tests with UI mode (recommended for development)
npm run test:e2e:ui

# Run tests in headed mode (see the browser)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test auth.spec.ts

# Run tests with specific grep pattern
npx playwright test --grep "login"
```

## Writing Tests

### Basic E2E Test

```typescript
import { test, expect } from '@playwright/test';

test('basic test example', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/10xPriceHistory/);
});
```

### Using Page Object Model

```typescript
import { test, expect } from './fixtures/auth.fixture';

test('login flow', async ({ loginPage, dashboardPage }) => {
  await loginPage.navigate();
  await loginPage.login('user@example.com', 'password');
  
  await expect(dashboardPage.header).toBeVisible();
});
```

### Creating a New Page Object

```typescript
// e2e/pages/SettingsPage.ts
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
  readonly passwordInput: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.passwordInput = page.locator('#password');
    this.saveButton = page.locator('button[type="submit"]');
  }

  async navigate() {
    await this.goto('/settings');
  }

  async changePassword(newPassword: string) {
    await this.passwordInput.fill(newPassword);
    await this.saveButton.click();
  }
}
```

### Test Hooks

```typescript
test.describe('Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Run before each test
    await page.goto('/');
  });

  test.afterEach(async ({ page }) => {
    // Run after each test
    await page.context().clearCookies();
  });

  test('feature test', async ({ page }) => {
    // Your test here
  });
});
```

### API Testing

```typescript
test('API endpoint test', async ({ request }) => {
  const response = await request.get('/api/offers');
  
  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);
  
  const data = await response.json();
  expect(data).toHaveProperty('offers');
});
```

### Visual Regression Testing

```typescript
test('visual regression', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('dashboard.png');
});
```

## Best Practices

1. **Use Page Object Model** - Encapsulate page-specific logic in page objects

2. **Use proper locators in order of preference:**
   - `page.getByRole()` (most preferred)
   - `page.getByLabel()`
   - `page.getByPlaceholder()`
   - `page.getByText()`
   - `page.locator('[data-testid="..."]')` (least preferred)

3. **Auto-waiting** - Playwright automatically waits for elements, no need for manual waits

4. **Isolate tests** - Each test should be independent and not rely on others

5. **Use fixtures** - Leverage Playwright's fixture system for setup/teardown

6. **Browser contexts** - Use browser contexts for isolated test environments

7. **Test realistic user flows** - Test complete user journeys, not just individual features

8. **Handle authentication properly:**
   ```typescript
   test.beforeEach(async ({ page }) => {
     // Login before each test
     await page.goto('/login');
     await page.fill('#email', 'test@example.com');
     await page.fill('#password', 'password');
     await page.click('button[type="submit"]');
     await page.waitForURL('**/dashboard');
   });
   ```

9. **Use test.describe.serial** for tests that must run in order:
   ```typescript
   test.describe.serial('ordered tests', () => {
     test('first', async ({ page }) => { /* ... */ });
     test('second', async ({ page }) => { /* ... */ });
   });
   ```

## Configuration

The E2E test configuration is in `playwright.config.ts` at the project root.

Key settings:
- **Browser:** Chromium only (as per guidelines)
- **Base URL:** http://localhost:4321
- **Parallel execution:** Enabled by default
- **Retry:** 2 retries on CI, 0 locally
- **Trace:** On first retry
- **Screenshots:** On failure
- **Video:** Retain on failure

## Debugging Tests

### Using Playwright Inspector
```bash
npm run test:e2e:debug
```

### Using UI Mode (Recommended)
```bash
npm run test:e2e:ui
```

Features:
- Watch tests run in real-time
- Inspect DOM snapshots
- View network activity
- Step through tests
- Debug specific tests

### Using Trace Viewer
After a test failure:
```bash
npx playwright show-trace trace.zip
```

### Using console.log
```typescript
test('debug test', async ({ page }) => {
  const text = await page.locator('.title').textContent();
  console.log('Title text:', text);
});
```

### Using page.pause()
```typescript
test('pause test', async ({ page }) => {
  await page.goto('/');
  await page.pause(); // Pauses test execution
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install chromium --with-deps
      - name: Run E2E tests
        run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Test Teardown

### Automatic Database Cleanup

After all E2E tests complete, a global teardown script automatically cleans up test data from the Supabase database.

**What gets cleaned**:
- `user_offer` records (soft-deleted)
- Orphaned `offers` records

**Configuration** (in `.env.test`):
```bash
SUPABASE_URL=###           # Your test Supabase URL
SUPABASE_KEY=###           # Your test Supabase key
E2E_USERNAME_ID=###        # Test user ID (recommended)
```

**How it works**:
```bash
npm run test:e2e          # Tests run, teardown executes automatically

# Console output:
# 🧹 Starting E2E test teardown...
# 🔌 Connected to Supabase
# 🗑️  Deleting offers for test user: <user-id>
# ✅ Soft-deleted 5 user offer subscriptions
# ✨ E2E test teardown completed successfully
```

**Documentation**: See `e2e/E2E_TEARDOWN_DOC.md` for complete details on teardown configuration, safety features, and troubleshooting.

## Common Issues

### Tests timeout
- Increase timeout in `playwright.config.ts`
- Use `{ timeout: 10000 }` on specific assertions
- Ensure the dev server is running

### Element not found
- Use proper auto-waiting locators
- Check if element is in viewport
- Verify the selector is correct

### Authentication issues
- Clear cookies before tests
- Use proper fixtures for authenticated tests
- Consider using storage state for persistent auth

### Flaky tests
- Avoid `page.waitForTimeout()`
- Use proper locators with auto-waiting
- Ensure proper test isolation
- Check for race conditions

### Teardown issues
- Check `.env.test` has correct Supabase credentials
- Verify `E2E_USERNAME_ID` matches your test user
- Review console output for teardown logs
- See `e2e/E2E_TEARDOWN_DOC.md` for troubleshooting

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [Page Object Model](https://playwright.dev/docs/pom)
- [E2E Teardown Documentation](./E2E_TEARDOWN_DOC.md)

