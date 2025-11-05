# 🧪 Przewodnik Testowania Logowania - PriceHistory

## Wymagania przed testowaniem

### 1. Uruchomienie projektu

```bash
npm run dev
```

### 2. Dostęp do Supabase

- Użytkownik testowy: `test@example.com` (zgodnie z informacją użytkownika)
- Hasło: (ustaw/zresetuj w Supabase Dashboard jeśli potrzeba)

### 3. Weryfikacja migracji

Sprawdź czy migracje auth są zastosowane:

```bash
supabase db push
```

---

## 📋 Scenariusze testowe

### ✅ Test 1: Pomyślne logowanie

**Kroki:**

1. Otwórz przeglądarkę w trybie incognito
2. Przejdź do `http://localhost:4321/login`
3. Wprowadź:
   - Email: `test@example.com`
   - Hasło: `[twoje hasło]`
4. Kliknij "Zaloguj się"

**Oczekiwany wynik:**

- ✅ Redirect do `/dashboard`
- ✅ Dashboard wyświetla się poprawnie
- ✅ W DevTools → Application → Cookies widoczne są cookies Supabase (`sb-*-auth-token`)
- ✅ Brak błędów w konsoli

**Jak sprawdzić sesję:**

```javascript
// W konsoli przeglądarki (na stronie dashboard)
fetch("/api/auth/check")
  .then((r) => r.json())
  .then(console.log);
```

---

### ✅ Test 2: Nieprawidłowe hasło

**Kroki:**

1. Przejdź do `/login`
2. Wprowadź:
   - Email: `test@example.com`
   - Hasło: `wrongpassword123`
3. Kliknij "Zaloguj się"

**Oczekiwany wynik:**

- ✅ Komunikat błędu: "Nieprawidłowy email lub hasło"
- ✅ Pozostanie na stronie `/login`
- ✅ Brak redirect
- ✅ Formularz czytelny (nie zresetowany)

---

### ✅ Test 3: Email niezweryfikowany

**Przygotowanie:**

1. W Supabase Dashboard → Authentication → Users
2. Znajdź użytkownika testowego
3. W kolumnie "Email Confirmed" kliknij i odznacz (jeśli zaznaczone)

**Kroki:**

1. Próba logowania z tym kontem

**Oczekiwany wynik:**

- ✅ Komunikat błędu: "Potwierdź email przed logowaniem"
- ✅ Status HTTP 403
- ✅ Code: `EMAIL_NOT_VERIFIED`

**Przywrócenie:**

- Ponownie zaznacz "Email Confirmed" w dashboard

---

### ✅ Test 4: Już zalogowany użytkownik

**Kroki:**

1. Zaloguj się normalnie (Test 1)
2. Po sukcesie, ręcznie wpisz w URL: `http://localhost:4321/login`

**Oczekiwany wynik:**

- ✅ Automatyczny redirect do `/dashboard`
- ✅ Nie widać strony logowania

---

### ✅ Test 5: Wylogowanie

**Kroki:**

1. Zaloguj się (Test 1)
2. Znajdź przycisk "Wyloguj" w nawigacji (jeśli istnieje Header)
3. Kliknij "Wyloguj"

**Jeśli brak przycisku, test przez API:**

```javascript
// W konsoli przeglądarki na dashboardzie
fetch("/api/auth/logout", { method: "POST" })
  .then((r) => r.json())
  .then(console.log)
  .then(() => (window.location.href = "/"));
```

**Oczekiwany wynik:**

- ✅ Redirect do `/` (landing page)
- ✅ Cookies Supabase usunięte
- ✅ Próba wejścia na `/dashboard` przekierowuje do `/login`

---

### ✅ Test 6: Protected routes bez auth

**Kroki:**

1. Wyloguj się (Test 5) lub otwórz przeglądarkę incognito
2. Spróbuj wejść bezpośrednio na:
   - `http://localhost:4321/dashboard`
   - `http://localhost:4321/settings`
   - `http://localhost:4321/offer/123`

**Oczekiwany wynik:**

- ✅ Automatyczny redirect do `/login?returnUrl=/dashboard` (lub odpowiednia ścieżka)
- ✅ URL zawiera `returnUrl` query param

---

### ✅ Test 7: Return URL po logowaniu

**Kroki:**

1. Wyloguj się
2. Spróbuj wejść na `/settings`
3. System przekieruje do `/login?returnUrl=/settings`
4. Zaloguj się

**Oczekiwany wynik:**

- ✅ Po zalogowaniu redirect do `/settings` (nie `/dashboard`)

---

### ✅ Test 8: Walidacja formularza (client-side)

**Kroki:**

1. Przejdź do `/login`
2. Wprowadź nieprawidłowy email: `notanemail`
3. Kliknij poza pole (blur event)

**Oczekiwany wynik:**

- ✅ Komunikat walidacji: "Wprowadź prawidłowy adres email"
- ✅ Border czerwony na polu email

**Kroki 2:**

1. Pozostaw pole hasła puste
2. Spróbuj submit

**Oczekiwany wynik:**

- ✅ Komunikat: "Hasło jest wymagane"
- ✅ Submit nie przechodzi

---

### ✅ Test 9: Session persistence

**Kroki:**

1. Zaloguj się (Test 1)
2. Refresh strony `/dashboard` (F5)
3. Zamknij kartę i otwórz ponownie `http://localhost:4321/dashboard`

**Oczekiwany wynik:**

- ✅ Dashboard wyświetla się bez konieczności ponownego logowania
- ✅ Session persystuje przez 7 dni (zgodnie z PRD)

---

### ✅ Test 10: Middleware protection

**Test przez curl/Postman:**

```bash
# Bez cookies (niezalogowany)
curl http://localhost:4321/api/dashboard

# Oczekiwany wynik: 401 lub redirect HTML
```

**Oczekiwany wynik:**

- ✅ Middleware blokuje dostęp do API bez auth
- ✅ Tylko endpointy w PUBLIC_PATHS są dostępne

---

## 🐛 Debugowanie problemów

### Problem: "Nieprawidłowy email lub hasło" pomimo poprawnych danych

**Diagnoza:**

1. Sprawdź czy użytkownik istnieje w Supabase:
   - Dashboard → Authentication → Users
2. Sprawdź hasło (możliwe że wymaga resetu):
   - Kliknij na użytkownika → "Send Password Reset Email"
3. Sprawdź logi w terminalu Astro

### Problem: Redirect loop lub ciągłe przekierowania

**Diagnoza:**

1. Sprawdź cookies w DevTools:
   - Application → Cookies → `sb-*-auth-token`
2. Sprawdź middleware w `src/middleware/index.ts`:
   - Dodaj `console.log(context.locals.user)` w middleware
3. Sprawdź network tab:
   - Czy `/login` zwraca 302 czy 200?

### Problem: Session nie persystuje po refresh

**Diagnoza:**

1. Sprawdź czy cookies mają proper flags:
   - `HttpOnly: true`
   - `Secure: true` (wymaga HTTPS, może nie działać na localhost)
   - `SameSite: Lax`
2. Sprawdź w `supabase.client.ts`:
   - `cookieOptions` powinny być zgodne z spec
3. Możliwe rozwiązanie dla localhost:
   ```typescript
   secure: import.meta.env.PROD, // true tylko w production
   ```

### Problem: TypeScript error "user does not exist on Locals"

**Rozwiązanie:**

1. Restart TS server w VSCode:
   - Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
2. Sprawdź `src/env.d.ts` czy zawiera proper types
3. Sprawdź czy `env.d.ts` jest w `tsconfig.json` include

---

## 📊 Checklist przed deployment

- [ ] Wszystkie testy 1-10 przechodzą
- [ ] Brak błędów w konsoli przeglądarki
- [ ] Brak błędów 500 w terminalu Astro
- [ ] Session persystuje po refresh
- [ ] Protected routes są chronione
- [ ] Logout działa i czyści session
- [ ] Middleware nie blokuje public paths
- [ ] Return URL działa poprawnie
- [ ] Email verified check działa (Test 3)

---

## 🔍 Dodatkowe narzędzia diagnostyczne

### Sprawdzenie sesji przez API endpoint (opcjonalny helper)

Utwórz `/src/pages/api/auth/check.ts`:

```typescript
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals }) => {
  return new Response(
    JSON.stringify({
      authenticated: !!locals.user,
      user: locals.user,
      current_user_id: locals.current_user_id,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};

export const prerender = false;
```

### Sprawdzenie middleware przez console logs

Tymczasowo dodaj w `middleware/index.ts`:

```typescript
console.log("🔐 Middleware:", {
  path: context.url.pathname,
  user: context.locals.user?.email || "not authenticated",
  isPublic: PUBLIC_PATHS.includes(context.url.pathname),
});
```

---

## ✅ Gotowe do produkcji gdy:

1. ✅ Wszystkie 10 testów przechodzą
2. ✅ Supabase Dashboard skonfigurowany (patrz: auth-supabase-config.md)
3. ✅ Zmienne środowiskowe production ustawione
4. ✅ HTTPS włączony (wymagane dla secure cookies)
5. ✅ Email templates customizowane (opcjonalnie)

---

**Data utworzenia:** 2025-01-03  
**Ostatnia aktualizacja:** 2025-01-03  
**Status:** Gotowe do testowania
