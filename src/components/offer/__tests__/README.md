# Testy jednostkowe dla OfferDetailsPage

Kompleksowa suite testów jednostkowych pokrywająca wszystkie komponenty związane z wyświetlaniem szczegółów ofert.

## 📊 Podsumowanie pokrycia

- **168 testów** - wszystkie przechodzą ✅
- **6 plików testowych**
- **Pokrycie**: wszystkie kluczowe funkcjonalności

## 🧪 Struktura testów

### 1. `mockData.ts`
Mock danych używanych we wszystkich testach:
- Przykładowe oferty (aktywne, usunięte, z błędami)
- Historia cen (pusta, pojedyncza, wielokrotna)
- Różne scenariusze trendów cenowych

### 2. `useOfferData.test.ts` (17 testów)
Testuje hook odpowiedzialny za transformację danych:

#### Data Transformation (3 testy)
- Transformacja DTO → ViewModels
- Ekstrakcja danych z paginacji
- Formatowanie dat dla wykresów

#### Stats Calculation (6 testów)
- Kalkulacje min/max/avg
- Określanie trendów (spadkowy < -2%, stabilny -2% do 2%, wzrostowy > 2%)
- Obliczanie czasu obserwacji
- Obsługa brakującego `lastChecked`

#### Edge Cases (3 testy)
- Pusta historia
- Pojedynczy wpis
- Stany loading/error dla MVP

#### Memoization (2 testy)
- Weryfikacja `useMemo` dla headerData
- Weryfikacja `useMemo` dla chartData

#### Date Formatting (2 testy)
- Format DD.MM dla osi wykresu
- Format DD.MM.YYYY HH:mm dla tooltipów

### 3. `OfferDetailsPage.test.tsx` (17 testów)
Testuje główny komponent strony:

#### Normal State (4 testy)
- Renderowanie wszystkich sekcji
- Nagłówki sekcji
- Brak banneru dla aktywnych ofert
- Responsywny grid layout

#### Status Banners (3 testy)
- Banner dla usuniętych ofert
- Banner dla ofert z błędami
- Stylowanie bannerów (destructive colors)

#### Layout Structure (2 testy)
- Główna kolumna z treścią
- Sticky sidebar ze statystykami

#### Component Data Flow (3 testy)
- Przekazywanie danych do OfferHeader
- Przekazywanie danych do OfferStats
- Przekazywanie długości historii

#### Accessibility (2 testy)
- Semantyczna struktura HTML
- Hierarchia nagłówków

### 4. `OfferHeader.test.tsx` (25 testów)
Testuje nagłówek oferty z obrazem i informacjami:

#### Content Rendering (6 testów)
- Tytuł, obraz, miasto
- Link do Otomoto
- Obsługa null dla imageUrl i city

#### Price Change Badges (9 testów)
- Strzałka w dół dla spadków (↓)
- Strzałka w górę dla wzrostów (↑)
- Znak równości dla braku zmian (=)
- Formatowanie procentów
- Wartości bezwzględne w procentach

#### Layout and Styling (4 testy)
- Card styling
- Responsywny flexbox
- Stylowanie tytułu i obrazu

#### Accessibility (4 testy)
- Semantyczny element header
- Struktura nagłówków
- Dostępne linki
- Atrybuty rel dla linków zewnętrznych

### 5. `OfferStats.test.tsx` (35 testów)
Testuje panel statystyk cenowych:

#### Price Formatting (5 testów)
- Format polski (spacje jako separatory tysięcy)
- Wyświetlanie waluty
- Obsługa różnych walut
- Brak miejsc dziesiętnych

#### Trend Display (7 testów)
- Emoji dla każdego trendu (📈📉➡️)
- Kapitalizacja tekstu
- Kolory: zielony=spadek, czerwony=wzrost, szary=stabilny

#### Observation Duration (6 testów)
- Pluralizacja polska:
  - 1 → "dzień"
  - 2-4 → "dni"
  - 5+ → "dni"
  - Reguły dla 22-24
- Ikona kalendarza 📅

#### Edge Cases (4 testy)
- Zero sprawdzeń
- Zero dni obserwacji
- Bardzo duże ceny
- Te same min/max ceny

#### Accessibility (2 testy)
- Nagłówki card
- Czytelne rozmiary tekstu

### 6. `PriceHistoryChart.test.tsx` (32 testy)
Testuje wykres historii cen (Recharts):

#### Normal State (9 testów)
- Renderowanie wykresu z danymi
- Tytuł i opis
- Wszystkie komponenty (XAxis, YAxis, Line, Tooltip, CartesianGrid)
- Konfiguracja osi i linii

#### Empty State (5 testów)
- Komunikat "Za mało danych"
- Wymóg minimum 2 punktów
- Brak komponentów wykresu w empty state
- Ikona z komunikatem

#### Y-Axis Domain Calculation (3 testy)
- 10% padding poniżej minimum
- 10% padding powyżej maksimum
- Obsługa płaskich danych

#### Edge Cases (4 testy)
- Dokładnie 2 punkty (minimum)
- Duża liczba punktów (100+)
- Bardzo duże/małe ceny

#### Accessibility (3 testy)
- Opisowy tytuł
- Pomocny opis z instrukcją
- Informacyjny empty state

### 7. `PriceHistoryTable.test.tsx` (42 testy)
Testuje tabelę historii cen:

#### Date Formatting (2 testy)
- Format DD.MM.YYYY HH:mm
- Padding zer dla pojedynczych cyfr

#### Price Formatting (3 testy)
- Format polski z separatorami
- Waluta w osobnej kolumnie
- Różne waluty

#### Price Change Indicators (8 testów)
- Podświetlenie wierszy ze zmianami
- Strzałki (↑↓) z procentami
- Kolory: zielony=spadek, czerwony=wzrost
- Pogrubienie zmienionych cen
- Brak wskaźnika dla tej samej ceny

#### Ordering (2 testy)
- Najnowsze na górze
- Opis sortowania w opisie

#### Pluralization (5 testów)
- 1 → "wpis"
- 2-4 → "wpisy"
- 5+ → "wpisów"
- Reguły dla 15+ i 22-24

#### Edge Cases (5 testów)
- Pojedynczy wpis
- Bardzo duże ceny
- Duplikaty timestampów

#### Accessibility (4 testy)
- Semantyczna struktura tabeli
- Opisowe nagłówki
- Informacyjny empty state
- Info o liczbie wpisów

## 🎯 Zastosowane najlepsze praktyki Vitest

### 1. **Test Doubles z `vi` object**
```typescript
vi.mock("../OfferHeader", () => ({
  default: ({ data }: any) => (
    <div data-testid="offer-header">Header: {data.title}</div>
  ),
}));
```

### 2. **Mock Factory Patterns**
```typescript
vi.mock("../useOfferData", () => ({
  useOfferData: ({ initialOffer, initialHistory }: any) => ({
    offer: initialOffer,
    // ... typed mock implementation
  }),
}));
```

### 3. **Setup Files**
- `src/test/setup.ts` - globalne mocki (matchMedia, IntersectionObserver, ResizeObserver)
- Spójne środowisko testowe dla wszystkich testów

### 4. **Descriptive Test Structure**
```typescript
describe("Component", () => {
  describe("Feature", () => {
    it("should do specific thing", () => {
      // Arrange-Act-Assert
    });
  });
});
```

### 5. **TypeScript Type Safety**
- Silne typowanie mock danych
- Zachowanie typów oryginalnych w mockach
- ViewModels dla czytelności

### 6. **jsdom Environment**
- Konfiguracja w `vitest.config.ts`
- Testing Library dla symulacji interakcji
- Realistyczne testowanie komponentów DOM

### 7. **Smart Mocking**
- Recharts zmockowany dla szybkości testów
- Zachowanie kontraktu interfejsu
- Izolacja komponentów

## 🚀 Uruchamianie testów

```bash
# Wszystkie testy
npm test

# Testy watch mode
npm run test:watch

# UI mode
npm run test:ui

# Coverage
npm run test:coverage

# Tylko testy offer
npm test src/components/offer/__tests__/
```

## 📈 Metryki jakości

- ✅ **100% przechodzących testów**
- ✅ **Pokrycie edge cases**
- ✅ **Testy accessibility**
- ✅ **Testy responsywności**
- ✅ **Testy formatowania i lokalizacji**
- ✅ **Testy integracji komponentów**

## 🔄 Ciągłe doskonalenie

### Potencjalne rozszerzenia:
1. **Integration tests** - testowanie przepływu danych między komponentami bez mocków
2. **Snapshot tests** - dla złożonych struktur UI (ostrożnie, mogą być kruche)
3. **Performance tests** - pomiar czasu renderowania dla dużych zestawów danych
4. **Visual regression tests** - z Playwright dla E2E

### Monitoring coverage:
```bash
npm run test:coverage
```

Skonfigurowane progi w `vitest.config.ts`:
- Statements: monitoring
- Branches: monitoring  
- Functions: monitoring
- Lines: monitoring

---

**Uwaga**: Ostrzeżenia `[vitest-pool]: Failed to terminate forks worker` są bezpieczne i nie wpływają na wyniki testów - to znany problem na macOS z uprawnieniami procesów.

