# GET /dashboard - Quick Reference

## Endpoint
```
GET /api/dashboard
```

## Purpose
Get comprehensive dashboard overview with summary statistics and list of active offers. Perfect for homepage/overview screen.

## Authentication
- **Required**: Yes (JWT Bearer token)

## Parameters
**None** - Simple GET request, no query parameters

## Request Example
```bash
curl -X GET 'http://localhost:4321/api/dashboard' \
  -H 'Authorization: Bearer <token>'
```

## Response (200 OK)

### Structure
```typescript
{
  summary: {
    activeCount: number;
    avgChange: number;
    largestDrop: number;
    largestRise: number;
  };
  offers: OfferDto[];  // Same format as GET /offers
}
```

### Full Example
```json
{
  "summary": {
    "activeCount": 3,
    "avgChange": -2.5,
    "largestDrop": -10.2,
    "largestRise": 5.6
  },
  "offers": [
    {
      "id": 123,
      "title": "Toyota Corolla 2020",
      "url": "https://otomoto.pl/...",
      "imageUrl": "https://...",
      "city": "Warszawa",
      "status": "active",
      "lastChecked": "2025-10-31T12:00:00Z",
      "currentPrice": 11500.00,
      "currency": "PLN",
      "percentChangeFromFirst": -4.17,
      "percentChangeFromPrevious": 2.5
    },
    {
      "id": 124,
      "title": "Honda Civic 2019",
      "url": "https://otomoto.pl/...",
      "imageUrl": "https://...",
      "city": "Kraków",
      "status": "active",
      "lastChecked": "2025-10-31T11:00:00Z",
      "currentPrice": 8500.00,
      "currency": "PLN",
      "percentChangeFromFirst": -10.2,
      "percentChangeFromPrevious": -1.5
    },
    {
      "id": 125,
      "title": "BMW X5 2021",
      "url": "https://otomoto.pl/...",
      "imageUrl": "https://...",
      "city": "Gdańsk",
      "status": "active",
      "lastChecked": "2025-10-31T10:00:00Z",
      "currentPrice": 15800.00,
      "currency": "PLN",
      "percentChangeFromFirst": 5.6,
      "percentChangeFromPrevious": 3.2
    }
  ]
}
```

### Empty State
```json
{
  "summary": {
    "activeCount": 0,
    "avgChange": 0,
    "largestDrop": 0,
    "largestRise": 0
  },
  "offers": []
}
```

## Summary Fields Explained

| Field | Description | Interpretation |
|-------|-------------|----------------|
| `activeCount` | Number of offers with `status: "active"` | How many offers are being monitored |
| `avgChange` | Average `percentChangeFromFirst` | Overall price trend (negative = prices falling) |
| `largestDrop` | Most negative `percentChangeFromFirst` | Best deal (biggest price decrease) |
| `largestRise` | Most positive `percentChangeFromFirst` | Worst deal (biggest price increase) |

### Understanding the Numbers

**activeCount: 3**
- User is tracking 3 active offers
- Excludes "removed" or "error" status offers

**avgChange: -2.5**
- On average, prices dropped 2.5%
- Negative is good for buyers (prices going down)
- Positive is bad for buyers (prices going up)

**largestDrop: -10.2**
- Best deal: one offer dropped 10.2%
- This is the offer with ID 124 (Honda Civic)
- Highlight this to user as best opportunity

**largestRise: 5.6**
- Worst deal: one offer increased 5.6%
- This is the offer with ID 125 (BMW X5)
- Maybe alert user about price increase

## Offers Array

**Format:** Same as `GET /offers` endpoint
**Limit:** Up to 100 offers
**Sorting:** By `created_at` (newest subscriptions first)

See [GET /offers quick reference](./GET-offers-quick-reference.md) for full field descriptions.

## Error Responses

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

## Use Cases

### 1. Dashboard Homepage

```typescript
function Dashboard() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(setData);
  }, []);
  
  if (!data) return <Spinner />;
  
  return (
    <div>
      <SummaryStats summary={data.summary} />
      <RecentOffers offers={data.offers} />
    </div>
  );
}
```

### 2. Summary Cards

```typescript
function SummaryStats({ summary }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        title="Active Offers"
        value={summary.activeCount}
        icon={<ChartIcon />}
      />
      
      <StatCard
        title="Avg Change"
        value={`${summary.avgChange}%`}
        color={summary.avgChange < 0 ? 'green' : 'red'}
        trend={summary.avgChange < 0 ? 'down' : 'up'}
      />
      
      <StatCard
        title="Best Deal"
        value={`${Math.abs(summary.largestDrop)}%`}
        subtitle={summary.largestDrop < 0 ? 'Price dropped' : 'Least increase'}
        highlight={summary.largestDrop < -5}
      />
      
      <StatCard
        title="Price Alert"
        value={`${summary.largestRise}%`}
        subtitle={summary.largestRise > 0 ? 'Price increased' : 'Least decrease'}
        alert={summary.largestRise > 5}
      />
    </div>
  );
}
```

### 3. Best Deal Highlight

```typescript
function BestDealBanner({ dashboard }) {
  const { offers, summary } = dashboard;
  
  // Find offer with largest drop
  const bestDeal = offers.find(
    o => o.percentChangeFromFirst === summary.largestDrop
  );
  
  if (!bestDeal || summary.largestDrop >= 0) {
    return null;  // No significant drops
  }
  
  return (
    <Alert variant="success">
      <Trophy />
      <div>
        <h3>Best Deal Alert!</h3>
        <p>
          {bestDeal.title} dropped {Math.abs(summary.largestDrop)}%
        </p>
        <Button onClick={() => navigate(`/offers/${bestDeal.id}`)}>
          View Details
        </Button>
      </div>
    </Alert>
  );
}
```

### 4. Price Trend Indicator

```typescript
function PriceTrendIndicator({ avgChange }) {
  if (avgChange < -5) {
    return (
      <Badge color="green" size="lg">
        📉 Great time to buy! Prices falling {Math.abs(avgChange)}%
      </Badge>
    );
  } else if (avgChange < 0) {
    return (
      <Badge color="green">
        ↓ Prices slightly down {Math.abs(avgChange)}%
      </Badge>
    );
  } else if (avgChange > 5) {
    return (
      <Badge color="red" size="lg">
        📈 Prices rising! Up {avgChange}%
      </Badge>
    );
  } else if (avgChange > 0) {
    return (
      <Badge color="yellow">
        ↑ Prices slightly up {avgChange}%
      </Badge>
    );
  } else {
    return (
      <Badge color="gray">
        → Prices stable
      </Badge>
    );
  }
}
```

### 5. Mobile Dashboard Widget

```typescript
function DashboardWidget() {
  const { data, isLoading } = useDashboard();
  
  if (isLoading) return <WidgetSkeleton />;
  
  return (
    <Widget>
      <WidgetHeader>Your Offers</WidgetHeader>
      <WidgetBody>
        <Stat 
          label="Tracking" 
          value={data.summary.activeCount}
          icon="📊"
        />
        <Stat 
          label="Avg Change" 
          value={`${data.summary.avgChange}%`}
          color={data.summary.avgChange < 0 ? 'green' : 'red'}
          icon={data.summary.avgChange < 0 ? '↓' : '↑'}
        />
        {data.summary.largestDrop < -5 && (
          <Banner>
            🎉 Best deal: {Math.abs(data.summary.largestDrop)}% off!
          </Banner>
        )}
      </WidgetBody>
      <WidgetFooter>
        <Link to="/offers">View all →</Link>
      </WidgetFooter>
    </Widget>
  );
}
```

### 6. Chart Data Preparation

```typescript
function PriceChangeChart({ offers }) {
  const chartData = offers.map(offer => ({
    name: offer.title.substring(0, 20) + '...',
    change: offer.percentChangeFromFirst,
    color: offer.percentChangeFromFirst < 0 ? 'green' : 'red'
  }));
  
  return (
    <BarChart data={chartData}>
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="change" fill="#8884d8" />
    </BarChart>
  );
}
```

## Comparison with GET /offers

| Feature | GET /dashboard | GET /offers |
|---------|----------------|-------------|
| **Summary stats** | ✅ Yes | ❌ No |
| **Pagination** | ❌ No (100 max) | ✅ Yes |
| **Sorting** | ❌ Fixed | ✅ Customizable |
| **Use case** | Homepage/overview | Browse all offers |
| **Query params** | None | page, size, sort |

**When to use GET /dashboard:**
- Homepage/dashboard screen
- Quick overview needed
- Summary statistics important
- Mobile app home
- Widget/quick view

**When to use GET /offers:**
- Full list view
- User wants to browse all offers
- Pagination needed (>100 offers)
- Custom sorting required
- Search/filter functionality

## Performance

- **Response time**: < 100ms typical
- **Queries**: 2 (same as GET /offers)
  1. Fetch offers with user_offer join
  2. Fetch price history for offers
- **Calculation**: Summary stats computed in-memory
- **Caching**: Can cache for 5-10 minutes on frontend

## Refresh Strategy

```typescript
function useDashboard() {
  const [data, setData] = useState(null);
  const [lastFetch, setLastFetch] = useState(Date.now());
  
  useEffect(() => {
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchDashboard();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  async function fetchDashboard() {
    const response = await fetch('/api/dashboard');
    const data = await response.json();
    setData(data);
    setLastFetch(Date.now());
  }
  
  return { data, refresh: fetchDashboard, lastFetch };
}
```

## Statistical Interpretations

### All Prices Falling (Good for Buyers)
```json
{
  "summary": {
    "avgChange": -5.2,
    "largestDrop": -15.0,
    "largestRise": -2.0
  }
}
```
- All offers decreased
- largestRise is still negative (least decrease)
- Great time to buy!

### All Prices Rising (Bad for Buyers)
```json
{
  "summary": {
    "avgChange": 3.8,
    "largestDrop": 1.5,
    "largestRise": 8.0
  }
}
```
- All offers increased
- largestDrop is still positive (least increase)
- Maybe wait or buy quickly before more increases

### Mixed (Normal Market)
```json
{
  "summary": {
    "avgChange": -1.2,
    "largestDrop": -10.0,
    "largestRise": 5.0
  }
}
```
- Some offers up, some down
- On average slightly down
- Normal market fluctuations

## Common Questions

### Q: How many offers are returned?
**A**: Up to 100 offers. If user has more, only first 100 are shown.

### Q: Can I paginate the dashboard?
**A**: No. Use `GET /offers` with pagination for full list.

### Q: What if I have no offers?
**A**: Returns zeros for all summary stats and empty offers array.

### Q: Do inactive offers affect summary?
**A**: 
- `activeCount`: No (only counts active)
- Other stats: Yes (includes all offers for price calculations)

### Q: What if an offer has no price history?
**A**: It's filtered out from avgChange, largestDrop, largestRise calculations.

### Q: How often should I refresh?
**A**: 5-10 minutes is reasonable. Price checks happen every 6-48 hours anyway.

### Q: Is this different from GET /offers?
**A**: Yes. Dashboard includes summary statistics and has fixed size (100).

## Related Endpoints

- `GET /offers` - Paginated list (more flexible)
- `GET /offers/{id}` - Individual offer details
- `GET /offers/{id}/history` - Price history chart data

## Implementation Files

- **Route Handler**: `/src/pages/api/dashboard.ts`
- **Service Layer**: `/src/lib/services/dashboard.service.ts`
- **Types**: `/src/types.ts` (`DashboardDto`, `DashboardSummaryDto`)

## Summary

- ✅ **Simple**: No query parameters needed
- ✅ **Complete**: Summary + offers in one response
- ✅ **Fast**: Reuses optimized queries
- ✅ **Informative**: 4 key statistics
- ✅ **Practical**: Perfect for homepage/overview
- ✅ **Consistent**: Same offer format as GET /offers

