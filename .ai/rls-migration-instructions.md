# Instrukcja Wykonania Migracji RLS

## Przegląd

Migracja `20251103120000_enable_comprehensive_rls_policies.sql` włącza Row Level Security (RLS) i tworzy kompleksowe polityki dla wszystkich operacji CRUD na następujących tabelach:

- `offers` - oferty śledzone przez użytkowników
- `user_offer` - połączenie użytkownik-oferta (subskrypcje)
- `price_history` - historia zmian cen
- `user_preferences` - preferencje użytkownika
- `api_usage` - logi użycia API

## Polityki Bezpieczeństwa

### Tabela: offers
- **SELECT** (anon): Publiczny dostęp do przeglądania ofert
- **SELECT** (authenticated): Pełny dostęp do przeglądania ofert
- **INSERT** (authenticated): Użytkownicy mogą dodawać nowe oferty
- **UPDATE** (authenticated): Tylko oferty, które użytkownik śledzi
- **DELETE** (authenticated): Tylko jeśli użytkownik jest jedynym subskrybentem

### Tabela: user_offer
- **SELECT** (authenticated): Tylko własne subskrypcje (nieskasowane)
- **INSERT** (authenticated): Tylko własne subskrypcje
- **UPDATE** (authenticated): Tylko własne subskrypcje (głównie soft-delete)
- **DELETE** (authenticated): Tylko własne subskrypcje

### Tabela: price_history
- **SELECT** (anon): Publiczny dostęp do historii cen
- **SELECT** (authenticated): Pełny dostęp do historii cen
- **INSERT/UPDATE/DELETE**: Obsługiwane przez backend service (service_role)

### Tabela: user_preferences
- **SELECT** (authenticated): Tylko własne preferencje
- **INSERT** (authenticated): Tylko własne preferencje
- **UPDATE** (authenticated): Tylko własne preferencje
- **DELETE** (authenticated): Tylko własne preferencje

### Tabela: api_usage
- **SELECT** (authenticated): Tylko własne logi API
- **INSERT** (authenticated/anon): Dozwolone dla logowania (backend service)
- **UPDATE/DELETE**: Tylko service_role (immutable audit logs)

## Krok 1: Przygotowanie

### Sprawdź połączenie z bazą danych

```bash
# Sprawdź status Supabase
supabase status

# Jeśli nie działa, uruchom lokalnie:
supabase start
```

### Backup bazy danych (WAŻNE!)

Przed wykonaniem migracji zawsze wykonaj backup:

```bash
# Dla lokalnej bazy danych
supabase db dump -f backup_before_rls_$(date +%Y%m%d_%H%M%S).sql

# Dla produkcyjnej bazy (jeśli dotyczy)
supabase db dump --linked -f backup_prod_before_rls_$(date +%Y%m%d_%H%M%S).sql
```

## Krok 2: Wykonanie Migracji

### Opcja A: Lokalna baza danych

```bash
# Zastosuj wszystkie pending migracje
supabase db push

# LUB zastosuj konkretną migrację
supabase migration up
```

### Opcja B: Środowisko zdalne/staging

```bash
# Link do projektu (jeśli jeszcze nie linkowany)
supabase link --project-ref your-project-ref

# Zastosuj migracje na zdalne środowisko
supabase db push --linked
```

### Opcja C: Manualne wykonanie SQL (alternatywa)

Jeśli `supabase db push` nie działa:

```bash
# 1. Połącz się z bazą danych
supabase db reset  # dla lokalnej bazy (UWAGA: kasuje wszystkie dane!)

# LUB użyj psql
psql postgresql://postgres:your-password@localhost:54322/postgres \
  -f supabase/migrations/20251103120000_enable_comprehensive_rls_policies.sql
```

## Krok 3: Weryfikacja Migracji

### Sprawdź status RLS

```sql
-- Połącz się z bazą i wykonaj query
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('offers', 'user_offer', 'price_history', 'user_preferences', 'api_usage')
ORDER BY tablename;
```

Oczekiwany wynik - wszystkie tabele powinny mieć `rls_enabled = true`

### Sprawdź utworzone polityki

```sql
-- Wyświetl wszystkie polityki RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('offers', 'user_offer', 'price_history', 'user_preferences', 'api_usage')
ORDER BY tablename, policyname;
```

Powinieneś zobaczyć:
- **offers**: 5 polityk (select anon, select auth, insert auth, update auth, delete auth)
- **user_offer**: 4 polityki (select, insert, update, delete dla authenticated)
- **price_history**: 2 polityki (select anon, select auth)
- **user_preferences**: 4 polityki (select, insert, update, delete dla authenticated)
- **api_usage**: 2 polityki (select auth, insert all)

### Sprawdź liczby polityk per tabela

```sql
-- Szybkie podsumowanie
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('offers', 'user_offer', 'price_history', 'user_preferences', 'api_usage')
GROUP BY tablename
ORDER BY tablename;
```

## Krok 4: Testy Funkcjonalne

### Test 1: Dostęp anonymous (anon)

```sql
-- Ustaw role na anon (symulacja niezalogowanego użytkownika)
SET ROLE anon;

-- Powinno działać: odczyt ofert
SELECT * FROM offers LIMIT 5;

-- Powinno działać: odczyt historii cen
SELECT * FROM price_history LIMIT 5;

-- Powinno zwrócić błąd: próba insertu
INSERT INTO offers (title, url, selector, city) 
VALUES ('Test Offer', 'https://test.com', '.price', 'Warsaw');
-- Oczekiwany błąd: permission denied

-- Reset role
RESET ROLE;
```

### Test 2: Dostęp authenticated

```sql
-- Ustaw role na authenticated z konkretnym user_id
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "test-user-id-123"}';

-- Powinno działać: odczyt ofert
SELECT * FROM offers LIMIT 5;

-- Powinno działać: insert oferty
INSERT INTO offers (title, url, selector, city) 
VALUES ('Test Offer', 'https://test.com', '.price', 'Warsaw')
RETURNING *;

-- Powinno działać: odczyt własnych subskrypcji
SELECT * FROM user_offer WHERE user_id = 'test-user-id-123';

-- Powinno zwrócić błąd: odczyt cudzych subskrypcji
SELECT * FROM user_offer WHERE user_id = 'other-user-id-456';
-- Powinno zwrócić 0 wierszy (polityka filtruje)

-- Reset
RESET ROLE;
```

### Test 3: Service Role (bypass RLS)

```sql
-- Service role omija RLS
SET ROLE service_role;

-- Wszystkie operacje powinny działać bez ograniczeń
SELECT COUNT(*) FROM offers;
SELECT COUNT(*) FROM user_offer;
SELECT COUNT(*) FROM price_history;

-- Insert do price_history (zazwyczaj tylko dla service)
INSERT INTO price_history (offer_id, price, currency)
VALUES (1, 999.99, 'PLN')
RETURNING *;

RESET ROLE;
```

## Krok 5: Zaaplikowanie Zmian do TypeScript

### Regeneruj typy Supabase

Po zastosowaniu migracji, zaktualizuj TypeScript types:

```bash
# Generuj nowe typy z bazy danych
supabase gen types typescript --local > src/db/database.types.ts

# LUB dla zdalnej bazy
supabase gen types typescript --linked > src/db/database.types.ts
```

### Zweryfikuj typy w aplikacji

```bash
# Sprawdź błędy TypeScript
npm run typecheck

# LUB
tsc --noEmit
```

## Krok 6: Testowanie w Aplikacji

### Uruchom testy jednostkowe

```bash
# Uruchom wszystkie testy
npm run test

# Uruchom testy z pokryciem
npm run test:coverage
```

### Uruchom aplikację i przetestuj manualnie

```bash
# Uruchom dev server
npm run dev
```

Przetestuj następujące scenariusze:
1. ✅ Przeglądanie ofert jako niezalogowany użytkownik
2. ✅ Dodawanie oferty jako zalogowany użytkownik
3. ✅ Edycja własnej oferty (którą śledzisz)
4. ❌ Próba edycji cudzej oferty (powinna być zablokowana)
5. ✅ Przeglądanie własnych subskrypcji
6. ✅ Dodawanie/usuwanie subskrypcji
7. ✅ Przeglądanie historii cen

## Krok 7: Rollback (w razie problemów)

Jeśli migracja powoduje problemy, możesz ją wycofać:

### Opcja A: Reset lokalnej bazy

```bash
# UWAGA: To usuwa wszystkie dane!
supabase db reset
```

### Opcja B: Manualne wycofanie

Utwórz plik rollback: `supabase/migrations/20251103120001_rollback_rls_policies.sql`

```sql
-- rollback: disable rls policies
-- purpose: revert rls changes if issues occur

-- drop all policies
drop policy if exists offers_select_anon on offers;
drop policy if exists offers_select_authenticated on offers;
drop policy if exists offers_insert_authenticated on offers;
drop policy if exists offers_update_authenticated on offers;
drop policy if exists offers_delete_authenticated on offers;

drop policy if exists user_offer_select_authenticated on user_offer;
drop policy if exists user_offer_insert_authenticated on user_offer;
drop policy if exists user_offer_update_authenticated on user_offer;
drop policy if exists user_offer_delete_authenticated on user_offer;

drop policy if exists price_history_select_anon on price_history;
drop policy if exists price_history_select_authenticated on price_history;

drop policy if exists user_preferences_select_authenticated on user_preferences;
drop policy if exists user_preferences_insert_authenticated on user_preferences;
drop policy if exists user_preferences_update_authenticated on user_preferences;
drop policy if exists user_preferences_delete_authenticated on user_preferences;

drop policy if exists api_usage_select_authenticated on api_usage;
drop policy if exists api_usage_insert_all on api_usage;

-- disable rls
alter table offers disable row level security;
alter table user_offer disable row level security;
alter table price_history disable row level security;
alter table user_preferences disable row level security;
alter table api_usage disable row level security;
```

Następnie:

```bash
supabase db push
```

## Troubleshooting

### Problem: "permission denied for table X"

**Rozwiązanie**: Sprawdź czy używasz właściwej roli (anon/authenticated/service_role)

```sql
-- Sprawdź aktualną rolę
SELECT current_user, current_setting('request.jwt.claims', true);
```

### Problem: Polityki nie działają jak oczekiwano

**Rozwiązanie**: Sprawdź szczegóły polityki i przetestuj using/with_check expressions:

```sql
-- Test using expression dla konkretnej polityki
SELECT 
  id, 
  title,
  (
    EXISTS (
      SELECT 1 FROM user_offer
      WHERE user_offer.offer_id = offers.id
        AND user_offer.user_id = auth.uid()
        AND user_offer.deleted_at IS NULL
    )
  ) as can_update
FROM offers;
```

### Problem: Nie mogę zalogować się lub wykonać operacji

**Rozwiązanie**: Sprawdź konfigurację auth i czy `auth.uid()` zwraca właściwą wartość:

```sql
-- Sprawdź auth context
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;
```

## Dodatkowe Zasoby

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)

## Podsumowanie

Po wykonaniu wszystkich kroków:

✅ RLS jest włączony na wszystkich tabelach  
✅ Polityki CRUD są utworzone zgodnie z wymaganiami  
✅ Typy TypeScript są zaktualizowane  
✅ Testy przechodzą pomyślnie  
✅ Aplikacja działa poprawnie z nowymi politykami  

Jeśli wszystko działa, możesz commitować zmiany:

```bash
git add supabase/migrations/20251103120000_enable_comprehensive_rls_policies.sql
git add src/db/database.types.ts
git commit -m "feat: enable comprehensive RLS policies for all CRUD operations"
```

