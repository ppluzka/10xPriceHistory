# Konfiguracja Testów E2E z Prawdziwą Autentykacją

## 🎯 Zmiany

✅ **Usunięto** wszystkie mocki autentykacji  
✅ **Dodano** prawdziwe logowanie przez Supabase  
✅ **Middleware** teraz waliduje tylko prawdziwe tokeny JWT  
✅ **Testy** używają prawdziwych API, bazy danych i użytkowników  

## 🚀 Szybki Start

### Krok 1: Utwórz użytkownika testowego

**Opcja A: Dashboard Supabase (najłatwiej)**
1. Otwórz https://supabase.com/dashboard → Twój projekt
2. Authentication → Users → "Add User"
3. Email: `e2e-test@yourproject.com`
4. Password: (wygeneruj silne hasło)
5. ✅ **Zaznacz "Auto Confirm User"** (ważne!)
6. Skopiuj ID użytkownika (UUID)

**Opcja B: SQL Query**
```sql
-- W Supabase SQL Editor
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at,
  confirmation_token, recovery_token,
  email_change_token_new, email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated', 'authenticated',
  'e2e-test@yourproject.com',
  crypt('TWOJE_HASŁO', gen_salt('bf')),
  NOW(), NOW(), NOW(), '', '', '', ''
)
RETURNING id;  -- Skopiuj ten ID!
```

### Krok 2: Skonfiguruj .env.test

Utwórz plik `.env.test` w katalogu głównym projektu:

```bash
# Supabase
SUPABASE_URL=https://twoj-projekt.supabase.co
SUPABASE_KEY=twoj_anon_key

# Użytkownik testowy
E2E_TEST_USER_EMAIL=e2e-test@yourproject.com
E2E_TEST_USER_PASSWORD=twoje_bezpieczne_haslo
E2E_USERNAME_ID=uuid-użytkownika-z-supabase

# OpenRouter (dla scrapowania z AI)
OPENROUTER_API_KEY=twoj_klucz
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_TIMEOUT_MS=30000
OPENROUTER_MAX_RETRIES=3
```

### Krok 3: Uruchom testy

```bash
npm run test:e2e:ui
```

## 📝 Co się zmieniło?

### 1. Autentykacja (e2e/helpers/auth.helper.ts)

**Przed (mocki):**
```typescript
await mockAuthSession(page, 'test-user-123', 'test@example.com');
// Ustawiało fałszywe ciasteczka
```

**Teraz (prawdziwe):**
```typescript
await loginAsTestUser(page);
// Prawdziwe logowanie przez API /api/auth/login
// Prawdziwe ciasteczka Supabase
// Prawdziwa walidacja JWT
```

### 2. Middleware (src/middleware/index.ts)

**Usunięto:**
- ❌ Bypass dla testów E2E
- ❌ Rozpoznawanie mock cookies
- ❌ Sztuczne ustawianie `context.locals.user`

**Pozostało:**
- ✅ Tylko walidacja prawdziwych tokenów Supabase
- ✅ `supabase.auth.getUser()` - bez obejść

### 3. Testy (e2e/dashboard-add-offer.spec.ts)

**Usunięto:**
- ❌ Mockowanie API (`page.route()`)
- ❌ Fałszywe odpowiedzi z `/api/dashboard`
- ❌ Symulowanie dodawania ofert

**Dodano:**
- ✅ Prawdziwe logowanie przed każdym testem
- ✅ Prawdziwe API calls (scraping, OpenRouter, database)
- ✅ Wylogowanie po każdym teście (cleanup)

## ⚙️ Jak to działa

### Przepływ autentykacji

```
1. test.beforeEach()
   ↓
2. loginAsTestUser(page)
   ↓
3. POST /api/auth/login { email, password }
   ↓
4. Supabase waliduje credentials
   ↓
5. Zwraca session → ciasteczka ustawione automatycznie
   ↓
6. page.navigate('/dashboard')
   ↓
7. Middleware czyta ciasteczka
   ↓
8. supabase.auth.getUser() → sukces!
   ↓
9. Test wykonuje prawdziwe akcje
   ↓
10. test.afterEach() → logoutUser(page)
```

### Cleanup danych testowych

- `global-teardown.ts` uruchamia się PO WSZYSTKICH testach
- Usuwa oferty gdzie `user_id = E2E_USERNAME_ID`
- Dane innych użytkowników pozostają nietknięte

## ⚠️ Ważne Uwagi

### Testy są teraz wolniejsze

❌ **Przed:** Mock zwraca dane w ~10ms  
✅ **Teraz:** Prawdziwe API ~1-5s (scraping + AI + database)

**Rozwiązanie:** Użyj `test.setTimeout(60000)` dla długich testów

### Testy wymagają połączenia

Testy teraz potrzebują:
- ✅ Internet (scraping otomoto.pl)
- ✅ OpenRouter API
- ✅ Supabase database
- ✅ .env.test skonfigurowany

### Rate limiting

Możesz trafić na limity:
- Database triggers (np. max 10 ofert/minutę)
- OpenRouter rate limits
- Otomoto.pl może blokować częste requesty

## 🐛 Rozwiązywanie Problemów

### Testy pomijane: "Login failed"

**Przyczyna:** Nieprawidłowe credentials lub użytkownik nie istnieje

**Rozwiązanie:**
```bash
# 1. Sprawdź czy .env.test istnieje
ls -la .env.test

# 2. Sprawdź wartości
cat .env.test | grep E2E_

# 3. Zweryfikuj użytkownika w Supabase Dashboard
# Authentication → Users → Szukaj po email

# 4. Upewnij się że email jest potwierdzony
# (kolumna email_confirmed_at nie może być null)
```

### "Email not confirmed"

**Rozwiązanie:**  
Supabase Dashboard → Authentication → Users → Znajdź użytkownika → "..." → Confirm Email

### Testy timeout na "Add Offer"

**Przyczyna:** Scraping/OpenRouter zbyt wolne

**Rozwiązanie:**
```typescript
test('should add offer', async ({ page }) => {
  test.setTimeout(90000); // 90 sekund
  // ... test
});
```

### "Rate limit exceeded"

**Przyczyna:** Zbyt częste uruchamianie testów

**Rozwiązanie:**
- Poczekaj 1-2 minuty między uruchomieniami
- Lub wyłącz rate limiting dla użytkownika testowego w SQL

### Dane nie są czyszczone po testach

**Przyczyna:** `E2E_USERNAME_ID` nie pasuje do zalogowanego użytkownika

**Rozwiązanie:**
```bash
# Pobierz ID z odpowiedzi logowania
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e-test@yourproject.com","password":"haslo"}' \
  | jq '.user.id'

# Aktualizuj .env.test
E2E_USERNAME_ID=<id-z-powyzszego-polecenia>
```

## 📊 Weryfikacja Setupu

Po konfiguracji sprawdź czy wszystko działa:

```bash
# 1. Test połączenia z Supabase
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"e2e-test@yourproject.com",
    "password":"twoje-haslo"
  }'

# Oczekiwana odpowiedź:
# {
#   "message": "Login successful",
#   "user": { "id": "...", "email": "..." }
# }

# 2. Uruchom jeden test
npm run test:e2e -- --grep "should display offer form"

# 3. Test NIE POWINIEN być pominięty (skipped)
```

## ✅ Checklist

Przed uruchomieniem testów upewnij się że:

- [ ] Utworzono użytkownika testowego w Supabase
- [ ] Email użytkownika jest potwierdzony (confirmed)
- [ ] Plik `.env.test` istnieje w katalogu głównym
- [ ] `E2E_TEST_USER_EMAIL` jest ustawiony
- [ ] `E2E_TEST_USER_PASSWORD` jest ustawiony
- [ ] `E2E_USERNAME_ID` jest ustawiony (UUID z Supabase)
- [ ] `SUPABASE_URL` i `SUPABASE_KEY` są poprawne
- [ ] `OPENROUTER_API_KEY` jest ustawiony
- [ ] Serwer dev działa: `npm run dev:e2e`

## 🎉 Korzyści

✅ **Testy są bardziej realistyczne** - prawdziwy flow aplikacji  
✅ **Wykrywają bugi w auth** - walidacja JWT, ciasteczka, middleware  
✅ **Testują bazę danych** - prawdziwe zapytania, constraints, triggers  
✅ **Brak utrzymywania mocków** - API się zmienia, testy nadal działają  
✅ **Gotowe na CI/CD** - można uruchomić w izolowanym środowisku  

## 📚 Dokumentacja

- **Szczegółowa (EN):** `.ai/e2e-real-auth-setup.md`
- **Tworzenie użytkownika:** `.ai/create-test-user.md`
- **Ten plik (PL):** Quick reference

## 🔗 Zmienione Pliki

- ✅ `e2e/helpers/auth.helper.ts` - Przepisane na prawdziwą auth
- ✅ `src/middleware/index.ts` - Usunięto bypass dla testów
- ✅ `e2e/dashboard-add-offer.spec.ts` - Używa prawdziwego logowania
- ❌ `e2e/helpers/api-mock.helper.ts` - USUNIĘTY (nie potrzebny)

Powodzenia z testami! 🚀

