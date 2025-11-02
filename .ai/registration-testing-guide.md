# 🧪 Przewodnik Testowania Rejestracji - PriceHistory

## 📋 Scenariusze testowe US-001 i US-002

### ✅ Test 1: Pomy śłna rejestracja (full flow)

**Kroki:**
1. Otwórz `http://localhost:4321/register`
2. Wprowadź:
   - Email: `nowyuser@example.com`
   - Hasło: `Test123!Abc`
   - Potwierdź hasło: `Test123!Abc`
3. Kliknij "Zarejestruj się"

**Oczekiwany wynik:**
- ✅ Redirect do `/verify-email?email=nowyuser@example.com`
- ✅ Strona pokazuje: "Sprawdź swoją skrzynkę email"
- ✅ Email wyświetlony: `nowyuser@example.com`
- ✅ Instrukcje widoczne

**Sprawdź email (Mailpit):**
1. Otwórz `http://127.0.0.1:54324`
2. Znajdź email "Confirm Your Signup"
3. Kliknij w link weryfikacyjny

**Po kliknięciu w link:**
- ✅ Redirect do `/login?verified=true`
- ✅ Banner zielony: "✓ Email został zweryfikowany. Możesz się teraz zalogować."

---

### ✅ Test 2: Email już istnieje

**Kroki:**
1. Zarejestruj `test@example.com` (lub inny istniejący email)
2. Spróbuj zarejestrować ponownie ten sam email

**Oczekiwany wynik:**
- ✅ Błąd: "Email jest już zarejestrowany"
- ✅ Status HTTP 409
- ✅ Pozostanie na stronie `/register`

---

### ✅ Test 3: Walidacja hasła (client-side)

**Scenariusz A: Za krótkie hasło**
1. Wprowadź hasło: `123`
2. Kliknij poza pole (blur)

**Oczekiwany wynik:**
- ✅ Błąd: "Hasło musi mieć minimum 8 znaków"
- ✅ Przycisk "Zarejestruj się" disabled

**Scenariusz B: Password strength indicator**
1. Wprowadź hasło: `password` - słabe (czerwony)
2. Wprowadź hasło: `Password1` - średnie (żółty)
3. Wprowadź hasło: `Password1!Abc` - silne (zielony)

**Oczekiwany wynik:**
- ✅ Pasek siły hasła zmienia kolor
- ✅ Tekst: "Słabe" / "Średnie" / "Silne"
- ✅ Dla słabego: podpowiedź "💡 Użyj cyfr i wielkich liter"

---

### ✅ Test 4: Hasła niezgodne

**Kroki:**
1. Hasło: `Test123!Abc`
2. Potwierdź hasło: `Test123!Wrong`
3. Kliknij poza pole potwierdzenia

**Oczekiwany wynik:**
- ✅ Błąd: "Hasła nie są identyczne"
- ✅ Przycisk disabled

---

### ✅ Test 5: Walidacja email (client-side)

**Scenariusz A: Nieprawidłowy format**
1. Email: `notanemail`
2. Blur

**Oczekiwany wynik:**
- ✅ Błąd: "Wprowadź prawidłowy adres email"

**Scenariusz B: Email za długi**
1. Email: `bardzo_dlugi_email_ponad_255_znakow...@example.com` (>255 znaków)
2. Blur

**Oczekiwany wynik:**
- ✅ Błąd: "Email jest za długi"

---

### ✅ Test 6: Ponowne wysłanie linku weryfikacyjnego

**Przygotowanie:**
1. Zarejestruj nowego użytkownika
2. Jesteś na `/verify-email?email=...`

**Kroki:**
1. Kliknij "Wyślij link ponownie"

**Oczekiwany wynik:**
- ✅ Loading indicator
- ✅ Sukces: "✓ Email weryfikacyjny został wysłany ponownie"
- ✅ Przycisk disabled na 60 sekund z licznikiem: "Wyślij ponownie (59s)"
- ✅ W Mailpit widzisz nowy email

**Test cooldown:**
1. Poczekaj aż licznik dojdzie do 0
2. Przycisk znowu aktywny
3. Możesz kliknąć ponownie

---

### ✅ Test 7: Rate limiting resend (Supabase built-in)

**Kroki:**
1. Kliknij "Wyślij link ponownie"
2. Poczekaj 60s
3. Kliknij ponownie (2. raz)
4. Poczekaj 60s
5. Kliknij ponownie (3. raz szybko)

**Oczekiwany wynik:**
- ✅ Supabase może zwrócić 429 (rate limit)
- ✅ Komunikat: "Zbyt wiele prób. Spróbuj ponownie za minutę"

---

### ✅ Test 8: Email verification callback

**Scenariusz A: Pomyślna weryfikacja**
1. Zarejestruj użytkownika
2. W Mailpit kliknij link weryfikacyjny
3. Link prowadzi do `/auth/callback?code=...`

**Oczekiwany wynik:**
- ✅ Automatyczny redirect do `/login?verified=true`
- ✅ Banner sukcesu widoczny
- ✅ Możesz się zalogować

**Scenariusz B: Błędny/wygasły kod**
1. Ręcznie wpisz `/auth/callback?code=invalid`

**Oczekiwany wynik:**
- ✅ Redirect do `/login?error=verification_failed`
- ✅ Komunikat błędu

---

### ✅ Test 9: Już zalogowany użytkownik

**Kroki:**
1. Zaloguj się
2. Ręcznie wpisz URL: `/register`

**Oczekiwany wynik:**
- ✅ Automatyczny redirect do `/dashboard`
- ✅ Nie widać strony rejestracji

---

### ✅ Test 10: Link do logowania

**Kroki:**
1. Wejdź na `/register`
2. Na dole kliknij "Masz już konto? Zaloguj się"

**Oczekiwany wynik:**
- ✅ Redirect do `/login`

---

## 🔍 Sprawdzenie w Supabase Studio

Po rejestracji sprawdź w Studio:

1. **Authentication → Users**
   - ✅ Nowy użytkownik widoczny
   - ✅ Email Confirmed = FALSE (przed kliknięciem linku)
   - ✅ Email Confirmed = TRUE (po kliknięciu linku)

2. **Mailpit** (`http://127.0.0.1:54324`)
   - ✅ Email "Confirm Your Signup" widoczny
   - ✅ Link działa

---

## 🐛 Debugowanie problemów

### Problem: "Email jest już zarejestrowany" pomimo że użytkownik nie istnieje

**Diagnoza:**
```sql
-- W Supabase SQL Editor
SELECT email, email_confirmed_at, deleted_at 
FROM auth.users 
WHERE email = 'test@example.com';
```

**Rozwiązanie:**
```sql
-- Hard delete jeśli potrzeba (tylko dev!)
DELETE FROM auth.users WHERE email = 'test@example.com';
```

### Problem: Email nie przychodzi

**Dla lokalnego Supabase:**
1. Sprawdź Mailpit: `http://127.0.0.1:54324`
2. Wszystkie emaile są przechwytywane tam

**W production (później):**
- Sprawdź spam folder
- Sprawdź SMTP config w Supabase Dashboard

### Problem: Link weryfikacyjny nie działa

**Diagnoza:**
1. Sprawdź URL w emailu - czy zawiera `code=...`?
2. Sprawdź logi terminala Astro - czy są błędy w `/auth/callback`?
3. Sprawdź Site URL w Supabase Studio

**Rozwiązanie:**
- Site URL musi być: `http://localhost:4321`
- Redirect URLs musi zawierać: `http://localhost:4321/auth/callback`

### Problem: Password strength indicator nie działa

**Diagnoza:**
- Sprawdź console przeglądarki (F12) - czy są błędy React?

**Rozwiązanie:**
- Component używa `useEffect` - sprawdź czy import jest OK
- Restart dev server

---

## 📊 Checklist przed uznaniem za zakończone

- [ ] Test 1-10 przechodzą pomyślnie
- [ ] Użytkownik widoczny w Supabase Studio po rejestracji
- [ ] Email weryfikacyjny przychodzi (w Mailpit)
- [ ] Link weryfikacyjny działa
- [ ] Po weryfikacji można się zalogować
- [ ] Password strength indicator działa
- [ ] Walidacje pokazują się poprawnie
- [ ] Resend button działa z cooldown
- [ ] Brak błędów w konsoli przeglądarki
- [ ] Brak błędów w terminalu Astro

---

## ✅ Zgodność z PRD

### US-001: Rejestracja nowego konta

**Kryteria akceptacji:**
- ✅ Formularz: email, hasło, potwierdzenie hasła
- ✅ Walidacja formatu email (regex)
- ✅ Hasło minimum 8 znaków
- ⏭️ Captcha (pominięte w MVP - placeholder gotowy)
- ⏭️ Rate limiting: 3 rejestracje/IP/24h (pominięte w MVP - endpoint gotowy)
- ✅ Wysłanie emaila weryfikacyjnego
- ✅ Komunikat: "Sprawdź email aby potwierdzić konto"

### US-002: Weryfikacja konta email

**Kryteria akceptacji:**
- ✅ Email z unikalnym linkiem
- ✅ Link ważny 24h (Supabase default)
- ✅ Potwierdzenie email w bazie
- ✅ Redirect do /login z komunikatem sukcesu
- ✅ Blokada logowania bez weryfikacji (już w /api/auth/login)
- ✅ Możliwość ponownego wysłania linku

---

## 🚀 Następne kroki (poza rejestrację)

1. **Dodanie Captcha** (opcjonalne):
   - hCaptcha lub Cloudflare Turnstile
   - Uncomment captchaToken validation
   - Dodaj CaptchaService

2. **Rate Limiting** (opcjonalne):
   - Użyj tabeli `registration_attempts`
   - Sprawdzanie w endpointcie register
   - Alert przy przekroczeniu

3. **Custom Email Templates**:
   - Branding w Supabase Dashboard
   - Polskie tłumaczenia

---

**Data utworzenia:** 2025-01-03  
**Status:** Gotowe do testowania  
**Flow:** Register → Verify Email → Login ✅

