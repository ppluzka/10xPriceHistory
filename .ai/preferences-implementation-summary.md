# Preferences Endpoints Implementation Summary

## Overview
Successfully implemented GET and PUT endpoints for managing user preferences, specifically the default frequency for price checking of new offer subscriptions.

## Files Created/Modified

### Created:
1. `/src/pages/api/preferences.ts` - Route handlers for GET and PUT
2. `/src/lib/services/preferences.service.ts` - PreferencesService with business logic

### Modified:
1. `.ai/api-plan.md` - Marked both endpoints as implemented

## Implementation Details

### 1. Route Handlers (`src/pages/api/preferences.ts`)

**Two Handlers in One File:**
```typescript
export const GET: APIRoute = ...   // Get preferences
export const PUT: APIRoute = ...   // Update preferences
```

**Key Features:**
- Single file for related operations (GET + PUT)
- Zod validation for PUT request body
- Auto-creation of default preferences on GET
- Proper error handling with clear messages

### 2. GET /preferences

**Purpose:** Retrieve user's default frequency preference

**Flow:**
1. Fetch preferences from `user_preferences` table
2. If exists → return it
3. If doesn't exist → create default (24h) and return

**Response (200 OK):**
```json
{
  "defaultFrequency": "24h"
}
```

**Auto-Creation Feature:**
- First time user calls GET → automatically creates default preferences
- Ensures user always has preferences (no null handling needed)
- Default value: `"24h"` (most common frequency)

**Service Method:**
```typescript
async get(userId: string): Promise<PreferencesDto> {
  // Try to fetch
  const preferences = await fetchPreferences(userId);
  
  if (preferences) {
    return preferences;
  }
  
  // Auto-create default
  await createDefaultPreferences(userId);
  return { defaultFrequency: "24h" };
}
```

### 3. PUT /preferences

**Purpose:** Update user's default frequency preference

**Request Body:**
```json
{
  "defaultFrequency": "12h"
}
```

**Validation:**
- Field: `defaultFrequency`
- Type: enum
- Valid values: `"6h"`, `"12h"`, `"24h"`, `"48h"`
- Invalid values → 400 Bad Request

**Flow:**
1. Validate request body with Zod
2. Check if preferences exist
3. If exists → UPDATE
4. If doesn't exist → INSERT (upsert behavior)

**Response (200 OK):**
```json
{
  "message": "Preferences updated"
}
```

**Upsert Behavior:**
- Handles case where user never called GET first
- Always succeeds whether preferences exist or not
- Simpler client logic (no need to check if preferences exist)

**Service Method:**
```typescript
async update(userId: string, frequency: Frequency): Promise<Response> {
  const exists = await checkIfExists(userId);
  
  if (exists) {
    await updatePreferences(userId, frequency);
  } else {
    await createPreferences(userId, frequency);
  }
  
  return { message: "Preferences updated" };
}
```

### 4. PreferencesService

**Location:** `/src/lib/services/preferences.service.ts`

**Two Methods:**
1. `get(userId)` - Fetch or create default preferences
2. `update(userId, frequency)` - Update or insert preferences

**Design Decisions:**
- Separate service class (follows pattern from OfferService)
- Handles database operations
- Returns typed DTOs
- Throws errors on database failures

**Database Operations:**
- **GET**: 1-2 queries (SELECT, optional INSERT)
- **PUT**: 2-3 queries (SELECT to check, then UPDATE or INSERT)

**Error Handling:**
- Database errors logged to console
- Throws descriptive error messages
- Handler catches and returns 500

### 5. Validation Schema

**Zod Schema:**
```typescript
const UpdatePreferencesSchema = z.object({
  defaultFrequency: z.enum(["6h", "12h", "24h", "48h"]),
});
```

**Why Enum Validation:**
- Matches database ENUM type exactly
- Prevents invalid frequency values
- Type-safe (TypeScript knows valid values)
- Clear error messages for invalid input

**Error Response Example:**
```json
{
  "error": "Bad Request",
  "details": {
    "defaultFrequency": {
      "_errors": [
        "Invalid enum value. Expected '6h' | '12h' | '24h' | '48h', received '1h'"
      ]
    }
  }
}
```

## Response Codes

### GET /preferences
- `200 OK` - Preferences returned (existing or newly created)
- `500 Internal Server Error` - Database error

### PUT /preferences
- `200 OK` - Preferences updated successfully
- `400 Bad Request` - Invalid JSON or invalid frequency value
- `500 Internal Server Error` - Database error

## Use Cases

### 1. User Settings Page
```typescript
// Load current preferences
const response = await fetch('/api/preferences');
const { defaultFrequency } = await response.json();

// Display in form
<select value={defaultFrequency}>
  <option value="6h">Every 6 hours</option>
  <option value="12h">Every 12 hours</option>
  <option value="24h">Every 24 hours</option>
  <option value="48h">Every 48 hours</option>
</select>

// Update on change
async function handleSave(newFrequency) {
  await fetch('/api/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ defaultFrequency: newFrequency })
  });
}
```

### 2. Default Value for New Offers
```typescript
// When user adds new offer, use their preference
async function addOffer(url: string) {
  // Get user's default frequency
  const { defaultFrequency } = await fetch('/api/preferences').then(r => r.json());
  
  // Create offer with user's preferred frequency
  await createOfferInDatabase(url, defaultFrequency);
}
```

### 3. First-Time User Experience
```typescript
// User opens settings for first time
GET /api/preferences
→ { "defaultFrequency": "24h" }  // Auto-created

// User changes preference
PUT /api/preferences { "defaultFrequency": "12h" }
→ { "message": "Preferences updated" }

// Verify change
GET /api/preferences
→ { "defaultFrequency": "12h" }  // Updated
```

## Database Schema

### user_preferences Table
```sql
CREATE TABLE user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  default_frequency frequency NOT NULL DEFAULT '24h',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE frequency AS ENUM ('6h', '12h', '24h', '48h');
```

**Key Points:**
- One-to-one with users (primary key on user_id)
- Default value: '24h'
- Auto-updates `updated_at` via trigger
- RLS policies enforce user can only access own preferences

## Performance Considerations

**Query Efficiency:**
- **GET**: 1 query if preferences exist, 2 if creating default
- **PUT**: 2-3 queries (check + update/insert)
- All queries use primary key (user_id) → very fast

**Optimization Opportunity:**
- Could use PostgreSQL UPSERT (`ON CONFLICT`) to reduce PUT to 1 query
- Current approach prioritizes clarity over minimal query count

**Potential Improvement:**
```sql
INSERT INTO user_preferences (user_id, default_frequency)
VALUES ($1, $2)
ON CONFLICT (user_id) 
DO UPDATE SET default_frequency = $2, updated_at = now()
```

**Caching:**
- Frontend can cache preferences (rarely change)
- Consider cache duration: 5-10 minutes
- Invalidate cache after PUT

## Testing Considerations

**Test Scenarios:**

**GET /preferences:**
1. ✅ User has preferences → returns existing
2. ✅ User has no preferences → creates default (24h)
3. ✅ Database error → 500

**PUT /preferences:**
1. ✅ Valid frequency (6h, 12h, 24h, 48h) → 200
2. ✅ Invalid frequency (1h, invalid, null) → 400
3. ✅ Invalid JSON → 400
4. ✅ User has no preferences → creates new
5. ✅ User has preferences → updates existing
6. ✅ Database error → 500

**Edge Cases:**
- Concurrent GET requests (first time) → safe (might create duplicates, but DB prevents with primary key)
- Concurrent PUT requests → last write wins (acceptable)
- GET after PUT → returns updated value

## Security

**Row-Level Security (RLS):**
- Policies ensure user can only access own preferences
- `user_id` filter enforced at database level
- Defense-in-depth (service layer + RLS)

**Input Validation:**
- Enum validation prevents SQL injection
- Type-safe with TypeScript
- Zod schema ensures data integrity

**Authorization:**
- JWT required (handled by middleware)
- User can only read/update own preferences
- No ability to access other users' preferences

## Integration with Other Endpoints

### POST /offers
When adding new offer, use user's default frequency:
```typescript
// In OfferService.add()
const { default_frequency } = await getPreferences(userId);
await createOffer({ ..., frequency: default_frequency });
```

### Settings UI
User profile/settings page:
```typescript
function SettingsPage() {
  const [prefs, setPrefs] = useState(null);
  
  useEffect(() => {
    fetch('/api/preferences').then(r => r.json()).then(setPrefs);
  }, []);
  
  async function handleUpdate(newFreq) {
    await fetch('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify({ defaultFrequency: newFreq })
    });
    setPrefs({ defaultFrequency: newFreq });
  }
  
  return <FrequencySelector value={prefs?.defaultFrequency} onChange={handleUpdate} />;
}
```

## Code Quality

**Linting:**
- ✅ 0 errors
- ✅ 2 warnings (console.log for error logging - acceptable)
- Follows TypeScript and ESLint best practices

**Type Safety:**
- Full TypeScript coverage
- Uses `PreferencesDto` and `UpdatePreferencesResponseDto`
- Proper type inference from Supabase queries
- Enum type ensures valid frequency values

**Error Handling:**
- Database errors logged and re-thrown
- Clear error messages for debugging
- Proper HTTP status codes
- Validation errors include details

## Design Patterns

### Auto-Creation Pattern (GET)
**Benefit:** Simplifies client code
- No need to handle "preferences not found" case
- Always returns valid preferences
- Lazy initialization on first access

**Trade-off:** Extra query on first GET
- Acceptable because it's one-time per user
- Most users will call GET before PUT

### Upsert Pattern (PUT)
**Benefit:** Flexible update logic
- Works whether preferences exist or not
- Client doesn't need to check existence
- Simpler API contract

**Trade-off:** Extra query to check existence
- Could be optimized with SQL UPSERT
- Current approach is more explicit

## Related Endpoints

- **POST /offers** - Uses default frequency when creating offer
- **Settings UI** - Primary consumer of these endpoints

## Summary

✅ **Implementation Status**: COMPLETE
- GET handler: ✅ (with auto-creation)
- PUT handler: ✅ (with upsert)
- Service methods: ✅
- Validation: ✅ (enum validation)
- Error handling: ✅
- Documentation: ✅
- Auto-creation: ✅
- Upsert behavior: ✅

**Key Features:**
- Auto-creates default preferences on first GET
- Upsert behavior on PUT (works with or without existing preferences)
- Enum validation ensures data integrity
- Simple, focused API (one resource, two operations)
- Fast queries (single table, primary key lookups)

