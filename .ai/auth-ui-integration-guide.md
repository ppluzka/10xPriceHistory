# Przewodnik integracji UI autentykacji

Ten dokument opisuje jak zintegrować nowe komponenty UI autentykacji z istniejącymi stronami aplikacji.

## Status: ✅ UI zaimplementowane | ⏳ Backend oczekuje

Wszystkie komponenty UI zostały zaimplementowane zgodnie ze specyfikacją w `auth-spec.md`. Backend (API endpoints, middleware, Supabase) będzie zaimplementowany w kolejnej fazie.

## Zaimplementowane pliki

### Komponenty React
```
src/components/auth/
├── LoginForm.tsx                    ✅ Zaimplementowane
├── RegisterForm.tsx                 ✅ Zaimplementowane
├── ResendVerificationButton.tsx    ✅ Zaimplementowane
└── index.ts                         ✅ Zaimplementowane

src/components/navigation/
├── Header.tsx                       ✅ Zaimplementowane (dla zalogowanych)
├── PublicHeader.tsx                 ✅ Zaimplementowane (dla niezalogowanych)
└── index.ts                         ✅ Zaimplementowane
```

### Strony Astro
```
src/pages/
├── login.astro                      ✅ Zaimplementowane
├── register.astro                   ✅ Zaimplementowane
├── verify-email.astro               ✅ Zaimplementowane
├── forgot-password.astro            ✅ Zaimplementowane (placeholder)
└── auth/
    └── callback.astro               ✅ Zaimplementowane
```

### Layouts i utilities
```
src/layouts/
└── AuthLayout.astro                 ✅ Zaimplementowane

src/lib/utils/
└── auth.utils.ts                    ✅ Zaimplementowane
```

### Zaktualizowane strony
```
src/pages/
└── index.astro                      ✅ Zaktualizowane (dodano PublicHeader)
```

## Przykłady integracji

### 1. Dodanie Header do dashboard

**Plik: `src/pages/dashboard.astro`**

```astro
---
import Layout from "@/layouts/Layout.astro";
import DashboardView from "@/components/views/DashboardView";
import Header from "@/components/navigation/Header";

export const prerender = false;

// Po implementacji middleware:
// const user = Astro.locals.user;
// if (!user) {
//   return Astro.redirect('/login');
// }

// Placeholder dla development (usunąć po implementacji middleware):
const user = {
  id: "dev-user-id",
  email: "dev@example.com"
};
---

<Layout title="Dashboard">
  <Header client:load user={user} currentPath={Astro.url.pathname} />
  
  <main class="container mx-auto px-4 py-8">
    <DashboardView client:load />
  </main>
</Layout>
```

### 2. Dodanie Header do settings

**Plik: `src/pages/settings.astro`**

```astro
---
import Layout from "@/layouts/Layout.astro";
import SettingsView from "@/components/views/SettingsView";
import Header from "@/components/navigation/Header";

export const prerender = false;

// Po implementacji middleware:
// const user = Astro.locals.user;
// if (!user) {
//   return Astro.redirect('/login');
// }

// Placeholder dla development (usunąć po implementacji middleware):
const user = {
  id: "dev-user-id",
  email: "dev@example.com"
};
---

<Layout title="Ustawienia">
  <Header client:load user={user} currentPath={Astro.url.pathname} />
  
  <main class="container mx-auto px-4 py-8">
    <SettingsView client:load />
  </main>
</Layout>
```

### 3. Dodanie Header do offer/[id]

**Plik: `src/pages/offer/[id].astro`**

```astro
---
import Layout from "@/layouts/Layout.astro";
import OfferDetailsPage from "@/components/offer/OfferDetailsPage";
import Header from "@/components/navigation/Header";

export const prerender = false;

// Po implementacji middleware:
// const user = Astro.locals.user;
// if (!user) {
//   return Astro.redirect('/login');
// }

const { id } = Astro.params;

// Placeholder dla development:
const user = {
  id: "dev-user-id",
  email: "dev@example.com"
};
---

<Layout title="Szczegóły oferty">
  <Header client:load user={user} currentPath={Astro.url.pathname} />
  
  <main class="container mx-auto px-4 py-8">
    <OfferDetailsPage client:load offerId={id!} />
  </main>
</Layout>
```

## Middleware integration (do zrobienia w backend phase)

Po implementacji middleware w `src/middleware/index.ts`, strony będą mogły używać:

```typescript
// Będzie dostępne po implementacji:
const user = Astro.locals.user;

// Typ user:
type User = {
  id: string;
  email: string;
  emailVerified: boolean;
} | null;
```

### Przykład middleware (do implementacji):

```typescript
// src/middleware/index.ts
import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client.ts";

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.supabase = supabaseClient;

  const { data: { session }, error } = await supabaseClient.auth.getSession();

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

  // Ochrona chronionych stron
  const protectedRoutes = ['/dashboard', '/settings', '/offer'];
  const isProtectedRoute = protectedRoutes.some(route => 
    context.url.pathname.startsWith(route)
  );

  if (isProtectedRoute && !context.locals.user) {
    const returnUrl = encodeURIComponent(context.url.pathname + context.url.search);
    return context.redirect(`/login?returnUrl=${returnUrl}`);
  }

  return next();
});
```

## API endpoints (do zrobienia w backend phase)

Komponenty UI wywołują następujące endpointy, które wymagają implementacji:

### Wymagane endpointy:

1. **POST /api/auth/register**
   - Body: `{ email, password, captchaToken }`
   - Response: `201 Created` lub błąd

2. **POST /api/auth/login**
   - Body: `{ email, password }`
   - Response: `200 OK` + session cookie

3. **POST /api/auth/logout**
   - Response: `200 OK` + clear session

4. **POST /api/auth/resend-verification**
   - Body: `{ email }`
   - Response: `200 OK`

5. **POST /api/auth/change-password**
   - Body: `{ currentPassword, newPassword }`
   - Response: `200 OK`

6. **POST /api/auth/delete-account**
   - Body: `{ confirmation: "USUŃ" }`
   - Response: `200 OK`

7. **GET /auth/callback** (Supabase)
   - Query: `?code=...`
   - Wymiana kodu na sesję

### Przykładowa struktura endpoint (szablon):

```typescript
// src/pages/api/auth/login.ts
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { email, password } = await request.json();
    
    // TODO: Implement Supabase Auth login
    // const { data, error } = await locals.supabase.auth.signInWithPassword({
    //   email,
    //   password,
    // });
    
    // Placeholder response:
    return new Response(
      JSON.stringify({ 
        message: "Login endpoint not implemented yet",
        user: { id: "dev-id", email } 
      }),
      { 
        status: 501, // Not Implemented
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400 }
    );
  }
};
```

## Testowanie UI (bez backendu)

Obecnie możesz testować:

### ✅ Co działa:
- Renderowanie wszystkich formularzy
- Walidacja client-side (email, hasło, itp.)
- Wizualne feedback (loading states, error messages)
- Responsywność (mobile/desktop)
- Dark mode
- Nawigacja między stronami

### ⏳ Co NIE działa (wymaga backendu):
- Faktyczne logowanie/rejestracja
- Wysyłanie emaili weryfikacyjnych
- Zmiana hasła
- Usuwanie konta
- Session management
- Przekierowania po autoryzacji

### Jak przetestować UI:

1. **Uruchom dev server:**
   ```bash
   npm run dev
   ```

2. **Odwiedź strony:**
   - http://localhost:4321/ - Landing z PublicHeader
   - http://localhost:4321/login - Formularz logowania
   - http://localhost:4321/register - Formularz rejestracji
   - http://localhost:4321/verify-email?email=test@example.com - Weryfikacja
   - http://localhost:4321/dashboard - Dashboard (z placeholder user)

3. **Testuj interakcje:**
   - Wypełnij formularze (walidacja działa)
   - Błędy wyświetlają się przy onBlur
   - Loading states przy submit
   - Responsive menu na mobile
   - Wskaźnik siły hasła w rejestracji

## Kolejność implementacji backendu

Zgodnie z `auth-spec.md`, kolejność implementacji:

1. **Faza 1: Fundament** (Dzień 1-2)
   - Migracje bazy danych
   - Konfiguracja Supabase Auth
   - Modyfikacja `supabase.client.ts`
   - Implementacja middleware
   - Typy TypeScript (`env.d.ts`)

2. **Faza 2: Rejestracja i logowanie** (Dzień 2-3)
   - Walidatory Zod
   - Serwisy (auth, captcha, logger)
   - Endpointy `/api/auth/register`, `/login`, `/logout`
   - Integracja captcha

3. **Faza 3: Weryfikacja email** (Dzień 3)
   - Endpoint `/api/auth/resend-verification`
   - Custom email templates w Supabase

4. **Faza 4: Zarządzanie kontem** (Dzień 4)
   - Endpoint `/api/auth/change-password`
   - Endpoint `/api/auth/delete-account`
   - Modyfikacja komponentów settings

5. **Faza 5: Ochrona stron** (Dzień 4-5)
   - Guards w middleware
   - Modyfikacja dashboard, settings, offer pages
   - Usunięcie placeholderów user

## Znane placeholder do usunięcia

Po implementacji middleware, usuń/zastąp:

```typescript
// ❌ Usuń to:
const user = {
  id: "dev-user-id",
  email: "dev@example.com"
};

// ✅ Zamień na:
const user = Astro.locals.user;
if (!user) {
  return Astro.redirect('/login');
}
```

## Troubleshooting

### Problem: "Cannot find module '@/components/auth'"
**Rozwiązanie:** Sprawdź czy `tsconfig.json` ma poprawne path aliases:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Problem: React component nie renderuje się
**Rozwiązanie:** Sprawdź czy używasz `client:load` directive:
```astro
<LoginForm client:load />
```

### Problem: Tailwind classes nie działają
**Rozwiązanie:** Upewnij się że `@/styles/global.css` jest importowany w layout.

## Dodatkowe zasoby

- Specyfikacja: `.ai/auth-spec.md`
- README komponentów: `src/components/auth/README.md`
- PRD: `.ai/prd.md`
- Diagram journey: `.ai/diagrams/journey.md`

