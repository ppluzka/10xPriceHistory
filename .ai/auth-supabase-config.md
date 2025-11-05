# ⚙️ Konfiguracja Supabase Auth Dashboard - PriceHistory

## 🎯 Cel dokumentu

Przewodnik krok-po-kroku konfiguracji Supabase Auth Dashboard dla prawidłowego działania logowania w aplikacji PriceHistory.

---

## 📋 Wymagania wstępne

- ✅ Konto Supabase (lokalny projekt lub cloud)
- ✅ Projekt Supabase utworzony
- ✅ Migracje zastosowane (`20251103000000_auth_support_tables.sql`)
- ✅ Zmienne środowiskowe ustawione w `.env`

---

## 🔧 Konfiguracja Dashboard

### 1. URL Configuration

**Lokalizacja:** Supabase Dashboard → Authentication → URL Configuration

#### 1.1 Site URL

**Development:**

```
http://localhost:4321
```

**Production:**

```
https://pricehistory.pl
```

**Uwaga:** Site URL musi być dokładnie taki sam jak URL aplikacji (bez trailing slash).

#### 1.2 Redirect URLs (Wildcards)

Dodaj następujące URLs do whitelist:

**Development:**

```
http://localhost:4321/**
http://localhost:4321/auth/callback
```

**Production:**

```
https://pricehistory.pl/**
https://pricehistory.pl/auth/callback
```

**Dlaczego to ważne:**

- `/**` pozwala na redirecty po logowaniu (returnUrl)
- `/auth/callback` wymagany dla weryfikacji email (US-002 w przyszłości)

---

### 2. Email Auth Settings

**Lokalizacja:** Supabase Dashboard → Authentication → Providers → Email

#### 2.1 Enable Email Provider

- ✅ **Enable Email provider** - zaznacz
- ✅ **Confirm email** - zaznacz (wymagane według PRD US-002)

**Uwaga:** "Confirm email" blokuje logowanie przed weryfikacją emaila (zgodnie z US-003).

#### 2.2 Email Templates (opcjonalne dla MVP)

**Confirm signup template:**

Możesz dostosować template w: Authentication → Email Templates → Confirm signup

```html
<h2>Potwierdź swój email</h2>
<p>Dziękujemy za rejestrację w PriceHistory!</p>
<p>Kliknij poniższy link aby potwierdzić swój adres email:</p>
<p><a href="{{ .ConfirmationURL }}">Potwierdź email</a></p>
<p>Link jest ważny przez 24 godziny.</p>
<p>Jeśli nie zakładałeś konta, zignoruj tę wiadomość.</p>

<hr />
<p style="font-size: 12px; color: #666;">PriceHistory - Śledź historię cen ofert z Otomoto.pl</p>
```

**Change Email template:**
Zostaw domyślny (lub customizuj później).

**Reset Password template:**
Zostaw domyślny (nie używany w MVP, może być przydatny później).

---

### 3. Session Settings

**Lokalizacja:** Supabase Dashboard → Authentication → Settings

#### 3.1 Session Timeout

- **Inactivity timeout:** `604800` sekund (7 dni zgodnie z PRD US-003)
- **JWT expiry:** `3600` sekund (1 godzina, default OK)

**Wyjaśnienie:**

- JWT expiry: Czas życia access token (automatycznie refreshowany)
- Inactivity timeout: Całkowity czas sesji (7 dni zgodnie z PRD)

#### 3.2 Refresh Token Rotation

- ✅ **Enable automatic reuse detection** - zaznacz (security best practice)

---

### 4. Security Settings (opcjonalne ale zalecane)

**Lokalizacja:** Supabase Dashboard → Authentication → Settings

#### 4.1 Password Requirements

- **Minimum length:** `8` (zgodnie z PRD US-001, US-005)

#### 4.2 Rate Limiting (built-in Supabase)

Supabase ma własny rate limiting:

- ~100 requests/hour per IP dla auth endpoints
- Dla dodatkowego rate limiting użyj tabel z migracji (poza scopem MVP)

---

### 5. SMTP Configuration (Email Delivery)

**Lokalizacja:** Supabase Dashboard → Project Settings → Auth → SMTP Settings

#### 5.1 Development (lokalne testowanie)

Supabase local używa Inbucket do przechwytywania emaili:

- URL: `http://localhost:54324`
- Wszystkie wysłane emaile widoczne w Inbucket UI

**Brak dodatkowej konfiguracji wymaganej dla dev.**

#### 5.2 Production (cloud Supabase)

**Opcja A: Używanie Supabase SMTP (default)**

- Supabase Cloud ma własny SMTP
- Działa out-of-the-box
- Ograniczenie: 3-4 emaile/godzinę per user (może być za mało)

**Opcja B: Custom SMTP (zalecane dla production)**

Przykład z SendGrid:

```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: [your-sendgrid-api-key]
Sender email: noreply@pricehistory.pl
Sender name: PriceHistory
```

Inne opcje: Mailgun, AWS SES, Postmark

---

### 6. Test Configuration

#### 6.1 Utworzenie użytkownika testowego

**Opcja A: Przez Dashboard**

1. Authentication → Users → Add user
2. Email: `test@example.com`
3. Password: (ustaw silne hasło)
4. ✅ Auto Confirm User (zaznacz dla testów)
5. Kliknij "Create user"

**Opcja B: Przez SQL**

```sql
-- W Supabase SQL Editor
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('yourpassword123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);
```

**Uwaga:** Opcja B jest zaawansowana, zalecamy Opcję A.

#### 6.2 Weryfikacja konfiguracji

Test przez Supabase CLI:

```bash
# Sprawdź czy auth działa
supabase functions invoke test-auth
```

Lub test manualny:

1. Otwórz `/login` w aplikacji
2. Zaloguj się jako `test@example.com`
3. Sprawdź czy redirect do `/dashboard` działa

---

## 🔐 Security Checklist

Przed produkcją sprawdź:

- [ ] Site URL ustawiony na production domain (HTTPS)
- [ ] Redirect URLs zawierają tylko twoje domeny
- [ ] Email confirmation włączony
- [ ] Session timeout = 7 dni
- [ ] Password min length = 8
- [ ] SMTP skonfigurowany (custom SMTP zalecane)
- [ ] Rate limiting enabled (Supabase default)
- [ ] JWT Secret jest secure (Supabase generuje automatycznie)

---

## 🐛 Troubleshooting

### Problem: "Email rate limit exceeded"

**Diagnoza:**
Supabase default SMTP ma limit ~4 emaile/h per user.

**Rozwiązanie:**

- Skonfiguruj custom SMTP (SendGrid, Mailgun)
- W dev użyj "Auto Confirm User" (omija email)

### Problem: "Invalid redirect URL"

**Diagnoza:**
URL po logowaniu nie jest w whitelist Redirect URLs.

**Rozwiązanie:**

1. Sprawdź URL Configuration w dashboard
2. Dodaj `https://yourdomain.com/**` do whitelist
3. Restart Supabase (jeśli lokalny): `supabase stop && supabase start`

### Problem: "User already registered" pomimo braku w dashboard

**Diagnoza:**
Użytkownik może być soft-deleted.

**Rozwiązanie:**

```sql
-- Sprawdź wszystkich users (łącznie z deleted)
SELECT email, deleted_at FROM auth.users WHERE email = 'test@example.com';

-- Jeśli deleted_at IS NOT NULL, hard delete:
DELETE FROM auth.users WHERE email = 'test@example.com';
```

### Problem: Email nie przychodzi (production)

**Diagnoza:**

1. Sprawdź spam folder
2. Sprawdź SMTP logs w dashboard
3. Sprawdź czy sender email jest zweryfikowany

**Rozwiązanie:**

- Dla SendGrid: Zweryfikuj sender domain
- Dla AWS SES: Wyjdź z sandbox mode
- Test przez dashboard: Authentication → Users → Send password reset

---

## 📊 Environment Variables Summary

Upewnij się że masz w `.env`:

```env
# Development
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=your-anon-key-from-local
SUPABASE_SERVICE_KEY=your-service-role-key-from-local

# Production
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_KEY=your-production-anon-key
SUPABASE_SERVICE_KEY=your-production-service-role-key
```

**Gdzie znaleźć klucze:**

- Local: `supabase status` (po `supabase start`)
- Cloud: Dashboard → Project Settings → API → Project API keys

---

## 🚀 Quick Start Commands

```bash
# Start local Supabase (jeśli nie działa)
supabase start

# Sprawdź status i klucze
supabase status

# Zastosuj migracje (jeśli jeszcze nie)
supabase db push

# Reset bazy (OSTROŻNIE - usuwa wszystkie dane)
supabase db reset

# Otwórz local studio
supabase studio
```

---

## 📚 Dodatkowe zasoby

**Dokumentacja Supabase:**

- Auth Overview: https://supabase.com/docs/guides/auth
- Email Auth: https://supabase.com/docs/guides/auth/auth-email
- Server-Side Auth (SSR): https://supabase.com/docs/guides/auth/server-side-rendering
- Custom SMTP: https://supabase.com/docs/guides/auth/auth-smtp

**Nasze dokumenty:**

- Testing Guide: `.ai/auth-testing-guide.md`
- Auth Spec: `.ai/auth-spec.md`
- PRD: `.ai/prd.md`

---

## ✅ Gotowe do testowania

Po wykonaniu wszystkich kroków:

1. Restart dev server: `npm run dev`
2. Otwórz: `http://localhost:4321/login`
3. Zaloguj się jako `test@example.com`
4. Sprawdź: [auth-testing-guide.md](./auth-testing-guide.md)

---

**Data utworzenia:** 2025-01-03  
**Ostatnia aktualizacja:** 2025-01-03  
**Status:** Gotowe do użycia  
**Autor:** AI Assistant
