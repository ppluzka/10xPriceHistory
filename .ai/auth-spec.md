# Specyfikacja techniczna modułu autentykacji - PriceHistory

## 1. WPROWADZENIE

### 1.1 Cel dokumentu

Dokument określa szczegółową architekturę techniczną systemu autentykacji dla aplikacji PriceHistory, obejmującą rejestrację, logowanie, wylogowanie, weryfikację email, zmianę hasła oraz usuwanie konta użytkownika.

### 1.2 Zakres funkcjonalny

Specyfikacja realizuje następujące historyjki użytkownika z PRD:

- US-001: Rejestracja nowego konta
- US-002: Weryfikacja konta email
- US-003: Logowanie do systemu
- US-004: Wylogowanie z systemu
- US-005: Zmiana hasła
- US-006: Usunięcie konta

### 1.3 Założenia techniczne

- **Frontend**: Astro 5 (SSR), React 19, TypeScript 5, Tailwind 4, Shadcn/ui
- **Backend**: Supabase Auth + PostgreSQL z Row Level Security
- **Architektura**: Server-Side Rendering z Astro middleware dla autoryzacji
- **Sesje**: Zarządzane przez Supabase Auth (7 dni session timeout)

---

## 2. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 2.1 Struktura stron i komponentów

#### 2.1.1 Strony publiczne (Astro SSR)

**Lokalizacja**: `src/pages/`

##### `/login.astro` - Strona logowania

**Odpowiedzialność**:

- Renderowanie layoutu strony logowania
- Server-side sprawdzenie czy użytkownik jest już zalogowany (redirect do /dashboard)
- Osadzenie formularza logowania (React component)
- Wyświetlanie komunikatów z query params (np. `?verified=true`)

**Struktura**:

```typescript
// Pseudokod
export const prerender = false; // SSR wymagane

const session = await Astro.locals.supabase.auth.getSession();
if (session.data.session) {
  return Astro.redirect("/dashboard");
}

const verified = Astro.url.searchParams.get("verified");
const error = Astro.url.searchParams.get("error");
```

**Integracja z layoutem**:

- Layout: `src/layouts/AuthLayout.astro` (nowy, dedykowany dla stron auth)
- Wyśrodkowany formularz, responsywny design
- Logo i branding

##### `/register.astro` - Strona rejestracji

**Odpowiedzialność**:

- Renderowanie formularza rejestracji
- Server-side sprawdzenie czy użytkownik jest już zalogowany (redirect)
- Osadzenie formularza rejestracji z captcha

**Struktura**: Analogiczna do `/login.astro`

##### `/verify-email.astro` - Strona potwierdzenia weryfikacji

**Odpowiedzialność**:

- Wyświetlenie informacji o pomyślnej weryfikacji
- Komunikat o konieczności sprawdzenia emaila po rejestracji
- Możliwość wysłania linku ponownie

**Przepływ**:

1. Po rejestracji → redirect na `/verify-email?email={encoded_email}`
2. Po kliknięciu w link weryfikacyjny → Supabase przekierowuje do `/auth/callback` (patrz niżej)

##### `/auth/callback.astro` - Obsługa callback z Supabase

**Odpowiedzialność**:

- Przechwytuje callback po weryfikacji email lub OAuth (przyszłość)
- Wymiana kodu na sesję (Supabase Auth SDK)
- Redirect do `/dashboard` lub `/login?error=...`

**Implementacja**:

```typescript
export const prerender = false;

const code = Astro.url.searchParams.get("code");
if (code) {
  const { error } = await Astro.locals.supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return Astro.redirect("/login?error=verification_failed");
  }
  return Astro.redirect("/dashboard?verified=true");
}
return Astro.redirect("/login");
```

##### `/forgot-password.astro` - Reset hasła (MVP: opcjonalny)

**Odpowiedzialność**:

- Formularz z polem email
- Wysłanie linku resetującego przez Supabase
- Komunikat o wysłaniu emaila

**Status**: Opcjonalny w MVP, ale łatwy do dodania z Supabase Auth

---

#### 2.1.2 Komponenty React (Client-side)

**Lokalizacja**: `src/components/auth/`

##### `LoginForm.tsx` - Formularz logowania

**Typ**: Client React Component (`client:load`)

**Odpowiedzialność**:

- Zarządzanie stanem formularza (email, hasło)
- Walidacja po stronie klienta (format email, długość hasła)
- Wywołanie API endpoint `/api/auth/login`
- Wyświetlanie błędów walidacji i błędów API
- Loading state podczas wysyłania

**Props**:

```typescript
interface LoginFormProps {
  redirectTo?: string; // Gdzie przekierować po logowaniu (default: /dashboard)
  showRegisterLink?: boolean; // Czy pokazać link do rejestracji (default: true)
}
```

**Stan komponentu**:

```typescript
interface LoginFormState {
  email: string;
  password: string;
  isLoading: boolean;
  error: string | null;
}
```

**Walidacja**:

- Email: regex RFC 5322 simplified
- Hasło: minimum 8 znaków (zgodnie z US-001)
- Real-time walidacja przy onBlur, submit walidacja przed wysłaniem

**Obsługa błędów**:

- `400 Bad Request` → "Nieprawidłowy format danych"
- `401 Unauthorized` → "Nieprawidłowy email lub hasło"
- `403 Forbidden (unverified)` → "Potwierdź email przed logowaniem" + link do ponownego wysłania
- `429 Too Many Requests` → "Zbyt wiele prób logowania, spróbuj za chwilę"
- `500 Server Error` → "Wystąpił błąd, spróbuj ponownie"

**Integracja z UI**:

- Komponenty z Shadcn/ui: `Input`, `Button`, `Label`, `Alert`
- Toast notifications (Sonner) dla sukcesu/błędów

##### `RegisterForm.tsx` - Formularz rejestracji

**Typ**: Client React Component (`client:load`)

**Odpowiedzialność**:

- Zarządzanie stanem formularza (email, hasło, potwierdzenie hasła)
- Walidacja: zgodność haseł, siła hasła
- Integracja z hCaptcha lub Cloudflare Turnstile
- Wywołanie API endpoint `/api/auth/register`
- Rate limiting UI (disable po 3 próbach z jednego IP)

**Props**:

```typescript
interface RegisterFormProps {
  captchaSiteKey: string; // Przekazany z env przez Astro
}
```

**Stan**:

```typescript
interface RegisterFormState {
  email: string;
  password: string;
  confirmPassword: string;
  captchaToken: string | null;
  isLoading: boolean;
  error: string | null;
  passwordStrength: "weak" | "medium" | "strong"; // Wizualne wskazanie siły
}
```

**Walidacja**:

- Email: format, długość max 255 znaków
- Hasło: min 8 znaków, zalecane: 1 cyfra, 1 wielka litera
- Potwierdzenie hasła: musi być identyczne
- Captcha: wymagany token przed submit

**Obsługa błędów**:

- `400 Bad Request` → Wyświetl szczegóły walidacji
- `409 Conflict` → "Email jest już zarejestrowany"
- `429 Too Many Requests` → "Zbyt wiele prób rejestracji z tego IP"
- `500 Server Error` → "Wystąpił błąd, spróbuj ponownie"

##### `ResendVerificationButton.tsx` - Ponowne wysłanie linku

**Typ**: Client React Component (`client:load`)

**Odpowiedzialność**:

- Przycisk do ponownego wysłania linku weryfikacyjnego
- Cooldown timer (60 sekund) po wysłaniu
- Wywołanie `/api/auth/resend-verification`

**Props**:

```typescript
interface ResendVerificationButtonProps {
  email: string;
}
```

**Stan**:

```typescript
interface State {
  isLoading: boolean;
  cooldownSeconds: number; // 0 = można wysłać
  message: string | null;
}
```

##### `PasswordChangeForm.tsx` - Już istnieje

**Lokalizacja**: `src/components/settings/PasswordChangeForm.tsx`

**Wymagane modyfikacje**:

- Integracja z Supabase Auth API zamiast mock
- Wywołanie `/api/auth/change-password`
- Dodanie walidacji: aktualne hasło, nowe hasło (min 8), potwierdzenie

##### `DeleteAccountSection.tsx` - Już istnieje

**Lokalizacja**: `src/components/settings/DeleteAccountSection.tsx`

**Wymagane modyfikacje**:

- Integracja z `/api/auth/delete-account`
- Modal z potwierdzeniem: użytkownik musi wpisać "USUŃ"
- Obsługa anonimizacji danych przez backend

---

#### 2.1.3 Strony chronione (Auth required)

**Modyfikacje istniejących stron**:

##### `/dashboard.astro`

**Zmiany**:

- Dodanie sprawdzenia sesji w middleware (już istnieje szkielet w `src/middleware/index.ts`)
- Redirect do `/login` jeśli brak sesji
- Przekazanie danych użytkownika do komponentu React

**Implementacja server-side**:

```typescript
export const prerender = false;

const session = await Astro.locals.supabase.auth.getSession();
if (!session.data.session) {
  return Astro.redirect("/login");
}

const user = session.data.session.user;
Astro.locals.current_user_id = user.id; // Zastąpienie DEFAULT_USER_ID
```

##### `/settings.astro`

**Zmiany**: Analogiczne do `/dashboard.astro`

##### `/offer/[id].astro`

**Zmiany**: Analogiczne, weryfikacja dostępu do oferty przez RLS w zapytaniu DB

---

#### 2.1.4 Komponenty nawigacyjne

##### `Header.tsx` (nowy)

**Typ**: React Component

**Odpowiedzialność**:

- Nawigacja dla zalogowanych użytkowników
- Wyświetlanie emaila użytkownika (lub Avatar w przyszłości)
- Przycisk "Wyloguj"
- Responsywny hamburger menu na mobile

**Props**:

```typescript
interface HeaderProps {
  user: {
    email: string;
    id: string;
  };
}
```

**Nawigacja**:

- Logo → `/dashboard`
- "Dashboard" → `/dashboard`
- "Ustawienia" → `/settings`
- "Wyloguj" → wywołanie `/api/auth/logout` i redirect

##### `PublicHeader.tsx` (nowy)

**Typ**: React Component

**Odpowiedzialność**:

- Nawigacja dla niezalogowanych (landing page)
- Przyciski "Zaloguj" i "Zarejestruj"

---

### 2.2 Layouty

#### `AuthLayout.astro` (nowy)

**Lokalizacja**: `src/layouts/AuthLayout.astro`

**Odpowiedzialność**:

- Dedykowany layout dla stron auth (login, register)
- Wyśrodkowane karty formularzy
- Minimalistyczny design bez nawigacji głównej
- Logo i link powrotny do landing page

**Struktura**:

```astro
---
import "@/styles/global.css";
---

<!doctype html>
<html>
  <head>
    <title>{Astro.props.title} - PriceHistory</title>
  </head>
  <body class="bg-gray-50">
    <div class="min-h-screen flex items-center justify-center">
      <div class="w-full max-w-md">
        <slot />
      </div>
    </div>
  </body>
</html>
```

#### `Layout.astro` (modyfikacja istniejącego)

**Lokalizacja**: `src/layouts/Layout.astro`

**Zmiany**:

- Dodanie `<Header>` dla stron chronionych
- Przekazanie danych użytkownika z Astro.locals
- Warunkowe renderowanie: PublicHeader vs Header

---

### 2.3 Przepływy użytkownika (User Flows)

#### 2.3.1 Flow rejestracji

```
1. Użytkownik wchodzi na /register
   ├─ Jeśli zalogowany → redirect /dashboard
   └─ Jeśli niezalogowany → renderuj RegisterForm

2. Wypełnienie formularza
   ├─ Email
   ├─ Hasło (min 8 znaków)
   ├─ Potwierdzenie hasła
   └─ Captcha

3. Submit → POST /api/auth/register
   ├─ Sukces (201):
   │   └─ Redirect /verify-email?email={email}
   │       └─ Komunikat: "Sprawdź email aby potwierdzić konto"
   ├─ Błąd 409: Email zajęty
   │   └─ Wyświetl: "Email jest już zarejestrowany"
   ├─ Błąd 429: Rate limit
   │   └─ Wyświetl: "Zbyt wiele prób rejestracji z tego IP"
   └─ Błąd 400/500: Inne
       └─ Wyświetl komunikat błędu

4. Użytkownik sprawdza email
   └─ Kliknięcie w link → Supabase Auth → /auth/callback?code=...

5. Callback handler:
   ├─ Wymiana code na session
   ├─ Sukces → redirect /dashboard?verified=true
   └─ Błąd → redirect /login?error=verification_failed
```

#### 2.3.2 Flow logowania

```
1. Użytkownik wchodzi na /login
   ├─ Jeśli zalogowany → redirect /dashboard
   └─ Jeśli niezalogowany → renderuj LoginForm

2. Wypełnienie formularza
   ├─ Email
   └─ Hasło

3. Submit → POST /api/auth/login
   ├─ Sukces (200):
   │   └─ Redirect /dashboard
   ├─ Błąd 401: Nieprawidłowe dane
   │   └─ Wyświetl: "Nieprawidłowy email lub hasło"
   ├─ Błąd 403: Email niezweryfikowany
   │   └─ Wyświetl: "Potwierdź email przed logowaniem" + przycisk resend
   └─ Błąd 429/500: Inne
       └─ Wyświetl komunikat błędu

4. Po zalogowaniu:
   └─ Middleware ustawia session w cookies
   └─ User ma dostęp do chronionych stron
```

#### 2.3.3 Flow wylogowania

```
1. Użytkownik klika "Wyloguj" w Header
   └─ onClick → POST /api/auth/logout

2. Backend:
   ├─ Supabase.auth.signOut()
   └─ Usunięcie session cookies

3. Redirect → /
   └─ Landing page
```

#### 2.3.4 Flow zmiany hasła

```
1. Użytkownik wchodzi na /settings (wymaga auth)
   └─ Renderuj PasswordChangeForm

2. Wypełnienie formularza
   ├─ Aktualne hasło
   ├─ Nowe hasło (min 8)
   └─ Potwierdzenie nowego hasła

3. Submit → POST /api/auth/change-password
   ├─ Sukces (200):
   │   ├─ Toast: "Hasło zostało zmienione"
   │   └─ Wysłanie emaila informującego o zmianie (Supabase)
   ├─ Błąd 401: Nieprawidłowe aktualne hasło
   │   └─ Wyświetl: "Aktualne hasło jest nieprawidłowe"
   └─ Błąd 400/500: Inne
       └─ Wyświetl komunikat błędu
```

#### 2.3.5 Flow usunięcia konta

```
1. Użytkownik wchodzi na /settings → sekcja "Niebezpieczne akcje"
   └─ Przycisk: "Usuń konto"

2. Kliknięcie → Modal potwierdzający
   ├─ Ostrzeżenie: "Ta akcja jest nieodwracalna"
   ├─ Input: Wpisz "USUŃ" aby potwierdzić
   └─ Przyciski: "Anuluj" | "Usuń konto"

3. Po wpisaniu "USUŃ" i kliknięciu → POST /api/auth/delete-account
   ├─ Sukces (200):
   │   ├─ Soft delete user_offer (deleted_at = NOW())
   │   ├─ Anonimizacja email: deleted_{timestamp}@deleted.com
   │   ├─ Usunięcie hasła i danych auth
   │   └─ Redirect /
   └─ Błąd:
       └─ Wyświetl komunikat błędu w modal
```

---

### 2.4 Walidacja i komunikaty błędów

#### 2.4.1 Walidacja client-side

**Email**:

- Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Komunikat: "Wprowadź prawidłowy adres email"

**Hasło (rejestracja/zmiana)**:

- Min 8 znaków: "Hasło musi mieć minimum 8 znaków"
- Zalecane (warning, nie blokuje): "Dla bezpieczeństwa użyj cyfr i wielkich liter"

**Potwierdzenie hasła**:

- Musi być identyczne: "Hasła nie są identyczne"

**Captcha**:

- Wymagany token: "Potwierdź że nie jesteś robotem"

#### 2.4.2 Komunikaty błędów API

Wszystkie błędy zwracane w formacie:

```typescript
interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
}
```

**Kody błędów**:

- `EMAIL_ALREADY_EXISTS` (409)
- `INVALID_CREDENTIALS` (401)
- `EMAIL_NOT_VERIFIED` (403)
- `RATE_LIMIT_EXCEEDED` (429)
- `WEAK_PASSWORD` (400)
- `INVALID_CAPTCHA` (400)
- `SESSION_EXPIRED` (401)

---

### 2.5 Obsługa loading states i feedback

#### Loading indicators:

- **Formularze**: Spinner + disabled inputs podczas submit
- **Przyciski**: Loading spinner zamiast tekstu
- **Skeleton screens**: Nie wymagane dla auth (szybkie operacje)

#### Success feedback:

- **Toast notifications** (Sonner):
  - "Zalogowano pomyślnie"
  - "Hasło zostało zmienione"
  - "Link weryfikacyjny wysłany"
- **Redirects** z query params:
  - `/dashboard?verified=true` → Toast: "Email zweryfikowany"
  - `/login?registered=true` → Banner: "Sprawdź email"

#### Error feedback:

- **Inline errors**: Pod polami formularza (kolor czerwony)
- **Toast errors**: Dla błędów API (5s auto-dismiss)
- **Banner errors**: Dla błędów krytycznych (wymaga dismiss)

---

## 3. LOGIKA BACKENDOWA

### 3.1 Endpointy API

**Lokalizacja**: `src/pages/api/auth/`

#### 3.1.1 POST `/api/auth/register`

**Odpowiedzialność**: Rejestracja nowego użytkownika

**Request Body**:

```typescript
{
  email: string; // Max 255 znaków, format email
  password: string; // Min 8 znaków
  captchaToken: string; // Token z hCaptcha/Turnstile
}
```

**Walidacja**:

1. Schema validation (Zod)
2. Weryfikacja captcha token (HTTP request do hCaptcha API)
3. Rate limiting: max 3 rejestracje z jednego IP/24h (sprawdzenie w tabeli `registration_attempts`)

**Logika**:

```typescript
// 1. Walidacja inputu
const validated = RegisterSchema.parse(body);

// 2. Weryfikacja captcha
const captchaValid = await verifyCaptcha(validated.captchaToken, clientIp);
if (!captchaValid) {
  return new Response(JSON.stringify({ error: "Invalid captcha" }), { status: 400 });
}

// 3. Rate limiting check
const attemptCount = await checkRegistrationAttempts(clientIp);
if (attemptCount >= 3) {
  return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 });
}

// 4. Rejestracja przez Supabase Auth
const { data, error } = await supabase.auth.signUp({
  email: validated.email,
  password: validated.password,
  options: {
    emailRedirectTo: `${siteUrl}/auth/callback`,
  },
});

// 5. Log attempt
await logRegistrationAttempt(clientIp, data?.user?.id);

// 6. Zwróć sukces
return new Response(
  JSON.stringify({
    message: "Registration successful. Check your email.",
  }),
  { status: 201 }
);
```

**Response**:

- `201 Created`: Sukces
- `400 Bad Request`: Błąd walidacji/captcha
- `409 Conflict`: Email już istnieje
- `429 Too Many Requests`: Rate limit
- `500 Server Error`: Błąd serwera

#### 3.1.2 POST `/api/auth/login`

**Odpowiedzialność**: Logowanie użytkownika

**Request Body**:

```typescript
{
  email: string;
  password: string;
}
```

**Logika**:

```typescript
// 1. Walidacja
const validated = LoginSchema.parse(body);

// 2. Logowanie przez Supabase
const { data, error } = await supabase.auth.signInWithPassword({
  email: validated.email,
  password: validated.password,
});

// 3. Obsługa błędów
if (error) {
  // Email niezweryfikowany
  if (error.message.includes("Email not confirmed")) {
    return new Response(
      JSON.stringify({
        error: "Email not verified",
        code: "EMAIL_NOT_VERIFIED",
      }),
      { status: 403 }
    );
  }

  // Nieprawidłowe dane
  return new Response(
    JSON.stringify({
      error: "Invalid credentials",
      code: "INVALID_CREDENTIALS",
    }),
    { status: 401 }
  );
}

// 4. Ustaw session cookie (Supabase SDK robi to automatycznie)
// 5. Opcjonalnie: utworzenie user_preferences jeśli nie istnieją
await ensureUserPreferencesExist(data.session.user.id);

// 6. Zwróć sukces
return new Response(
  JSON.stringify({
    message: "Login successful",
    user: {
      id: data.session.user.id,
      email: data.session.user.email,
    },
  }),
  { status: 200 }
);
```

**Response**:

- `200 OK`: Sukces
- `401 Unauthorized`: Nieprawidłowe dane
- `403 Forbidden`: Email niezweryfikowany
- `500 Server Error`: Błąd serwera

#### 3.1.3 POST `/api/auth/logout`

**Odpowiedzialność**: Wylogowanie użytkownika

**Logika**:

```typescript
// 1. Wylogowanie przez Supabase
const { error } = await supabase.auth.signOut();

if (error) {
  return new Response(JSON.stringify({ error: error.message }), { status: 500 });
}

// 2. Usunięcie cookies (Supabase SDK robi to automatycznie)
return new Response(JSON.stringify({ message: "Logged out" }), { status: 200 });
```

**Response**:

- `200 OK`: Sukces
- `500 Server Error`: Błąd

#### 3.1.4 POST `/api/auth/resend-verification`

**Odpowiedzialność**: Ponowne wysłanie emaila weryfikacyjnego

**Request Body**:

```typescript
{
  email: string;
}
```

**Logika**:

```typescript
// 1. Walidacja
const validated = ResendSchema.parse(body);

// 2. Rate limiting (max 1 email/minute dla danego adresu)
const canResend = await checkResendCooldown(validated.email);
if (!canResend) {
  return new Response(
    JSON.stringify({
      error: "Please wait before resending",
    }),
    { status: 429 }
  );
}

// 3. Wysłanie przez Supabase
const { error } = await supabase.auth.resend({
  type: "signup",
  email: validated.email,
  options: {
    emailRedirectTo: `${siteUrl}/auth/callback`,
  },
});

if (error) {
  return new Response(JSON.stringify({ error: error.message }), { status: 400 });
}

// 4. Log resend
await logResendAttempt(validated.email);

return new Response(
  JSON.stringify({
    message: "Verification email sent",
  }),
  { status: 200 }
);
```

**Response**:

- `200 OK`: Email wysłany
- `429 Too Many Requests`: Cooldown aktywny
- `400 Bad Request`: Błąd
- `500 Server Error`: Błąd serwera

#### 3.1.5 POST `/api/auth/change-password`

**Odpowiedzialność**: Zmiana hasła zalogowanego użytkownika

**Uwaga**: Wymaga aktywnej sesji (middleware sprawdza auth)

**Request Body**:

```typescript
{
  currentPassword: string;
  newPassword: string;
}
```

**Logika**:

```typescript
// 1. Sprawdzenie sesji (middleware)
const session = await supabase.auth.getSession();
if (!session.data.session) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}

// 2. Walidacja
const validated = ChangePasswordSchema.parse(body);

// 3. Weryfikacja aktualnego hasła (re-authentication)
const { error: reAuthError } = await supabase.auth.signInWithPassword({
  email: session.data.session.user.email,
  password: validated.currentPassword,
});

if (reAuthError) {
  return new Response(
    JSON.stringify({
      error: "Current password is incorrect",
      code: "INVALID_CURRENT_PASSWORD",
    }),
    { status: 401 }
  );
}

// 4. Zmiana hasła
const { error } = await supabase.auth.updateUser({
  password: validated.newPassword,
});

if (error) {
  return new Response(JSON.stringify({ error: error.message }), { status: 400 });
}

// 5. Supabase automatycznie wysyła email o zmianie hasła

return new Response(
  JSON.stringify({
    message: "Password changed successfully",
  }),
  { status: 200 }
);
```

**Response**:

- `200 OK`: Hasło zmienione
- `401 Unauthorized`: Nieprawidłowe aktualne hasło lub brak sesji
- `400 Bad Request`: Błąd walidacji
- `500 Server Error`: Błąd serwera

#### 3.1.6 POST `/api/auth/delete-account`

**Odpowiedzialność**: Usunięcie konta użytkownika (anonimizacja)

**Uwaga**: Wymaga aktywnej sesji + potwierdzenie

**Request Body**:

```typescript
{
  confirmation: string; // Musi być "USUŃ"
}
```

**Logika**:

```typescript
// 1. Sprawdzenie sesji
const session = await supabase.auth.getSession();
if (!session.data.session) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}

const userId = session.data.session.user.id;

// 2. Walidacja potwierdzenia
if (body.confirmation !== "USUŃ") {
  return new Response(
    JSON.stringify({
      error: "Invalid confirmation",
    }),
    { status: 400 }
  );
}

// 3. Soft delete user_offer (RLS pozwala użytkownikowi)
await supabase.from("user_offer").update({ deleted_at: new Date().toISOString() }).eq("user_id", userId);

// 4. Anonimizacja email w auth.users (wymaga service_role lub function)
const timestamp = Date.now();
const anonymizedEmail = `deleted_${timestamp}@deleted.com`;

// Użycie Supabase Admin API (service_role)
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
await adminSupabase.auth.admin.updateUserById(userId, {
  email: anonymizedEmail,
});

// 5. Usunięcie sesji
await supabase.auth.signOut();

return new Response(
  JSON.stringify({
    message: "Account deleted successfully",
  }),
  { status: 200 }
);
```

**Alternatywa**: Implementacja jako Database Function dla bezpieczeństwa:

```sql
CREATE OR REPLACE FUNCTION delete_user_account(user_id_param UUID)
RETURNS void AS $$
BEGIN
  -- Soft delete offers
  UPDATE user_offer
  SET deleted_at = NOW()
  WHERE user_id = user_id_param;

  -- Anonymize email
  UPDATE auth.users
  SET email = 'deleted_' || EXTRACT(EPOCH FROM NOW()) || '@deleted.com',
      encrypted_password = NULL
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Response**:

- `200 OK`: Konto usunięte
- `400 Bad Request`: Błąd walidacji
- `401 Unauthorized`: Brak sesji
- `500 Server Error`: Błąd serwera

---

### 3.2 Schematy walidacji (Zod)

**Lokalizacja**: `src/lib/validators/auth.validators.ts`

```typescript
import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email("Invalid email format").max(255),
  password: z.string().min(8, "Password must be at least 8 characters"),
  captchaToken: z.string().min(1, "Captcha is required"),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const ResendVerificationSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const DeleteAccountSchema = z.object({
  confirmation: z.literal("USUŃ", {
    errorMap: () => ({ message: "Type USUŃ to confirm" }),
  }),
});

// Types exported dla TypeScript
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>;
export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;
```

---

### 3.3 Serwisy pomocnicze

**Lokalizacja**: `src/lib/services/auth.service.ts`

#### 3.3.1 `AuthService`

```typescript
export class AuthService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Sprawdza czy użytkownik ma user_preferences, jeśli nie - tworzy
   */
  async ensureUserPreferencesExist(userId: string): Promise<void> {
    const { data } = await this.supabase.from("user_preferences").select("user_id").eq("user_id", userId).single();

    if (!data) {
      await this.supabase.from("user_preferences").insert({
        user_id: userId,
        default_frequency: "24h",
      });
    }
  }

  /**
   * Pobiera dane aktualnie zalogowanego użytkownika
   */
  async getCurrentUser() {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email!,
      emailVerified: session.user.email_confirmed_at !== null,
    };
  }

  /**
   * Sprawdza czy email jest zweryfikowany
   */
  async isEmailVerified(userId: string): Promise<boolean> {
    const { data } = await this.supabase.auth.admin.getUserById(userId);
    return data.user?.email_confirmed_at !== null;
  }
}
```

#### 3.3.2 `CaptchaService`

**Lokalizacja**: `src/lib/services/captcha.service.ts`

```typescript
export class CaptchaService {
  constructor(private secretKey: string) {}

  /**
   * Weryfikuje token captcha z hCaptcha
   */
  async verify(token: string, remoteIp?: string): Promise<boolean> {
    const response = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: this.secretKey,
        response: token,
        ...(remoteIp && { remoteip: remoteIp }),
      }),
    });

    const data = await response.json();
    return data.success === true;
  }
}
```

Alternatywnie dla Cloudflare Turnstile:

```typescript
async verifyTurnstile(token: string, remoteIp?: string): Promise<boolean> {
  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: this.secretKey,
        response: token,
        remoteip: remoteIp,
      }),
    }
  );

  const data = await response.json();
  return data.success === true;
}
```

---

### 3.4 Rate Limiting

**Wykorzystanie istniejącego**: `src/lib/rate-limiter.service.ts`

**Rozszerzenia wymagane**:

```typescript
// Dodanie nowych limitów dla auth endpoints
export const AUTH_RATE_LIMITS = {
  REGISTER: { maxAttempts: 3, windowMs: 24 * 60 * 60 * 1000 }, // 3/24h per IP
  LOGIN: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5/15min per IP
  RESEND: { maxAttempts: 1, windowMs: 60 * 1000 }, // 1/min per email
  CHANGE_PASSWORD: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3/hour per user
};
```

**Implementacja w bazie danych**:

Tabela `registration_attempts`:

```sql
CREATE TABLE registration_attempts (
  id SERIAL PRIMARY KEY,
  ip_address INET NOT NULL,
  user_id UUID,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_registration_attempts_ip_time
  ON registration_attempts(ip_address, attempted_at DESC);
```

Tabela `login_attempts`:

```sql
CREATE TABLE login_attempts (
  id SERIAL PRIMARY KEY,
  ip_address INET NOT NULL,
  email TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_login_attempts_ip_time
  ON login_attempts(ip_address, attempted_at DESC);
```

---

### 3.5 Obsługa wyjątków

**Centralna obsługa błędów**:

**Lokalizacja**: `src/lib/errors/auth.errors.ts`

```typescript
export enum AuthErrorCode {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED",
  EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS",
  WEAK_PASSWORD = "WEAK_PASSWORD",
  INVALID_CAPTCHA = "INVALID_CAPTCHA",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  INVALID_TOKEN = "INVALID_TOKEN",
}

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "AuthError";
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
    };
  }
}

// Helper functions
export function handleSupabaseAuthError(error: any): AuthError {
  if (error.message.includes("Email not confirmed")) {
    return new AuthError(AuthErrorCode.EMAIL_NOT_VERIFIED, "Email address is not verified", 403);
  }

  if (error.message.includes("Invalid login credentials")) {
    return new AuthError(AuthErrorCode.INVALID_CREDENTIALS, "Invalid email or password", 401);
  }

  if (error.message.includes("User already registered")) {
    return new AuthError(AuthErrorCode.EMAIL_ALREADY_EXISTS, "Email is already registered", 409);
  }

  // Default
  return new AuthError(AuthErrorCode.INVALID_TOKEN, "Authentication failed", 500);
}
```

**Middleware error handler** w endpointach:

```typescript
try {
  // Logic
} catch (error) {
  if (error instanceof AuthError) {
    return new Response(JSON.stringify(error.toJSON()), {
      status: error.statusCode,
    });
  }

  // Unexpected error
  console.error("Unexpected error:", error);
  return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
}
```

---

### 3.6 Aktualizacja renderowania SSR

#### 3.6.1 Middleware (modyfikacja istniejącego)

**Lokalizacja**: `src/middleware/index.ts`

**Zmiany**:

```typescript
import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client.ts";

export const onRequest = defineMiddleware(async (context, next) => {
  // 1. Udostępnij Supabase client
  context.locals.supabase = supabaseClient;

  // 2. Pobierz sesję użytkownika
  const {
    data: { session },
    error,
  } = await supabaseClient.auth.getSession();

  // 3. Ustaw user_id (lub null jeśli niezalogowany)
  if (session && !error) {
    context.locals.current_user_id = session.user.id;
    context.locals.user = {
      id: session.user.id,
      email: session.user.email!,
      emailVerified: session.user.email_confirmed_at !== null,
    };
  } else {
    context.locals.current_user_id = null;
    context.locals.user = null;
  }

  // 4. Ochrona chronionych stron
  const protectedRoutes = ["/dashboard", "/settings", "/offer"];
  const isProtectedRoute = protectedRoutes.some((route) => context.url.pathname.startsWith(route));

  if (isProtectedRoute && !context.locals.user) {
    // Redirect do logowania z returnUrl
    const returnUrl = encodeURIComponent(context.url.pathname + context.url.search);
    return context.redirect(`/login?returnUrl=${returnUrl}`);
  }

  return next();
});
```

#### 3.6.2 Typy dla Astro.locals

**Lokalizacja**: `src/env.d.ts`

**Zmiany**:

```typescript
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_SERVICE_KEY: string;
  readonly HCAPTCHA_SECRET_KEY: string;
  readonly HCAPTCHA_SITE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    supabase: import("@supabase/supabase-js").SupabaseClient<import("./db/database.types").Database>;
    current_user_id: string | null;
    user: {
      id: string;
      email: string;
      emailVerified: boolean;
    } | null;
  }
}
```

#### 3.6.3 Helper dla chronionych stron

**Lokalizacja**: `src/lib/utils/auth.utils.ts`

```typescript
import type { AstroGlobal } from "astro";

/**
 * Sprawdza czy użytkownik jest zalogowany, jeśli nie - przekierowuje do /login
 * Do użycia w .astro pages
 */
export function requireAuth(Astro: AstroGlobal) {
  if (!Astro.locals.user) {
    const returnUrl = encodeURIComponent(Astro.url.pathname + Astro.url.search);
    return Astro.redirect(`/login?returnUrl=${returnUrl}`);
  }
  return null; // Continue rendering
}

/**
 * Sprawdza czy użytkownik jest już zalogowany, jeśli tak - przekierowuje do /dashboard
 * Do użycia na stronach /login, /register
 */
export function requireGuest(Astro: AstroGlobal) {
  if (Astro.locals.user) {
    return Astro.redirect("/dashboard");
  }
  return null;
}

/**
 * Pobiera return URL z query params lub default
 */
export function getReturnUrl(Astro: AstroGlobal, defaultUrl = "/dashboard"): string {
  const returnUrl = Astro.url.searchParams.get("returnUrl");
  return returnUrl ? decodeURIComponent(returnUrl) : defaultUrl;
}
```

**Użycie w stronie**:

```astro
---
// dashboard.astro
import { requireAuth } from "@/lib/utils/auth.utils";

const redirect = requireAuth(Astro);
if (redirect) return redirect;

const user = Astro.locals.user!;
---
```

---

## 4. SYSTEM AUTENTYKACJI - SUPABASE AUTH

### 4.1 Konfiguracja Supabase Auth

#### 4.1.1 Zmienne środowiskowe

**Lokalizacja**: `.env`

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Captcha
HCAPTCHA_SECRET_KEY=your-secret-key
HCAPTCHA_SITE_KEY=your-site-key

# Site URL (dla email redirects)
PUBLIC_SITE_URL=http://localhost:3000  # development
# PUBLIC_SITE_URL=https://pricehistory.pl  # production
```

#### 4.1.2 Konfiguracja Supabase Dashboard

**Authentication Settings** → **URL Configuration**:

- Site URL: `https://pricehistory.pl` (production)
- Redirect URLs:
  - `http://localhost:3000/auth/callback` (dev)
  - `https://pricehistory.pl/auth/callback` (prod)

**Email Templates**:

- Confirm signup: Customizowany template z brandingiem
- Change email: Domyślny lub customizowany
- Reset password: Customizowany (jeśli implementujemy)

**Email Auth**:

- Enable Email provider: ✓
- Confirm email: Required (wymagane przed logowaniem)
- Secure email change: Enabled

**Sessions**:

- Inactivity timeout: 7 days (zgodnie z US-003)
- Refresh token rotation: Enabled

#### 4.1.3 Inicjalizacja klienta

**Lokalizacja**: `src/db/supabase.client.ts` (modyfikacja)

**Obecny stan**:

```typescript
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

**Rozszerzona konfiguracja**:

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce", // Bezpieczniejszy flow dla SSR
  },
});

// Admin client (tylko dla server-side operacji wymagających service_role)
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Type export dla TypeScript
export type SupabaseClient = typeof supabaseClient;
```

---

### 4.2 Integracja z Astro SSR

#### 4.2.1 Session Management

Supabase Auth używa cookies do przechowywania sesji. W Astro SSR:

1. **Set cookies**: Supabase SDK automatycznie ustawia cookies po `signInWithPassword()`
2. **Read cookies**: Middleware odczytuje cookies przez `getSession()`
3. **Clear cookies**: `signOut()` usuwa cookies

**Cookie names** (Supabase v2 SSR):

- `sb-<project-ref>-auth-token` - główny token sesji (zawiera access i refresh token jako JSON)
- Alternatywnie (legacy): `sb-access-token`, `sb-refresh-token`

**Uwaga**: Dokładna nazwa zależy od project ref w Supabase. Middleware używa `getSession()` które automatycznie odczytuje odpowiednie cookies.

**Security**:

- HttpOnly: ✓
- Secure: ✓ (w production z HTTPS)
- SameSite: Lax
- Path: /

#### 4.2.2 Token Refresh

Supabase SDK automatycznie odświeża tokeny przed wygaśnięciem jeśli `autoRefreshToken: true`.

W middleware:

```typescript
// getSession() automatycznie refreshuje token jeśli potrzeba
const {
  data: { session },
  error,
} = await supabaseClient.auth.getSession();
```

#### 4.2.3 Obsługa wygasłych sesji

```typescript
// W middleware lub helper
if (error && error.message.includes("refresh_token_not_found")) {
  // Token wygasł, wyloguj użytkownika
  context.locals.user = null;
  return context.redirect("/login?session_expired=true");
}
```

---

### 4.3 Row Level Security (RLS)

RLS policies już zdefiniowane w migracji `20251011000000_initial_schema.sql`.

**Kluczowe polityki dla auth**:

```sql
-- user_offer: Użytkownik widzi tylko swoje subskrypcje
CREATE POLICY user_offer_select_authenticated ON user_offer
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- user_preferences: Użytkownik zarządza swoimi preferencjami
CREATE POLICY user_preferences_select_authenticated ON user_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

**Auth helper w RLS**: `auth.uid()` zwraca ID zalogowanego użytkownika z JWT tokenu.

**Testowanie RLS**:

```sql
-- Test jako określony użytkownik
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'user-uuid-here';

SELECT * FROM user_offer; -- Powinien zwrócić tylko oferty tego użytkownika
```

---

### 4.4 Weryfikacja email

#### 4.4.1 Flow weryfikacji

1. **Rejestracja**: Supabase wysyła email z linkiem
2. **Link format**: `https://pricehistory.pl/auth/callback?token_hash=...&type=signup`
3. **Callback handler**: Wymienia token na sesję
4. **Redirect**: Po sukcesie → `/dashboard?verified=true`

#### 4.4.2 Custom email template

W Supabase Dashboard → Authentication → Email Templates → Confirm signup:

```html
<h2>Potwierdź swój email</h2>
<p>Dziękujemy za rejestrację w PriceHistory!</p>
<p>Kliknij poniższy link aby potwierdzić swój adres email:</p>
<p><a href="{{ .ConfirmationURL }}">Potwierdź email</a></p>
<p>Jeśli nie zakładałeś konta, zignoruj tę wiadomość.</p>
```

---

### 4.5 Bezpieczeństwo

#### 4.5.1 Password hashing

Supabase Auth używa bcrypt do hashowania haseł. Nie przechowujemy plain text passwords.

#### 4.5.2 JWT Tokens

- Access token: Krótkoterminowy (1h), zawiera user metadata
- Refresh token: Długoterminowy (7 dni), używany do odświeżania access tokenu

#### 4.5.3 PKCE Flow

Włączone przez `flowType: 'pkce'` w konfiguracji klienta. Dodatkowa warstwa zabezpieczeń dla auth flows.

#### 4.5.4 Rate limiting

Supabase ma wbudowane rate limiting dla auth endpoints:

- Login: ~100 requests/hour per IP
- Signup: ~100 requests/hour per IP

**Dodatkowe rate limiting** implementujemy w aplikacji (patrz sekcja 3.4).

---

## 5. MIGRACJE BAZY DANYCH

### 5.1 Nowe tabele dla auth

**Lokalizacja**: `supabase/migrations/20251103000000_auth_tables.sql`

```sql
-- ============================================================================
-- Migration: Auth Supporting Tables
-- Purpose: Add tables for rate limiting and audit logging for auth operations
-- ============================================================================

-- Table: system_logs
-- Purpose: General system logging table (used by delete_user_account function and other operations)
CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error')),
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_logs_level_time
  ON system_logs(level, created_at DESC);

CREATE INDEX idx_system_logs_time
  ON system_logs(created_at DESC);

COMMENT ON TABLE system_logs IS
  'General system logging for all operations including auth, scraping, and errors';

-- Table: registration_attempts
-- Purpose: Track registration attempts for rate limiting (3/24h per IP)
CREATE TABLE registration_attempts (
  id SERIAL PRIMARY KEY,
  ip_address INET NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_code TEXT
);

CREATE INDEX idx_registration_attempts_ip_time
  ON registration_attempts(ip_address, attempted_at DESC);

CREATE INDEX idx_registration_attempts_email_time
  ON registration_attempts(email, attempted_at DESC);

COMMENT ON TABLE registration_attempts IS
  'Logs all registration attempts for rate limiting and security monitoring';

-- Table: login_attempts
-- Purpose: Track login attempts for security and rate limiting
CREATE TABLE login_attempts (
  id SERIAL PRIMARY KEY,
  ip_address INET NOT NULL,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_code TEXT
);

CREATE INDEX idx_login_attempts_ip_time
  ON login_attempts(ip_address, attempted_at DESC);

CREATE INDEX idx_login_attempts_email_time
  ON login_attempts(email, attempted_at DESC);

COMMENT ON TABLE login_attempts IS
  'Logs all login attempts for security monitoring and rate limiting';

-- Table: password_change_log
-- Purpose: Audit log for password changes
CREATE TABLE password_change_log (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_password_change_log_user_time
  ON password_change_log(user_id, changed_at DESC);

COMMENT ON TABLE password_change_log IS
  'Audit log of password changes for security purposes';

-- Table: email_verification_resends
-- Purpose: Track verification email resends for rate limiting (1/minute)
CREATE TABLE email_verification_resends (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  resent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verification_resends_email_time
  ON email_verification_resends(email, resent_at DESC);

COMMENT ON TABLE email_verification_resends IS
  'Tracks verification email resends for rate limiting';

-- Cleanup function: Delete old logs (retention 90 days)
CREATE OR REPLACE FUNCTION cleanup_auth_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM registration_attempts WHERE attempted_at < NOW() - INTERVAL '90 days';
  DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '90 days';
  DELETE FROM password_change_log WHERE changed_at < NOW() - INTERVAL '90 days';
  DELETE FROM email_verification_resends WHERE resent_at < NOW() - INTERVAL '7 days';
  DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_auth_logs() IS
  'Cleans up old auth logs according to retention policy';

-- Schedule cleanup (using pg_cron if available, otherwise manual)
-- SELECT cron.schedule('cleanup-auth-logs', '0 2 * * *', 'SELECT cleanup_auth_logs()');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
```

### 5.2 Funkcja pomocnicza dla usuwania konta

**Lokalizacja**: `supabase/migrations/20251103000001_delete_account_function.sql`

```sql
-- ============================================================================
-- Migration: Delete Account Function
-- Purpose: Secure function to anonymize user account (US-006)
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void AS $$
DECLARE
  user_id_param UUID;
  timestamp_val BIGINT;
BEGIN
  -- Get current user ID from JWT
  user_id_param := auth.uid();

  IF user_id_param IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate timestamp for anonymized email
  timestamp_val := EXTRACT(EPOCH FROM NOW())::BIGINT;

  -- Soft delete all user offers
  UPDATE user_offer
  SET deleted_at = NOW()
  WHERE user_id = user_id_param
    AND deleted_at IS NULL;

  -- Anonymize email in auth.users
  UPDATE auth.users
  SET
    email = 'deleted_' || timestamp_val || '@deleted.com',
    encrypted_password = NULL,
    email_confirmed_at = NULL
  WHERE id = user_id_param;

  -- Log the deletion
  INSERT INTO system_logs (level, message, context)
  VALUES (
    'info',
    'User account deleted',
    jsonb_build_object('user_id', user_id_param, 'timestamp', NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_user_account() IS
  'Anonymizes user account data (soft delete). Callable by authenticated user to delete their own account.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
```

**Uwaga**: Funkcja używa `auth.uid()` więc automatycznie działa tylko dla zalogowanego użytkownika - nie może usunąć cudzego konta.

---

## 6. TESTOWANIE

### 6.1 Scenariusze testowe

#### 6.1.1 Rejestracja

**Test Case 1: Pomyślna rejestracja**

```
1. Wejdź na /register
2. Wypełnij email: test@example.com
3. Wypełnij hasło: TestPass123
4. Wypełnij potwierdzenie: TestPass123
5. Rozwiąż captcha
6. Kliknij "Zarejestruj"
Oczekiwany wynik: Redirect na /verify-email, komunikat o sprawdzeniu emaila
```

**Test Case 2: Email już istnieje**

```
1. Zarejestruj użytkownika test@example.com
2. Spróbuj zarejestrować ponownie tego samego emaila
Oczekiwany wynik: Błąd 409 "Email jest już zarejestrowany"
```

**Test Case 3: Captcha nieprawidłowa**

```
1. Wypełnij formularz poprawnie
2. NIE rozwiąż captcha lub użyj nieprawidłowego tokenu
Oczekiwany wynik: Błąd "Potwierdź że nie jesteś robotem"
```

**Test Case 4: Rate limiting**

```
1. Zarejestruj 3 konta z tego samego IP w ciągu 24h
2. Spróbuj zarejestrować 4. konto
Oczekiwany wynik: Błąd 429 "Zbyt wiele prób rejestracji z tego IP"
```

#### 6.1.2 Logowanie

**Test Case 1: Pomyślne logowanie**

```
1. Zarejestruj i zweryfikuj konto
2. Wejdź na /login
3. Wprowadź email i hasło
4. Kliknij "Zaloguj"
Oczekiwany wynik: Redirect na /dashboard, sesja aktywna
```

**Test Case 2: Nieprawidłowe hasło**

```
1. Wprowadź prawidłowy email
2. Wprowadź nieprawidłowe hasło
Oczekiwany wynik: Błąd "Nieprawidłowy email lub hasło"
```

**Test Case 3: Email niezweryfikowany**

```
1. Zarejestruj konto BEZ weryfikacji emaila
2. Spróbuj się zalogować
Oczekiwany wynik: Błąd "Potwierdź email przed logowaniem" + przycisk resend
```

**Test Case 4: Redirect po logowaniu**

```
1. Jako niezalogowany próbuj wejść na /settings
2. System przekierowuje na /login?returnUrl=/settings
3. Zaloguj się
Oczekiwany wynik: Redirect na /settings (a nie /dashboard)
```

#### 6.1.3 Zmiana hasła

**Test Case 1: Pomyślna zmiana**

```
1. Zaloguj się
2. Wejdź na /settings
3. Wypełnij "Aktualne hasło": OldPass123
4. Wypełnij "Nowe hasło": NewPass123
5. Wypełnij "Potwierdzenie": NewPass123
6. Kliknij "Zmień hasło"
Oczekiwany wynik: Toast "Hasło zostało zmienione", email informujący o zmianie
```

**Test Case 2: Nieprawidłowe aktualne hasło**

```
1. W formularzu zmiany hasła wprowadź nieprawidłowe aktualne hasło
Oczekiwany wynik: Błąd "Aktualne hasło jest nieprawidłowe"
```

**Test Case 3: Nowe hasło za krótkie**

```
1. Wprowadź nowe hasło: "123"
Oczekiwany wynik: Błąd walidacji "Hasło musi mieć minimum 8 znaków"
```

#### 6.1.4 Usunięcie konta

**Test Case 1: Pomyślne usunięcie**

```
1. Zaloguj się
2. Wejdź na /settings → "Usuń konto"
3. W modal wpisz "USUŃ"
4. Kliknij "Usuń konto"
Oczekiwany wynik:
  - Soft delete user_offer (deleted_at ustawiony)
  - Email anonimizowany do deleted_{timestamp}@deleted.com
  - Wylogowanie i redirect na /
```

**Test Case 2: Nieprawidłowe potwierdzenie**

```
1. W modal wpisz "usuń" (małe litery) zamiast "USUŃ"
Oczekiwany wynik: Przycisk "Usuń konto" pozostaje disabled
```

---

### 6.2 Testy integracyjne

**Framework**: Playwright lub Cypress

**Przykładowy test E2E**:

```typescript
// tests/auth/registration.spec.ts
import { test, expect } from "@playwright/test";

test.describe("User Registration", () => {
  test("should register new user successfully", async ({ page }) => {
    await page.goto("/register");

    const email = `test-${Date.now()}@example.com`;
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', "TestPass123");
    await page.fill('[name="confirmPassword"]', "TestPass123");

    // Mock captcha (w dev environment)
    await page.evaluate(() => {
      (window as any).mockCaptcha = true;
    });

    await page.click('button[type="submit"]');

    // Should redirect to verify-email
    await expect(page).toHaveURL(/\/verify-email/);
    await expect(page.locator("text=Sprawdź email")).toBeVisible();
  });

  test("should show error for existing email", async ({ page }) => {
    await page.goto("/register");

    // Use existing email
    await page.fill('[name="email"]', "existing@example.com");
    await page.fill('[name="password"]', "TestPass123");
    await page.fill('[name="confirmPassword"]', "TestPass123");

    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator("text=Email jest już zarejestrowany")).toBeVisible();
  });
});
```

---

### 6.3 Testy jednostkowe

**Framework**: Vitest

**Przykład: Walidatory**

```typescript
// tests/unit/auth.validators.test.ts
import { describe, it, expect } from "vitest";
import { RegisterSchema } from "@/lib/validators/auth.validators";

describe("RegisterSchema", () => {
  it("should validate correct registration data", () => {
    const data = {
      email: "test@example.com",
      password: "TestPass123",
      captchaToken: "valid-token",
    };

    const result = RegisterSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const data = {
      email: "invalid-email",
      password: "TestPass123",
      captchaToken: "valid-token",
    };

    const result = RegisterSchema.safeParse(data);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("Invalid email");
  });

  it("should reject short password", () => {
    const data = {
      email: "test@example.com",
      password: "123",
      captchaToken: "valid-token",
    };

    const result = RegisterSchema.safeParse(data);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("at least 8 characters");
  });
});
```

---

## 7. DEPLOYMENT I KONFIGURACJA

### 7.1 Zmienne środowiskowe

**Development** (`.env.local`):

```env
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=your-local-anon-key
SUPABASE_SERVICE_KEY=your-local-service-key
HCAPTCHA_SECRET_KEY=0x0000000000000000000000000000000000000000  # test key
HCAPTCHA_SITE_KEY=10000000-ffff-ffff-ffff-000000000001  # test key
PUBLIC_SITE_URL=http://localhost:3000
```

**Production** (VPS environment variables):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-production-anon-key
SUPABASE_SERVICE_KEY=your-production-service-key
HCAPTCHA_SECRET_KEY=your-real-secret-key
HCAPTCHA_SITE_KEY=your-real-site-key
PUBLIC_SITE_URL=https://pricehistory.pl
```

---

### 7.2 Checklist wdrożenia

**Przed wdrożeniem**:

- [ ] Migracje bazy danych zastosowane w Supabase
- [ ] RLS policies włączone i przetestowane
- [ ] Zmienne środowiskowe production ustawione
- [ ] Supabase Auth skonfigurowany (Site URL, Redirect URLs)
- [ ] Email templates customizowane
- [ ] Captcha keys (production) skonfigurowane
- [ ] HTTPS włączony na domenie (wymagane dla secure cookies)

**Po wdrożeniu**:

- [ ] Test rejestracji + weryfikacja email
- [ ] Test logowania
- [ ] Test zmiany hasła
- [ ] Test usunięcia konta
- [ ] Test rate limiting
- [ ] Monitoring błędów auth w Sentry

---

## 8. MONITOROWANIE I LOGGING

### 8.1 Metryki do śledzenia

**Authentication metrics**:

- Liczba rejestracji dziennie/tygodniowo
- Success rate logowania (successful_logins / total_attempts)
- Liczba nieudanych prób logowania (security)
- Liczba zmian hasła
- Liczba usuniętych kont

**Query**:

```sql
-- Daily registrations
SELECT DATE(attempted_at) as date, COUNT(*)
FROM registration_attempts
WHERE success = true
GROUP BY DATE(attempted_at)
ORDER BY date DESC;

-- Failed login attempts (security alert)
SELECT email, COUNT(*) as failed_attempts
FROM login_attempts
WHERE success = false
  AND attempted_at > NOW() - INTERVAL '1 hour'
GROUP BY email
HAVING COUNT(*) > 5;
```

---

### 8.2 Logging

**Lokalizacja**: `src/lib/services/logger.service.ts`

```typescript
export enum LogLevel {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp?: string;
}

export class Logger {
  constructor(private supabase: SupabaseClient<Database>) {}

  async log(entry: LogEntry): Promise<void> {
    await this.supabase.from("system_logs").insert({
      level: entry.level,
      message: entry.message,
      context: entry.context || {},
      timestamp: entry.timestamp || new Date().toISOString(),
    });
  }

  async info(message: string, context?: Record<string, any>) {
    await this.log({ level: LogLevel.INFO, message, context });
  }

  async warning(message: string, context?: Record<string, any>) {
    await this.log({ level: LogLevel.WARNING, message, context });
  }

  async error(message: string, context?: Record<string, any>) {
    await this.log({ level: LogLevel.ERROR, message, context });
  }
}
```

**Przykładowe logi auth**:

```typescript
// Po rejestracji
await logger.info("User registered", {
  userId: user.id,
  email: user.email,
});

// Po nieudanym logowaniu
await logger.warning("Failed login attempt", {
  email: attemptedEmail,
  ip: clientIp,
  reason: "invalid_credentials",
});

// Po zmianie hasła
await logger.info("Password changed", {
  userId: user.id,
});

// Po usunięciu konta
await logger.info("Account deleted", {
  userId: user.id,
  email: anonymizedEmail,
});
```

---

## 9. BEZPIECZEŃSTWO - PODSUMOWANIE

### 9.1 Implementowane zabezpieczenia

✅ **Hasła**:

- Hashing przez Supabase Auth (bcrypt)
- Minimalna długość 8 znaków
- Brak przechowywania plain text

✅ **Sesje**:

- JWT tokens (access + refresh)
- HttpOnly, Secure cookies
- 7 dni timeout
- Auto-refresh przez Supabase SDK

✅ **Rate Limiting**:

- Rejestracja: 3/24h per IP
- Logowanie: 5/15min per IP
- Resend email: 1/minute per email
- Zmiana hasła: 3/hour per user

✅ **CAPTCHA**:

- hCaptcha lub Cloudflare Turnstile
- Wymagany przy rejestracji
- Server-side verification

✅ **Row Level Security**:

- Wszystkie tabele user-facing mają RLS
- Izolacja danych użytkowników
- Automatyczna weryfikacja przez `auth.uid()`

✅ **Email Verification**:

- Wymagana przed pełnym dostępem
- Link ważny 24h
- Możliwość resend z rate limiting

✅ **Audit Logging**:

- Rejestracja, logowanie, zmiana hasła, usunięcie konta
- IP address tracking
- Retention 90 dni

✅ **Input Validation**:

- Client-side (React)
- Server-side (Zod schemas)
- SQL injection protection (prepared statements/RLS)

---

### 9.2 Potencjalne rozszerzenia (poza MVP)

🔮 **2FA (Two-Factor Authentication)**:

- TOTP przez Supabase Auth
- Opcjonalne dla użytkowników premium

🔮 **OAuth Providers**:

- Google Sign-In
- Facebook Login
- Łatwe do dodania przez Supabase

🔮 **Password Reset**:

- Formularz /forgot-password
- Email z linkiem resetującym
- Supabase Auth ma built-in support

🔮 **Account Recovery**:

- Backup codes
- Security questions

🔮 **Advanced Rate Limiting**:

- IP reputation scoring
- Distributed rate limiting (Redis)

🔮 **Brute Force Protection**:

- Account lockout po X nieudanych prób
- CAPTCHA po 3 nieudanych próbach logowania

---

## 10. PODSUMOWANIE ARCHITEKTURY

### 10.1 Kluczowe decyzje architektoniczne

1. **Supabase Auth jako fundament**:
   - Gotowe rozwiązanie, battle-tested
   - Integracja z PostgreSQL i RLS
   - Email verification out of the box

2. **Astro SSR dla autoryzacji**:
   - Middleware sprawdza sesję na każdym request
   - Server-side guards dla chronionych stron
   - SEO-friendly dla landing page

3. **React dla interaktywności**:
   - Formularze auth jako client components
   - Real-time walidacja
   - Loading states i error handling

4. **Centralna walidacja**:
   - Zod schemas dla wszystkich inputów
   - Reużywalne między client i server
   - Type-safe z TypeScript

5. **Rate limiting w aplikacji**:
   - Dodatkowa warstwa poza Supabase
   - Tabele audit w PostgreSQL
   - Elastyczna konfiguracja limitów

---

### 10.2 Struktura plików - Podsumowanie

```
src/
├── components/
│   ├── auth/                    # NOWE
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── ResendVerificationButton.tsx
│   ├── navigation/              # NOWE
│   │   ├── Header.tsx
│   │   └── PublicHeader.tsx
│   ├── settings/                # MODYFIKACJE
│   │   ├── PasswordChangeForm.tsx  # Integracja z /api/auth/change-password
│   │   └── DeleteAccountSection.tsx # Integracja z /api/auth/delete-account
│   └── ...
├── db/
│   ├── supabase.client.ts       # MODYFIKACJE (auth config, admin client)
│   └── database.types.ts
├── layouts/
│   ├── AuthLayout.astro         # NOWY
│   └── Layout.astro             # MODYFIKACJE (Header integration)
├── lib/
│   ├── services/
│   │   ├── auth.service.ts      # NOWY
│   │   ├── captcha.service.ts   # NOWY
│   │   ├── logger.service.ts    # NOWY
│   │   └── ...
│   ├── validators/
│   │   └── auth.validators.ts   # NOWY (Zod schemas)
│   ├── errors/
│   │   └── auth.errors.ts       # NOWY
│   └── utils/
│       └── auth.utils.ts        # NOWY (requireAuth, requireGuest helpers)
├── middleware/
│   └── index.ts                 # MODYFIKACJE (session management, guards)
├── pages/
│   ├── api/
│   │   └── auth/                # NOWE
│   │       ├── register.ts
│   │       ├── login.ts
│   │       ├── logout.ts
│   │       ├── resend-verification.ts
│   │       ├── change-password.ts
│   │       └── delete-account.ts
│   ├── auth/
│   │   └── callback.astro       # NOWY
│   ├── login.astro              # NOWY
│   ├── register.astro           # NOWY
│   ├── verify-email.astro       # NOWY
│   ├── dashboard.astro          # MODYFIKACJE (auth guard)
│   ├── settings.astro           # MODYFIKACJE (auth guard)
│   └── ...
├── types.ts                     # MODYFIKACJE (auth types)
└── env.d.ts                     # MODYFIKACJE (Locals type)

supabase/
└── migrations/
    ├── 20251103000000_auth_tables.sql        # NOWY
    └── 20251103000001_delete_account_function.sql  # NOWY
```

---

### 10.3 Flow danych - Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER REGISTRATION                         │
└─────────────────────────────────────────────────────────────────┘

Browser                  Astro SSR              Supabase Auth         Database
   │                        │                        │                   │
   ├─ GET /register ───────>│                        │                   │
   │<─ RegisterForm ─────────┤                        │                   │
   │                        │                        │                   │
   ├─ Submit form ─────────>│                        │                   │
   │  (email, pwd, captcha) │                        │                   │
   │                        │                        │                   │
   │                        ├─ POST /api/auth/register                   │
   │                        ├─ Validate (Zod) ───────────────────────────┤
   │                        ├─ Verify captcha                            │
   │                        ├─ Check rate limit ──────────────────────>  │
   │                        │                        │  (registration_attempts)
   │                        │                        │                   │
   │                        ├─ signUp() ──────────>  │                   │
   │                        │                        ├─ Create user ──>  │
   │                        │                        ├─ Send email ─────>│
   │                        │                        │  (verification)   │
   │                        │<─ Success ─────────────┤                   │
   │                        │                        │                   │
   │<─ Redirect /verify-email ─────────────────────────────────────────  │
   │                                                                      │

┌─────────────────────────────────────────────────────────────────┐
│                         USER LOGIN                               │
└─────────────────────────────────────────────────────────────────┘

Browser                  Astro SSR              Supabase Auth         Database
   │                        │                        │                   │
   ├─ GET /login ──────────>│                        │                   │
   │<─ LoginForm ────────────┤                        │                   │
   │                        │                        │                   │
   ├─ Submit ──────────────>│                        │                   │
   │  (email, password)     │                        │                   │
   │                        │                        │                   │
   │                        ├─ POST /api/auth/login  │                   │
   │                        ├─ Validate (Zod) ───────────────────────────┤
   │                        │                        │                   │
   │                        ├─ signInWithPassword() ─> │                 │
   │                        │                        ├─ Verify ────────>  │
   │                        │                        │  (auth.users)     │
   │                        │                        ├─ Check verified    │
   │                        │                        │<─ Session ─────────┤
   │                        │<─ Session + cookies ────┤                   │
   │                        │                        │                   │
   │                        ├─ Create user_preferences (if not exists) ──>│
   │                        │                        │                   │
   │<─ Redirect /dashboard ─┤                        │                   │
   │  (cookies set)         │                        │                   │

┌─────────────────────────────────────────────────────────────────┐
│                    PROTECTED PAGE ACCESS                         │
└─────────────────────────────────────────────────────────────────┘

Browser                  Middleware             Supabase Auth         Database
   │                        │                        │                   │
   ├─ GET /dashboard ──────>│                        │                   │
   │  (cookies)             │                        │                   │
   │                        ├─ getSession() ──────>  │                   │
   │                        │  (reads cookies)       │                   │
   │                        │                        ├─ Verify JWT ───>  │
   │                        │<─ Session ─────────────┤                   │
   │                        │                        │                   │
   │                        ├─ Set Astro.locals.user │                   │
   │                        ├─ next() ──────────────>│                   │
   │                        │  (render page)         │                   │
   │<─ Dashboard HTML ───────┤                        │                   │
```

---

## 11. KOLEJNOŚĆ IMPLEMENTACJI

### 11.1 Faza 1: Fundament (Dzień 1-2)

1. Migracje bazy danych (`auth_tables.sql`, `delete_account_function.sql`)
2. Konfiguracja Supabase Auth (Dashboard settings, email templates)
3. Modyfikacja `supabase.client.ts` (auth config, admin client)
4. Modyfikacja `middleware/index.ts` (session management)
5. Typy TypeScript (`env.d.ts`, `types.ts`)
6. AuthLayout + auth utilities

### 11.2 Faza 2: Rejestracja i logowanie (Dzień 2-3)

1. Walidatory Zod (`auth.validators.ts`)
2. Serwisy (`auth.service.ts`, `captcha.service.ts`, `logger.service.ts`)
3. Endpoint `/api/auth/register`
4. Endpoint `/api/auth/login`
5. Endpoint `/api/auth/logout`
6. Strony `/register.astro`, `/login.astro`, `/auth/callback.astro`
7. Komponenty `RegisterForm.tsx`, `LoginForm.tsx`
8. Integracja captcha

### 11.3 Faza 3: Weryfikacja email (Dzień 3)

1. Endpoint `/api/auth/resend-verification`
2. Strona `/verify-email.astro`
3. Komponent `ResendVerificationButton.tsx`
4. Custom email templates w Supabase
5. Testy weryfikacji

### 11.4 Faza 4: Zarządzanie kontem (Dzień 4)

1. Endpoint `/api/auth/change-password`
2. Endpoint `/api/auth/delete-account`
3. Modyfikacja `PasswordChangeForm.tsx`
4. Modyfikacja `DeleteAccountSection.tsx`
5. Integracja z `/settings.astro`

### 11.5 Faza 5: Ochrona stron (Dzień 4-5)

1. Guards w middleware (redirect niezalogowanych)
2. Modyfikacja `/dashboard.astro` (auth required)
3. Modyfikacja `/settings.astro` (auth required)
4. Modyfikacja `/offer/[id].astro` (auth required)
5. Komponenty nawigacyjne (`Header.tsx`, `PublicHeader.tsx`)
6. Integracja z istniejącym `Layout.astro`

### 11.6 Faza 6: Rate limiting i security (Dzień 5)

1. Implementacja rate limiting checks w endpointach
2. Logging wszystkich operacji auth
3. Error handling i custom error types
4. Testy security (brute force, rate limits)

### 11.7 Faza 7: Testy i deployment (Dzień 6-7)

1. Testy jednostkowe (validators, services)
2. Testy integracyjne (E2E z Playwright)
3. Testy manualne wszystkich flows
4. Deployment na VPS
5. Konfiguracja production env variables
6. Monitoring i alerty

---

## 12. ZALEŻNOŚCI NPM

### 12.1 Nowe zależności do instalacji

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "vitest": "^1.0.0"
  }
}
```

**Opcjonalnie (jeśli używamy hCaptcha React component)**:

```bash
npm install @hcaptcha/react-hcaptcha
```

**Opcjonalnie (jeśli używamy Cloudflare Turnstile)**:

```bash
npm install @marsidev/react-turnstile
```

---

## 13. CHECKLIST ZGODNOŚCI Z PRD

✅ **US-001: Rejestracja nowego konta**

- [x] Formularz: email, hasło, potwierdzenie hasła
- [x] Walidacja formatu email (regex)
- [x] Hasło min 8 znaków
- [x] Captcha (hCaptcha/Turnstile)
- [x] Wysłanie emaila weryfikacyjnego
- [x] Komunikat: "Sprawdź email aby potwierdzić konto"
- [x] Rate limiting: 3 rejestracje/IP/24h
- [x] Błąd przy przekroczeniu: "Zbyt wiele prób rejestracji"

✅ **US-002: Weryfikacja konta email**

- [x] Email z unikalnym linkiem
- [x] Link ważny 24h (Supabase default)
- [x] Potwierdzenie email w bazie
- [x] Redirect do /dashboard
- [x] Komunikat przy próbie logowania bez weryfikacji
- [x] Możliwość ponownego wysłania linku

✅ **US-003: Logowanie do systemu**

- [x] Formularz: email, hasło
- [x] Weryfikacja przez Supabase Auth
- [x] Redirect do /dashboard przy sukcesie
- [x] Błąd: "Nieprawidłowy email lub hasło"
- [x] Błąd: "Potwierdź email przed logowaniem"
- [x] Session timeout 7 dni

✅ **US-004: Wylogowanie z systemu**

- [x] Przycisk "Wyloguj" w nawigacji
- [x] Zakończenie sesji Supabase
- [x] Redirect do /
- [x] Redirect do /login przy próbie dostępu bez sesji

✅ **US-005: Zmiana hasła**

- [x] Formularz w /settings
- [x] Pola: aktualne, nowe, potwierdzenie
- [x] Weryfikacja aktualnego hasła
- [x] Nowe min 8 znaków
- [x] Nowe i potwierdzenie identyczne
- [x] Komunikat: "Hasło zostało zmienione"
- [x] Email informujący o zmianie

✅ **US-006: Usunięcie konta**

- [x] Opcja w /settings, sekcja "Niebezpieczne akcje"
- [x] Modal potwierdzający z ostrzeżeniem
- [x] Input: wpisz "USUŃ"
- [x] Anonimizacja: deleted\_{timestamp}@deleted.com
- [x] Usunięcie hasła i danych auth
- [x] Soft delete user_offer
- [x] Historia cen pozostaje
- [x] Redirect do /

---

## 14. KONTAKT I WSPARCIE

### 14.1 Dokumentacja zewnętrzna

- **Supabase Auth**: https://supabase.com/docs/guides/auth
- **Astro SSR**: https://docs.astro.build/en/guides/server-side-rendering/
- **Zod**: https://zod.dev/
- **hCaptcha**: https://docs.hcaptcha.com/
- **Cloudflare Turnstile**: https://developers.cloudflare.com/turnstile/

### 14.2 Troubleshooting typowych problemów

**Problem**: Sesja nie persystuje po refresh
**Rozwiązanie**: Sprawdź czy `persistSession: true` w supabase client config

**Problem**: RLS blokuje zapytania
**Rozwiązanie**: Sprawdź czy middleware ustawia `Astro.locals.user`, test policies w SQL

**Problem**: Email weryfikacyjny nie przychodzi
**Rozwiązanie**: Sprawdź SMTP config w Supabase Dashboard, spam folder, rate limits

**Problem**: Captcha zawsze failuje
**Rozwiązanie**: Sprawdź czy secret key jest server-side only, verify IP whitelist

**Problem**: Rate limiting nie działa
**Rozwiązanie**: Sprawdź czy IP address jest poprawnie pobierany (proxy headers), check DB logs

---

## 15. INTEGRACJA Z ISTNIEJĄCYMI FUNKCJONALNOŚCIAMI

### 15.1 Dostęp do user_id w istniejących endpointach

**Problem**: Istniejące endpointy używają `DEFAULT_USER_ID`

**Lokalizacje do aktualizacji**:

- `src/pages/api/dashboard.ts`
- `src/pages/api/offers.ts`
- `src/pages/api/offers/[id].ts`
- `src/pages/api/offers/[id]/history.ts`
- `src/pages/api/preferences.ts`

**Wzorzec aktualizacji**:

```typescript
// PRZED (obecny stan)
const userId = DEFAULT_USER_ID;

// PO (z autentykacją)
const userId = Astro.locals.current_user_id;
if (!userId) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}
```

### 15.2 Automatyczne tworzenie user_preferences

**Implementacja**: W endpoint `/api/auth/login` po pomyślnym logowaniu:

```typescript
// Po zalogowaniu sprawdź czy user ma preferences
const { data: prefs } = await supabase.from("user_preferences").select("user_id").eq("user_id", userId).single();

if (!prefs) {
  // Utwórz domyślne preferencje
  await supabase.from("user_preferences").insert({
    user_id: userId,
    default_frequency: "24h",
  });
}
```

**Alternatywa**: Database trigger przy tworzeniu użytkownika w `auth.users`

### 15.3 RLS i Supabase client w API routes

**Ważne**: W API routes używaj `Astro.locals.supabase`, NIE importuj `supabaseClient` bezpośrednio.

**Dlaczego**: `Astro.locals.supabase` ma dostęp do cookies z sesją użytkownika, co pozwala RLS działać poprawnie.

```typescript
// ✅ POPRAWNIE
export async function GET({ locals }: APIContext) {
  const { data } = await locals.supabase.from("user_offer").select("*");
  // RLS automatycznie filtruje do user_id z sesji
}

// ❌ ŹLE
import { supabaseClient } from "@/db/supabase.client";
export async function GET() {
  const { data } = await supabaseClient.from("user_offer").select("*");
  // RLS nie zadziała - brak kontekstu sesji
}
```

### 15.4 Obsługa migracji istniejących danych

**Scenariusz**: Jeśli w dev environment masz dane z `DEFAULT_USER_ID`, migracja nie jest potrzebna (dev data).

**Dla production**: Upewnij się że:

1. Nie ma danych z `DEFAULT_USER_ID` w production
2. Migracje auth są zastosowane PRZED pierwszym użytkownikiem

### 15.5 Landing page i routing

**Obecna struktura**: `src/pages/index.astro` (US-030)

**Wymagane zmiany**:

- Dodaj `PublicHeader` z przyciskami "Zaloguj" / "Zarejestruj"
- Sprawdź czy użytkownik jest zalogowany - jeśli tak, pokaż "Przejdź do Dashboard"

```astro
---
// index.astro
const user = Astro.locals.user;
---

<Layout>
  {user ? <a href="/dashboard">Przejdź do Dashboard</a> : <a href="/register">Zacznij za darmo</a>}
</Layout>
```

---

## 16. NOTATKI IMPLEMENTACYJNE

### 16.1 Kolejność działań przy pierwszej implementacji

1. **Setup Supabase lokalnie** (jeśli jeszcze nie działa)
   - `supabase start`
   - Skopiuj klucze do `.env.local`

2. **Zastosuj migracje**
   - `supabase migration up` (auth_tables, delete_account_function)

3. **Skonfiguruj Supabase Dashboard**
   - Email templates
   - Redirect URLs
   - Rate limits

4. **Zainstaluj zależności**
   - `npm install @supabase/supabase-js@^2.38.0 zod@^3.22.4`

5. **Implementuj w kolejności faz** (patrz sekcja 11)

### 16.2 Testing strategy

**Unit tests** (Vitest):

- Validators (Zod schemas)
- Error handlers
- Auth utilities

**Integration tests** (Playwright):

- Full registration flow
- Login flow
- Password change
- Account deletion

**Manual testing checklist**:

- [ ] Rejestracja z captcha
- [ ] Email verification link
- [ ] Login z verified/unverified account
- [ ] Session persistence after refresh
- [ ] Logout clears session
- [ ] Protected pages redirect to login
- [ ] Password change with wrong current password
- [ ] Account deletion with wrong confirmation

### 16.3 Potencjalne pułapki

⚠️ **PKCE flow w Supabase**:

- Wymaga odpowiedniej konfiguracji `emailRedirectTo`
- Testuj w różnych środowiskach (localhost vs production URL)

⚠️ **Captcha w development**:

- Użyj test keys dla hCaptcha/Turnstile
- Rozważ env variable do wyłączenia captcha w dev

⚠️ **IP address w rate limiting**:

- Za proxy: sprawdź `X-Forwarded-For`, `X-Real-IP`
- W Astro: `Astro.clientAddress` (może być proxy IP)

⚠️ **Session timing**:

- Access token: 1h (Supabase default)
- Refresh token: 7 dni (zgodnie z PRD)
- Upewnij się że Supabase nie ma innego ustawienia

---

## 17. KOMPATYBILNOŚĆ Z PRD

### 17.1 Pełna zgodność z User Stories

✅ **US-001**: Wszystkie kryteria pokryte w sekcjach 2.1.2, 3.1.1, 5.1  
✅ **US-002**: Wszystkie kryteria pokryte w sekcjach 2.3.1, 3.1.4, 4.4  
✅ **US-003**: Wszystkie kryteria pokryte w sekcjach 2.1.2, 3.1.2, 4.2  
✅ **US-004**: Wszystkie kryteria pokryte w sekcjach 2.1.4, 3.1.3  
✅ **US-005**: Wszystkie kryteria pokryte w sekcjach 2.1.2, 3.1.5  
✅ **US-006**: Wszystkie kryteria pokryte w sekcjach 2.1.2, 3.1.6, 5.2

### 17.2 Zgodność z harmonogramem

**Tydzień 1 (PRD 1.6)**: Autentykacja, dodawanie URL, podstawowy scraping, lista ofert

**Auth-spec pokrywa**:

- ✅ Faza 1-3 (Dni 1-3): Fundament + Rejestracja/Logowanie + Weryfikacja
- ✅ Integracja z istniejącymi endpointami (sekcja 15.1)
- ✅ User_preferences auto-tworzenie (sekcja 15.2)

**Pozostałe tygodnie**: Nie dotyczą auth, są zgodne z PRD

### 17.3 Stack technologiczny - zgodność 100%

- ✅ Astro 5 SSR (output: 'server')
- ✅ React 19 dla komponentów client-side
- ✅ TypeScript 5
- ✅ Tailwind CSS 4
- ✅ Shadcn/ui
- ✅ Supabase Auth + PostgreSQL
- ✅ Row Level Security (RLS)

---

## KONIEC SPECYFIKACJI

Dokument utworzony: 2025-01-03  
Wersja: 1.1 (zaktualizowana po weryfikacji z PRD)  
Status: Gotowy do implementacji

**Changelog v1.1**:

- ✅ Dodano tabelę `system_logs` w migracji (wymagana przez delete_user_account)
- ✅ Zaktualizowano nazwy cookies Supabase (sb-<project-ref>-auth-token)
- ✅ Dodano sekcję 15: Integracja z istniejącymi funkcjonalnościami
- ✅ Dodano sekcję 16: Notatki implementacyjne
- ✅ Dodano sekcję 17: Kompatybilność z PRD
- ✅ Rozszerzono cleanup function o system_logs
- ✅ Dodano uwagi o potencjalnych pułapkach
