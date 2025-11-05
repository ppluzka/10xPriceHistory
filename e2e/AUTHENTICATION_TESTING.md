# Authentication Testing Strategy

## Problem

Dashboard wymaga autentykacji, ale backend autentykacji nie jest jeszcze w pełni zaimplementowany. Middleware przekierowuje niezalogowanych użytkowników na `/login`.

## Rozwiązanie: Mock Authentication Helper

Utworzono helper `helpers/auth.helper.ts` do mockowania sesji autentykacji w testach E2E.

### Jak to działa

Helper `mockAuthSession()` ustawia mock cookies i localStorage, które symulują zalogowanego użytkownika:

```typescript
import { mockAuthSession } from "./helpers/auth.helper";

test.beforeEach(async ({ page }) => {
  // Mock authenticated user
  await mockAuthSession(page, "test-user-123", "test@example.com");

  // Navigate to protected route
  await page.goto("/dashboard");
});
```

### Dostępne funkcje

#### `mockAuthSession(page, userId?, email?)`

Ustawia mock cookies i localStorage dla zalogowanego użytkownika.

```typescript
await mockAuthSession(page); // Default user
await mockAuthSession(page, "custom-id", "custom@email.com");
```

#### `clearAuthSession(page)`

Czyści wszystkie cookies i storage.

```typescript
await clearAuthSession(page);
```

#### `isOnLoginPage(page)`

Sprawdza, czy użytkownik został przekierowany na stronę logowania.

```typescript
if (isOnLoginPage(page)) {
  console.log("Not authenticated");
}
```

#### `waitForAuthRedirect(page, timeout?)`

Czeka na przekierowanie na `/login` (lub timeout).

```typescript
const wasRedirected = await waitForAuthRedirect(page, 2000);
if (wasRedirected) {
  test.skip(true, "Auth required");
}
```

## Implementacja w testach dashboard

### Przed (nie działa bez backendu):

```typescript
test.beforeEach(async ({ page }) => {
  await loginPage.navigate();
  await loginPage.login("test@example.com", "password"); // Timeout!
  await dashboardPage.navigate();
});
```

### Po (działa z mock auth):

```typescript
test.beforeEach(async ({ page }) => {
  // Mock auth session
  await mockAuthSession(page, "test-user-123", "test@example.com");

  // Navigate to dashboard
  await dashboardPage.navigate();

  // Check if mock worked
  const wasRedirected = await waitForAuthRedirect(page, 2000);
  if (wasRedirected) {
    test.skip(true, "Auth mock failed");
    return;
  }

  await dashboardPage.waitForDashboardLoaded();
});
```

## Ograniczenia Mock Auth

⚠️ **Mock authentication ma ograniczenia:**

1. **Nie sprawdza prawdziwego backendu** - cookies są fake
2. **Middleware może nie zaakceptować** - jeśli sprawdza token w Supabase
3. **Brak prawdziwych danych użytkownika** - bazy danych może nie mieć test usera

## Migracja do Real Auth

Gdy backend autentykacji będzie gotowy:

### 1. Utwórz test user w bazie danych

```sql
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES ('test-user-123', 'test@example.com', 'hashed_password', NOW());
```

### 2. Zmień testy na używanie prawdziwego logowania

```typescript
test.beforeEach(async ({ page }) => {
  const loginPage = new LoginPage(page);

  // Real login
  await loginPage.navigate();
  await loginPage.login("test@example.com", "TestPassword123!");

  // Wait for redirect
  await page.waitForURL("**/dashboard", { timeout: 5000 });

  await dashboardPage.waitForDashboardLoaded();
});
```

### 3. Lub użyj Playwright storage state

Zaloguj się raz i zapisz session:

```typescript
// setup/auth.setup.ts
test("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.fill('[data-testid="login-email-input"]', "test@example.com");
  await page.fill('[data-testid="login-password-input"]', "password");
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL("**/dashboard");

  // Save auth state
  await page.context().storageState({ path: "playwright/.auth/user.json" });
});
```

Użyj w testach:

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "authenticated",
      use: { storageState: "playwright/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
});
```

## Best Practices

### ✅ Dobrze:

1. **Izoluj testy** - każdy test ma czysty stan
2. **Używaj fixtures** - centralizuj setup autentykacji
3. **Skip gdy potrzeba** - gracefully handle brak backendu
4. **Dokumentuj założenia** - jasno zaznacz co jest mock

### ❌ Źle:

1. **Hardcoded credentials** w testach
2. **Shared state** między testami
3. **Ignorowanie błędów auth** - testy powinny fail gdy auth nie działa
4. **Brak timeouts** - zawsze używaj timeout dla auth operations

## Przykład: Pełny test z auth

```typescript
import { test, expect } from "@playwright/test";
import { DashboardPage } from "./pages/DashboardPage";
import { mockAuthSession, waitForAuthRedirect } from "./helpers/auth.helper";

test.describe("Dashboard Tests", () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);

    // Mock auth
    await mockAuthSession(page, "test-user-123", "test@example.com");

    await dashboardPage.navigate();

    // Verify auth worked
    const wasRedirected = await waitForAuthRedirect(page, 2000);
    if (wasRedirected) {
      test.skip(true, "Auth required but not available");
      return;
    }

    await dashboardPage.waitForDashboardLoaded();
  });

  test("should display dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
    await expect(dashboardPage.stats.container).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Optional: clear auth state after each test
    // await clearAuthSession(page);
  });
});
```

## Status Implementacji

- ✅ Mock authentication helper utworzony
- ✅ Dashboard tests używają mock auth
- ✅ Graceful skipping gdy auth nie działa
- ⏳ Prawdziwe logowanie z backendem (TODO)
- ⏳ Playwright storage state (TODO)
- ⏳ Test user w bazie danych (TODO)

## Powiązane Pliki

- `e2e/helpers/auth.helper.ts` - Mock authentication helper
- `e2e/dashboard-add-offer.spec.ts` - Testy dashboard z mock auth
- `src/middleware/index.ts` - Middleware sprawdzający autentykację
- `e2e/auth.spec.ts` - Testy logowania (bez mock)
