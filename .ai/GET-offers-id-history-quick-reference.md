# GET /offers/{id}/history - Quick Reference

## Endpoint
```
GET /api/offers/{id}/history
```

## Purpose
Retrieve paginated price history for a specific offer. Shows chronological list of all price checks, newest first.

## Authentication
- **Required**: Yes (JWT Bearer token in Authorization header)
- **User must be subscribed** to the offer to access its history

## Path Parameters
| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| id | integer | Yes | Must be positive integer | ID of the offer |

## Query Parameters
| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|------------|-------------|
| page | integer | No | 1 | ≥ 1 | Page number (1-based) |
| size | integer | No | 10 | 1-100 | Items per page |

## Request Examples

### Basic Request
```bash
curl -X GET 'http://localhost:4321/api/offers/123/history' \
  -H 'Authorization: Bearer <token>'
```

### With Pagination
```bash
# Get first page (10 items)
curl 'http://localhost:4321/api/offers/123/history?page=1&size=10'

# Get second page
curl 'http://localhost:4321/api/offers/123/history?page=2&size=10'

# Get larger page (25 items)
curl 'http://localhost:4321/api/offers/123/history?page=1&size=25'

# Get maximum allowed (100 items)
curl 'http://localhost:4321/api/offers/123/history?page=1&size=100'
```

## Response (200 OK)

### Structure
```typescript
{
  data: Array<{
    price: number;
    currency: 'PLN' | 'EUR' | 'USD' | 'GBP';
    checkedAt: string; // ISO 8601 timestamp
  }>;
  page: number;
  size: number;
  total: number;
}
```

### Example with Data
```json
{
  "data": [
    {
      "price": 11500.00,
      "currency": "PLN",
      "checkedAt": "2025-10-31T12:00:00Z"
    },
    {
      "price": 11600.00,
      "currency": "PLN",
      "checkedAt": "2025-10-30T12:00:00Z"
    },
    {
      "price": 11800.00,
      "currency": "PLN",
      "checkedAt": "2025-10-29T12:00:00Z"
    }
  ],
  "page": 1,
  "size": 10,
  "total": 25
}
```

### Example with Empty History
```json
{
  "data": [],
  "page": 1,
  "size": 10,
  "total": 0
}
```

### Example - Last Page (Partial)
```json
{
  "data": [
    {
      "price": 12000.00,
      "currency": "PLN",
      "checkedAt": "2025-10-01T08:00:00Z"
    }
  ],
  "page": 3,
  "size": 10,
  "total": 21
}
```

## Error Responses

### 400 Bad Request (Invalid ID)
```json
{
  "error": "Bad Request",
  "details": "Invalid offer ID: must be a positive integer"
}
```

### 400 Bad Request (Invalid Query Parameters)
```json
{
  "error": "Bad Request",
  "details": {
    "page": {
      "_errors": ["Number must be greater than or equal to 1"]
    }
  }
}
```

**Invalid query examples:**
- `?page=0` → 400 (must be ≥ 1)
- `?page=-1` → 400 (must be positive)
- `?size=0` → 400 (must be ≥ 1)
- `?size=150` → 400 (max 100)
- `?size=abc` → 400 (must be number)

### 404 Not Found
```json
{
  "error": "Not Found",
  "details": "Offer not found or you are not subscribed to this offer"
}
```

**Scenarios:**
- Offer ID doesn't exist
- User never subscribed to this offer
- User unsubscribed (soft-deleted)

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error"
}
```

## Response Field Descriptions

| Field | Description |
|-------|-------------|
| `data` | Array of price history entries |
| `data[].price` | Price value at that point in time |
| `data[].currency` | Currency code (PLN, EUR, USD, GBP) |
| `data[].checkedAt` | ISO 8601 timestamp when price was scraped |
| `page` | Current page number (1-based) |
| `size` | Number of items per page (requested) |
| `total` | Total number of price history entries |

## Sorting

**Default Order:** Newest first (`checked_at DESC`)

```json
{
  "data": [
    { "checkedAt": "2025-10-31T12:00:00Z" },  // ← Most recent
    { "checkedAt": "2025-10-30T12:00:00Z" },
    { "checkedAt": "2025-10-29T12:00:00Z" }   // ← Older
  ]
}
```

## Pagination Logic

### Calculating Pages
```javascript
const totalPages = Math.ceil(total / size);
const hasNextPage = page < totalPages;
const hasPrevPage = page > 1;
```

### Examples
```
Total: 25 items, Size: 10 items/page

Page 1: items 1-10   (10 items)
Page 2: items 11-20  (10 items)
Page 3: items 21-25  (5 items)
Page 4: items 26+    (0 items - empty, but valid)
```

### Requesting Beyond Last Page
```bash
# Total = 25, requesting page 10
GET /api/offers/123/history?page=10&size=10

Response:
{
  "data": [],
  "page": 10,
  "size": 10,
  "total": 25
}
```

This is **NOT an error** - it returns an empty array. The client should check if `data.length === 0` to know they've reached the end.

## Use Cases

### 1. Display Price Chart
Load data for charting library:
```typescript
async function loadPriceChart(offerId: number) {
  const response = await fetch(
    `/api/offers/${offerId}/history?page=1&size=100`
  );
  const { data } = await response.json();
  
  // Convert to chart format
  const chartData = data.map(entry => ({
    x: new Date(entry.checkedAt),
    y: entry.price
  }));
  
  renderChart(chartData);
}
```

### 2. Paginated Table
```typescript
function PriceHistoryTable({ offerId }) {
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState(null);
  const pageSize = 20;
  
  useEffect(() => {
    fetch(`/api/offers/${offerId}/history?page=${page}&size=${pageSize}`)
      .then(r => r.json())
      .then(setHistory);
  }, [offerId, page]);
  
  if (!history) return <Spinner />;
  
  const totalPages = Math.ceil(history.total / history.size);
  
  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Price</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {history.data.map(entry => (
            <tr key={entry.checkedAt}>
              <td>{entry.price} {entry.currency}</td>
              <td>{new Date(entry.checkedAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="pagination">
        <button 
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button 
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### 3. Infinite Scroll
```typescript
function InfinitePriceHistory({ offerId }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;
  
  const loadMore = async () => {
    const response = await fetch(
      `/api/offers/${offerId}/history?page=${page}&size=${pageSize}`
    );
    const result = await response.json();
    
    setItems(prev => [...prev, ...result.data]);
    setPage(page + 1);
    
    // Check if we've loaded everything
    const totalLoaded = items.length + result.data.length;
    setHasMore(totalLoaded < result.total);
  };
  
  return (
    <div>
      {items.map(entry => (
        <PriceCard key={entry.checkedAt} {...entry} />
      ))}
      
      {hasMore && (
        <button onClick={loadMore}>Load More</button>
      )}
    </div>
  );
}
```

### 4. Export All Data
```typescript
async function exportAllHistory(offerId: number) {
  const allData = [];
  let page = 1;
  const size = 100;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(
      `/api/offers/${offerId}/history?page=${page}&size=${size}`
    );
    const result = await response.json();
    
    allData.push(...result.data);
    hasMore = page * size < result.total;
    page++;
  }
  
  // Convert to CSV
  const csv = [
    'Date,Price,Currency',
    ...allData.map(d => `${d.checkedAt},${d.price},${d.currency}`)
  ].join('\n');
  
  downloadCsv(csv, `offer-${offerId}-history.csv`);
}
```

### 5. Price Change Detection
```typescript
async function detectPriceChanges(offerId: number) {
  const response = await fetch(
    `/api/offers/${offerId}/history?page=1&size=2`
  );
  const { data } = await response.json();
  
  if (data.length >= 2) {
    const latest = data[0];
    const previous = data[1];
    
    if (latest.price < previous.price) {
      notify(`Price dropped to ${latest.price} ${latest.currency}!`);
    }
  }
}
```

## Performance Notes

- **Query Count**: 2 queries per request
  1. Authorization check (user_offer)
  2. Paginated price history (price_history)
- **Index Usage**: `idx_price_history_offer_checked_desc`
- **Response Time**: < 50ms typical
- **Max Items**: 100 per request (prevents excessive data)
- **Caching**: Consider caching first page for 5-10 minutes

## Integration with Other Endpoints

### GET /offers/{id} (detail)
Shows summary statistics:
```typescript
GET /api/offers/123
→ { firstPrice: 12000, lastPrice: 11500, ... }

GET /api/offers/123/history?page=1&size=100
→ { data: [all price points], total: 50 }
```

### POST /offers (add)
Initially might have just 1 entry:
```typescript
POST /api/offers { url: "..." }  → 201 Created

GET /api/offers/123/history
→ { data: [{ price: 12000, ... }], total: 1 }
```

### DELETE /offers/{id} (unsubscribe)
After deletion, returns 404:
```typescript
DELETE /api/offers/123  → 204 No Content

GET /api/offers/123/history  → 404 Not Found
```

## Security

- ✅ Authorization enforced (user must be subscribed)
- ✅ RLS policies provide defense-in-depth
- ✅ Input validation prevents injection
- ✅ Rate limiting via pagination (max 100 items)
- ✅ Read-only operation (safe)

## Common Questions

### Q: What if I request a page beyond the last page?
**A**: Returns empty array with 200 OK. Check `data.length === 0` to detect end.

### Q: Can I get all history in one request?
**A**: Max 100 items per request. For more, make multiple requests or implement server-side export.

### Q: What's the sort order?
**A**: Newest first (DESC by checked_at). Most recent price appears first.

### Q: Can I access history after unsubscribing?
**A**: No. After DELETE /offers/{id}, this endpoint returns 404.

### Q: What if offer has no price history yet?
**A**: Returns empty array: `{ data: [], page: 1, size: 10, total: 0 }`

### Q: Is the price data always in same currency?
**A**: Usually yes, but currency can change if offer seller updates it.

## Testing Checklist

- [x] Valid offer, page 1 → 200 with data
- [x] Valid offer, empty history → 200 with empty array
- [x] Page beyond total → 200 with empty array
- [x] Invalid offer ID → 400
- [x] Invalid page (0, negative) → 400
- [x] Invalid size (>100) → 400
- [x] Not subscribed → 404
- [x] Soft-deleted subscription → 404
- [x] Database error → 500
- [x] Pagination math correct
- [x] Total count accurate
- [x] Newest first ordering

## Related Endpoints

- `GET /offers` - List user's offers
- `GET /offers/{id}` - Get offer details (includes summary stats)
- `POST /offers` - Subscribe to offer
- `DELETE /offers/{id}` - Unsubscribe from offer

## Implementation Files

- **Route Handler**: `/src/pages/api/offers/[id]/history.ts`
- **Service Layer**: `/src/lib/services/offer.service.ts` (`getHistory()`)
- **Types**: `/src/types.ts` (`PriceHistoryDto`, `PaginatedDto`)

## Summary

- ✅ **Method**: GET
- ✅ **Pagination**: page (1-based), size (1-100)
- ✅ **Sorting**: Newest first (DESC)
- ✅ **Authorization**: User must be subscribed
- ✅ **Empty results**: Valid (200 with empty array)
- ✅ **Use cases**: Charts, tables, export, infinite scroll

