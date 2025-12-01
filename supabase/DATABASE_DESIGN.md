# 🗄️ Smart Restaurant Management - Database Design Document

## Table of Contents
1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Entity Relationship Model](#entity-relationship-model)
4. [Table Specifications](#table-specifications)
5. [Relationships & Constraints](#relationships--constraints)
6. [Indexes & Performance](#indexes--performance)
7. [Triggers & Automation](#triggers--automation)
8. [Views & Analytics](#views--analytics)
9. [Security & RLS](#security--rls)
10. [Migration Strategy](#migration-strategy)
11. [Best Practices](#best-practices)

---

## Overview

### Application Domain
**Smart Restaurant Management SaaS** - A multi-tenant platform for restaurant and café management with:
- ✅ Multi-restaurant support (SaaS architecture)
- ✅ Role-based staff management (waiter, chef, manager, cashier)
- ✅ Kitchen Display System (KDS) with real-time order tracking
- ✅ Customer relationship management (CRM)
- ✅ Menu management with inventory tracking
- ✅ Real-time analytics and reporting
- ✅ Multi-fulfillment support (dine-in, pickup, delivery)

### Technology Stack
- **Database:** PostgreSQL 15+
- **Extensions:** uuid-ossp, pgcrypto
- **Client:** Supabase JS SDK
- **Frontend:** React Native (Expo)

### Data Flow
```
Restaurant Owner → Onboarding → Restaurant Creation
        ↓
Staff Accounts → Authentication → Order Management
        ↓
Orders (new) → Kitchen (preparing) → Ready → Completed
        ↓
Customer Stats Updated → Analytics Generated
```

---

## Database Architecture

### Multi-Tenancy Model
**Strategy:** Shared database with `restaurant_id` scoping

**Rationale:**
- Simple to implement and maintain
- Cost-effective for startups
- Excellent query performance with proper indexing
- Easy data backup/restore per restaurant
- Row-Level Security (RLS) enforces data isolation

**Alternative Considered:** Schema-per-tenant (rejected due to maintenance complexity)

### Normalization Level
**3NF (Third Normal Form)** with selective denormalization for performance

**Denormalized Fields:**
- `customers.total_spend` - Cached for fast sorting/filtering
- `customers.visit_count` - Reduces join operations
- `order_items.line_total` - Computed column for consistency
- `order_items.name`, `order_items.price` - Historical snapshot

---

## Entity Relationship Model

```
┌─────────────────┐
│  restaurants    │ (1) ────────┐
└─────────────────┘             │
        │ 1                     │ 1
        │                       │
        │ M                     │ M
┌─────────────────┐      ┌─────────────────┐
│ staff_accounts  │      │   customers     │
└─────────────────┘      └─────────────────┘
        │ 1                     │ 1
        │                       │
        │ M                     │ M
┌─────────────────┐      ┌─────────────────┐
│     orders      │──────│  order_items    │
└─────────────────┘ 1    └─────────────────┘
        │ M               │ M
        │                 │
        │ 1               │ 1
┌─────────────────┐      ┌─────────────────┐
│   menu_items    │      │  menu_items     │
└─────────────────┘      └─────────────────┘
```

### Relationship Summary

| Relationship | Type | Explanation |
|-------------|------|-------------|
| Restaurant → Staff | 1:M | One restaurant has many staff members |
| Restaurant → Customers | 1:M | Customers are scoped per restaurant |
| Restaurant → Menu Items | 1:M | Each restaurant has its own menu |
| Restaurant → Orders | 1:M | Orders belong to one restaurant |
| Customer → Orders | 1:M | One customer can place many orders |
| Staff → Orders | 1:M | Staff member records multiple orders |
| Order → Order Items | 1:M | One order contains multiple items |
| Menu Item → Order Items | 1:M | One menu item can appear in many orders |

---

## Table Specifications

### 1. `restaurants` (Core Multi-Tenancy)

**Purpose:** Stores restaurant/café information (SaaS tenant records)

**Key Fields:**
- `code` - Unique restaurant code for staff login (e.g., "DEMO-REST-001")
- `owner_email` - Unique email for owner authentication
- `owner_password_hash` - Bcrypt hashed password
- `experience_type` - Restaurant, café, or hybrid
- `subscription_tier` - Free, basic, premium, enterprise
- `onboarding_complete` - Tracks if setup is finished

**Constraints:**
- `code` must be ≥ 4 characters
- `owner_email` must match email regex
- `subscription_tier` enum validation

**Indexes:**
- Primary key on `id`
- Unique index on `code`
- Unique index on `owner_email`
- Partial index on `is_active = true` (fast active restaurant queries)

---

### 2. `staff_accounts` (Authentication & RBAC)

**Purpose:** Staff members who can log in and perform operations

**Key Fields:**
- `restaurant_id` - Links to restaurant (FK with cascade delete)
- `role` - waiter | chef | manager | cashier
- `passcode_hash` - Quick PIN login (bcrypt hashed)
- `is_owner` - Flag for restaurant owner
- `last_login_at` - Track activity

**Constraints:**
- `role` must be one of 4 valid values
- Composite FK ensures staff belongs to valid restaurant

**Indexes:**
- `idx_staff_restaurant` - Fast lookups by restaurant
- `idx_staff_role` - Filter by role (partial: active only)

**Security:**
- RLS policies restrict viewing to same restaurant
- Password hashing mandatory (never store plaintext)

---

### 3. `customers` (CRM)

**Purpose:** Track customer purchase history and loyalty

**Key Fields:**
- `restaurant_id` - Multi-tenant scoping
- `phone` - Primary identifier (customers identified by phone)
- `total_spend` - Cached total for performance
- `visit_count` - Cached count for performance
- `loyalty_points` - For loyalty programs
- `is_vip` - Flag for special treatment
- `tags` - Array for segmentation (e.g., ['frequent', 'delivery-preferred'])

**Constraints:**
- `unique(restaurant_id, phone)` - One customer per phone per restaurant
- `total_spend >= 0`, `visit_count >= 0` - Prevent negative values

**Indexes:**
- `idx_customers_phone` - Fast phone lookups
- `idx_customers_total_spend` - Sort by spending (DESC)
- `idx_customers_vip` - Filter VIP customers (partial index)

**Triggers:**
- `update_customer_stats` - Auto-update stats when order completes

---

### 4. `menu_items` (Product Catalog)

**Purpose:** Restaurant menu with pricing and availability

**Key Fields:**
- `restaurant_id` - Multi-tenant scoping
- `category` - e.g., "Burgers", "قهوة ساخنة"
- `price` - Current selling price
- `cost` - Cost of goods sold (for profit tracking)
- `prep_time_minutes` - Kitchen timing
- `is_available` - Real-time availability toggle
- `stock_quantity` - Optional inventory tracking
- `allergens`, `dietary_tags` - Arrays for filtering

**Constraints:**
- `unique(restaurant_id, name, category)` - Prevent duplicates
- `price >= 0`, `cost >= 0` - Non-negative amounts

**Indexes:**
- `idx_menu_items_available` - Fast filtering (partial: available only)
- `idx_menu_items_popular` - Quick popular item queries
- `idx_menu_items_stock` - Low stock alerts

**Triggers:**
- `update_menu_stock` - Auto-decrement stock when order placed

---

### 5. `orders` (Order Management)

**Purpose:** Core order tracking from creation to completion

**Key Fields:**
- `restaurant_id` - Multi-tenant scoping
- `customer_id` - Who placed it (FK with SET NULL on delete)
- `staff_id` - Who recorded it (FK with SET NULL)
- `status` - new | preparing | ready | completed | cancelled
- `fulfillment_type` - dine-in | pickup | delivery
- `subtotal`, `tax`, `discount`, `tip`, `total` - Financial breakdown
- `payment_method`, `payment_status` - Payment tracking
- `created_at`, `preparing_at`, `ready_at`, `completed_at` - Timestamps

**Constraints:**
- `status` enum (5 values)
- `fulfillment_type` enum (3 values)
- `total = subtotal + tax - discount + tip` - Enforced via trigger
- `priority` between 1-10 (1=highest)

**Indexes:**
- `idx_orders_status` - KDS filtering
- `idx_orders_today` - Dashboard (partial: today only)
- `idx_orders_active` - Active orders (partial: new/preparing/ready)
- `idx_orders_dashboard` - Composite for analytics

**Triggers:**
- `calculate_order_totals` - Auto-recalculate on item changes
- `set_order_timestamps` - Auto-set timestamps on status change
- `update_customer_stats` - Update customer when completed

---

### 6. `order_items` (Order Line Items)

**Purpose:** Individual items within an order

**Key Fields:**
- `order_id` - Parent order (FK with CASCADE delete)
- `menu_item_id` - Reference to menu (FK with SET NULL)
- `name`, `price` - **Snapshot** at order time (historical record)
- `quantity` - How many ordered
- `modifiers` - JSONB for customizations (e.g., extra cheese)
- `line_total` - **Computed column**: `price * quantity`

**Why Snapshot?**
- Menu prices change over time
- Historical orders must reflect actual paid price
- Prevents data inconsistencies if menu item deleted

**Constraints:**
- `quantity > 0` - At least 1 item
- `line_total` generated always as stored

**Indexes:**
- `idx_order_items_order` - Fast order detail loading
- `idx_order_items_menu` - Track menu item sales

**Triggers:**
- `calculate_order_totals` - Notify parent order to recalculate

---

### 7. `audit_logs` (Compliance & Debugging)

**Purpose:** Track all important changes for security and debugging

**Key Fields:**
- `entity_type` - Table name (e.g., "orders", "menu_items")
- `entity_id` - Record ID that changed
- `action` - create | update | delete | status_change
- `old_values`, `new_values` - JSONB snapshots
- `staff_id` - Who made the change (if known)
- `ip_address`, `user_agent` - Request metadata

**Use Cases:**
- Investigate deleted orders
- Track price changes
- Security audits
- Debugging application issues

**Retention:** Consider partitioning by `created_at` for long-term storage

---

### 8. `restaurant_settings` (Configuration)

**Purpose:** Per-restaurant configuration and preferences

**Key Fields:**
- `business_hours` - JSONB with open/close times per day
- `tax_rate`, `tax_inclusive` - Tax calculations
- `service_charge_rate` - Additional fees
- `delivery_fee`, `free_delivery_threshold` - Delivery pricing
- `notify_new_orders` - Feature flags
- `enable_loyalty_points` - Feature toggles
- `receipt_header`, `receipt_footer` - Customization

**Why JSONB for business_hours?**
- Flexible structure for complex schedules
- Easy to query with PostgreSQL operators
- Can add holidays/special hours without schema changes

---

### 9. `tables` (Dine-In Management)

**Purpose:** Track physical tables for dine-in orders

**Key Fields:**
- `table_number` - Display identifier (e.g., "1", "VIP-1")
- `capacity` - Number of seats
- `status` - available | occupied | reserved | cleaning
- `current_order_id` - Link to active order (FK with SET NULL)
- `section` - Grouping (e.g., "indoor", "outdoor", "vip")

**Use Cases:**
- Waiters see which tables are occupied
- Managers optimize table assignments
- Analytics on table turnover

---

### 10. `inventory_transactions` (Stock Tracking)

**Purpose:** Log all inventory changes for accountability

**Key Fields:**
- `menu_item_id` - Which item changed
- `transaction_type` - purchase | sale | waste | adjustment
- `quantity` - Positive or negative change
- `previous_quantity`, `new_quantity` - Before/after snapshot
- `cost_per_unit`, `total_cost` - Financial tracking

**Triggers:**
- Auto-created when orders placed (if item tracks stock)
- Allows manual adjustments by managers

---

## Relationships & Constraints

### Foreign Key Cascade Rules

| Parent → Child | On Delete | Rationale |
|---------------|-----------|-----------|
| restaurants → * | CASCADE | Delete all restaurant data if restaurant deleted |
| orders → order_items | CASCADE | Delete items when order deleted |
| customers → orders | SET NULL | Keep order history even if customer deleted |
| staff → orders | SET NULL | Keep order history even if staff deleted |
| menu_items → order_items | SET NULL | Keep historical orders even if item removed |

### Check Constraints

```sql
-- Price validation
check (price >= 0)
check (total >= 0)

-- Enum validation
check (status in ('new', 'preparing', 'ready', 'completed', 'cancelled'))
check (role in ('waiter', 'chef', 'manager', 'cashier'))

-- Business logic
check (priority between 1 and 10)
check (tax_rate >= 0 and tax_rate <= 100)

-- Format validation
check (owner_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
```

### Unique Constraints

```sql
-- Global uniqueness
unique (code) -- restaurants
unique (owner_email) -- restaurants

-- Scoped uniqueness
unique (restaurant_id, phone) -- customers
unique (restaurant_id, name, category) -- menu_items
unique (restaurant_id, table_number) -- tables
```

---

## Indexes & Performance

### Index Strategy

1. **Primary Keys:** All tables have UUID primary keys with default indexes
2. **Foreign Keys:** Every FK has a corresponding index for fast joins
3. **Partial Indexes:** Used for filtered queries (e.g., `where is_active = true`)
4. **Composite Indexes:** For common multi-column queries

### Critical Indexes

```sql
-- Dashboard queries (most common)
create index idx_orders_dashboard 
  on orders (restaurant_id, created_at desc, status, total);

-- Kitchen Display System
create index idx_orders_active 
  on orders (restaurant_id, status, created_at) 
  where status in ('new', 'preparing', 'ready');

-- Today's orders (frequently queried)
create index idx_orders_today 
  on orders (restaurant_id, created_at) 
  where date_trunc('day', created_at) = date_trunc('day', now());

-- Customer search
create index idx_customers_phone 
  on customers (restaurant_id, phone);

-- Menu availability
create index idx_menu_items_available 
  on menu_items (restaurant_id, is_available) 
  where is_available = true;
```

### Performance Optimization Tips

1. **Use Views for Complex Queries:** Pre-defined views with optimized queries
2. **Materialize Heavy Analytics:** Consider materialized views for reports
3. **Partition Large Tables:** Orders table may need date-based partitioning at scale
4. **Connection Pooling:** Use PgBouncer for high-traffic scenarios
5. **Query Planning:** Use `EXPLAIN ANALYZE` to optimize slow queries

---

## Triggers & Automation

### 1. `update_updated_at_column()`

**Purpose:** Auto-update `updated_at` timestamp on record changes

**Applied to:**
- restaurants
- customers
- menu_items
- orders
- staff_accounts
- tables
- restaurant_settings

```sql
create trigger update_customers_updated_at 
  before update on customers
  for each row execute function update_updated_at_column();
```

---

### 2. `calculate_order_totals()`

**Purpose:** Recalculate order subtotal and total when items change

**Trigger Events:**
- INSERT on order_items
- UPDATE on order_items
- DELETE on order_items

**Logic:**
```sql
subtotal = sum(order_items.line_total)
total = subtotal + tax - discount + tip
```

---

### 3. `set_order_timestamps()`

**Purpose:** Auto-set timestamp fields based on status changes

**Mapping:**
- `status = 'preparing'` → set `preparing_at`
- `status = 'ready'` → set `ready_at`
- `status = 'completed'` → set `completed_at`
- `status = 'cancelled'` → set `cancelled_at`

---

### 4. `update_customer_stats()`

**Purpose:** Maintain customer cached stats when order completes

**Logic:**
- When order moves to `completed`: increment `total_spend`, `visit_count`
- When order cancelled after completion: decrement stats
- Update `last_order_at` timestamp

**Rationale:** Prevents expensive joins for customer sorting/filtering

---

### 5. `update_menu_stock()`

**Purpose:** Decrement inventory when order placed

**Trigger Events:**
- INSERT on order_items (decrease stock)
- DELETE on order_items (increase stock, for cancellations)

**Also Creates:** Inventory transaction record for audit trail

---

### 6. `create_audit_log()`

**Purpose:** Log all changes to critical tables

**Applied to:**
- orders (INSERT, UPDATE, DELETE)
- menu_items (INSERT, UPDATE, DELETE)

**Captures:**
- Who made the change (from session variable)
- What changed (old vs new JSON)
- When it happened

---

## Views & Analytics

### 1. `customer_analytics`

**Purpose:** Comprehensive customer metrics

**Fields:**
- All customer fields
- `lifetime_value` - Total spent (completed orders only)
- `total_orders` - Count of all orders
- `orders_today`, `orders_this_week`, `orders_this_month` - Recency
- `avg_order_value` - Average spending
- `last_visit` - Most recent order

**Use Cases:**
- Customer leaderboards
- VIP identification
- Retention analysis

---

### 2. `daily_sales_summary`

**Purpose:** Daily aggregated sales data per restaurant

**Fields:**
- `date` - Truncated to day
- `total_orders`, `completed_orders`, `cancelled_orders`
- `total_revenue`, `subtotal_revenue`, `total_tax`, `total_tips`
- `avg_order_value`, `highest_order`, `lowest_order`

**Use Cases:**
- Daily reports
- Revenue tracking
- Trend analysis

---

### 3. `menu_item_performance`

**Purpose:** Sales and profitability per menu item

**Fields:**
- Menu item details
- `total_sold` - Quantity sold
- `total_revenue` - Revenue generated
- `total_cost` - COGS (Cost of Goods Sold)
- `total_profit` - Revenue - Cost
- `order_count` - Number of orders containing this item

**Use Cases:**
- Menu optimization
- Pricing decisions
- Identify bestsellers

---

### 4. `staff_performance`

**Purpose:** Staff productivity metrics

**Fields:**
- Staff details
- `total_orders_handled`
- `orders_today`
- `total_sales`
- `avg_order_value`

**Use Cases:**
- Performance reviews
- Commission calculations
- Staffing optimization

---

### 5. `kitchen_efficiency`

**Purpose:** Kitchen prep time and throughput

**Fields:**
- `avg_prep_minutes`, `median_prep_minutes`, `max_prep_minutes`
- `orders_completed`
- `orders_in_progress`

**Use Cases:**
- Kitchen performance monitoring
- Staff scheduling
- Process improvement

---

## Security & RLS

### Row-Level Security (RLS) Policies

**Enabled on all tables** to enforce multi-tenant isolation

### Session Variables

```sql
-- Set in application code before queries
set app.current_restaurant_id = '<restaurant_uuid>';
set app.current_staff_id = '<staff_uuid>';
```

### Policy Examples

```sql
-- Customers: Users can only see customers from their restaurant
create policy "Customers: View own restaurant"
  on customers for select
  using (restaurant_id = current_restaurant_id());

-- Orders: Staff can only manage orders from their restaurant
create policy "Orders: Manage own restaurant"
  on orders for all
  using (restaurant_id = current_restaurant_id());

-- Menu Items: Public can view available items
create policy "Menu: Public can view available"
  on menu_items for select
  using (is_available = true);
```

### Password Security

- **Never store plaintext passwords**
- Use bcrypt with cost factor 10-12
- Hash on application side before INSERT
- Owner passwords: Full authentication
- Staff passcodes: Quick 4-6 digit PINs (also hashed)

---

## Migration Strategy

### Incremental Migrations

**6 migration files** for phased rollout:

1. **001_add_restaurants_and_staff.sql** - Core multi-tenancy
2. **002_add_restaurant_id_to_existing_tables.sql** - Retrofit existing schema
3. **003_enhance_orders_and_items.sql** - Add financial fields
4. **004_add_audit_and_settings.sql** - Audit logs and config
5. **005_add_enhanced_features.sql** - Categories, tables, inventory
6. **006_add_views_and_functions.sql** - Analytics layer

### Migration Commands

```bash
# Supabase CLI
supabase db push

# Or execute individually
supabase db execute --file supabase/migrations/001_add_restaurants_and_staff.sql
supabase db execute --file supabase/migrations/002_add_restaurant_id_to_existing_tables.sql
# ... etc

# For complete fresh install
supabase db execute --file supabase/schema-v2-complete.sql
```

### Rollback Strategy

- Keep migration files version-controlled
- Test in staging environment first
- Create database backups before major migrations
- Write DOWN migrations for reversibility

---

## Best Practices

### Application Code

1. **Always set session variables** before queries:
   ```javascript
   await supabase.rpc('set_config', {
     setting: 'app.current_restaurant_id',
     value: restaurantId
   });
   ```

2. **Use prepared statements** to prevent SQL injection

3. **Handle NULL values** gracefully (especially on SET NULL FKs)

4. **Batch updates** when possible to reduce trigger overhead

5. **Use transactions** for multi-table operations:
   ```javascript
   const { data, error } = await supabase.rpc('create_order_with_items', {
     order: {...},
     items: [...]
   });
   ```

### Database Maintenance

1. **Regular VACUUM** to reclaim space:
   ```sql
   VACUUM ANALYZE orders;
   ```

2. **Monitor slow queries**:
   ```sql
   SELECT * FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC 
   LIMIT 10;
   ```

3. **Index maintenance**:
   ```sql
   -- Check for unused indexes
   SELECT * FROM pg_stat_user_indexes 
   WHERE idx_scan = 0;
   
   -- Rebuild bloated indexes
   REINDEX INDEX idx_orders_restaurant;
   ```

4. **Partition large tables** if orders exceed 1M rows:
   ```sql
   CREATE TABLE orders_2024_01 PARTITION OF orders
   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
   ```

### Monitoring

1. **Connection pool size** - Monitor active connections
2. **Query performance** - Track slow queries (>100ms)
3. **Table bloat** - Watch for excessive dead tuples
4. **RLS overhead** - RLS adds ~5-10% query time
5. **Trigger execution time** - Monitor trigger performance

---

## Appendix: Common Queries

### Get Today's Sales

```sql
SELECT 
  count(*) as total_orders,
  sum(total) filter (where status != 'cancelled') as revenue
FROM orders
WHERE restaurant_id = '<restaurant_id>'
  AND date_trunc('day', created_at) = current_date;
```

### Top Customers This Month

```sql
SELECT * FROM customer_analytics
WHERE restaurant_id = '<restaurant_id>'
  AND orders_this_month > 0
ORDER BY lifetime_value DESC
LIMIT 10;
```

### Kitchen Load (Active Orders)

```sql
SELECT status, count(*) as count
FROM orders
WHERE restaurant_id = '<restaurant_id>'
  AND status IN ('new', 'preparing', 'ready')
GROUP BY status;
```

### Low Stock Alerts

```sql
SELECT name, stock_quantity, low_stock_threshold
FROM menu_items
WHERE restaurant_id = '<restaurant_id>'
  AND stock_quantity IS NOT NULL
  AND stock_quantity <= low_stock_threshold
ORDER BY stock_quantity ASC;
```

---

**Document Version:** 2.0  
**Last Updated:** December 2024  
**Author:** AI Database Architect  
**Status:** Production Ready ✅

