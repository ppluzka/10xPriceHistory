# DELETE /offers/{id} - Quick Reference

## Endpoint

```
DELETE /api/offers/{id}
```

## Purpose

Unsubscribe from an offer (soft-delete). Removes offer from user's tracking list but preserves data for potential reactivation.

## Authentication

- **Required**: Yes (JWT Bearer token in Authorization header)
- **User must be subscribed** to the offer to delete it

## Path Parameters

| Parameter | Type    | Required | Validation               | Description                         |
| --------- | ------- | -------- | ------------------------ | ----------------------------------- |
| id        | integer | Yes      | Must be positive integer | ID of the offer to unsubscribe from |

## Request Example

```bash
curl -X DELETE 'http://localhost:4321/api/offers/123' \
  -H 'Authorization: Bearer <token>'
```

## Response (204 No Content)

### Success - No Response Body

```bash
HTTP/1.1 204 No Content
# Empty response body
```

The 204 status code indicates successful deletion. According to REST conventions, there is no response body.

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

**Cause**: Offer doesn't exist OR user is not subscribed OR already unsubscribed

```json
{
  "error": "Not Found",
  "details": "Offer not found or already unsubscribed"
}
```

**Scenarios:**

- Offer ID doesn't exist in database
- User never subscribed to this offer
- User already unsubscribed (soft-deleted)
- Another user subscribed, but not current user

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

## Soft-Delete Pattern

### What is Soft-Delete?

Instead of permanently removing the subscription, we set a `deleted_at` timestamp:

```sql
-- Active subscription
user_id | offer_id | created_at | deleted_at
uuid    | 123      | 2025-10-01 | NULL

-- After DELETE (soft-deleted)
user_id | offer_id | created_at | deleted_at
uuid    | 123      | 2025-10-01 | 2025-10-31
```

### Benefits:

1. **Data Preservation**: Price history remains accessible
2. **Audit Trail**: Track when user unsubscribed
3. **Reactivation**: User can re-subscribe to same offer
4. **Analytics**: Analyze subscription patterns

### What Gets Hidden:

After soft-delete, the offer is hidden from:

- `GET /offers` - List endpoint
- `GET /offers/{id}` - Detail endpoint
- `GET /offers/{id}/history` - History endpoint

### What Remains:

- Offer data in `offers` table
- Price history in `price_history` table
- Subscription record in `user_offer` table (with `deleted_at` timestamp)

## Reactivation Flow

User can re-subscribe to a previously deleted offer:

```bash
# 1. User subscribes
POST /api/offers
{ "url": "https://otomoto.pl/..." }
→ 201 Created

# 2. User unsubscribes
DELETE /api/offers/123
→ 204 No Content

# 3. Verify it's gone
GET /api/offers/123
→ 404 Not Found

# 4. User re-subscribes (same URL)
POST /api/offers
{ "url": "https://otomoto.pl/..." }
→ 200 OK (reactivated, not 201)
```

When reactivating:

- Sets `deleted_at = NULL`
- Keeps original `created_at` timestamp
- Resumes price tracking from current time

## Idempotency

DELETE is **NOT strictly idempotent**:

- First call: `204 No Content` (success)
- Second call: `404 Not Found` (already deleted)

However, the **end result is idempotent**: after one or more DELETE calls, the subscription is removed.

## Use Cases

### 1. User Unsubscribes from Offer

Frontend "unfollow" or "remove" button:

```typescript
async function unsubscribe(offerId: number) {
  const response = await fetch(`/api/offers/${offerId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 204) {
    // Successfully unsubscribed, redirect to offers list
    router.push("/offers");
  } else if (response.status === 404) {
    // Already unsubscribed, show message
    alert("This offer is already removed");
  }
}
```

### 2. Cleanup Inactive Offers

Backend batch job removes stale offers:

```typescript
// Find offers with status 'removed' or 'error'
const staleOffers = await getStaleOffers();

for (const offer of staleOffers) {
  await fetch(`/api/offers/${offer.id}`, { method: "DELETE" });
}
```

### 3. Testing Subscription Lifecycle

E2E test verifies full flow:

```typescript
test("subscription lifecycle", async () => {
  // Add offer
  const { id } = await POST("/api/offers", { url });

  // Verify visible
  const list = await GET("/api/offers");
  expect(list.data.some((o) => o.id === id)).toBe(true);

  // Delete offer
  await DELETE(`/api/offers/${id}`);

  // Verify hidden
  const listAfter = await GET("/api/offers");
  expect(listAfter.data.some((o) => o.id === id)).toBe(false);

  // Verify 404 on detail
  const detail = await GET(`/api/offers/${id}`);
  expect(detail.status).toBe(404);
});
```

## Impact on Other Endpoints

### GET /offers (list)

Soft-deleted offers are excluded:

```typescript
// Before DELETE
GET /api/offers
{ data: [{ id: 123 }, { id: 456 }], total: 2 }

// After DELETE /api/offers/123
GET /api/offers
{ data: [{ id: 456 }], total: 1 }
```

### GET /offers/{id} (detail)

Returns 404 after deletion:

```typescript
GET /api/offers/123
→ 404 Not Found
```

### POST /offers (add)

Reactivates if same URL:

```typescript
// After DELETE /api/offers/123
POST /api/offers { "url": "https://otomoto.pl/..." }
→ 200 OK (reactivated)
{ id: 123, message: "Offer subscription reactivated" }
```

### GET /offers/{id}/history

Returns 404 after deletion:

```typescript
GET /api/offers/123/history
→ 404 Not Found (or Unauthorized)
```

## Performance Notes

- **Query Count**: 2 queries per request
  1. Check if active subscription exists (SELECT)
  2. Perform soft-delete (UPDATE)
- **Index Usage**: `idx_user_offer_user_deleted` and primary key
- **Response Time**: < 50ms typical
- **No Side Effects**: Other users' subscriptions unaffected

## Security

- ✅ Authorization: Only subscription owner can delete
- ✅ RLS policies provide defense-in-depth
- ✅ Input validation prevents injection
- ✅ Soft-delete preserves data integrity
- ✅ Idempotent (safe to retry)

## Related Endpoints

- `GET /offers` - List user's active offers
- `POST /offers` - Add/reactivate offer subscription
- `GET /offers/{id}` - Get offer details
- `GET /offers/{id}/history` - Get price history

## Implementation Files

- **Route Handler**: `/src/pages/api/offers/[id].ts` (DELETE export)
- **Service Layer**: `/src/lib/services/offer.service.ts` (`unsubscribe()` method)
- **Database**: `user_offer` table with `deleted_at` column

## Common Questions

### Q: Can user access deleted offer's price history?

**A**: No. After soft-delete, `GET /offers/{id}/history` returns 404.

### Q: Can user re-subscribe to deleted offer?

**A**: Yes. POST the same URL again to reactivate (sets `deleted_at = NULL`).

### Q: What if I call DELETE twice?

**A**: First call returns 204, second returns 404. Safe to retry.

### Q: Does DELETE affect other users?

**A**: No. Each user has their own subscription. Deleting yours doesn't affect others.

### Q: Is the offer data permanently deleted?

**A**: No. Only the subscription is soft-deleted. Offer and price history remain in database.

### Q: Can admin permanently delete (hard delete)?

**A**: Not implemented yet. Would require separate admin endpoint.

## Testing Checklist

- [x] Valid offer ID, active subscription → 204
- [x] Valid offer ID, no subscription → 404
- [x] Valid offer ID, already deleted → 404
- [x] Invalid offer ID (0, negative, string) → 400
- [x] Unauthorized request → 401
- [x] Database error → 500
- [x] DELETE then GET → 404
- [x] DELETE then POST same URL → reactivation
- [x] Concurrent DELETE requests → safe

## Error Handling Best Practices

```typescript
// Frontend example
async function deleteOffer(offerId: number) {
  try {
    const response = await fetch(`/api/offers/${offerId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 204) {
      // Success - offer deleted
      showNotification("Offer removed successfully");
      return true;
    }

    if (response.status === 404) {
      // Already deleted or not found
      showNotification("Offer not found");
      return false;
    }

    if (response.status === 400) {
      // Invalid ID
      const error = await response.json();
      showNotification(`Error: ${error.details}`);
      return false;
    }

    // Other errors
    throw new Error(`Unexpected status: ${response.status}`);
  } catch (error) {
    console.error("Failed to delete offer:", error);
    showNotification("Failed to delete offer. Please try again.");
    return false;
  }
}
```

## Summary

- ✅ **Method**: DELETE
- ✅ **Success**: 204 No Content (no body)
- ✅ **Pattern**: Soft-delete (sets `deleted_at`)
- ✅ **Idempotent**: Safe to retry
- ✅ **Reactivation**: POST same URL
- ✅ **Impact**: Hidden from all endpoints
- ✅ **Security**: User can only delete own subscriptions
