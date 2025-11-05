# Przewodnik po Testowaniu - 10xPriceHistory

## 🎉 Środowisko Testowe Jest Gotowe!

Twoje środowisko testowe zostało w pełni skonfigurowane i jest gotowe do użycia!

## 📦 Co Zostało Zainstalowane

### Testy Jednostkowe (Unit Tests)

- **Vitest** - Szybki framework do testów jednostkowych
- **Testing Library** - Narzędzia do testowania komponentów React
- **MSW** - Mock Service Worker do mockowania API
- **jsdom** - Symulacja DOM dla Node.js

### Testy E2E (End-to-End)

- **Playwright** - Nowoczesny framework do testów E2E
- **Chromium** - Przeglądarka do uruchamiania testów

## 🚀 Szybki Start

### Uruchom Testy Jednostkowe

```bash
# Uruchom wszystkie testy jednostkowe
npm test

# Uruchom z interfejsem graficznym (polecane)
npm run test:ui

# Uruchom w trybie watch (automatyczne ponowne uruchamianie)
npm run test:watch

# Uruchom z raportem pokrycia kodu
npm run test:coverage
```

### Uruchom Testy E2E

```bash
# Uruchom wszystkie testy E2E
npm run test:e2e

# Uruchom z interfejsem graficznym (polecane)
npm run test:e2e:ui

# Uruchom z widoczną przeglądarką
npm run test:e2e:headed

# Uruchom w trybie debugowania
npm run test:e2e:debug
```

## 📁 Struktura Projektu

```
10xPriceHistory/
├── src/
│   ├── components/
│   │   └── ui/
│   │       ├── button.tsx
│   │       └── button.test.tsx          # ← Przykładowy test jednostkowy
│   └── test/
│       ├── setup.ts                     # Konfiguracja testów
│       ├── test-utils.tsx               # Narzędzia pomocnicze
│       ├── mocks/                       # Mocki API (MSW)
│       ├── factories/                   # Fabryki danych testowych
│       └── README.md                    # Przewodnik
├── e2e/
│   ├── pages/                           # Page Object Models
│   │   ├── BasePage.ts
│   │   ├── LoginPage.ts
│   │   └── DashboardPage.ts
│   ├── fixtures/                        # Fixtures testowe
│   │   └── auth.fixture.ts
│   ├── auth.spec.ts                     # ← Przykładowy test E2E
│   └── README.md                        # Przewodnik
├── vitest.config.ts                     # Konfiguracja Vitest
├── playwright.config.ts                 # Konfiguracja Playwright
├── TESTING.md                           # Pełna dokumentacja (EN)
├── TESTOWANIE.md                        # Ten plik (PL)
└── QUICK_START_TESTING.md               # Szybki start (EN)
```

## ✍️ Pisanie Testów

### Test Jednostkowy - Przykład

```typescript
// src/components/MyComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renderuje się poprawnie', () => {
    render(<MyComponent />);
    expect(screen.getByText('Witaj')).toBeInTheDocument();
  });

  it('obsługuje kliknięcia', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<MyComponent onClick={handleClick} />);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Test E2E - Przykład

```typescript
// e2e/moja-funkcja.spec.ts
import { test, expect } from "@playwright/test";

test("użytkownik może się zalogować", async ({ page }) => {
  await page.goto("/login");

  await page.fill('input[type="email"]', "test@example.com");
  await page.fill('input[type="password"]', "haslo123");
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/dashboard/);
});
```

### Test E2E z Page Object Model

```typescript
// e2e/auth-flow.spec.ts
import { test, expect } from "./fixtures/auth.fixture";

test("pełny proces logowania", async ({ loginPage, dashboardPage }) => {
  // Nawiguj do strony logowania
  await loginPage.navigate();

  // Zaloguj się
  await loginPage.login("test@example.com", "haslo123");

  // Sprawdź czy jesteś na dashboardzie
  await expect(dashboardPage.header).toBeVisible();
});
```

## 🎯 Dostępne Komendy

### Testy Jednostkowe

| Komenda                 | Opis                                                       |
| ----------------------- | ---------------------------------------------------------- |
| `npm test`              | Uruchom wszystkie testy jednostkowe                        |
| `npm run test:watch`    | Uruchom w trybie watch (automatyczne ponowne uruchamianie) |
| `npm run test:ui`       | Uruchom z interfejsem graficznym                           |
| `npm run test:coverage` | Uruchom z raportem pokrycia kodu                           |

### Testy E2E

| Komenda                      | Opis                                        |
| ---------------------------- | ------------------------------------------- |
| `npm run test:e2e`           | Uruchom wszystkie testy E2E                 |
| `npm run test:e2e:ui`        | Uruchom z interfejsem graficznym (polecane) |
| `npm run test:e2e:headed`    | Uruchom z widoczną przeglądarką             |
| `npm run test:e2e:debug`     | Uruchom w trybie debugowania                |
| `npm run playwright:install` | Zainstaluj przeglądarkę Chromium            |

## 📝 Przykładowe Testy

### Test Komponentu Button (Testy Jednostkowe)

Lokalizacja: `src/components/ui/button.test.tsx`

**Sprawdza:**

- ✅ Renderowanie komponentu
- ✅ Warianty stylów (default, destructive, outline)
- ✅ Rozmiary (default, sm, lg)
- ✅ Obsługę kliknięć
- ✅ Stan disabled
- ✅ Komponent Slot (asChild)

**Status:** ✅ 6/6 testów przechodzi

### Test Autentykacji (Testy E2E)

Lokalizacja: `e2e/auth.spec.ts`

**Sprawdza:**

- ✅ Wyświetlanie strony logowania
- ✅ Błędy przy nieprawidłowych danych
- ✅ Nawigację do strony odzyskiwania hasła
- ✅ Nawigację do strony rejestracji
- ✅ Kontrolę dostępu do dashboardu

## 🎓 Dobre Praktyki

### Testy Jednostkowe

✅ **Testuj zachowanie, nie implementację**

```typescript
// ✅ Dobrze - testujesz co użytkownik widzi
expect(screen.getByRole("button", { name: /zapisz/i })).toBeInTheDocument();

// ❌ Źle - testujesz szczegóły implementacji
expect(component.state.isVisible).toBe(true);
```

✅ **Używaj userEvent zamiast fireEvent**

```typescript
// ✅ Dobrze - realistyczna interakcja
const user = userEvent.setup();
await user.click(button);

// ❌ Źle - mniej realistyczne
fireEvent.click(button);
```

✅ **Mockuj zewnętrzne zależności**

```typescript
// Mockowanie API z MSW
server.use(
  http.get("/api/offers", () => {
    return HttpResponse.json({ data: mockOffers });
  })
);
```

### Testy E2E

✅ **Używaj Page Object Model**

```typescript
// ✅ Dobrze - kod jest czysty i łatwy w utrzymaniu
await loginPage.navigate();
await loginPage.login(email, password);

// ❌ Źle - kod jest powtarzalny i trudny w utrzymaniu
await page.goto("/login");
await page.fill("#email", email);
await page.fill("#password", password);
await page.click("button");
```

✅ **Używaj semantycznych selektorów**

```typescript
// ✅ Dobrze
page.getByRole("button", { name: /zaloguj/i });
page.getByLabel("Email");

// ❌ Źle
page.locator(".btn-primary");
page.locator("#email-input");
```

✅ **Korzystaj z auto-waiting**

```typescript
// ✅ Dobrze - Playwright czeka automatycznie
await expect(page.locator("h1")).toBeVisible();

// ❌ Źle - niepotrzebne ręczne czekanie
await page.waitForTimeout(1000);
```

## 🔍 Debugowanie

### Testy Jednostkowe

**Interfejs Graficzny (polecane):**

```bash
npm run test:ui
```

**Tryb Watch z przeglądarką:**

```bash
npm run test:watch
# Naciśnij 'b' aby otworzyć w przeglądarce
```

### Testy E2E

**UI Mode (polecane):**

```bash
npm run test:e2e:ui
```

**Tryb Debug:**

```bash
npm run test:e2e:debug
```

**Z widoczną przeglądarką:**

```bash
npm run test:e2e:headed
```

## 📊 Pokrycie Kodu (Coverage)

### Generowanie Raportu

```bash
# Wygeneruj raport pokrycia
npm run test:coverage

# Otwórz raport HTML
open coverage/index.html
```

### Cele Pokrycia

- **Krytyczne ścieżki:** 90%+
- **Logika biznesowa:** 80%+
- **Komponenty UI:** 70%+
- **Narzędzia pomocnicze:** 90%+

**Pamiętaj:** Pokrycie to narzędzie, nie cel. Skup się na sensownych testach, a nie na wysokich procentach.

## 🛠️ Narzędzia Pomocnicze

### Fabryki Danych Testowych

Lokalizacja: `src/test/factories/offer.factory.ts`

```typescript
import { createMockOffer, createMockOffers } from "@/test/factories/offer.factory";

// Utwórz jedną ofertę
const offer = createMockOffer({
  title: "Testowy Produkt",
  current_price: 99.99,
});

// Utwórz wiele ofert
const offers = createMockOffers(5);

// Utwórz historię cen
const history = createMockPriceHistorySeries("offer-id", 10);
```

### Mockowanie API

Lokalizacja: `src/test/mocks/handlers.ts`

```typescript
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/offers", () => {
    return HttpResponse.json({
      data: createMockOffers(3),
    });
  }),
];
```

## 🚨 Częste Problemy

### Problem: "not wrapped in act(...)"

**Rozwiązanie:** Użyj `await` z user events

```typescript
// ✅ Dobrze
await user.click(button);

// ❌ Źle
user.click(button);
```

### Problem: Element nie został znaleziony

**Rozwiązanie:** Użyj właściwych selektorów z auto-waiting

```typescript
// ✅ Dobrze
await expect(page.getByRole("button")).toBeVisible();

// ❌ Źle
expect(page.locator(".button")).toBeTruthy();
```

### Problem: Testy są niestabilne (flaky)

**Rozwiązanie:** Unikaj ręcznych opóźnień, używaj auto-waiting

```typescript
// ✅ Dobrze
await expect(element).toBeVisible();

// ❌ Źle
await page.waitForTimeout(1000);
```

## 📚 Dokumentacja

- **[TESTING.md](./TESTING.md)** - Pełna dokumentacja (angielski)
- **[QUICK_START_TESTING.md](./QUICK_START_TESTING.md)** - Szybki start (angielski)
- **[src/test/README.md](./src/test/README.md)** - Przewodnik testów jednostkowych
- **[e2e/README.md](./e2e/README.md)** - Przewodnik testów E2E
- **[TESTING_SETUP_SUMMARY.md](./TESTING_SETUP_SUMMARY.md)** - Podsumowanie konfiguracji

## 🔗 Przydatne Linki

- [Vitest Documentation](https://vitest.dev)
- [Playwright Documentation](https://playwright.dev)
- [Testing Library Documentation](https://testing-library.com)
- [MSW Documentation](https://mswjs.io)

## 📈 Następne Kroki

1. ✅ **Uruchom przykładowe testy** - `npm test` i `npm run test:e2e:ui`
2. ✅ **Napisz pierwszy test** - Zobacz przykłady powyżej
3. ✅ **Dodaj więcej testów** - Dla swoich komponentów i funkcji
4. ✅ **Skonfiguruj CI/CD** - Użyj `.github/workflows/test.yml.example`
5. ✅ **Monitoruj pokrycie** - `npm run test:coverage`

## 🎉 Gotowe do Użycia!

Twoje środowisko testowe jest w pełni skonfigurowane i gotowe do użycia. Wszystkie przykładowe testy przechodzą pomyślnie!

**Powodzenia w testowaniu! 🧪✨**

---

_Dla bardziej szczegółowych informacji, zobacz pełną dokumentację w [TESTING.md](./TESTING.md)_
