# Quick Start - Testing Setup

This guide will help you get started with testing in the 10xPriceHistory project.

## ✅ Setup Complete

The testing environment has been configured with:

- ✅ **Vitest** - Unit test framework
- ✅ **Testing Library** - React component testing
- ✅ **Playwright** - E2E test framework
- ✅ **MSW** - API mocking
- ✅ **Test configurations** - Both unit and E2E
- ✅ **Example tests** - Button component unit test and auth E2E test
- ✅ **Page Object Models** - For maintainable E2E tests

## 🚀 Quick Start

### 1. Install Dependencies (Already Done)

All dependencies have been installed. If you need to reinstall:

```bash
npm install
```

### 2. Install Playwright Browsers (Already Done)

Chromium browser has been installed. If you need to reinstall:

```bash
npm run playwright:install
```

### 3. Run Your First Unit Test

```bash
# Run all unit tests
npm test

# Run in watch mode (recommended for development)
npm run test:watch

# Run with UI (visual test runner)
npm run test:ui
```

### 4. Run Your First E2E Test

```bash
# Make sure your dev server is NOT running
# (Playwright will start it automatically)

# Run E2E tests
npm run test:e2e

# Run with UI mode (recommended)
npm run test:e2e:ui
```

## 📝 Available Commands

### Unit Tests (Vitest)

```bash
npm test                  # Run all unit tests
npm run test:watch        # Run in watch mode
npm run test:ui           # Run with UI
npm run test:coverage     # Run with coverage report
```

### E2E Tests (Playwright)

```bash
npm run test:e2e          # Run all E2E tests
npm run test:e2e:ui       # Run with UI mode (recommended)
npm run test:e2e:headed   # Run with visible browser
npm run test:e2e:debug    # Run in debug mode
```

## 📁 Project Structure

```
10xPriceHistory/
├── src/
│   ├── components/
│   │   └── ui/
│   │       ├── button.tsx
│   │       └── button.test.tsx          # ← Example unit test
│   └── test/
│       ├── setup.ts                     # Global test setup
│       ├── test-utils.tsx               # Custom render utilities
│       ├── mocks/                       # MSW mocks
│       └── README.md                    # Unit testing guide
├── e2e/
│   ├── pages/                           # Page Object Models
│   │   ├── BasePage.ts
│   │   ├── LoginPage.ts
│   │   └── DashboardPage.ts
│   ├── fixtures/                        # Test fixtures
│   │   └── auth.fixture.ts
│   ├── auth.spec.ts                     # ← Example E2E test
│   └── README.md                        # E2E testing guide
├── vitest.config.ts                     # Vitest configuration
├── playwright.config.ts                 # Playwright configuration
└── TESTING.md                           # Complete testing guide
```

## 🎯 Next Steps

### 1. Write Your First Unit Test

Create a test file next to your component:

```typescript
// src/components/MyComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### 2. Write Your First E2E Test

Create a test file in the `e2e` directory:

```typescript
// e2e/my-feature.spec.ts
import { test, expect } from "@playwright/test";

test("my feature works", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
});
```

### 3. Create a Page Object Model

For more complex E2E tests, create a page object:

```typescript
// e2e/pages/MyPage.ts
import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export class MyPage extends BasePage {
  readonly myButton: Locator;

  constructor(page: Page) {
    super(page);
    this.myButton = page.locator("button#my-button");
  }

  async navigate() {
    await this.goto("/my-page");
  }

  async clickMyButton() {
    await this.myButton.click();
  }
}
```

## 📚 Learn More

- **[TESTING.md](./TESTING.md)** - Complete testing guide
- **[src/test/README.md](./src/test/README.md)** - Unit testing guide
- **[e2e/README.md](./e2e/README.md)** - E2E testing guide

## 🔍 Example Tests Included

### Unit Test Example

Located at: `src/components/ui/button.test.tsx`

This test demonstrates:

- Component rendering
- Style variants testing
- User interaction testing
- Disabled state testing
- Slot component testing

Run it:

```bash
npm test src/components/ui/button.test.tsx
```

### E2E Test Example

Located at: `e2e/auth.spec.ts`

This test demonstrates:

- Page navigation
- Form interactions
- Error handling
- Authentication flows
- Page Object Model usage

Run it:

```bash
npx playwright test auth.spec.ts
```

## 💡 Tips for Success

### Unit Tests

1. **Use Testing Library queries properly:**
   - Prefer `getByRole` over `getByTestId`
   - Use `userEvent` instead of `fireEvent`
   - Use `waitFor` for async assertions

2. **Mock external dependencies:**
   - Use MSW for API calls
   - Use `vi.fn()` for function mocks
   - Use `vi.spyOn()` for existing functions

3. **Keep tests simple:**
   - One assertion per test when possible
   - Follow Arrange-Act-Assert pattern
   - Test behavior, not implementation

### E2E Tests

1. **Use Page Object Model:**
   - Encapsulate page logic in page objects
   - Keep test files clean and readable
   - Reuse common functionality

2. **Use proper locators:**
   - Prefer `getByRole` and semantic selectors
   - Avoid CSS class selectors
   - Use `data-testid` as last resort

3. **Leverage auto-waiting:**
   - Don't use `page.waitForTimeout()`
   - Trust Playwright's auto-waiting
   - Use `expect` assertions for waiting

## 🐛 Debugging

### Unit Tests

```bash
# Run with UI
npm run test:ui

# Run in watch mode and press 'b' to open in browser
npm run test:watch
```

### E2E Tests

```bash
# Run with UI mode (best for debugging)
npm run test:e2e:ui

# Run in debug mode (step through tests)
npm run test:e2e:debug

# Run with visible browser
npm run test:e2e:headed
```

## 🎉 You're Ready!

Your testing environment is fully set up and ready to use. Start writing tests and happy testing!

For more detailed information, check out:

- [TESTING.md](./TESTING.md) - Complete testing documentation
- [Vitest Documentation](https://vitest.dev)
- [Playwright Documentation](https://playwright.dev)
- [Testing Library Documentation](https://testing-library.com)
