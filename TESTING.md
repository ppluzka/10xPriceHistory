# Testing Guide

This document provides a comprehensive guide to testing in the 10xPriceHistory project.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Unit Tests (Vitest)](#unit-tests-vitest)
- [E2E Tests (Playwright)](#e2e-tests-playwright)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [CI/CD Integration](#cicd-integration)

## Overview

The testing strategy follows a comprehensive approach with two types of tests:

1. **Unit Tests** - Test individual components, functions, and services in isolation
2. **End-to-End Tests** - Test complete user flows in a real browser environment

## Tech Stack

### Unit Testing
- **Vitest** - Fast unit test framework with native Vite/Astro integration
- **Testing Library** - React component testing utilities
- **User Event** - Realistic user interaction simulation
- **Jest DOM** - Extended matchers for DOM elements
- **MSW** - Mock Service Worker for API mocking
- **jsdom** - DOM implementation for Node.js

### E2E Testing
- **Playwright** - Modern E2E testing framework
- **Chromium** - Browser for test execution
- **Page Object Model** - Design pattern for maintainable tests

## Project Structure

```
10xPriceHistory/
├── src/
│   ├── components/           # React components
│   │   └── ui/
│   │       └── button.test.tsx  # Example unit test
│   ├── test/                 # Unit test configuration
│   │   ├── setup.ts          # Global test setup
│   │   ├── test-utils.tsx    # Custom render utilities
│   │   ├── mocks/
│   │   │   ├── handlers.ts   # MSW request handlers
│   │   │   ├── server.ts     # MSW server for tests
│   │   │   └── browser.ts    # MSW worker for dev
│   │   └── README.md
│   └── ...
├── e2e/                      # E2E tests
│   ├── pages/                # Page Object Models
│   │   ├── BasePage.ts       # Base POM class
│   │   ├── LoginPage.ts      # Login page POM
│   │   └── DashboardPage.ts  # Dashboard page POM
│   ├── fixtures/             # Test fixtures
│   │   └── auth.fixture.ts   # Auth fixtures
│   ├── auth.spec.ts          # Auth E2E tests
│   └── README.md
├── vitest.config.ts          # Vitest configuration
├── playwright.config.ts      # Playwright configuration
└── TESTING.md               # This file
```

## Unit Tests (Vitest)

### Configuration

The Vitest configuration is located in `vitest.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // ...
  },
});
```

### Key Features

- **Globals enabled** - No need to import `describe`, `it`, `expect`
- **jsdom environment** - DOM simulation for component testing
- **Auto-setup** - Global mocks and utilities configured automatically
- **Fast execution** - Parallel test execution by default
- **TypeScript support** - Full type checking in tests
- **Coverage reporting** - v8 provider with multiple formats

### Writing Unit Tests

See [src/test/README.md](./src/test/README.md) for detailed examples and guidelines.

### Common Test Patterns

**Component Rendering:**
```typescript
it('renders correctly', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button')).toBeInTheDocument();
});
```

**User Interactions:**
```typescript
it('handles clicks', async () => {
  const handleClick = vi.fn();
  const user = userEvent.setup();
  
  render(<Button onClick={handleClick}>Click</Button>);
  await user.click(screen.getByRole('button'));
  
  expect(handleClick).toHaveBeenCalled();
});
```

**API Mocking:**
```typescript
server.use(
  http.get('/api/data', () => {
    return HttpResponse.json({ data: 'test' });
  })
);
```

## E2E Tests (Playwright)

### Configuration

The Playwright configuration is located in `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

### Key Features

- **Chromium only** - Following best practices for focused testing
- **Auto-waiting** - No manual waits needed
- **Parallel execution** - Tests run in parallel by default
- **Trace on retry** - Debugging information captured on failure
- **Screenshots & Videos** - Visual debugging on test failure
- **Page Object Model** - Maintainable test structure

### Writing E2E Tests

See [e2e/README.md](./e2e/README.md) for detailed examples and guidelines.

### Common Test Patterns

**Basic Page Test:**
```typescript
test('displays login page', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input[type="email"]')).toBeVisible();
});
```

**Using Page Objects:**
```typescript
test('user can login', async ({ loginPage, dashboardPage }) => {
  await loginPage.navigate();
  await loginPage.login('user@example.com', 'password');
  
  await expect(dashboardPage.header).toBeVisible();
});
```

**API Testing:**
```typescript
test('API returns data', async ({ request }) => {
  const response = await request.get('/api/offers');
  expect(response.ok()).toBeTruthy();
});
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npx vitest run src/components/ui/button.test.tsx

# Run tests matching pattern
npx vitest run --grep "button"
```

### E2E Tests

```bash
# First time setup - install browsers
npm run playwright:install

# Run all E2E tests
npm run test:e2e

# Run tests with UI mode (recommended)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test auth.spec.ts

# Run tests matching pattern
npx playwright test --grep "login"
```

## Writing Tests

### Guidelines for Unit Tests

1. **Test components in isolation** - Mock external dependencies
2. **Test user behavior, not implementation** - Focus on what users see and do
3. **Use proper selectors** - Prefer `getByRole` over `getByTestId`
4. **Test edge cases** - Empty states, errors, loading states
5. **Keep tests simple** - One assertion per test when possible
6. **Use descriptive test names** - Clearly state what is being tested

### Guidelines for E2E Tests

1. **Use Page Object Model** - Encapsulate page logic in page objects
2. **Test realistic flows** - Complete user journeys, not isolated features
3. **Leverage auto-waiting** - Playwright waits automatically, avoid manual waits
4. **Isolate tests** - Each test should be independent
5. **Use proper locators** - Prefer `getByRole` and semantic selectors
6. **Handle authentication** - Use fixtures for authenticated tests
7. **Test critical paths** - Focus on main user flows

### Test Structure (Arrange-Act-Assert)

```typescript
describe('Feature', () => {
  it('does something specific', async () => {
    // Arrange - Setup test data and initial state
    const user = userEvent.setup();
    render(<Component initialValue="test" />);
    
    // Act - Perform the action being tested
    await user.click(screen.getByRole('button'));
    
    // Assert - Verify the expected outcome
    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});
```

## Best Practices

### General

- ✅ Write tests that resemble how users interact with your app
- ✅ Test behavior, not implementation details
- ✅ Keep tests simple, focused, and maintainable
- ✅ Use descriptive test names that explain the scenario
- ✅ Arrange tests in a logical order (AAA pattern)
- ✅ Mock external dependencies (API calls, timers, etc.)
- ✅ Clean up after tests (automatic with testing-library)
- ❌ Don't test third-party libraries
- ❌ Don't test implementation details (internal state, props)
- ❌ Don't write tests that are tightly coupled to markup structure

### Unit Tests (Vitest)

- ✅ Use `vi.fn()` for function mocks
- ✅ Use `vi.spyOn()` to monitor existing functions
- ✅ Use `userEvent` instead of `fireEvent` for realistic interactions
- ✅ Use `waitFor` for async assertions
- ✅ Use MSW for API mocking
- ✅ Test error states and edge cases
- ❌ Don't use `setTimeout` or manual waiting
- ❌ Don't test CSS or styling details
- ❌ Don't duplicate E2E test coverage

### E2E Tests (Playwright)

- ✅ Use Page Object Model for maintainable tests
- ✅ Use proper locators (`getByRole`, `getByLabel`, etc.)
- ✅ Use fixtures for common setup
- ✅ Test complete user flows
- ✅ Use trace viewer for debugging failures
- ✅ Run tests in parallel when possible
- ❌ Don't use `page.waitForTimeout()` (use auto-waiting)
- ❌ Don't hardcode wait times
- ❌ Don't test every small feature (that's for unit tests)

## CI/CD Integration

### GitHub Actions

Example workflow for running tests in CI:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e-tests:
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
```

### Pre-commit Hooks

You can add testing to pre-commit hooks using Husky:

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "vitest related --run"
    ]
  }
}
```

## Debugging Tests

### Unit Tests

**VS Code:**
- Install Vitest extension
- Set breakpoints
- Run tests in debug mode

**UI Mode:**
```bash
npm run test:ui
```

**Browser DevTools:**
```bash
npm run test:watch
# Press 'b' to open in browser
```

### E2E Tests

**Playwright Inspector:**
```bash
npm run test:e2e:debug
```

**UI Mode (Recommended):**
```bash
npm run test:e2e:ui
```

**Trace Viewer:**
```bash
npx playwright show-trace trace.zip
```

**Console Logging:**
```typescript
test('debug', async ({ page }) => {
  const text = await page.locator('.title').textContent();
  console.log('Title:', text);
});
```

## Test Coverage

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/index.html
```

### Coverage Goals

- **Critical paths:** 90%+ coverage
- **Business logic:** 80%+ coverage
- **UI components:** 70%+ coverage
- **Utilities:** 90%+ coverage

Remember: Coverage is a tool, not a goal. Focus on meaningful tests rather than high percentages.

## Troubleshooting

### Common Issues

**Unit Tests:**
- Tests fail with "not wrapped in act(...)": Use `await` with user events
- Mocks not working: Define mocks at top level, clear between tests
- Cannot find module: Check path aliases in `vitest.config.ts`

**E2E Tests:**
- Tests timeout: Increase timeout, ensure dev server is running
- Element not found: Use proper auto-waiting locators
- Flaky tests: Avoid manual timeouts, ensure proper test isolation

### Getting Help

- Unit tests: [src/test/README.md](./src/test/README.md)
- E2E tests: [e2e/README.md](./e2e/README.md)
- Vitest docs: https://vitest.dev
- Playwright docs: https://playwright.dev
- Testing Library docs: https://testing-library.com

## Resources

### Documentation
- [Vitest](https://vitest.dev)
- [Playwright](https://playwright.dev)
- [Testing Library](https://testing-library.com)
- [MSW](https://mswjs.io)

### Learning Resources
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Best Practices](https://testingjavascript.com)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)

---

Happy Testing! 🧪✨

