# GET /api/offers - Quick Reference

## 🚀 Endpoint Overview

Returns paginated list of user's active offer subscriptions with price analytics.

## 📍 URL

```
GET /api/offers
```

## 🔑 Query Parameters

| Param | Type   | Default    | Validation       | Description    |
| ----- | ------ | ---------- | ---------------- | -------------- |
| page  | number | 1          | ≥1               | Page number    |
| size  | number | 10         | ≥1, ≤100         | Items per page |
| sort  | string | created_at | enum (see below) | Sort column    |

**Valid sort values**: `created_at`, `last_checked`, `title`

## 📤 Response

### Success (200 OK)

```typescript
interface Response {
  data: OfferDto[];
  page: number;
  size: number;
  total: number;
}

interface OfferDto {
  id: number;
  title: string;
  url: string;
  imageUrl: string;
  city: string;
  status: string;
  lastChecked: string; // ISO 8601
  currentPrice: number;
  currency: "PLN" | "EUR" | "USD";
  percentChangeFromFirst: number; // % change from first price
  percentChangeFromPrevious: number; // % change from previous price
}
```

### Errors

| Code | Scenario              | Response                                   |
| ---- | --------------------- | ------------------------------------------ |
| 400  | Invalid query params  | `{ error: "Bad Request", details: {...} }` |
| 500  | Internal server error | `{ error: "Internal Server Error" }`       |

## 💻 Example Usage

### cURL

```bash
# Default
curl http://localhost:4321/api/offers

# With pagination
curl "http://localhost:4321/api/offers?page=2&size=20"

# With sorting
curl "http://localhost:4321/api/offers?sort=last_checked"

# Combined
curl "http://localhost:4321/api/offers?page=1&size=50&sort=title"
```

### JavaScript/TypeScript

```typescript
// Fetch with default params
const response = await fetch("/api/offers");
const data = await response.json();

// With query params
const params = new URLSearchParams({
  page: "1",
  size: "20",
  sort: "last_checked",
});
const response = await fetch(`/api/offers?${params}`);
const data = await response.json();

// Type-safe (with OfferDto type)
interface PaginatedResponse<T> {
  data: T[];
  page: number;
  size: number;
  total: number;
}

const response = await fetch("/api/offers");
const data: PaginatedResponse<OfferDto> = await response.json();
```

## 🏗️ Implementation Details

### Files

- **Endpoint**: `/src/pages/api/offers.ts`
- **Service**: `/src/lib/services/offer.service.ts`
- **Types**: `/src/types.ts` (OfferDto, PaginatedDto)

### Database Queries

1. **Offers Query**: Single query with `user_offer` join

   ```sql
   SELECT offers.*, user_offer.*
   FROM offers
   INNER JOIN user_offer ON ...
   WHERE user_offer.user_id = ? AND user_offer.deleted_at IS NULL
   ORDER BY ? DESC
   LIMIT ? OFFSET ?
   ```

2. **Price History Query**: Batch fetch for all offers
   ```sql
   SELECT offer_id, price, currency, checked_at
   FROM price_history
   WHERE offer_id IN (...)
   ORDER BY checked_at ASC
   ```

### Performance

- ✅ Batch price history fetching (2 queries total)
- ✅ Uses database indexes
- ✅ Efficient Map-based grouping
- 🔄 Consider cursor pagination for large datasets

## 🔒 Security

- ✅ Input validation with Zod
- ✅ RLS-ready (user_offer join)
- ⏳ Auth: Currently uses DEFAULT_USER_ID
- ✅ No SQL injection risk (parameterized queries)

## 🧪 Testing Checklist

- [ ] Default parameters work
- [ ] Custom page/size/sort work
- [ ] Invalid params return 400
- [ ] Empty results return empty array
- [ ] Pagination calculates correctly
- [ ] Sort by each column works
- [ ] Price calculations are accurate
- [ ] Handles offers with no price history
- [ ] Performance with 100+ offers

## 🐛 Common Issues

**Issue**: Getting empty data array

- Check if user has active offers in database
- Verify `DEFAULT_USER_ID` matches database records
- Check `user_offer.deleted_at IS NULL` condition

**Issue**: Wrong price calculations

- Verify price_history has entries
- Check for NULL or 0 prices
- Ensure sorted by `checked_at ASC`

**Issue**: 400 Bad Request

- Check query param types (should be numbers for page/size)
- Verify sort value is one of: created_at, last_checked, title
- Check page ≥1 and size ≥1, ≤100
