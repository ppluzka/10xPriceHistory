# Preferences API - Quick Reference

## Endpoints

### GET /api/preferences

Get user's default price check frequency

### PUT /api/preferences

Update user's default price check frequency

---

## GET /preferences

### Purpose

Retrieve user's default frequency preference for new offer subscriptions. Auto-creates default preferences if user has none.

### Authentication

- **Required**: Yes (JWT Bearer token)

### Request

```bash
curl -X GET 'http://localhost:4321/api/preferences' \
  -H 'Authorization: Bearer <token>'
```

### Response (200 OK)

**Structure:**

```typescript
{
  defaultFrequency: "6h" | "12h" | "24h" | "48h";
}
```

**Example:**

```json
{
  "defaultFrequency": "24h"
}
```

### Behavior

**First-Time User:**

- User has no preferences yet
- GET automatically creates default: `"24h"`
- Returns newly created default

**Existing User:**

- Returns current preference
- No modification

### Error Responses

**500 Internal Server Error:**

```json
{
  "error": "Internal Server Error"
}
```

---

## PUT /preferences

### Purpose

Update user's default frequency preference. Creates preferences if user has none (upsert behavior).

### Authentication

- **Required**: Yes (JWT Bearer token)

### Request

**Structure:**

```typescript
{
  defaultFrequency: "6h" | "12h" | "24h" | "48h";
}
```

**Example:**

```bash
curl -X PUT 'http://localhost:4321/api/preferences' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"defaultFrequency":"12h"}'
```

### Valid Frequency Values

| Value   | Description                    |
| ------- | ------------------------------ |
| `"6h"`  | Check every 6 hours            |
| `"12h"` | Check every 12 hours           |
| `"24h"` | Check every 24 hours (default) |
| `"48h"` | Check every 48 hours           |

### Response (200 OK)

**Structure:**

```typescript
{
  message: string;
}
```

**Example:**

```json
{
  "message": "Preferences updated"
}
```

### Error Responses

**400 Bad Request (Invalid JSON):**

```json
{
  "error": "Bad Request",
  "details": "Invalid JSON in request body"
}
```

**400 Bad Request (Invalid Frequency):**

```json
{
  "error": "Bad Request",
  "details": {
    "defaultFrequency": {
      "_errors": ["Invalid enum value. Expected '6h' | '12h' | '24h' | '48h', received '1h'"]
    }
  }
}
```

**Examples of invalid values:**

- `"1h"` → Invalid (not in enum)
- `"daily"` → Invalid (must use exact values)
- `24` → Invalid (must be string)
- `null` → Invalid (required field)
- Missing field → Invalid (required)

**500 Internal Server Error:**

```json
{
  "error": "Internal Server Error"
}
```

---

## Use Cases

### 1. Settings Page

```typescript
function UserSettings() {
  const [frequency, setFrequency] = useState('24h');

  // Load current preference
  useEffect(() => {
    fetch('/api/preferences')
      .then(r => r.json())
      .then(data => setFrequency(data.defaultFrequency));
  }, []);

  // Update preference
  async function handleSave(newFrequency: string) {
    const response = await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultFrequency: newFrequency })
    });

    if (response.ok) {
      setFrequency(newFrequency);
      showNotification('Preferences saved!');
    }
  }

  return (
    <div>
      <label>Default check frequency:</label>
      <select value={frequency} onChange={e => handleSave(e.target.value)}>
        <option value="6h">Every 6 hours</option>
        <option value="12h">Every 12 hours</option>
        <option value="24h">Every 24 hours</option>
        <option value="48h">Every 48 hours</option>
      </select>
    </div>
  );
}
```

### 2. Onboarding Flow

```typescript
async function setupUserPreferences(userId: string) {
  // Show preference selection during onboarding
  const selectedFrequency = await showOnboardingDialog();

  // Update preferences
  await fetch("/api/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ defaultFrequency: selectedFrequency }),
  });
}
```

### 3. Using Preference When Adding Offer

```typescript
async function addOffer(url: string) {
  // Get user's default frequency
  const { defaultFrequency } = await fetch("/api/preferences").then((r) => r.json());

  // Add offer with user's preferred frequency
  await fetch("/api/offers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      frequency: defaultFrequency, // Use user's preference
    }),
  });
}
```

### 4. Bulk Update Example

```typescript
// Allow user to change frequency for all future offers
async function updateDefaultFrequency(newFreq: string) {
  const response = await fetch("/api/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ defaultFrequency: newFreq }),
  });

  if (response.ok) {
    alert("All new offers will be checked " + newFreq);
  }
}
```

---

## Frequency Behavior

### What It Controls

The `defaultFrequency` preference controls:

- **New offers**: Frequency assigned when user subscribes
- **Future offers**: Only applies to offers added after preference is set

### What It Does NOT Control

- **Existing offers**: Already have their own frequency setting
- **Individual offers**: Can be overridden per offer (if feature implemented)

### Example Flow

```typescript
// User has defaultFrequency: "24h"
GET /api/preferences → { "defaultFrequency": "24h" }

// User adds offer → uses default (24h)
POST /api/offers { url: "..." }

// User changes preference
PUT /api/preferences { "defaultFrequency": "12h" }

// Next offer → uses new default (12h)
POST /api/offers { url: "..." }

// Previous offer → still uses 24h (unchanged)
```

---

## Auto-Creation Behavior

### First GET Request

```typescript
// User has never accessed preferences
GET /api/preferences
→ Database has no entry for user
→ Service creates default: { defaultFrequency: "24h" }
→ Returns: { "defaultFrequency": "24h" }

// Subsequent GET requests
GET /api/preferences
→ Returns existing: { "defaultFrequency": "24h" }
```

### First PUT Request

```typescript
// User has never accessed preferences
// Direct PUT without GET first
PUT /api/preferences { "defaultFrequency": "12h" }
→ Database has no entry
→ Service creates new entry with "12h"
→ Returns: { "message": "Preferences updated" }
```

**Benefit:** Client doesn't need to check if preferences exist before updating.

---

## Performance

- **GET**: 1-2 queries (SELECT, optional INSERT for first time)
- **PUT**: 2-3 queries (SELECT to check, UPDATE or INSERT)
- **Response time**: < 50ms typical
- **Caching**: Can cache on frontend for 5-10 minutes

---

## Security

- ✅ User can only access own preferences (RLS)
- ✅ Enum validation prevents invalid values
- ✅ JWT required for all operations
- ✅ No sensitive data exposure

---

## Common Questions

### Q: What's the default value?

**A**: `"24h"` (once every 24 hours)

### Q: Can I skip GET and just PUT?

**A**: Yes! PUT has upsert behavior and works even if preferences don't exist.

### Q: What if I never call GET or PUT?

**A**: No preferences are created. When adding offers, system will use database default (24h).

### Q: Does changing preference update existing offers?

**A**: No. Only affects new offers added after the change.

### Q: Can I have different frequencies per offer?

**A**: Not directly via this API. This sets the DEFAULT for new offers. Individual offer frequency is stored in the `offers` table.

### Q: What happens if two requests create preferences simultaneously?

**A**: Database primary key constraint prevents duplicates. One will succeed, one might fail (rare edge case).

---

## Related Database Schema

```sql
CREATE TYPE frequency AS ENUM ('6h', '12h', '24h', '48h');

CREATE TABLE user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  default_frequency frequency NOT NULL DEFAULT '24h',
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

---

## Testing Checklist

**GET /preferences:**

- [x] User has preferences → returns existing
- [x] User has no preferences → creates and returns default (24h)
- [x] Database error → 500

**PUT /preferences:**

- [x] Valid frequency (6h, 12h, 24h, 48h) → 200
- [x] Invalid frequency → 400 with validation error
- [x] Invalid JSON → 400
- [x] Missing field → 400
- [x] User has no preferences → creates new
- [x] User has preferences → updates existing
- [x] Database error → 500

---

## Implementation Files

- **Route Handler**: `/src/pages/api/preferences.ts`
- **Service Layer**: `/src/lib/services/preferences.service.ts`
- **Types**: `/src/types.ts` (`PreferencesDto`, `UpdatePreferencesCommand`)

---

## Summary

- ✅ **GET**: Retrieve preferences (auto-creates if missing)
- ✅ **PUT**: Update preferences (upsert behavior)
- ✅ **Validation**: Strict enum validation
- ✅ **Default**: "24h" for new users
- ✅ **Scope**: Affects only new offer subscriptions
- ✅ **Simple**: Single resource, two operations
