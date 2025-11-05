# Ochrona Stron przed Niezalogowanymi Użytkownikami

## Przegląd

Aplikacja używa uniwersalnego middleware do ochrony stron przed dostępem niezalogowanych użytkowników. Mechanizm jest zgodny z najlepszymi praktykami inżynierskimi i wykorzystuje Supabase Auth z pakietem `@supabase/ssr`.

## Architektura

### 1. Middleware (`src/middleware/index.ts`)

Middleware stanowi **centralny punkt kontroli** dla wszystkich żądań w aplikacji:

```typescript
// Definicja ścieżek publicznych
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/auth/callback",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/resend-verification",
];

// Definicja wzorców chronionej ścieżki
const protectedRoutes = ["/dashboard", "/settings", "/offer"];
```

#### Przepływ działania:

1. **Tworzenie klienta Supabase** z kontekstem żądania (cookies + headers)
2. **Sprawdzanie ścieżki publicznej** - jeśli TAK, kontynuuj bez weryfikacji
3. **Pobieranie sesji użytkownika** z Supabase Auth (`supabase.auth.getUser()`)
4. **Ustawianie danych użytkownika** w `Astro.locals` dla użycia w stronach
5. **Ochrona tras** - przekierowanie do `/login?returnUrl=...` dla niezalogowanych

### 2. Chronione Strony

#### Dashboard (`src/pages/dashboard.astro`)

- Chroniona przez middleware
- Użytkownik zawsze dostępny w `Astro.locals.user!`
- Brak redundantnych sprawdzeń

#### Settings (`src/pages/settings.astro`)

- Chroniona przez middleware
- Użytkownik zawsze dostępny w `Astro.locals.user!`
- Brak redundantnych sprawdzeń

#### Offer Details (`src/pages/offer/[id].astro`)

- Chroniona przez middleware (wzorzec `/offer`)
- Użytkownik zawsze dostępny w `Astro.locals.user`
- Brak redundantnych sprawdzeń

### 3. Supabase Client (`src/db/supabase.client.ts`)

Zapewnia:

- Bezpieczne zarządzanie ciasteczkami z opcjami: `httpOnly`, `secure`, `sameSite: 'lax'`
- Parsing nagłówka Cookie dla Supabase SSR
- Funkcję `createSupabaseServerInstance()` do tworzenia instancji z kontekstem

## Zalety Rozwiązania

### 1. **Single Source of Truth**

- Jedna centralna lokalizacja dla logiki autoryzacji (middleware)
- Łatwe zarządzanie i aktualizacja reguł dostępu

### 2. **Separation of Concerns**

- Middleware = autoryzacja
- Strony = logika biznesowa i prezentacja
- Brak duplikacji kodu

### 3. **Bezpieczeństwo**

- Automatyczna walidacja JWT przez Supabase Auth
- Automatyczne odświeżanie tokenów
- Bezpieczne ciasteczka (`httpOnly`, `secure`)

### 4. **User Experience**

- Przekierowanie z parametrem `returnUrl` - użytkownik wraca tam, gdzie chciał
- Brak potrzeby wielokrotnego logowania

### 5. **Type Safety**

- Typy dla `Astro.locals.user` w `env.d.ts`
- TypeScript wymusza poprawne użycie danych użytkownika

### 6. **Maintenance**

- Łatwe dodawanie nowych chronionych stron
- Łatwe dodawanie nowych ścieżek publicznych
- Brak potrzeby duplikowania logiki

## Przykład Użycia

### Dodanie nowej chronionej strony

1. Utwórz nową stronę w `src/pages/`
2. Dodaj `export const prerender = false;`
3. Użyj `Astro.locals.user!` do dostępu do danych użytkownika
4. **GOTOWE!** Middleware automatycznie chroni stronę

```astro
---
// src/pages/new-protected-page.astro
import Layout from "../layouts/Layout.astro";

export const prerender = false;

// Middleware zapewnia, że user jest zawsze dostępny
const user = Astro.locals.user!;
---

<Layout title="Protected Page">
  <h1>Witaj {user.email}!</h1>
</Layout>
```

### Dodanie nowej ścieżki publicznej

Jeśli nowa strona powinna być dostępna bez logowania, dodaj ją do `PUBLIC_PATHS` w middleware:

```typescript
const PUBLIC_PATHS = [
  // ... istniejące ścieżki
  "/new-public-page", // ← dodaj tutaj
];
```

## Konfiguracja Środowiskowa

### Wymagane zmienne `.env`:

```env
SUPABASE_URL=your_project_url
SUPABASE_KEY=your_anon_key
```

### Typy TypeScript (`src/env.d.ts`):

```typescript
interface Locals {
  supabase: SupabaseClient;
  current_user_id: string | null;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
  } | null;
}
```

## Bezpieczeństwo

### Zabezpieczenia na poziomie middleware:

- ✅ JWT validation (automatyczna przez Supabase)
- ✅ Token refresh (automatyczny przez Supabase)
- ✅ Secure cookies (httpOnly, secure, sameSite)
- ✅ Przekierowania dla niezalogowanych
- ✅ Obsługa returnUrl

### Zabezpieczenia na poziomie API:

- ✅ Każdy endpoint API również używa middleware
- ✅ Weryfikacja użytkownika w każdym endpoincie
- ✅ Supabase RLS (Row Level Security) dla dodatkowej ochrony na poziomie bazy danych

## Best Practices

### DO ✅

- Używaj `Astro.locals.user!` na chronionych stronach
- Dodawaj nowe ścieżki do `PUBLIC_PATHS` jeśli mają być publiczne
- Używaj `createSupabaseServerInstance()` w API routes
- Dodawaj `export const prerender = false;` na stronach używających auth

### DON'T ❌

- Nie dodawaj redundantnych sprawdzeń `if (!user)` na chronionych stronach
- Nie używaj bezpośredniego importu `supabaseClient` w API routes
- Nie modyfikuj logiki cookie handling w `createSupabaseServerInstance()`
- Nie używaj indywidualnych metod cookie (`get`, `set`, `remove`) - tylko `getAll` i `setAll`

## Testowanie

### Scenariusze testowe:

1. **Niezalogowany użytkownik próbuje dostać się do `/dashboard`**
   - Oczekiwany rezultat: Przekierowanie do `/login?returnUrl=%2Fdashboard`

2. **Niezalogowany użytkownik próbuje dostać się do `/settings`**
   - Oczekiwany rezultat: Przekierowanie do `/login?returnUrl=%2Fsettings`

3. **Niezalogowany użytkownik próbuje dostać się do `/offer/123`**
   - Oczekiwany rezultat: Przekierowanie do `/login?returnUrl=%2Foffer%2F123`

4. **Zalogowany użytkownik dostaje się do chronionych stron**
   - Oczekiwany rezultat: Strona wyświetla się poprawnie

5. **Niezalogowany użytkownik dostaje się do `/login`**
   - Oczekiwany rezultat: Strona logowania wyświetla się poprawnie (ścieżka publiczna)

## Zgodność ze Standardami

- ✅ Zgodne z Supabase SSR best practices
- ✅ Zgodne z Astro middleware patterns
- ✅ Zgodne z OWASP security guidelines
- ✅ Zgodne z TypeScript strict mode
- ✅ Zgodne z Single Responsibility Principle
- ✅ Zgodne z DRY (Don't Repeat Yourself)
