# GET /offers/{id} - Quick Reference

## Endpoint

```
GET /api/offers/{id}
```

## Purpose

Retrieve detailed information about a specific offer subscription, including price statistics and historical data summary.

## Authentication

- **Required**: Yes (JWT Bearer token in Authorization header)
- **User must be subscribed** to the offer to access it

## Path Parameters

| Parameter | Type    | Required | Validation               | Description                 |
| --------- | ------- | -------- | ------------------------ | --------------------------- |
| id        | integer | Yes      | Must be positive integer | ID of the offer to retrieve |

## Request Example

```bash
curl -X GET 'http://localhost:4321/api/offers/123' \
  -H 'Authorization: Bearer <token>'
```

## Response (200 OK)

### Structure

```typescript
{
  id: number;
  title: string;
  url: string;
  imageUrl: string;
  city: string;
  status: "active" | "removed" | "error";
  frequency: "6h" | "12h" | "24h" | "48h";
  createdAt: string; // ISO 8601
  lastChecked: string; // ISO 8601
  firstPrice: number;
  lastPrice: number;
  percentChangeFromFirst: number;
  percentChangeFromPrevious: number;
  stats: {
    min: number;
    max: number;
    avg: number;
  }
}
```

### Example

```json
{
  "id": 123,
  "title": "Toyota Corolla 2020",
  "url": "https://otomoto.pl/osobowe/toyota/corolla/...",
  "imageUrl": "https://ireland.apollo.olxcdn.com/v1/files/...",
  "city": "Warszawa",
  "status": "active",
  "frequency": "24h",
  "createdAt": "2025-10-01T08:00:00Z",
  "lastChecked": "2025-10-31T12:00:00Z",
  "firstPrice": 12000.0,
  "lastPrice": 11500.0,
  "percentChangeFromFirst": -4.17,
  "percentChangeFromPrevious": 2.5,
  "stats": {
    "min": 11000.0,
    "max": 12500.0,
    "avg": 11875.0
  }
}
```

## Error Responses

### 400 Bad Request

**Cause**: Invalid offer ID parameter (not a positive integer)

```json
{
  "error": "Bad Request",
  "details": "Invalid offer ID: must be a positive integer"
}
```

**Examples of invalid IDs:**

- `/api/offers/0` → 400
- `/api/offers/-5` → 400
- `/api/offers/abc` → 400
- `/api/offers/1.5` → 400

### 404 Not Found

**Cause**: Offer doesn't exist OR user is not subscribed to the offer

```json
{
  "error": "Not Found",
  "details": "Offer not found or you are not subscribed to this offer"
}
```

**Scenarios:**

- Offer ID doesn't exist in database
- Offer exists but user never subscribed
- User unsubscribed (soft-deleted) from the offer

### 401 Unauthorized

**Cause**: Missing or invalid JWT token (handled by middleware)

```json
{
  "error": "Unauthorized"
}
```

### 500 Internal Server Error

**Cause**: Unexpected server error (database error, etc.)

```json
{
  "error": "Internal Server Error"
}
```

## Field Descriptions

| Field                       | Description                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| `id`                        | Unique identifier of the offer                                                                   |
| `title`                     | Title of the offer (extracted from Otomoto.pl)                                                   |
| `url`                       | Full URL to the offer on Otomoto.pl                                                              |
| `imageUrl`                  | URL to the main image of the offer                                                               |
| `city`                      | Location/city where the offer is listed                                                          |
| `status`                    | Current status: `active` (monitored), `removed` (no longer available), `error` (scraping failed) |
| `frequency`                 | How often the price is checked: `6h`, `12h`, `24h`, or `48h`                                     |
| `createdAt`                 | When the offer was first added to the system                                                     |
| `lastChecked`               | When the price was last successfully checked                                                     |
| `firstPrice`                | The first price recorded (at subscription time)                                                  |
| `lastPrice`                 | The most recent price recorded                                                                   |
| `percentChangeFromFirst`    | Percentage change from first to last price (negative = price drop)                               |
| `percentChangeFromPrevious` | Percentage change from second-to-last to last price                                              |
| `stats.min`                 | Lowest price ever recorded for this offer                                                        |
| `stats.max`                 | Highest price ever recorded for this offer                                                       |
| `stats.avg`                 | Average price across all recorded price points                                                   |

## Special Cases

### No Price History

If an offer has no price history entries (rare edge case):

```json
{
  "id": 123,
  "title": "...",
  // ... other fields ...
  "firstPrice": 0,
  "lastPrice": 0,
  "percentChangeFromFirst": 0,
  "percentChangeFromPrevious": 0,
  "stats": {
    "min": 0,
    "max": 0,
    "avg": 0
  }
}
```

### Single Price Entry

If an offer has only one price recorded:

```json
{
  // ...
  "firstPrice": 12000,
  "lastPrice": 12000,
  "percentChangeFromFirst": 0,
  "percentChangeFromPrevious": 0, // No previous price to compare
  "stats": {
    "min": 12000,
    "max": 12000,
    "avg": 12000
  }
}
```

## Use Cases

### 1. Display Offer Detail Page

Frontend displays comprehensive information about a single offer:

- Show title, image, location
- Display current price vs. initial price
- Show price trend (up/down) with percentage
- Display min/max/avg statistics
- Link to original Otomoto.pl listing

### 2. Price Alert Calculations

Backend uses statistics to determine if alert should be sent:

- Compare `lastPrice` to `firstPrice` for overall trend
- Compare `percentChangeFromFirst` to user's alert threshold
- Use `stats.min` to detect historic lows

### 3. Data Validation

Verify offer data integrity:

- Check if `lastChecked` is recent (within expected frequency)
- Verify `status` is `active` for ongoing monitoring
- Ensure price statistics are consistent

## Performance Notes

- **Query Count**: 2 queries per request
  1. Offer lookup with authorization check
  2. Price history fetch for statistics
- **No N+1**: All data fetched in batch
- **Caching**: Frontend can cache response for reasonable duration (e.g., 5-10 minutes)
- **Index Usage**: Optimized with `idx_user_offer_user_deleted` and `idx_price_history_offer_checked_desc`

## Related Endpoints

- `GET /offers` - List all user's offers
- `POST /offers` - Subscribe to a new offer
- `DELETE /offers/{id}` - Unsubscribe from an offer
- `GET /offers/{id}/history` - Get paginated price history for detailed chart

## Implementation Files

- **Route Handler**: `/src/pages/api/offers/[id].ts`
- **Service Layer**: `/src/lib/services/offer.service.ts` (`getById()` method)
- **Types**: `/src/types.ts` (`OfferDetailDto`)
- **Tests**: TBD

## Security

- ✅ Authorization enforced via `user_offer` join
- ✅ Only subscribed users can access offer details
- ✅ Row-Level Security (RLS) policies provide defense-in-depth
- ✅ Input validation prevents injection attacks
- ✅ Soft-deleted subscriptions return 404 (not accessible)
