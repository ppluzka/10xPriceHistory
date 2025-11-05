# 🚀 Quick Start: Price Monitoring System

Szybki przewodnik uruchomienia systemu automatycznego monitorowania cen w 5 krokach.

---

## ✅ Krok 1: Environment Variables (2 min)

### Dodaj do `.env`:

```bash
# Wygeneruj secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Dodaj do .env:
CRON_SECRET=<wygenerowany-secret>
ALERT_WEBHOOK_URL=https://hooks.slack.com/... # opcjonalne
```

---

## ✅ Krok 2: Database Setup (2 min)

```bash
# Uruchom migracje
supabase migration up
```

Lub w Supabase SQL Editor:

```sql
-- Run migrations manually if needed
-- Check: .ai/price-monitoring-setup.md for SQL
```

---

## ✅ Krok 3: Enable Extensions (1 min)

W **Supabase Dashboard** → **Database** → **Extensions**:

- ✅ Enable `pg_cron`
- ✅ Enable `pg_net`

---

## ✅ Krok 4: Configure Database (2 min)

W **Supabase SQL Editor**:

```sql
-- 1. Set CRON_SECRET (same as .env)
ALTER DATABASE postgres SET app.cron_secret = 'your-secret-here';

-- 2. Set API URL (production)
ALTER DATABASE postgres SET app.api_url = 'https://your-domain.com/api/cron/check-prices';

-- 3. Verify
SELECT current_setting('app.cron_secret', true);
SELECT current_setting('app.api_url', true);
```

---

## ✅ Krok 5: Test (3 min)

### Test 1: Manual CRON trigger

```bash
curl -X POST http://localhost:4321/api/cron/check-prices \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"

# Expected: {"success":true,"processed":X}
```

### Test 2: Check scheduled jobs

```sql
SELECT * FROM cron.job;
-- Should show 4 jobs: check_prices_6h, 12h, 24h, 48h
```

### Test 3: Monitor logs

```sql
SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 10;
```

---

## 🎯 System Ready!

System będzie teraz automatycznie sprawdzać ceny:

- **Co 6h**: check_prices_6h
- **Co 12h**: check_prices_12h
- **Co 24h**: check_prices_24h (główny)
- **Co 48h**: check_prices_48h

---

## 📊 Monitorowanie

### Sprawdź success rate:

```sql
SELECT
  ROUND(
    COUNT(CASE WHEN event_type = 'price_check_success' THEN 1 END)::NUMERIC /
    COUNT(*)::NUMERIC * 100,
    2
  ) as success_rate_percent
FROM system_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND event_type IN ('price_check_success', 'price_check_failed');
```

**Target**: ≥90%

---

## 🎨 UI Features

Dashboard automatycznie pokaże:

- ✅ **Status badges** na ofertach (Aktywna, Błąd sprawdzania, Oferta usunięta)
- ✅ **"Sprawdź ponownie"** button dla ofert ERROR
- ✅ **Warning message** dla ofert REMOVED
- ✅ **Last checked** timestamp

---

## 🆘 Troubleshooting

### Problem: Jobs nie uruchamiają się

```sql
-- Check execution history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

**Fix**: Sprawdź czy extensions są enabled

### Problem: 401 Unauthorized

**Fix**: Zweryfikuj czy `CRON_SECRET` jest taki sam w `.env` i bazie

### Problem: Timeout/Connection refused

**Fix**: Zmień `api_url` na publiczny domain (nie localhost!)

---

## 📚 Pełna dokumentacja

- **Setup Guide**: `.ai/price-monitoring-setup.md`
- **API Docs**: `.ai/api-monitoring-endpoints.md`
- **Implementation Plan**: `.ai/price-monitoring-implementation-plan.md`
- **Env Config**: `.ai/env-monitoring-config.txt`

---

## 🎉 That's it!

System automatycznego monitorowania cen jest gotowy do użycia! 🚀

Pytania? Sprawdź `.ai/price-monitoring-setup.md` → sekcja Troubleshooting
