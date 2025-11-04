# Setup Guide: Automatyczne Monitorowanie Cen

Ten dokument opisuje kroki niezbędne do uruchomienia systemu automatycznego monitorowania cen ofert z Otomoto.pl.

## 📋 Spis treści

1. [Wymagania wstępne](#wymagania-wstępne)
2. [Konfiguracja Environment Variables](#konfiguracja-environment-variables)
3. [Konfiguracja bazy danych](#konfiguracja-bazy-danych)
4. [Konfiguracja pg_cron](#konfiguracja-pg_cron)
5. [Testowanie systemu](#testowanie-systemu)
6. [Troubleshooting](#troubleshooting)

---

## Wymagania wstępne

- ✅ Supabase project z włączonymi extensions: `pg_cron`, `pg_net`
- ✅ OpenRouter.ai API key (dla AI fallback)
- ✅ Webhook URL dla alertów (opcjonalne - Slack/Discord)
- ✅ Node.js 18+ i npm/pnpm

---

## Konfiguracja Environment Variables

### 1. Utwórz/zaktualizuj plik `.env`

```bash
# Supabase Configuration (już skonfigurowane)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# OpenRouter API (już skonfigurowane)
OPENROUTER_API_KEY=sk-or-v1-...

# NOWE - Wymagane dla price monitoring:
# Secret dla autoryzacji CRON jobs
CRON_SECRET=your-secure-random-secret-here

# OPCJONALNE - Webhook dla alertów (Slack, Discord, etc.)
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### 2. Wygeneruj bezpieczny CRON_SECRET

```bash
# W terminalu:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Lub użyj:
openssl rand -hex 32
```

Skopiuj wygenerowany string do `.env` jako `CRON_SECRET`.

---

## Konfiguracja bazy danych

### 1. Uruchom migracje

```bash
# W katalogu projektu:
supabase db reset

# LUB jeśli baza już działa:
supabase migration up
```

To uruchomi:
- `20251104000000_monitoring_tables.sql` - tabele system_logs i error_log
- `20251104000001_pg_cron_jobs.sql` - scheduled jobs

### 2. Zweryfikuj tabele

W Supabase SQL Editor uruchom:

```sql
-- Sprawdź czy tabele zostały utworzone
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('system_logs', 'error_log');

-- Powinno zwrócić:
-- system_logs
-- error_log
```

---

## Konfiguracja pg_cron

### 1. Enable extensions w Supabase Dashboard

1. Otwórz Supabase Dashboard
2. Przejdź do: **Database** → **Extensions**
3. Włącz następujące extensions:
   - ✅ `pg_cron` - scheduled jobs
   - ✅ `pg_net` - HTTP requests

### 2. Skonfiguruj CRON_SECRET w bazie danych

W Supabase SQL Editor uruchom:

```sql
-- Ustaw CRON_SECRET (ten sam co w .env)
ALTER DATABASE postgres SET app.cron_secret = 'your-secure-random-secret-here';

-- Zweryfikuj ustawienie
SELECT current_setting('app.cron_secret', true);
```

⚠️ **WAŻNE**: Użyj tego samego secret co w `.env`!

### 3. Zaktualizuj API URL w funkcji check_offer_prices()

Musisz zaktualizować URL w migracji dla środowiska produkcyjnego:

**Opcja A: Bezpośrednio w bazie (SQL Editor):**

```sql
-- Zaktualizuj funkcję z nowym URL
CREATE OR REPLACE FUNCTION check_offer_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_url TEXT;
  cron_secret TEXT;
BEGIN
  -- ⚠️ ZMIEŃ NA SWÓJ DOMAIN PRODUKCYJNY
  api_url := 'https://your-production-domain.com/api/cron/check-prices';
  
  -- Dla development lokalnie:
  -- api_url := 'http://localhost:4321/api/cron/check-prices';
  
  cron_secret := current_setting('app.cron_secret', true);
  
  IF cron_secret IS NULL OR cron_secret = '' THEN
    RAISE WARNING 'CRON_SECRET not configured';
    RETURN;
  END IF;
  
  PERFORM
    net.http_post(
      url := api_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || cron_secret
      ),
      body := jsonb_build_object('triggered_by', 'pg_cron')
    );
    
  RAISE NOTICE 'Price check job triggered at %', NOW();
END;
$$;
```

**Opcja B: Użyj database setting (zalecane):**

```sql
-- Ustaw API URL jako ustawienie bazy
ALTER DATABASE postgres SET app.api_url = 'https://your-domain.com/api/cron/check-prices';

-- Zmodyfikuj funkcję aby używała tego ustawienia:
CREATE OR REPLACE FUNCTION check_offer_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_url TEXT;
  cron_secret TEXT;
BEGIN
  -- Pobierz URL z ustawień bazy
  api_url := current_setting('app.api_url', true);
  cron_secret := current_setting('app.cron_secret', true);
  
  IF api_url IS NULL OR api_url = '' THEN
    RAISE WARNING 'API URL not configured in app.api_url';
    RETURN;
  END IF;
  
  IF cron_secret IS NULL OR cron_secret = '' THEN
    RAISE WARNING 'CRON_SECRET not configured';
    RETURN;
  END IF;
  
  PERFORM
    net.http_post(
      url := api_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || cron_secret
      ),
      body := jsonb_build_object('triggered_by', 'pg_cron')
    );
    
  RAISE NOTICE 'Price check job triggered at %', NOW();
END;
$$;
```

### 4. Zweryfikuj scheduled jobs

```sql
-- Zobacz wszystkie scheduled jobs
SELECT * FROM cron.job;

-- Powinno zwrócić 4 joby:
-- check_prices_6h  - co 6 godzin
-- check_prices_12h - co 12 godzin
-- check_prices_24h - codziennie
-- check_prices_48h - co 2 dni
```

### 5. (Opcjonalne) Testowe ręczne uruchomienie

```sql
-- Wywołaj funkcję ręcznie (testowo)
SELECT check_offer_prices();

-- Sprawdź czy request został wysłany (check pg_net logs)
SELECT * FROM net._http_response ORDER BY id DESC LIMIT 5;
```

---

## Testowanie systemu

### 1. Test manualny CRON endpointu (local)

```bash
# W terminalu (z uruchomionym lokalnym serwerem):
curl -X POST http://localhost:4321/api/cron/check-prices \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json" \
  -d '{"triggered_by": "manual_test"}'

# Expected response:
# {"success":true,"processed":X,"message":"Price check completed successfully"}
```

### 2. Test manual recheck dla pojedynczej oferty

1. Przejdź do Dashboard w przeglądarce
2. Znajdź ofertę ze statusem **ERROR**
3. Kliknij przycisk **"Sprawdź ponownie"**
4. Powinieneś zobaczyć:
   - Spinner podczas sprawdzania
   - Toast z wynikiem (sukces/błąd)
   - Zaktualizowany status oferty

### 3. Monitoruj logi systemowe

```sql
-- Zobacz ostatnie zdarzenia
SELECT 
  event_type,
  offer_id,
  message,
  created_at 
FROM system_logs 
ORDER BY created_at DESC 
LIMIT 50;

-- Zobacz ostatnie błędy
SELECT 
  offer_id,
  error_message,
  attempt_number,
  created_at 
FROM error_log 
ORDER BY created_at DESC 
LIMIT 20;
```

### 4. Sprawdź success rate

```sql
-- Oblicz success rate z ostatnich 24h
WITH recent_checks AS (
  SELECT 
    event_type,
    COUNT(*) as count
  FROM system_logs
  WHERE created_at > NOW() - INTERVAL '24 hours'
    AND event_type IN ('price_check_success', 'price_check_failed')
  GROUP BY event_type
)
SELECT 
  ROUND(
    (SELECT count FROM recent_checks WHERE event_type = 'price_check_success')::NUMERIC / 
    (SELECT SUM(count) FROM recent_checks) * 100, 
    2
  ) as success_rate_percent;

-- Target: ≥90%
```

---

## Troubleshooting

### Problem: CRON job nie uruchamia się

**Diagnoza:**
```sql
-- Sprawdź execution history
SELECT * 
FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 20;

-- Sprawdź czy extension jest włączony
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

**Rozwiązanie:**
- Upewnij się, że `pg_cron` jest włączony w Extensions
- Sprawdź logi Supabase w Dashboard → Logs → Postgres

---

### Problem: HTTP request fails (timeout/connection refused)

**Diagnoza:**
```sql
-- Zobacz pg_net responses
SELECT * 
FROM net._http_response 
ORDER BY id DESC 
LIMIT 10;
```

**Możliwe przyczyny:**
1. **Localhost URL w produkcji**: Zmień `api_url` na publiczny domain
2. **Nieprawidłowy CRON_SECRET**: Zweryfikuj czy taki sam w `.env` i bazie
3. **Application nie działa**: Upewnij się że Astro app jest uruchomiony
4. **Firewall**: Supabase musi mieć dostęp do Twojego API

**Rozwiązanie:**
```sql
-- Ustaw prawidłowy production URL
ALTER DATABASE postgres SET app.api_url = 'https://your-actual-domain.com/api/cron/check-prices';
```

---

### Problem: Wysokie error rate (>15%)

**Diagnoza:**
```sql
-- Zobacz najczęstsze błędy
SELECT 
  error_message,
  COUNT(*) as occurrences
FROM error_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_message
ORDER BY occurrences DESC
LIMIT 10;

-- Sprawdź które oferty mają problemy
SELECT 
  o.id,
  o.url,
  o.status,
  COUNT(e.id) as error_count
FROM offers o
LEFT JOIN error_log e ON e.offer_id = o.id
WHERE e.created_at > NOW() - INTERVAL '24 hours'
GROUP BY o.id, o.url, o.status
ORDER BY error_count DESC
LIMIT 20;
```

**Możliwe przyczyny:**
1. **Zmiana struktury Otomoto**: Selektory przestały działać
2. **Rate limiting**: Za dużo requestów
3. **OpenRouter API down**: AI fallback nie działa
4. **Nieaktualne oferty**: Dużo ofert już usuniętych

**Rozwiązania:**
- Zaktualizuj selektory dla problematycznych ofert
- Zwiększ opóźnienia między requestami (w `ScrapingService`)
- Sprawdź dostępność OpenRouter API
- Usuń oferty ze statusem `removed`

---

### Problem: Alert nie wysyłany mimo wysokiego error rate

**Diagnoza:**
```sql
-- Sprawdź ostatni wysłany alert
SELECT * 
FROM system_logs 
WHERE event_type = 'alert_sent' 
ORDER BY created_at DESC 
LIMIT 1;

-- Sprawdź success rate
SELECT 
  ROUND(
    COUNT(CASE WHEN event_type = 'price_check_success' THEN 1 END)::NUMERIC / 
    COUNT(*)::NUMERIC * 100, 
    2
  ) as success_rate
FROM system_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND event_type IN ('price_check_success', 'price_check_failed');
```

**Możliwe przyczyny:**
1. **Cooldown period**: Alert był wysłany w ciągu ostatnich 6h
2. **Brak webhook URL**: `ALERT_WEBHOOK_URL` nie skonfigurowany
3. **Error rate < 15%**: System jest poniżej progu

**Rozwiązanie:**
- Sprawdź `.env` czy `ALERT_WEBHOOK_URL` jest ustawiony
- Zweryfikuj webhook URL (test curl)
- Cooldown można skrócić w `MonitoringService` (domyślnie 6h)

---

### Problem: Oferta wciąż w statusie ERROR mimo prawidłowego sprawdzenia

**Rozwiązanie:**
```sql
-- Ręcznie zmień status na active
UPDATE offers 
SET status = 'active'
WHERE id = 'offer-id-here';

-- LUB użyj UI - przycisk "Sprawdź ponownie"
```

---

### Przydatne komendy SQL

```sql
-- Reset wszystkich ofert ERROR do ACTIVE (ostrożnie!)
UPDATE offers 
SET status = 'active' 
WHERE status = 'error';

-- Usuń oferty REMOVED (soft delete przez user_offer)
-- (To się dzieje automatycznie przez UI)

-- Wyczyść stare logi (>90 dni)
DELETE FROM error_log 
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM system_logs 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Wyłącz scheduled job tymczasowo
SELECT cron.unschedule('check_prices_24h');

-- Włącz ponownie
SELECT cron.schedule(
  'check_prices_24h',
  '0 0 * * *',
  $$SELECT check_offer_prices()$$
);
```

---

## Monitorowanie w produkcji

### Dashboard metryki do śledzenia:

1. **Success Rate** (Target: ≥90%)
2. **Active Offers Count**
3. **Error Count (24h)**
4. **AI Fallback Rate** (Target: <20%)
5. **Average Response Time** (Target: <5s)

### Alerty do skonfigurowania:

- ⚠️ Success rate < 85%
- ⚠️ Brak checked offers w ciągu 25h
- ⚠️ >50% ofert w statusie ERROR
- 💰 OpenRouter costs > threshold

---

## Następne kroki (opcjonalne)

1. **Setup monitoring dashboard** - Grafana/Superset dla wizualizacji metryk
2. **Email notifications** - Dodaj email alerts obok webhook
3. **Per-offer frequency** - Różne częstotliwości dla różnych ofert (nie tylko globalna)
4. **Price predictions** - ML model dla predykcji cen
5. **Multi-site support** - Rozszerzenie o inne portale niż Otomoto

---

## Podsumowanie checklist

- [ ] `.env` skonfigurowany (CRON_SECRET, opcjonalnie ALERT_WEBHOOK_URL)
- [ ] Migracje uruchomione (`supabase migration up`)
- [ ] pg_cron i pg_net enabled w Supabase Extensions
- [ ] CRON_SECRET ustawiony w bazie (`ALTER DATABASE...`)
- [ ] API URL zaktualizowany dla produkcji
- [ ] Test manual CRON endpoint (curl)
- [ ] Test manual recheck w UI
- [ ] Zweryfikowano scheduled jobs (`SELECT * FROM cron.job`)
- [ ] Monitorowanie logów działa
- [ ] Success rate ≥90% po 24h

System jest gotowy! 🚀

