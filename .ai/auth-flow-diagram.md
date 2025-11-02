# Przepływ Uwierzytelniania - Diagram

## Architektura Komponentów

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser / Client                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTP Request
                            │ (Cookie: sb-access-token, sb-refresh-token)
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Astro Server (SSR)                          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         MIDDLEWARE (src/middleware/index.ts)            │   │
│  │                                                          │   │
│  │  1. Create Supabase Client                              │   │
│  │     ├─ Parse Cookie Header                              │   │
│  │     └─ Initialize with request context                  │   │
│  │                                                          │   │
│  │  2. Check if path is PUBLIC                             │   │
│  │     ├─ YES → Skip auth check, continue                  │   │
│  │     └─ NO  → Proceed to step 3                          │   │
│  │                                                          │   │
│  │  3. Get User Session                                    │   │
│  │     └─ await supabase.auth.getUser()                    │   │
│  │        ├─ Validates JWT token                           │   │
│  │        ├─ Refreshes token if expired                    │   │
│  │        └─ Returns user or null                          │   │
│  │                                                          │   │
│  │  4. Set Astro.locals                                    │   │
│  │     ├─ locals.supabase = supabase                       │   │
│  │     ├─ locals.user = user                               │   │
│  │     └─ locals.current_user_id = user.id                 │   │
│  │                                                          │   │
│  │  5. Protect Routes                                      │   │
│  │     ├─ User exists? → Continue                          │   │
│  │     └─ User null?   → Redirect to /login?returnUrl=...  │   │
│  │                                                          │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         PROTECTED PAGE (e.g., dashboard.astro)          │   │
│  │                                                          │   │
│  │  const user = Astro.locals.user!;  // Always present   │   │
│  │  const supabase = Astro.locals.supabase;               │   │
│  │                                                          │   │
│  │  • Fetch data from API endpoints                        │   │
│  │  • Render page with user context                        │   │
│  │  • Pass user info to React components                   │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Przykład Przepływu dla Różnych Ścieżek

### 1. Niezalogowany użytkownik → `/dashboard`

```
User Request: GET /dashboard
     │
     ▼
Middleware:
     │
     ├─ Check PUBLIC_PATHS: "/dashboard" in list? → NO
     │
     ├─ Get User Session: supabase.auth.getUser()
     │  └─ Result: null (no valid session)
     │
     ├─ Set locals.user = null
     │
     └─ Protect Routes: user is null?
        └─ YES → Redirect to /login?returnUrl=%2Fdashboard
                 │
                 ▼
        User sees: Login page with returnUrl parameter
```

### 2. Zalogowany użytkownik → `/dashboard`

```
User Request: GET /dashboard
     │
     ▼
Middleware:
     │
     ├─ Check PUBLIC_PATHS: "/dashboard" in list? → NO
     │
     ├─ Get User Session: supabase.auth.getUser()
     │  └─ Result: { id: "...", email: "user@example.com", ... }
     │
     ├─ Set locals.user = { id, email, emailVerified }
     │
     └─ Protect Routes: user exists?
        └─ YES → Continue to page
                 │
                 ▼
        Page renders:
        ├─ const user = Astro.locals.user!
        ├─ Fetch dashboard data
        └─ Render with user context
                 │
                 ▼
        User sees: Dashboard page
```

### 3. Niezalogowany użytkownik → `/login`

```
User Request: GET /login
     │
     ▼
Middleware:
     │
     ├─ Check PUBLIC_PATHS: "/login" in list? → YES
     │
     ├─ Set locals.user = null
     │
     └─ Skip auth check, continue
                 │
                 ▼
        Page renders: Login form
                 │
                 ▼
        User sees: Login page
```

### 4. Zalogowany użytkownik → `/login`

```
User Request: GET /login
     │
     ▼
Middleware:
     │
     ├─ Check PUBLIC_PATHS: "/login" in list? → YES
     │
     ├─ Set locals.user = null (skipped auth check)
     │
     └─ Continue to page
                 │
                 ▼
        Page renders: Login form
        (Note: Page could redirect to dashboard if user exists)
                 │
                 ▼
        User sees: Login page or redirects to dashboard
```

### 5. Niezalogowany użytkownik → `/api/dashboard`

```
User Request: GET /api/dashboard
     │
     ▼
Middleware:
     │
     ├─ Check PUBLIC_PATHS: "/api/dashboard" in list? → NO
     │
     ├─ Get User Session: supabase.auth.getUser()
     │  └─ Result: null (no valid session)
     │
     ├─ Set locals.user = null
     │
     └─ Protect Routes: user is null?
        └─ YES → Redirect to /login?returnUrl=%2Fapi%2Fdashboard
                 │
                 ▼
        Response: 302 Redirect
```

### 6. Zalogowany użytkownik → `/api/dashboard`

```
User Request: GET /api/dashboard
     │
     ▼
Middleware:
     │
     ├─ Check PUBLIC_PATHS: "/api/dashboard" in list? → NO
     │
     ├─ Get User Session: supabase.auth.getUser()
     │  └─ Result: { id: "...", email: "user@example.com", ... }
     │
     ├─ Set locals.user = { id, email, emailVerified }
     │
     └─ Protect Routes: user exists?
        └─ YES → Continue to API handler
                 │
                 ▼
        API Handler:
        ├─ const currentUserId = locals.current_user_id
        ├─ Fetch dashboard data for user
        └─ Return JSON response
                 │
                 ▼
        Response: 200 OK with dashboard data
```

## Komponenty Systemu

### PUBLIC_PATHS (Middleware)

```typescript
const PUBLIC_PATHS = [
  "/",                              // Landing page
  "/login",                         // Login page
  "/register",                      // Registration page
  "/verify-email",                  // Email verification page
  "/forgot-password",               // Password reset page
  "/auth/callback",                 // OAuth callback
  "/api/auth/login",                // Login API endpoint
  "/api/auth/register",             // Registration API endpoint
  "/api/auth/resend-verification",  // Resend verification API endpoint
];
```

### Protected Route Patterns (Middleware)

```typescript
const protectedRoutes = [
  "/dashboard",    // Matches: /dashboard
  "/settings",     // Matches: /settings
  "/offer",        // Matches: /offer, /offer/123, /offer/*/anything
];
```

### Astro.locals Structure

```typescript
interface Locals {
  supabase: SupabaseClient;           // Supabase client instance
  current_user_id: string | null;     // User ID or null
  user: {                             // User object or null
    id: string;
    email: string;
    emailVerified: boolean;
  } | null;
}
```

## Bezpieczeństwo

### Cookie Security

```typescript
cookieOptions = {
  path: "/",           // Cookie available for entire site
  secure: true,        // HTTPS only
  httpOnly: true,      // Not accessible via JavaScript
  sameSite: "lax",     // CSRF protection
}
```

### JWT Validation

1. **Automatic by Supabase**:
   - `supabase.auth.getUser()` validates JWT signature
   - Checks token expiration
   - Verifies token issuer (Supabase)

2. **Token Refresh**:
   - Automatically refreshes expired tokens
   - Updates cookies with new tokens
   - Transparent to application code

### Row Level Security (RLS)

```sql
-- Example: Users can only see their own offers
CREATE POLICY "Users see own offers"
ON offers FOR SELECT
USING (auth.uid() = user_id);
```

## Testowanie

### Test Cases

1. **Niezalogowany → Chroniona strona**: Oczekiwany redirect do `/login`
2. **Niezalogowany → Publiczna strona**: Oczekiwany dostęp
3. **Zalogowany → Chroniona strona**: Oczekiwany dostęp
4. **Zalogowany → Publiczna strona**: Oczekiwany dostęp
5. **Wygasły token → Chroniona strona**: Oczekiwany refresh i dostęp
6. **Nieprawidłowy token → Chroniona strona**: Oczekiwany redirect do `/login`

### Przykładowe Scenariusze Manualnego Testowania

#### Test 1: Podstawowa ochrona
```bash
# 1. Wyloguj się (usuń cookies)
# 2. Wejdź na http://localhost:3000/dashboard
# 3. Oczekiwany rezultat: Redirect do /login?returnUrl=%2Fdashboard
```

#### Test 2: returnUrl
```bash
# 1. Wyloguj się
# 2. Wejdź na http://localhost:3000/dashboard
# 3. Zaloguj się
# 4. Oczekiwany rezultat: Redirect z powrotem do /dashboard
```

#### Test 3: API Protection
```bash
# 1. Wyloguj się
# 2. Wykonaj: curl http://localhost:3000/api/dashboard
# 3. Oczekiwany rezultat: Redirect do /login lub 401 Unauthorized
```

#### Test 4: Publiczne strony
```bash
# 1. Wyloguj się
# 2. Wejdź na http://localhost:3000/login
# 3. Oczekiwany rezultat: Strona logowania wyświetla się poprawnie
```

