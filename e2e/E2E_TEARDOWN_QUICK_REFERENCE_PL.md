# E2E Teardown - Szybki Przewodnik (PL)

## ✅ Co zostało zaimplementowane

Automatyczne czyszczenie bazy danych Supabase po zakończeniu wszystkich testów E2E.

## 📁 Pliki

- **`e2e/global-teardown.ts`** - Skrypt czyszczący bazę danych
- **`playwright.config.ts`** - Konfiguracja z `globalTeardown`
- **`e2e/E2E_TEARDOWN_DOC.md`** - Pełna dokumentacja (EN)

## ⚙️ Konfiguracja

### Zmienne środowiskowe (`.env.test`)

```bash
SUPABASE_URL=###           # URL instancji Supabase
SUPABASE_KEY=###           # Klucz anon Supabase
E2E_USERNAME_ID=###        # ID użytkownika testowego (zalecane!)
```

### ⚠️ Ważne: E2E_USERNAME_ID

- **Z E2E_USERNAME_ID**: Usuwa tylko dane użytkownika testowego (BEZPIECZNE) ✅
- **Bez E2E_USERNAME_ID**: Usuwa WSZYSTKIE dane z tabel offers i user_offer (NIEBEZPIECZNE!) ⚠️

## 🚀 Użycie

Teardown uruchamia się **automatycznie** po zakończeniu testów:

```bash
npm run test:e2e          # Testy + automatyczne czyszczenie
npm run test:e2e:ui       # UI mode + czyszczenie
npm run test:e2e:headed   # Headed mode + czyszczenie
```

## 📊 Co jest usuwane

### Tryb bezpieczny (z E2E_USERNAME_ID)

1. **Soft-delete subskrypcji użytkownika**
   - Ustawia `deleted_at` w tabeli `user_offer` dla użytkownika testowego
   - Zachowuje dane historyczne

2. **Usunięcie osieroconych ofert**
   - Usuwa oferty bez aktywnych powiązań `user_offer`
   - Tylko oferty bez właścicieli

### Tryb agresywny (bez E2E_USERNAME_ID)

⚠️ Używaj TYLKO w całkowicie izolowanych środowiskach testowych!

1. **Usuwa WSZYSTKIE rekordy z `user_offer`**
2. **Usuwa WSZYSTKIE rekordy z `offers`**

## 🖥️ Output w konsoli

```bash
🧹 Starting E2E test teardown...
🔌 Connected to Supabase
🗑️  Deleting offers for test user: abc-123-def-456
✅ Soft-deleted 5 user offer subscriptions
🗑️  Found 3 orphaned offers, cleaning up...
✅ Deleted 3 orphaned offers
✨ E2E test teardown completed successfully
```

## 🔍 Weryfikacja

### 1. Sprawdź logi w konsoli

Po zakończeniu testów szukaj komunikatów:

- `🧹 Starting E2E test teardown...`
- `✨ E2E test teardown completed successfully`

### 2. Sprawdź bazę danych

```sql
-- Sprawdź soft-deleted subskrypcje użytkownika testowego
SELECT * FROM user_offer
WHERE user_id = '<E2E_USERNAME_ID>'
AND deleted_at IS NOT NULL;

-- Sprawdź czy nie ma osieroconych ofert
SELECT * FROM offers
WHERE id NOT IN (
  SELECT DISTINCT offer_id FROM user_offer WHERE deleted_at IS NULL
);
```

## 🐛 Rozwiązywanie problemów

### Problem: Brak zmiennych środowiskowych

```
❌ Missing required environment variables:
  - SUPABASE_URL
  - SUPABASE_KEY
```

**Rozwiązanie**: Upewnij się, że `.env.test` istnieje i zawiera wszystkie wymagane zmienne.

### Problem: Teardown nie wykonuje się

**Rozwiązanie**:

- Sprawdź `playwright.config.ts` - powinna być linia: `globalTeardown: "./e2e/global-teardown.ts"`
- Zweryfikuj ścieżkę do pliku teardown

### Problem: Błędy uprawnień bazy danych

**Rozwiązanie**:

- Sprawdź czy `SUPABASE_KEY` ma odpowiednie uprawnienia
- W środowisku testowym rozważ użycie service role key (ostrożnie!)

### Problem: Usuwa za dużo/za mało danych

**Rozwiązanie**:

- Sprawdź czy `E2E_USERNAME_ID` jest ustawiony prawidłowo
- Zweryfikuj czy testy tworzą dane z odpowiednim user_id
- Przejrzyj logi teardown aby zobaczyć co zostało usunięte

## 🔒 Bezpieczeństwo

### ✅ Dobre praktyki

- Zawsze ustawiaj `E2E_USERNAME_ID`
- Używaj osobnej instancji Supabase do testów
- NIE używaj danych produkcyjnych w testach
- Przechowuj credentials jako secrets w CI/CD

### ⚠️ Ostrzeżenia

- NIE ustawiaj produkcyjnych credentials w `.env.test`
- NIE uruchamiaj bez `E2E_USERNAME_ID` na produkcyjnej bazie
- ZAWSZE weryfikuj dane przed i po testach

## 📖 Pełna dokumentacja

Więcej informacji w:

- **`e2e/E2E_TEARDOWN_DOC.md`** - Kompletny przewodnik (EN)
- **`.ai/e2e-teardown-implementation-summary.md`** - Podsumowanie implementacji

## 🎯 Przykładowy przepływ

```
1. Uruchomienie testów:
   npm run test:e2e

2. Wykonanie testów:
   - Testy tworzą dane w bazie
   - Dodają oferty
   - Testują funkcjonalności

3. Zakończenie wszystkich testów:
   - Wszystkie test files zakończone

4. Automatyczne uruchomienie teardown:
   - Ładowanie zmiennych z .env.test
   - Połączenie z Supabase
   - Usunięcie danych użytkownika testowego
   - Logowanie wyników

5. Czysta baza gotowa na kolejne testy ✨
```

## 💡 Wskazówki

1. **Zawsze sprawdzaj logi teardown** - pokażą co zostało usunięte
2. **Używaj dedykowanego użytkownika testowego** - nie mieszaj danych testowych z development
3. **Weryfikuj środowisko** - upewnij się, że testujesz na odpowiedniej instancji Supabase
4. **Monitoruj bazę** - okresowo sprawdzaj czy nie gromadzą się dane testowe

---

**Data implementacji**: 2 listopada 2025  
**Status**: ✅ Aktywne i skonfigurowane
