# Komponenty autentykacji - UI

Komponenty interfejsu użytkownika dla procesu autentykacji zgodne ze specyfikacją w `.ai/auth-spec.md`.

## ⚠️ Status implementacji

**Tylko UI - Backend NIE jest zaimplementowany**

Te komponenty to tylko warstwa prezentacji (frontend). Wywołują endpointy API (`/api/auth/*`), które jeszcze nie istnieją i będą zaimplementowane w kolejnej fazie projektu.

## Struktura komponentów

### LoginForm.tsx

Formularz logowania z walidacją client-side.

**Props:**

```typescript
interface LoginFormProps {
  redirectTo?: string; // Gdzie przekierować po logowaniu (default: /dashboard)
  showRegisterLink?: boolean; // Czy pokazać link do rejestracji (default: true)
}
```

**Funkcjonalności:**

- Walidacja email (format RFC 5322 simplified)
- Walidacja hasła (minimum 8 znaków)
- Real-time walidacja przy onBlur
- Wyświetlanie błędów API
- Loading state
- Obsługa kodów błędów (401, 403, 429)

**API endpoint:** `POST /api/auth/login`

**Użycie:**

```astro
---
import LoginForm from "@/components/auth/LoginForm";
---

<LoginForm client:load redirectTo="/dashboard" />
```

### RegisterForm.tsx

Formularz rejestracji z wskaźnikiem siły hasła.

**Props:**

```typescript
interface RegisterFormProps {
  captchaSiteKey: string; // Klucz publiczny hCaptcha/Turnstile
}
```

**Funkcjonalności:**

- Walidacja email (format + max 255 znaków)
- Walidacja hasła (min 8 znaków)
- Walidacja potwierdzenia hasła (muszą być identyczne)
- Wizualny wskaźnik siły hasła (weak/medium/strong)
- Placeholder dla captcha (do implementacji)
- Obsługa błędów (409 - email zajęty, 429 - rate limit)

**API endpoint:** `POST /api/auth/register`

**Użycie:**

```astro
---
import RegisterForm from "@/components/auth/RegisterForm";
const captchaSiteKey = import.meta.env.HCAPTCHA_SITE_KEY;
---

<RegisterForm client:load captchaSiteKey={captchaSiteKey} />
```

### ResendVerificationButton.tsx

Przycisk do ponownego wysłania emaila weryfikacyjnego z cooldown timerem.

**Props:**

```typescript
interface ResendVerificationButtonProps {
  email: string; // Email użytkownika
}
```

**Funkcjonalności:**

- 60-sekundowy cooldown po wysłaniu
- Wyświetlanie komunikatów sukcesu/błędu
- Obsługa rate limiting (429)
- Disabled state podczas wysyłania

**API endpoint:** `POST /api/auth/resend-verification`

**Użycie:**

```astro
---
import ResendVerificationButton from "@/components/auth/ResendVerificationButton";
---

<ResendVerificationButton client:load email="user@example.com" />
```

## Strony Astro

### /login.astro

Strona logowania z obsługą query params:

- `?verified=true` - Wyświetla komunikat o zweryfikowanym emailu
- `?error=verification_failed` - Wyświetla błąd weryfikacji
- `?error=session_expired` - Wyświetla komunikat o wygasłej sesji
- `?returnUrl=/path` - Przekierowanie po zalogowaniu

### /register.astro

Strona rejestracji z informacją o darmowym koncie.

### /verify-email.astro

Strona informująca o konieczności weryfikacji emaila.
Query params:

- `?email=encoded@email.com` - Email użytkownika

### /auth/callback.astro

Obsługa callback po weryfikacji email lub OAuth (przyszłość).
Query params:

- `?code=...` - Kod weryfikacyjny z Supabase
- `?error=...` - Komunikat błędu

### /forgot-password.astro

Placeholder dla funkcji resetowania hasła (MVP: opcjonalny).

## Komponenty nawigacyjne

### Header.tsx

Nawigacja dla zalogowanych użytkowników.

**Props:**

```typescript
interface HeaderProps {
  user: {
    email: string;
    id: string;
  };
  currentPath?: string;
}
```

**Funkcjonalności:**

- Responsywny hamburger menu (mobile)
- Wyświetlanie emaila użytkownika
- Przycisk wylogowania
- Aktywne linki nawigacji

**API endpoint:** `POST /api/auth/logout`

### PublicHeader.tsx

Nawigacja dla niezalogowanych użytkowników.

**Props:**

```typescript
interface PublicHeaderProps {
  currentPath?: string;
}
```

**Funkcjonalności:**

- Przyciski "Zaloguj" i "Zarejestruj"
- Responsywny design

## Utilities

### auth.utils.ts

Helpery dla autentykacji:

- `requireAuth(Astro)` - Guard dla chronionych stron
- `requireGuest(Astro)` - Guard dla stron publicznych (login/register)
- `getReturnUrl(Astro, default)` - Pobiera return URL z query params
- `isValidEmail(email)` - Walidacja formatu email
- `validatePassword(password)` - Walidacja siły hasła
- `getClientIp(request)` - Pobiera IP klienta (obsługa proxy headers)

## Stylizacja

Wszystkie komponenty używają:

- Tailwind CSS 4
- Shadcn/ui components (Button, Input, Label, Card)
- Konsystentne z istniejącymi komponentami (OfferForm, PasswordChangeForm)
- Dark mode support

## Kolejne kroki

1. **Backend implementation** - Utworzenie endpointów API w `/api/auth/`
2. **Middleware** - Implementacja session management w `src/middleware/index.ts`
3. **Supabase integration** - Konfiguracja Supabase Auth
4. **Captcha integration** - Integracja hCaptcha lub Cloudflare Turnstile
5. **Testing** - E2E testy z Playwright

## Uwagi techniczne

- Wszystkie formularze używają React `useState` i `useCallback` dla performance
- Walidacja działa na dwóch poziomach: client-side (UI feedback) i server-side (security)
- Error handling jest zgodny ze specyfikacją (kody 400, 401, 403, 409, 429, 500)
- Loading states są zaimplementowane dla lepszego UX
- Komponenty są accessibility-friendly (aria-invalid, labels, autocomplete)
