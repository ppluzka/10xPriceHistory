# Dashboard Testing Guide

Przewodnik po testowaniu funkcjonalności dashboardu przy użyciu Page Object Model (POM).

## Szybki Start

### Uruchomienie Testów

```bash
# Uruchom wszystkie testy E2E
npm run test:e2e

# Uruchom testy w trybie UI
npm run test:e2e:ui

# Uruchom tylko testy dashboardu
npx playwright test dashboard-add-offer

# Uruchom z trybem debug
npx playwright test --debug dashboard-add-offer
```

## Scenariusz: Dodawanie Ogłoszenia

### Struktura Testu

Test znajduje się w pliku `dashboard-add-offer.spec.ts` i obejmuje następujące przypadki:

1. ✅ **Wyświetlanie formularza** - Sprawdzenie, czy formularz jest widoczny
2. ✅ **Walidacja URL** - Sprawdzenie walidacji pustego URL, nieprawidłowego URL, URL spoza otomoto.pl
3. ✅ **Dodawanie oferty** - Pełny przepływ dodawania nowej oferty
4. ✅ **Wyświetlanie w gridzie** - Weryfikacja wyświetlania nowej oferty w liście
5. ✅ **Stan ładowania** - Sprawdzenie stanu ładowania podczas dodawania
6. ✅ **Szczegóły oferty** - Weryfikacja poprawności danych wyświetlanej oferty
7. ✅ **Wiele ofert** - Dodawanie wielu ofert sekwencyjnie
8. ✅ **Weryfikacja stanu** - Kompleksowa weryfikacja stanu dashboardu

### Przykład Użycia POM

#### Podstawowe Użycie

```typescript
import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';

test('should add new offer', async ({ page }) => {
  const dashboardPage = new DashboardPage(page);
  await dashboardPage.navigate();
  
  // Użycie komponentu formularza
  await dashboardPage.offerForm.submitOffer('https://www.otomoto.pl/...');
  await dashboardPage.offerForm.waitForSuccess();
  
  // Użycie komponentu gridu
  await dashboardPage.offerGrid.waitForLoaded();
  const count = await dashboardPage.offerGrid.getOffersCount();
  expect(count).toBeGreaterThan(0);
});
```

#### Użycie Workflow

```typescript
test('should add offer using workflow', async ({ page }) => {
  const dashboardPage = new DashboardPage(page);
  await dashboardPage.navigate();
  
  // Użycie metody workflow - automatycznie czeka na wszystkie stany
  await dashboardPage.addOfferAndWait('https://www.otomoto.pl/...');
  
  // Weryfikacja stanu
  const isValid = await dashboardPage.verifyOfferAdded();
  expect(isValid).toBe(true);
});
```

## Komponenty POM

### 1. DashboardStatsComponent

Zarządza sekcją statystyk dashboardu.

```typescript
// Pobierz liczbę aktywnych ofert
const activeCount = await dashboardPage.stats.getActiveOffersCount();

// Poczekaj na aktualizację statystyk
await dashboardPage.stats.waitForActiveOffersCount(5);

// Pobierz wszystkie statystyki
const allStats = await dashboardPage.stats.getAllStats();
console.log(allStats.activeOffers); // 5
console.log(allStats.averageChange); // "+2.5%"
```

### 2. OfferFormComponent

Zarządza formularzem dodawania ofert.

```typescript
// Wypełnij i wyślij formularz
await dashboardPage.offerForm.fillUrl('https://www.otomoto.pl/...');
await dashboardPage.offerForm.clickSubmit();

// Lub użyj metody skrótowej
await dashboardPage.offerForm.submitOffer('https://www.otomoto.pl/...');

// Sprawdź błędy walidacji
const hasError = await dashboardPage.offerForm.hasValidationError();
const errorMsg = await dashboardPage.offerForm.getValidationError();

// Poczekaj na sukces (formularz się wyczyści)
await dashboardPage.offerForm.waitForSuccess();
```

### 3. OfferGridComponent

Zarządza listą/gridem ofert.

```typescript
// Sprawdź stan
const isEmpty = await dashboardPage.offerGrid.isEmpty();
const isLoading = await dashboardPage.offerGrid.isLoading();
const hasOffers = await dashboardPage.offerGrid.hasOffers();

// Pobierz liczbę ofert
const count = await dashboardPage.offerGrid.getOffersCount();

// Pobierz kartę oferty
const firstCard = dashboardPage.offerGrid.getOfferCard(0);
const cardById = dashboardPage.offerGrid.getOfferCardById('offer-123');

// Poczekaj na zmiany
await dashboardPage.offerGrid.waitForLoaded();
await dashboardPage.offerGrid.waitForNewOffer(previousCount);
await dashboardPage.offerGrid.waitForOffersCount(5);
```

### 4. OfferCardComponent

Reprezentuje pojedynczą kartę oferty.

```typescript
const card = dashboardPage.offerGrid.getOfferCard(0);

// Pobierz dane
const offerId = await card.getOfferId();
const title = await card.getTitle();
const price = await card.getPrice();
const status = await card.getStatus();
const city = await card.getCity();
const priceChange = await card.getPriceChange();

// Sprawdź stan
const hasImage = await card.hasImage();
const hasPriceChange = await card.hasPriceChange();

// Interakcje
await card.click(); // Przejdź do szczegółów
await card.hover(); // Najedź myszką (pokaże przycisk usuń)
await card.clickDelete(); // Usuń ofertę
```

## Przepływ Testu - Krok po Kroku

### Krok 1: Setup

```typescript
test.beforeEach(async ({ page }) => {
  // Zaloguj się
  const loginPage = new LoginPage(page);
  await loginPage.navigate();
  await loginPage.login('test@example.com', 'password');
  
  // Przejdź do dashboardu
  const dashboardPage = new DashboardPage(page);
  await dashboardPage.navigate();
  await dashboardPage.waitForDashboardLoaded();
});
```

### Krok 2: Dodaj Ogłoszenie

```typescript
test('should add offer', async ({ page }) => {
  const url = 'https://www.otomoto.pl/osobowe/oferta/test-123';
  
  // Zapisz stan początkowy
  const initialCount = await dashboardPage.offerGrid.getOffersCount();
  const initialStats = await dashboardPage.stats.getActiveOffersCount();
  
  // Dodaj ofertę
  await dashboardPage.offerForm.submitOffer(url);
  await dashboardPage.offerForm.waitForSuccess();
  
  // Poczekaj na ładowanie
  await dashboardPage.offerGrid.waitForLoaded();
});
```

### Krok 3: Weryfikacja

```typescript
  // Weryfikuj grid
  await dashboardPage.offerGrid.waitForNewOffer(initialCount);
  const newCount = await dashboardPage.offerGrid.getOffersCount();
  expect(newCount).toBe(initialCount + 1);
  
  // Weryfikuj statystyki
  await dashboardPage.stats.waitForActiveOffersCount(initialStats + 1);
  const newStats = await dashboardPage.stats.getActiveOffersCount();
  expect(newStats).toBe(initialStats + 1);
  
  // Weryfikuj szczegóły karty
  const card = dashboardPage.offerGrid.getOfferCard(0);
  expect(await card.getTitle()).toBeTruthy();
  expect(await card.getPrice()).toBeTruthy();
  expect(await card.getStatus()).toBe('active');
```

## Najlepsze Praktyki

### 1. Używaj Metod Komponentów

❌ **Źle:**
```typescript
await page.locator('[data-testid="offer-url-input"]').fill(url);
await page.locator('[data-testid="offer-submit-button"]').click();
```

✅ **Dobrze:**
```typescript
await dashboardPage.offerForm.submitOffer(url);
```

### 2. Czekaj na Zmiany Stanu

❌ **Źle:**
```typescript
await dashboardPage.offerForm.submitOffer(url);
expect(await dashboardPage.offerGrid.getOffersCount()).toBe(1); // Race condition!
```

✅ **Dobrze:**
```typescript
await dashboardPage.offerForm.submitOffer(url);
await dashboardPage.offerForm.waitForSuccess();
await dashboardPage.offerGrid.waitForLoaded();
expect(await dashboardPage.offerGrid.getOffersCount()).toBe(1);
```

### 3. Używaj Workflow dla Złożonych Scenariuszy

❌ **Źle:**
```typescript
await dashboardPage.offerForm.fillUrl(url);
await dashboardPage.offerForm.clickSubmit();
await page.waitForTimeout(2000); // Hardcoded delay!
const count = await dashboardPage.offerGrid.getOffersCount();
```

✅ **Dobrze:**
```typescript
await dashboardPage.addOfferAndWait(url); // Inteligentne czekanie
```

### 4. Grupuj Powiązane Testy

```typescript
test.describe('Offer Form Validation', () => {
  test('should validate empty URL', async () => { /* ... */ });
  test('should validate invalid URL', async () => { /* ... */ });
  test('should validate non-otomoto URL', async () => { /* ... */ });
});

test.describe('Offer Addition Flow', () => {
  test('should add single offer', async () => { /* ... */ });
  test('should add multiple offers', async () => { /* ... */ });
});
```

## Debugowanie

### 1. Tryb Debug

```bash
npx playwright test --debug dashboard-add-offer
```

### 2. Trace Viewer

```bash
# Uruchom testy z trace
npx playwright test --trace on

# Otwórz trace viewer
npx playwright show-trace trace.zip
```

### 3. Screenshots i Videos

Konfiguracja w `playwright.config.ts`:
```typescript
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

### 4. Console Logs

```typescript
// W komponencie
async getOffersCount(): Promise<number> {
  const count = await this.offerCards.count();
  console.log(`Current offers count: ${count}`);
  return count;
}
```

## Rozwiązywanie Problemów

### Problem: Test timeout podczas czekania na ofertę

**Rozwiązanie:** Zwiększ timeout lub sprawdź, czy backend działa:

```typescript
await dashboardPage.offerGrid.waitForLoaded({ timeout: 30000 });
```

### Problem: Elementy nie są widoczne

**Rozwiązanie:** Sprawdź, czy strona jest w pełni załadowana:

```typescript
await dashboardPage.waitForDashboardLoaded();
await page.waitForLoadState('networkidle');
```

### Problem: Niestabilne testy (flaky)

**Rozwiązanie:** Używaj właściwych strategii czekania:

```typescript
// ❌ Nie używaj
await page.waitForTimeout(2000);

// ✅ Używaj
await element.waitFor({ state: 'visible' });
await page.waitForFunction(() => condition);
```

## Przydatne Komendy

```bash
# Uruchom konkretny test
npx playwright test -g "should add new offer"

# Uruchom w trybie headed (z widoczną przeglądarką)
npx playwright test --headed

# Uruchom tylko chrome
npx playwright test --project=chromium

# Generuj test z codegen
npx playwright codegen http://localhost:4321/dashboard

# Pokaż raport
npx playwright show-report
```

## Więcej Informacji

- [Playwright Documentation](https://playwright.dev/)
- [Component POMs README](./pages/components/README.md)
- [Test Plan](./../.ai/test-plan.md)

