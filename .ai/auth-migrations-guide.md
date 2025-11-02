# Przewodnik migracji bazy danych dla Supabase Auth

## 📋 Podsumowanie

Utworzone zostały **2 nowe migracje** SQL dla wsparcia systemu autentykacji opartego na Supabase Auth.

### ✅ Utworzone pliki migracji:

1. **`20251103000000_auth_support_tables.sql`** - Tabele wsparcia dla autentykacji
2. **`20251103000001_delete_account_function.sql`** - Funkcja usuwania konta

---

## 🎯 Co już mamy (istniejące migracje)

### ✅ Już zaimplementowane:

Z istniejącej migracji `20251011000000_initial_schema.sql`:

```sql
-- ✅ Odniesienia do auth.users są już w schemacie:
create table user_offer (
  user_id uuid not null references auth.users(id) on delete cascade,
  ...
);

create table user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ...
);
```

**Wniosek:** Podstawowy schemat już jest przygotowany na Supabase Auth! Tabela `auth.users` jest zarządzana przez Supabase, nie musimy jej tworzyć.

---

## 📦 Nowa migracja #1: Auth Support Tables

**Plik:** `supabase/migrations/20251103000000_auth_support_tables.sql`

### Tabele utworzone:

#### 1. `system_logs`
**Cel:** Ogólny logging systemowy

```sql
CREATE TABLE system_logs (
  id SERIAL PRIMARY KEY,
  level TEXT CHECK (level IN ('info', 'warning', 'error')),
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Zastosowanie:**
- Logowanie operacji autentykacji
- Logowanie błędów scrapingu
- Audit trail dla krytycznych operacji
- Retention: 90 dni

#### 2. `registration_attempts`
**Cel:** Rate limiting dla rejestracji

```sql
CREATE TABLE registration_attempts (
  id SERIAL PRIMARY KEY,
  ip_address INET NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  email TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_code TEXT
);
```

**Zastosowanie:**
- Limitowanie do 3 rejestracji/24h per IP
- Security monitoring
- Indeksy: `(ip_address, attempted_at DESC)`, `(email, attempted_at DESC)`

#### 3. `login_attempts`
**Cel:** Rate limiting i security dla logowania

```sql
CREATE TABLE login_attempts (
  id SERIAL PRIMARY KEY,
  ip_address INET NOT NULL,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_code TEXT
);
```

**Zastosowanie:**
- Limitowanie do 5 prób/15min per IP
- Wykrywanie brute force attacks
- Indeksy: `(ip_address, attempted_at DESC)`, `(email, attempted_at DESC)`

#### 4. `password_change_log`
**Cel:** Audit trail zmian hasła

```sql
CREATE TABLE password_change_log (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);
```

**Zastosowanie:**
- Security audit
- Wykrywanie nieautoryzowanych zmian
- Retention: 90 dni

#### 5. `email_verification_resends`
**Cel:** Rate limiting dla wysyłania emaili weryfikacyjnych

```sql
CREATE TABLE email_verification_resends (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  resent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Zastosowanie:**
- Limitowanie do 1 wysłania/minutę per email
- Zapobieganie spamowi
- Retention: 7 dni (krótsza niż inne logi)

### Funkcje utworzone:

#### Rate Limiting Functions:
```sql
check_registration_rate_limit(ip INET) RETURNS BOOLEAN
check_login_rate_limit(ip INET) RETURNS BOOLEAN  
check_email_resend_cooldown(email TEXT) RETURNS BOOLEAN
```

**Użycie w API:**
```typescript
// Przykład w /api/auth/register
const isLimited = await supabase.rpc('check_registration_rate_limit', { 
  ip: clientIp 
});

if (isLimited) {
  return new Response(
    JSON.stringify({ error: 'Rate limit exceeded' }), 
    { status: 429 }
  );
}
```

#### Logging Functions:
```sql
log_registration_attempt(ip, email, user_id, success, error_code)
log_login_attempt(ip, email, user_id, success, error_code)
```

**Użycie w API:**
```typescript
// Po próbie logowania
await supabase.rpc('log_login_attempt', {
  p_ip_address: clientIp,
  p_email: email,
  p_user_id: userId || null,
  p_success: success,
  p_error_code: errorCode || null
});
```

#### Cleanup Function:
```sql
cleanup_auth_logs() RETURNS void
```

**Użycie:**
- Usuwa logi starsze niż 90 dni (email resends: 7 dni)
- Powinien być uruchamiany codziennie (cron job)
- Opcjonalnie: `pg_cron` extension (zakomentowane w migracji)

---

## 📦 Nowa migracja #2: Delete Account Function

**Plik:** `supabase/migrations/20251103000001_delete_account_function.sql`

### Funkcja główna: `delete_user_account()`

**Cel:** Bezpieczne usunięcie (anonimizacja) konta użytkownika

**Co robi:**
1. **Soft-delete** wszystkich subskrypcji użytkownika (`user_offer.deleted_at = NOW()`)
2. **Anonimizacja** emaila: `deleted_{timestamp}@deleted.com`
3. **Usunięcie hasła**: `encrypted_password = NULL`
4. **Czyszczenie metadanych**: `raw_user_meta_data = '{}'`
5. **Logowanie** operacji w `system_logs`

**Security:**
- `SECURITY DEFINER` - pozwala modyfikować `auth.users`
- `auth.uid()` - użytkownik może usunąć tylko swoje konto
- Nie można usunąć cudzego konta!

**Użycie w API:**
```typescript
// /api/auth/delete-account endpoint
const { error } = await supabase.rpc('delete_user_account');

if (error) {
  return new Response(
    JSON.stringify({ error: error.message }), 
    { status: 500 }
  );
}

// Success - logout user and redirect
await supabase.auth.signOut();
return new Response(
  JSON.stringify({ message: 'Account deleted' }), 
  { status: 200 }
);
```

### Funkcja pomocnicza: `can_delete_account()`

**Cel:** Pre-check przed usunięciem konta

**Zwraca:**
```json
{
  "can_delete": true,
  "active_offers": 5,
  "warnings": [
    "All your tracked offers will be removed",
    "Price history data will be preserved but anonymized",
    "This action cannot be undone"
  ]
}
```

**Użycie w UI:**
```typescript
// Przed pokazaniem modal z potwierdzeniem
const { data } = await supabase.rpc('can_delete_account');

// Pokaż warnings w modal
setWarnings(data.warnings);
setOfferCount(data.active_offers);
```

---

## 🚀 Jak zastosować migracje

### Opcja 1: Supabase CLI (zalecane)

```bash
# 1. Upewnij się że Supabase CLI jest zainstalowane
supabase --version

# 2. Link do projektu (jeśli jeszcze nie zrobione)
supabase link --project-ref your-project-ref

# 3. Zastosuj migracje
supabase db push

# Lub pojedynczo:
supabase migration up --version 20251103000000
supabase migration up --version 20251103000001
```

### Opcja 2: Supabase Dashboard (SQL Editor)

1. Wejdź do Supabase Dashboard
2. Przejdź do **SQL Editor**
3. Utwórz nowy query
4. Skopiuj zawartość `20251103000000_auth_support_tables.sql`
5. Uruchom (Run)
6. Powtórz dla `20251103000001_delete_account_function.sql`

### Opcja 3: Lokalna baza (development)

```bash
# Jeśli używasz lokalnego Supabase
supabase start

# Migracje zastosują się automatycznie
# Lub manualnie:
psql -h localhost -p 54322 -U postgres -d postgres < supabase/migrations/20251103000000_auth_support_tables.sql
psql -h localhost -p 54322 -U postgres -d postgres < supabase/migrations/20251103000001_delete_account_function.sql
```

---

## ✅ Weryfikacja migracji

### Test 1: Sprawdź czy tabele zostały utworzone

```sql
-- Powinny istnieć wszystkie 5 tabel
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN (
  'system_logs',
  'registration_attempts',
  'login_attempts',
  'password_change_log',
  'email_verification_resends'
);
```

### Test 2: Sprawdź funkcje

```sql
-- Powinny istnieć wszystkie funkcje
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
  'check_registration_rate_limit',
  'check_login_rate_limit',
  'check_email_resend_cooldown',
  'log_registration_attempt',
  'log_login_attempt',
  'cleanup_auth_logs',
  'delete_user_account',
  'can_delete_account'
);
```

### Test 3: Przetestuj rate limiting

```sql
-- Test registration rate limit
SELECT check_registration_rate_limit('192.168.1.1'::INET);
-- Powinno zwrócić FALSE (no attempts yet)

-- Dodaj 3 próby
SELECT log_registration_attempt(
  '192.168.1.1'::INET, 
  'test@example.com', 
  NULL, 
  TRUE, 
  NULL
);
-- Powtórz 3 razy

-- Sprawdź ponownie
SELECT check_registration_rate_limit('192.168.1.1'::INET);
-- Powinno zwrócić TRUE (limit exceeded)
```

### Test 4: Przetestuj delete_user_account (jako zalogowany użytkownik)

```sql
-- 1. Najpierw utwórz test użytkownika przez Supabase Auth UI lub API
-- 2. Zaloguj się jako ten użytkownik (aby auth.uid() działało)
-- 3. Uruchom:

SELECT can_delete_account();
-- Sprawdź output

-- SELECT delete_user_account();
-- (Ostrzeżenie: to faktycznie usunie konto!)

-- 4. Zweryfikuj czy email został zanonimizowany:
SELECT email, encrypted_password 
FROM auth.users 
WHERE email LIKE 'deleted_%@deleted.com';
```

---

## 📊 Statystyki migracji

### Utworzone obiekty:

| Typ | Liczba | Nazwy |
|-----|--------|-------|
| Tabele | 5 | system_logs, registration_attempts, login_attempts, password_change_log, email_verification_resends |
| Indeksy | 8 | idx_system_logs_*, idx_registration_attempts_*, etc. |
| Funkcje | 8 | check_*, log_*, cleanup_*, delete_*, can_delete_* |
| Permissions | 6 | GRANT EXECUTE dla authenticated role |

### Rozmiar na dysku (oszacowanie):

- **Początkowy:** ~100 KB (puste tabele + funkcje)
- **Po 1 miesiącu użytkowania:** ~10-50 MB (w zależności od ruchu)
- **Retention policies:** Automatyczne czyszczenie co 90 dni

---

## 🔐 Security considerations

### ✅ Co jest bezpieczne:

1. **RPC Functions są bezpieczne** - używają `auth.uid()` lub są tylko read-only
2. **SECURITY DEFINER** - tylko dla `delete_user_account()` i `can_delete_account()`
3. **Rate limiting** - chronione przed abuse
4. **Soft delete** - dane nie są tracone, tylko anonimizowane

### ⚠️ Uwagi:

1. **IP logging** - GDPR compliance: IP to dane osobowe
   - Retention: 90 dni max
   - W EU: user powinien być poinformowany

2. **System logs** - mogą zawierać wrażliwe dane w `context` JSONB
   - Unikaj logowania haseł, tokenów
   - Używaj dla audit trail

3. **Cleanup function** - musi być uruchomiony regularnie
   - Można użyć `pg_cron` (wymaga rozszerzenia)
   - Lub zewnętrzny cron job

---

## 🔄 Rollback procedure

Jeśli trzeba cofnąć migracje:

```sql
-- Rollback migracji 20251103000001
DROP FUNCTION IF EXISTS delete_user_account();
DROP FUNCTION IF EXISTS can_delete_account();

-- Rollback migracji 20251103000000
DROP FUNCTION IF EXISTS cleanup_auth_logs();
DROP FUNCTION IF EXISTS check_email_resend_cooldown(TEXT);
DROP FUNCTION IF EXISTS check_login_rate_limit(INET);
DROP FUNCTION IF EXISTS check_registration_rate_limit(INET);
DROP FUNCTION IF EXISTS log_login_attempt;
DROP FUNCTION IF EXISTS log_registration_attempt;

DROP TABLE IF EXISTS email_verification_resends;
DROP TABLE IF EXISTS password_change_log;
DROP TABLE IF EXISTS login_attempts;
DROP TABLE IF EXISTS registration_attempts;
DROP TABLE IF EXISTS system_logs;
```

**Uwaga:** To usunie wszystkie logi! Użyj tylko w development.

---

## 📝 Co NIE jest potrzebne w migracjach

### ❌ Nie trzeba tworzyć:

1. **Tabela `auth.users`**
   - Zarządzana przez Supabase Auth
   - Automatycznie dostępna

2. **Email templates**
   - Konfigurowane przez Supabase Dashboard
   - Nie są w SQL migrations

3. **OAuth providers**
   - Konfigurowane przez Dashboard
   - API keys w environment variables

4. **RLS dla `auth.users`**
   - Supabase ma built-in policies
   - Nie modyfikujemy tego

5. **Session management**
   - Supabase Auth SDK to obsługuje
   - Cookies, tokens - wszystko automatyczne

---

## 🎯 Następne kroki

Po zastosowaniu migracji:

### 1. Konfiguracja Supabase Auth Dashboard

- [ ] Email templates (confirm signup, password reset)
- [ ] Site URL i Redirect URLs
- [ ] Session timeout (7 dni zgodnie z PRD)
- [ ] Email provider (SMTP)

### 2. Environment variables

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
HCAPTCHA_SECRET_KEY=your-secret-key
HCAPTCHA_SITE_KEY=your-site-key
PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Implementacja API endpoints

- `/api/auth/register` - użyj `check_registration_rate_limit()`
- `/api/auth/login` - użyj `check_login_rate_limit()`
- `/api/auth/resend-verification` - użyj `check_email_resend_cooldown()`
- `/api/auth/delete-account` - użyj `delete_user_account()`

### 4. Setup cron job dla cleanup

```bash
# Opcja 1: pg_cron (w Supabase)
SELECT cron.schedule(
  'cleanup-auth-logs',
  '0 2 * * *',  -- 2 AM daily
  'SELECT cleanup_auth_logs()'
);

# Opcja 2: Zewnętrzny cron (VPS)
# Dodaj do crontab:
0 2 * * * psql "postgresql://..." -c "SELECT cleanup_auth_logs()"
```

---

## 📚 Dokumentacja

- **Auth spec:** `.ai/auth-spec.md` - Sekcja 5 (Migracje)
- **API plan:** `.ai/api-plan.md`
- **PRD:** `.ai/prd.md` - US-001 do US-006

---

## ✅ Checklist

- [x] Utworzone 2 pliki migracji SQL
- [x] Tabele dla rate limiting i audit logging
- [x] Funkcje pomocnicze (rate limit checks, logging)
- [x] Funkcja delete_user_account() z security definer
- [x] Indeksy dla performance
- [x] Permissions dla authenticated role
- [x] Komentarze i dokumentacja w SQL
- [x] Rollback procedure
- [ ] **DO ZROBIENIA:** Zastosować migracje w Supabase
- [ ] **DO ZROBIENIA:** Konfiguracja Dashboard
- [ ] **DO ZROBIENIA:** Setup cron job dla cleanup

---

**Status:** ✅ Migracje gotowe do zastosowania  
**Następny krok:** Zastosuj migracje w Supabase CLI lub Dashboard

