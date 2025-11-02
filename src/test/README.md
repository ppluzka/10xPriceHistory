# Testing Setup - Unit Tests (Vitest)

This directory contains the configuration and utilities for unit testing with Vitest.

## Directory Structure

```
src/test/
├── setup.ts              # Global test setup and configuration
├── test-utils.tsx        # Custom render utilities and helpers
├── mocks/
│   ├── handlers.ts       # MSW request handlers
│   ├── server.ts         # MSW server for Node.js (tests)
│   └── browser.ts        # MSW worker for browser (development)
└── README.md
```

## Running Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Writing Tests

### Basic Component Test

```typescript
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

### Testing User Interactions

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('handles click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Mocking API Requests with MSW

```typescript
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';

describe('DataFetching', () => {
  it('fetches and displays data', async () => {
    server.use(
      http.get('/api/data', () => {
        return HttpResponse.json({ data: 'test data' });
      })
    );

    render(<DataComponent />);
    
    expect(await screen.findByText('test data')).toBeInTheDocument();
  });
});
```

### Testing Async Code

```typescript
import { describe, it, expect, waitFor } from 'vitest';
import { render, screen } from '@/test/test-utils';

describe('AsyncComponent', () => {
  it('handles async operations', async () => {
    render(<AsyncComponent />);
    
    await waitFor(() => {
      expect(screen.getByText('Loaded')).toBeInTheDocument();
    });
  });
});
```

## Best Practices

1. **Use Testing Library queries in order of preference:**
   - `getByRole` (most preferred)
   - `getByLabelText`
   - `getByPlaceholderText`
   - `getByText`
   - `getByTestId` (least preferred)

2. **Use `userEvent` instead of `fireEvent`** for more realistic interactions

3. **Write tests that resemble how users interact with your app**

4. **Use `describe` blocks** to group related tests

5. **Follow Arrange-Act-Assert pattern:**
   ```typescript
   it('does something', async () => {
     // Arrange - setup test data and render
     const user = userEvent.setup();
     render(<Component />);
     
     // Act - perform the action
     await user.click(screen.getByRole('button'));
     
     // Assert - verify the result
     expect(screen.getByText('Result')).toBeInTheDocument();
   });
   ```

6. **Mock external dependencies** (API calls, date/time, random values)

7. **Test error states and edge cases**

8. **Keep tests simple and focused** - one assertion per test when possible

## Configuration

The test configuration is in `vitest.config.ts` at the project root.

Key settings:
- **Environment:** jsdom (DOM simulation)
- **Globals:** true (no need to import `describe`, `it`, `expect`)
- **Setup files:** `src/test/setup.ts`
- **Coverage:** v8 provider with text, JSON, and HTML reporters

## Debugging Tests

### In VS Code
1. Install the Vitest extension
2. Click on the test runner icon in the sidebar
3. Set breakpoints and run tests in debug mode

### Using UI Mode
```bash
npm run test:ui
```

### Using Browser DevTools
```bash
npm run test:watch
```
Then press `b` to open tests in browser.

## Common Issues

### Tests fail with "not wrapped in act(...)"
- Use `await` with all user events
- Use `waitFor` for async state updates

### Mocks not working
- Ensure mocks are defined at the top level of the file
- Use `vi.mock()` before imports
- Clear mocks between tests with `vi.clearAllMocks()`

### Cannot find module with @ alias
- Check `vitest.config.ts` has correct path alias configuration
- Ensure `tsconfig.json` also has the alias defined

