# RLS Migration Quick Start

## Quick Commands

```bash
# 1. Backup database (IMPORTANT!)
supabase db dump -f backup_before_rls_$(date +%Y%m%d_%H%M%S).sql

# 2. Apply migration
supabase db push

# 3. Regenerate TypeScript types
supabase gen types typescript --local > src/db/database.types.ts

# 4. Verify types
npm run typecheck

# 5. Run tests
npm run test
```

## What This Migration Does

Enables Row Level Security (RLS) and creates comprehensive CRUD policies for:

| Table                | Anon Access | Auth Access     | Notes                                         |
| -------------------- | ----------- | --------------- | --------------------------------------------- |
| **offers**           | SELECT only | All CRUD        | UPDATE/DELETE restricted to subscribed offers |
| **user_offer**       | None        | All CRUD        | User can only access own subscriptions        |
| **price_history**    | SELECT only | SELECT only     | INSERT/UPDATE/DELETE via service_role         |
| **user_preferences** | None        | All CRUD        | User can only access own preferences          |
| **api_usage**        | INSERT only | SELECT + INSERT | SELECT restricted to own logs                 |

## Quick Verification

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('offers', 'user_offer', 'price_history', 'user_preferences', 'api_usage');

-- Count policies (should be: offers=5, user_offer=4, price_history=2, user_preferences=4, api_usage=2)
SELECT tablename, COUNT(*)
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

## Rollback

If needed, disable RLS:

```bash
# Create rollback migration or run directly:
psql $DATABASE_URL -c "
ALTER TABLE offers DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_offer DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage DISABLE ROW LEVEL SECURITY;
"
```

## File Location

Migration: `supabase/migrations/20251103120000_enable_comprehensive_rls_policies.sql`

Full instructions (Polish): `.ai/rls-migration-instructions.md`
