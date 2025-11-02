# Database Schema Plan for PriceHistory

## Enumerated Types

```sql
-- Supported currencies for price entries
CREATE TYPE currency AS ENUM ('PLN', 'EUR', 'USD', 'GBP');

-- Status of an offer
CREATE TYPE offer_status AS ENUM ('active', 'removed', 'error');

-- Allowed checking frequencies
CREATE TYPE frequency AS ENUM ('6h', '12h', '24h', '48h');
```

## 1. Tables

### users
This table is managed by Supabase Auth.

| Column             | Type            | Constraints                                     |
|--------------------|-----------------|-------------------------------------------------|
| id                 | UUID            | PRIMARY KEY, DEFAULT gen_random_uuid()          |
| email              | TEXT            | NOT NULL, UNIQUE                                |                                       |
| created_at         | TIMESTAMPTZ     | NOT NULL, DEFAULT now()                         |
| deleted_at         | TIMESTAMPTZ     | NULLABLE                                        |

### offers
| Column           | Type           | Constraints                                              |
|------------------|----------------|----------------------------------------------------------|
| id               | SERIAL         | PRIMARY KEY                                              |
| url              | TEXT           | NOT NULL, UNIQUE                                         |
| title            | TEXT           | NOT NULL                                                 |
| image_url        | TEXT           | NULLABLE                                                 |
| selector         | TEXT           | NOT NULL                                                 |
| city             | TEXT           | NOT NULL                                                 |
| status           | offer_status   | NOT NULL, DEFAULT 'active'                               |
| frequency        | frequency      | NOT NULL, DEFAULT '24h'                                  |
| last_checked     | TIMESTAMPTZ    | NULLABLE                                                 |
| created_at       | TIMESTAMPTZ    | NOT NULL, DEFAULT now()                                  |
| updated_at       | TIMESTAMPTZ    | NOT NULL, DEFAULT now()                                  |

### user_offer (subscription, soft-delete)
| Column       | Type         | Constraints                                                              |
|--------------|--------------|--------------------------------------------------------------------------|
| user_id      | UUID         | NOT NULL, REFERENCES users(id) ON DELETE CASCADE                         |
| offer_id     | INT          | NOT NULL, REFERENCES offers(id) ON DELETE CASCADE                        |
| created_at   | TIMESTAMPTZ  | NOT NULL, DEFAULT now()                                                  |
| deleted_at   | TIMESTAMPTZ  | NULLABLE                                                                 |
| **PK**       | (user_id, offer_id) |                                                                    |
| **Unique**  | (user_id, offer_id)   | Prevent duplicate subscriptions                                  |

### price_history
| Column     | Type           | Constraints                                                            |
|------------|----------------|------------------------------------------------------------------------|
| id         | SERIAL         | PRIMARY KEY                                                            |
| offer_id   | INT            | NOT NULL, REFERENCES offers(id) ON DELETE CASCADE                      |
| price      | NUMERIC(12,2)  | NOT NULL                                                               |
| currency   | currency       | NOT NULL                                                               |
| checked_at | TIMESTAMPTZ    | NOT NULL, DEFAULT now()                                                |

### user_preferences
| Column            | Type         | Constraints                                               |
|-------------------|--------------|-----------------------------------------------------------|
| user_id           | UUID         | PRIMARY KEY, REFERENCES users(id) ON DELETE CASCADE       |
| default_frequency | frequency    | NOT NULL, DEFAULT '24h'                                   |
| updated_at        | TIMESTAMPTZ  | NOT NULL, DEFAULT now()                                   |

## 2. Relationships

- users ⇄ offers: Many-to-Many via `user_offer` (subscription table)
- offers → price_history: One-to-Many
- users → user_preferences: One-to-One

## 3. Indexes

```sql
-- Fast lookup of active subscriptions for a user
CREATE INDEX idx_user_offer_user_deleted ON user_offer(user_id, deleted_at);

-- Efficient retrieval of recent price history points per offer
CREATE INDEX idx_price_history_offer_checked_desc ON price_history(offer_id, checked_at DESC);

-- Query offers by status and last_checked time
CREATE INDEX idx_offers_status_checked ON offers(status, last_checked);

-- Additional index for retention/archival by date
CREATE INDEX idx_price_history_checked_at ON price_history(checked_at);
```

## 4. Row-Level Security (RLS) Policies

Enable RLS on `user_offer` to isolate users:

```sql
-- Enable RLS
ALTER TABLE user_offer ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- user_offer: users can only see and modify their own subscriptions
CREATE POLICY user_offer_access ON user_offer
  USING (user_id = current_setting('jwt.claims.user_id')::uuid AND deleted_at IS NULL)
  WITH CHECK (user_id = current_setting('jwt.claims.user_id')::uuid);

-- price_history: users can only view history for offers they subscribe to
CREATE POLICY price_history_access ON price_history
  USING (
    EXISTS (
      SELECT 1 FROM user_offer
      WHERE user_offer.offer_id = price_history.offer_id
        AND user_offer.user_id = current_setting('jwt.claims.user_id')::uuid
        AND user_offer.deleted_at IS NULL
    )
  );
```

## 5. Additional Notes

- **Offer Addition Limit**: Enforce maximum 10 additions per user per 24h via a `BEFORE INSERT` trigger on `user_offer` and a supporting view for counting.
- **Future Partitioning**: Partition `price_history` by RANGE on `checked_at` for scalability.
