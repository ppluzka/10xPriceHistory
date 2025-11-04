# API Endpoints - Price Monitoring

Dokumentacja endpointów API związanych z systemem automatycznego monitorowania cen.

---

## POST `/api/cron/check-prices`

**Przeznaczenie**: Scheduled endpoint wywoływany przez pg_cron do sprawdzania cen wszystkich aktywnych ofert.

**Autoryzacja**: Bearer token (`CRON_SECRET`)

**Request:**

```bash
POST /api/cron/check-prices
Content-Type: application/json
Authorization: Bearer your-cron-secret

{
  "triggered_by": "pg_cron"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "processed": 42,
  "message": "Price check completed successfully"
}
```

**Error Responses:**

```json
// 401 Unauthorized
{
  "error": "Unauthorized"
}

// 500 Internal Server Error
{
  "error": "Failed to fetch offers",
  "details": "error message"
}
```

**Proces:**

1. Weryfikuje CRON_SECRET
2. Pobiera wszystkie aktywne oferty (`status = 'active'`)
3. Przetwarza oferty w batchach po 10
4. Dla każdej oferty:
   - Pobiera HTML
   - Ekstrahuje cenę (selector → AI fallback)
   - Waliduje dane
   - Zapisuje do `price_history`
   - Aktualizuje `last_checked`
   - Loguje do `system_logs`
5. Sprawdza system health i wysyła alert jeśli error rate >15%

**Rate Limiting:**

- Batch processing: 10 ofert na raz
- Delay między batchami: 5s
- Delay między requestami: 2-5s (random)

**Retry Logic:**

- Max 3 próby na ofertę
- Delays: 1min, 5min, 15min
- Po 3 failures: status → `error`

---

## POST `/api/offers/:id/recheck`

**Przeznaczenie**: Ręczne sprawdzenie ceny dla pojedynczej oferty (UI "Sprawdź ponownie").

**Autoryzacja**: Session-based (authenticated user)

**Request:**

```bash
POST /api/offers/123/recheck
Cookie: sb-access-token=...
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Cena zaktualizowana pomyślnie",
  "offer": {
    "id": "123",
    "status": "active",
    "lastChecked": "2025-11-04T10:30:00Z",
    "currentPrice": 45000,
    "currency": "PLN"
  }
}
```

**Error Responses:**

```json
// 400 Bad Request
{
  "error": "Offer ID is required"
}

// 401 Unauthorized
{
  "error": "Unauthorized"
}

// 404 Not Found
{
  "error": "Offer not found or unauthorized"
}

// 500 Internal Server Error
{
  "error": "Failed to recheck offer",
  "details": "error message"
}
```

**Status Messages:**

```json
// Status: active
{
  "message": "Cena zaktualizowana pomyślnie"
}

// Status: error
{
  "message": "Nie udało się pobrać ceny. Spróbuj ponownie później."
}

// Status: removed
{
  "message": "Oferta została usunięta z Otomoto"
}
```

**Proces:**

1. Weryfikuje ownership oferty (user_offer)
2. Pobiera dane oferty z bazy
3. Wywołuje `OfferProcessorService.processOffer()`
4. Zwraca zaktualizowane dane
5. UI automatycznie aktualizuje status i cenę

**Use Case:**

- Użytkownik widzi ofertę ze statusem `error`
- Klika "Sprawdź ponownie"
- Endpoint próbuje ponownie pobrać cenę
- Status zmienia się:
  - `active` jeśli sukces
  - `error` jeśli nadal błąd
  - `removed` jeśli 404/410

---

## Status Codes

| Kod | Znaczenie | Kiedy występuje |
|-----|-----------|-----------------|
| 200 | Success | Operacja wykonana pomyślnie |
| 400 | Bad Request | Brak wymaganych parametrów |
| 401 | Unauthorized | Nieprawidłowa autoryzacja |
| 404 | Not Found | Oferta nie istnieje lub brak dostępu |
| 500 | Internal Server Error | Błąd serwera/bazy danych |

---

## Offer Status Flow

```
┌─────────┐
│ ACTIVE  │ ◄───────────┐
└────┬────┘             │
     │                  │
     │ 3x failure       │ Manual recheck
     │                  │ (sukces)
     ▼                  │
┌─────────┐             │
│  ERROR  │ ────────────┘
└─────────┘
     │
     │ HTTP 404/410
     ▼
┌─────────┐
│ REMOVED │ (terminal)
└─────────┘
```

**Status transitions:**

- `active` → `error`: 3 nieudane próby automatyczne
- `error` → `active`: Manual recheck sukces
- `active` → `removed`: HTTP 404/410 detected
- `removed`: Stan terminalny (nie można reaktywować)

---

## System Logs

### Event Types

System loguje następujące typy zdarzeń do `system_logs`:

| Event Type | Opis | Kiedy występuje |
|------------|------|-----------------|
| `price_check_success` | Pomyślne sprawdzenie ceny | Po udanej ekstrakcji i zapisie |
| `price_check_failed` | Nieudane sprawdzenie | Po wyczerpaniu retry |
| `price_anomaly_detected` | Anomalia cenowa >50% | Gdy zmiana ceny >50% |
| `alert_sent` | Wysłany alert | Gdy error rate >15% |

### Przykładowe zapytania

```sql
-- Success rate z ostatnich 24h
SELECT 
  ROUND(
    COUNT(CASE WHEN event_type = 'price_check_success' THEN 1 END)::NUMERIC / 
    COUNT(*)::NUMERIC * 100, 
    2
  ) as success_rate_percent
FROM system_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND event_type IN ('price_check_success', 'price_check_failed');

-- Ostatnie sprawdzenia
SELECT 
  o.id,
  o.title,
  sl.event_type,
  sl.message,
  sl.created_at
FROM system_logs sl
JOIN offers o ON o.id = sl.offer_id
WHERE sl.created_at > NOW() - INTERVAL '1 hour'
ORDER BY sl.created_at DESC
LIMIT 20;

-- Najczęstsze błędy
SELECT 
  error_message,
  COUNT(*) as occurrences
FROM error_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_message
ORDER BY occurrences DESC;
```

---

## Monitoring & Alerts

### Success Rate Target

**Target**: ≥90% w okresie 24h

**Alert threshold**: <85% (15% error rate)

**Calculation:**

```typescript
successRate = (successful_checks / total_checks) * 100
errorRate = 100 - successRate

if (errorRate > 15%) {
  sendAlert();
}
```

### Alert Cooldown

**Cooldown period**: 6 godzin

Zapobiega spamowaniu alertów gdy system ma dłuższy problem.

### Alert Payload (Webhook)

```json
{
  "title": "🚨 High Error Rate Alert",
  "timestamp": "2025-11-04T10:30:00Z",
  "successRate": "82.45%",
  "errorRate": "17.55%",
  "totalChecks": 152,
  "errorCount": 27,
  "activeOffers": 42
}
```

---

## Performance Metrics

### Target Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Success Rate | ≥90% | <85% |
| Avg Response Time | <5s/offer | >10s/offer |
| AI Fallback Rate | <20% | >30% |
| Batch Processing | 10 offers/batch | N/A |
| Delay between batches | 5s | N/A |

### Monitoring Dashboard Queries

```sql
-- Average processing time (if tracked)
SELECT AVG(EXTRACT(EPOCH FROM (created_at - lag(created_at) OVER (ORDER BY created_at)))) as avg_seconds
FROM system_logs
WHERE event_type = 'price_check_success'
  AND created_at > NOW() - INTERVAL '24 hours';

-- AI fallback rate
WITH total_checks AS (
  SELECT COUNT(*) as total
  FROM system_logs
  WHERE created_at > NOW() - INTERVAL '24 hours'
    AND event_type IN ('price_check_success', 'price_check_failed')
),
ai_usage AS (
  SELECT COUNT(*) as ai_count
  FROM system_logs
  WHERE created_at > NOW() - INTERVAL '24 hours'
    AND metadata->>'used_ai' = 'true'
)
SELECT 
  ROUND((ai_count::NUMERIC / total::NUMERIC) * 100, 2) as ai_fallback_rate_percent
FROM total_checks, ai_usage;
```

---

## Security Considerations

### CRON_SECRET

- **Storage**: Environment variable + database setting
- **Length**: 64 hex characters (256 bits)
- **Rotation**: Recommended every 90 days
- **Validation**: Checked on every CRON request

### Rate Limiting

- **Per domain**: Max 10 req/min, 200 req/hour
- **User-Agent rotation**: 5 different UAs
- **Random delays**: 2-5s between requests
- **Batch delays**: 5s between batches

### Error Handling

- **Graceful degradation**: AI fallback when selectors fail
- **Retry mechanism**: 3 attempts with exponential backoff
- **Status management**: Clear state transitions
- **Logging**: All errors logged to `error_log`

---

## Future Enhancements

Potencjalne rozszerzenia (nie w MVP):

1. **Per-offer frequency**: Różne częstotliwości dla każdej oferty
2. **User notifications**: Email/push gdy cena spadnie
3. **Price predictions**: ML model dla predykcji cen
4. **Multi-site support**: Inne portale niż Otomoto
5. **API rate limiting**: Limit requestów per user
6. **Webhooks for users**: Custom webhooks dla zdarzeń
7. **Export data**: CSV/JSON export historii cen

---

## Support & Debugging

### Common Issues

1. **CRON not running**: Check pg_cron extension, verify schedule
2. **401 Unauthorized**: Verify CRON_SECRET matches in .env and DB
3. **High error rate**: Check selector validity, OpenRouter API status
4. **Slow processing**: Increase batch delays, check network
5. **No alerts**: Verify ALERT_WEBHOOK_URL is set and working

### Debug Commands

```bash
# Test CRON endpoint
curl -X POST http://localhost:4321/api/cron/check-prices \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"

# Test recheck endpoint
curl -X POST http://localhost:4321/api/offers/123/recheck \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json"
```

### Logs Location

- **System logs**: `system_logs` table in Supabase
- **Error logs**: `error_log` table in Supabase
- **pg_cron logs**: `cron.job_run_details` table
- **HTTP logs**: `net._http_response` table (pg_net)

---

**Dokumentacja aktualna na**: 2025-11-04

