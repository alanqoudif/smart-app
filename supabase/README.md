# 📦 Supabase Database Setup Guide

Complete database schema, migrations, and seed data for the **Smart Restaurant Management SaaS** platform.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [File Structure](#file-structure)
- [Installation Options](#installation-options)
- [Seed Data](#seed-data)
- [Testing & Validation](#testing--validation)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites
- PostgreSQL 15+ or Supabase account
- Supabase CLI (optional): `npm install -g supabase`
- Database with extensions: `uuid-ossp`, `pgcrypto`

### Option 1: Fresh Install (Recommended for New Projects)

```bash
# Execute the complete schema
psql -U postgres -d your_database -f schema-v2-complete.sql

# Load sample data
psql -U postgres -d your_database -f seed-complete.sql
```

### Option 2: Incremental Migrations (Existing Projects)

```bash
# Run migrations in order
for file in migrations/*.sql; do
  echo "Applying $file..."
  psql -U postgres -d your_database -f "$file"
done

# Then seed data
psql -U postgres -d your_database -f seed-complete.sql
```

### Option 3: Supabase CLI

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Apply complete schema
supabase db push --file schema-v2-complete.sql

# Or apply migrations incrementally
supabase db push

# Load seed data
supabase db execute --file seed-complete.sql

# Or load legacy seed (menu only)
supabase db execute --file seed-menu.sql
```

---

## 📁 File Structure

```
supabase/
├── README.md                    # This file
├── DATABASE_DESIGN.md           # Comprehensive design documentation
│
├── schema.sql                   # Original/legacy schema (v1)
├── schema-v2-complete.sql       # Complete production-ready schema (v2)
│
├── migrations/                  # Incremental migration files
│   ├── 001_add_restaurants_and_staff.sql
│   ├── 002_add_restaurant_id_to_existing_tables.sql
│   ├── 003_enhance_orders_and_items.sql
│   ├── 004_add_audit_and_settings.sql
│   ├── 005_add_enhanced_features.sql
│   └── 006_add_views_and_functions.sql
│
├── seed-menu.sql                # Legacy menu seed (original)
├── seed-complete.sql            # Complete demo data with 2 restaurants
│
└── validation-tests.sql         # Test queries to verify integrity
```

---

## 🗂️ Installation Options

### A. Fresh Database (Greenfield Project)

**Best for:** New projects starting from scratch

```bash
# 1. Create database
createdb smart_restaurant

# 2. Apply complete schema
psql -d smart_restaurant -f schema-v2-complete.sql

# 3. Load demo data
psql -d smart_restaurant -f seed-complete.sql

# 4. Validate
psql -d smart_restaurant -f validation-tests.sql
```

**Result:** Full production-ready database with sample data

---

### B. Existing Database (Migration)

**Best for:** Upgrading from schema v1 to v2

**Step 1:** Backup existing data
```bash
pg_dump -d your_database -f backup_$(date +%Y%m%d).sql
```

**Step 2:** Apply migrations in order
```bash
cd migrations
psql -d your_database -f 001_add_restaurants_and_staff.sql
psql -d your_database -f 002_add_restaurant_id_to_existing_tables.sql
# ... continue with remaining migrations
```

**Step 3:** Backfill restaurant_id for existing data
```sql
-- Create a default restaurant for existing data
INSERT INTO restaurants (code, name, owner_name, owner_email, owner_password_hash, experience_type)
VALUES ('LEGACY', 'Legacy Restaurant', 'Admin', 'admin@example.com', '$2a$10$Dummy', 'restaurant')
RETURNING id;

-- Update existing records (replace <restaurant_id> with the ID from above)
UPDATE customers SET restaurant_id = '<restaurant_id>' WHERE restaurant_id IS NULL;
UPDATE menu_items SET restaurant_id = '<restaurant_id>' WHERE restaurant_id IS NULL;
UPDATE orders SET restaurant_id = '<restaurant_id>' WHERE restaurant_id IS NULL;
```

**Step 4:** Validate integrity
```bash
psql -d your_database -f validation-tests.sql
```

---

### C. Supabase Dashboard (Web UI)

1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Click **+ New query**
3. Paste contents of `schema-v2-complete.sql`
4. Click **Run**
5. Repeat with `seed-complete.sql` for demo data

---

## 🌱 Seed Data

### Complete Seed Data (`seed-complete.sql`)

**Includes:**
- ✅ 2 demo restaurants (restaurant + café)
- ✅ 8 staff accounts (various roles)
- ✅ 8 customers with purchase history
- ✅ 35+ menu items across categories
- ✅ 12 tables for dine-in management
- ✅ 5 sample orders in different states
- ✅ Restaurant settings and configurations

**Demo Credentials:**
| Restaurant | Code | Staff | Role | Passcode |
|-----------|------|-------|------|----------|
| البيك الذهبي | DEMO-REST-001 | أحمد السعيد | manager | 1234 |
| البيك الذهبي | DEMO-REST-001 | محمد العمري | waiter | 1234 |
| البيك الذهبي | DEMO-REST-001 | خالد الشمري | chef | 1234 |
| مقهى الأصالة | DEMO-CAFE-001 | فاطمة العلي | manager | 1234 |

**Note:** All passwords/passcodes are hashed. The seed file contains placeholder hashes for demo purposes.

### Legacy Seed (`seed-menu.sql`)

**Includes:**
- ✅ 6 menu items only
- ✅ Idempotent upserts (safe to run multiple times)

**Use when:** You want minimal seed data or are upgrading existing database

---

## 🧪 Testing & Validation

### Run Validation Tests

```bash
psql -d your_database -f validation-tests.sql
```

### Test Categories

1. **Schema Validation** - Verify all tables, indexes, views exist
2. **Data Integrity** - Check foreign key relationships
3. **Constraints** - Validate enum values, non-null fields
4. **Business Logic** - Ensure triggers work correctly
5. **Performance** - Check for missing indexes
6. **Security** - Verify RLS is enabled
7. **Data Quality** - Detect duplicates, NULLs in critical fields

### Expected Output

```
 test_category      | test_name                          | result
--------------------+------------------------------------+---------
 Schema Validation  | All tables exist                   | PASS ✓
 Schema Validation  | Critical indexes exist             | PASS ✓
 Data Integrity     | Orders have valid customers        | PASS ✓
 Constraints        | Order status values are valid      | PASS ✓
 Business Logic     | Order totals are correct           | PASS ✓
 Security           | RLS enabled on all tables          | PASS ✓
```

### Manual Verification Queries

```sql
-- Check data was loaded
SELECT 
  'Restaurants' as entity, count(*) from restaurants
UNION ALL
  SELECT 'Staff', count(*) from staff_accounts
UNION ALL
  SELECT 'Customers', count(*) from customers
UNION ALL
  SELECT 'Menu Items', count(*) from menu_items
UNION ALL
  SELECT 'Orders', count(*) from orders;

-- Test a view
SELECT * FROM customer_analytics LIMIT 5;

-- Test a function
SELECT get_dashboard_metrics(
  (SELECT id FROM restaurants LIMIT 1),
  current_date
);
```

---

## 🛠️ Troubleshooting

### Issue: "extension does not exist"

**Error:** `ERROR: extension "uuid-ossp" does not exist`

**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

Or enable in Supabase Dashboard → Database → Extensions

---

### Issue: "relation already exists"

**Error:** `ERROR: relation "restaurants" already exists`

**Solution:** You're running the schema twice. Either:
1. Drop existing tables: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
2. Or skip to seed data only

---

### Issue: "permission denied"

**Error:** `ERROR: permission denied for schema public`

**Solution:**
```sql
GRANT ALL ON SCHEMA public TO your_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
```

---

### Issue: "invalid input syntax for type uuid"

**Error:** When inserting seed data

**Solution:** Check that extensions are enabled and UUIDs are properly formatted

---

### Issue: RLS blocking queries

**Error:** Queries return 0 rows even though data exists

**Solution:** Set session variables or disable RLS for testing:
```sql
-- Option 1: Set session variable
SET app.current_restaurant_id = '<restaurant_uuid>';

-- Option 2: Temporarily disable RLS (dev only!)
ALTER TABLE restaurants DISABLE ROW LEVEL SECURITY;
```

---

### Issue: Trigger not firing

**Check trigger exists:**
```sql
SELECT * FROM information_schema.triggers 
WHERE event_object_table = 'orders';
```

**Check trigger function:**
```sql
\df+ update_customer_stats
```

**Enable logging:**
```sql
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS trigger AS $$
BEGIN
  RAISE NOTICE 'Trigger fired for order %', new.id;
  -- ... rest of function
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 Database Statistics

After seeding, expected record counts:

| Table | Count |
|-------|-------|
| restaurants | 2 |
| restaurant_onboarding | 2 |
| staff_accounts | 8 |
| customers | 8 |
| menu_categories | 11 |
| menu_items | 35+ |
| orders | 5 |
| order_items | 15+ |
| tables | 13 |
| restaurant_settings | 2 |

---

## 🔒 Security Checklist

Before production deployment:

- [ ] Change all demo passwords/passcodes
- [ ] Enable RLS on all tables
- [ ] Configure RLS policies for your application
- [ ] Set up database backups
- [ ] Enable SSL connections
- [ ] Restrict database user permissions
- [ ] Configure connection pooling
- [ ] Set up monitoring/alerting
- [ ] Review audit log retention policy
- [ ] Test disaster recovery procedures

---

## 📚 Additional Resources

- **Complete Design Documentation:** [DATABASE_DESIGN.md](./DATABASE_DESIGN.md)
- **Original Schema (v1):** [schema.sql](./schema.sql)
- **Validation Tests:** [validation-tests.sql](./validation-tests.sql)
- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs/

---

## 🆘 Support

**Common Issues:**
1. Check [Troubleshooting](#troubleshooting) section above
2. Review [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) for architecture details
3. Inspect validation test results for specific errors
4. Check Supabase logs if using hosted version

**Need Help?**
- Review the comprehensive [DATABASE_DESIGN.md](./DATABASE_DESIGN.md)
- Check validation results: `psql -d your_db -f validation-tests.sql`
- Inspect PostgreSQL logs for detailed error messages

---

## 📝 Change Log

### Version 2.0 (Current)
- ✅ Multi-tenant architecture with restaurants table
- ✅ Staff authentication and RBAC
- ✅ Enhanced order management (status, payment, timestamps)
- ✅ Audit logging for compliance
- ✅ Restaurant settings and configuration
- ✅ Inventory tracking with transactions
- ✅ Table management for dine-in
- ✅ Analytical views (customer, sales, performance)
- ✅ Utility functions (dashboard metrics, search, popular items)
- ✅ Comprehensive RLS policies
- ✅ Production-ready triggers and constraints

### Version 1.0 (Legacy)
- Basic customer, menu, orders structure
- Single-tenant only
- No audit trail
- No advanced features

---

**Maintained by:** Smart Restaurant Development Team  
**Last Updated:** December 2024  
**Schema Version:** 2.0  
**Status:** Production Ready ✅

