# LoginPage Fix - Obsługa Disabled Button

## Problem

Test E2E logowania kończył się timeout podczas klikania przycisku submit:

```
Error: locator.click: Test timeout of 30000ms exceeded.
- element is not enabled (button disabled)
```

## Przyczyna

Formularz logowania (`LoginForm.tsx`) ma walidację client-side, która **wyłącza przycisk submit** dopóki:

- Pole email nie jest wypełnione (`!email.trim()`)
- Pole hasło nie jest wypełnione (`!password`)
- Formularz nie jest w stanie ładowania (`isLoading`)

```typescript
<Button
  disabled={isLoading || !email.trim() || !password}
  ...
>
```

## Rozwiązanie

### 1. Dodano `data-testid` do LoginForm.tsx

Dla lepszej i bardziej niezawodnej selekcji elementów:

```tsx
// Email input
<Input data-testid="login-email-input" ... />

// Password input
<Input data-testid="login-password-input" ... />

// Submit button
<Button data-testid="login-submit-button" ... />
```

### 2. Zaktualizowano LoginPage.ts

#### Zmieniono locatory na data-testid:

```typescript
// Przed:
this.emailInput = page.locator('input[type="email"]');
this.passwordInput = page.locator('input[type="password"]');
this.loginButton = page.locator('button[type="submit"]');

// Po:
this.emailInput = page.getByTestId("login-email-input");
this.passwordInput = page.getByTestId("login-password-input");
this.loginButton = page.getByTestId("login-submit-button");
```

#### Dodano czekanie na aktywację przycisku:

```typescript
async login(email: string, password: string) {
  // Wypełnij pola
  await this.emailInput.fill(email);
  await this.passwordInput.fill(password);

  // Poczekaj, aż przycisk będzie widoczny
  await this.loginButton.waitFor({ state: 'visible' });

  // Poczekaj, aż przycisk będzie enabled (po walidacji)
  await this.page.waitForFunction(
    () => {
      const button = document.querySelector('[data-testid="login-submit-button"]');
      return button && !button.disabled;
    },
    { timeout: 5000 }
  );

  // Kliknij aktywny przycisk
  await this.loginButton.click();
}
```

#### Dodano pomocnicze metody:

```typescript
// Sprawdź, czy przycisk jest wyłączony
async isLoginButtonDisabled(): Promise<boolean>

// Poczekaj na aktywację przycisku
async waitForLoginButtonEnabled(): Promise<void>
```

## Wnioski

### Best Practices dla testów E2E:

1. **Zawsze używaj `data-testid`** dla elementów interaktywnych
2. **Czekaj na zmiany stanu** przed interakcją (disabled → enabled)
3. **Nie zakładaj**, że element jest od razu gotowy do kliknięcia
4. **Używaj `waitForFunction`** dla warunków niestandardowych (np. `!disabled`)

### Typowe pułapki:

❌ **Źle:**

```typescript
await emailInput.fill(email);
await submitButton.click(); // Button może być disabled!
```

✅ **Dobrze:**

```typescript
await emailInput.fill(email);
await passwordInput.fill(password);
await page.waitForFunction(() => !button.disabled);
await submitButton.click();
```

## Testy do uruchomienia

```bash
# Test logowania
npm run test:e2e:ui

# Tylko testy auth
npx playwright test auth
```

## Powiązane Pliki

- `e2e/pages/LoginPage.ts` - Zaktualizowany POM
- `src/components/auth/LoginForm.tsx` - Dodane data-testid
- `e2e/auth.spec.ts` - Testy używające LoginPage
