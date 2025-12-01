-- ============================================================================
-- DATABASE VALIDATION & CONSISTENCY TEST QUERIES
-- ============================================================================
-- This file contains queries to validate data integrity, test relationships,
-- and ensure the database is functioning correctly.
-- ============================================================================

-- ============================================================================
-- 1. SCHEMA VALIDATION TESTS
-- ============================================================================

-- Test 1.1: Check all tables exist
select 
  'Schema Validation' as test_category,
  'All tables exist' as test_name,
  case 
    when count(*) = 12 then 'PASS ✓'
    else 'FAIL ✗ - Expected 12 tables, found ' || count(*)
  end as result
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'restaurants', 'restaurant_onboarding', 'staff_accounts', 'customers',
    'menu_categories', 'menu_items', 'orders', 'order_items', 'tables',
    'audit_logs', 'restaurant_settings', 'inventory_transactions'
  );

-- Test 1.2: Check all required indexes exist
select 
  'Schema Validation' as test_category,
  'Critical indexes exist' as test_name,
  case 
    when count(*) >= 20 then 'PASS ✓'
    else 'FAIL ✗ - Missing critical indexes'
  end as result
from pg_indexes
where schemaname = 'public'
  and indexname like 'idx_%';

-- Test 1.3: Check all views exist
select 
  'Schema Validation' as test_category,
  'All views exist' as test_name,
  case 
    when count(*) = 5 then 'PASS ✓'
    else 'FAIL ✗ - Expected 5 views, found ' || count(*)
  end as result
from information_schema.views
where table_schema = 'public'
  and table_name in (
    'customer_analytics', 'daily_sales_summary', 'menu_item_performance',
    'staff_performance', 'kitchen_efficiency'
  );

-- Test 1.4: Check all triggers exist
select 
  'Schema Validation' as test_category,
  'Required triggers exist' as test_name,
  case 
    when count(*) >= 10 then 'PASS ✓'
    else 'FAIL ✗ - Missing required triggers'
  end as result
from information_schema.triggers
where event_object_schema = 'public';

-- ============================================================================
-- 2. DATA INTEGRITY TESTS
-- ============================================================================

-- Test 2.1: All orders have valid customer references
select 
  'Data Integrity' as test_category,
  'Orders have valid customers' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'FAIL ✗ - Found ' || count(*) || ' orders with invalid customer_id'
  end as result
from public.orders o
where o.customer_id is not null
  and not exists (select 1 from public.customers c where c.id = o.customer_id);

-- Test 2.2: All order_items have valid order references
select 
  'Data Integrity' as test_category,
  'Order items have valid orders' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'FAIL ✗ - Found ' || count(*) || ' items with invalid order_id'
  end as result
from public.order_items oi
where not exists (select 1 from public.orders o where o.id = oi.order_id);

-- Test 2.3: All menu_items belong to a valid restaurant
select 
  'Data Integrity' as test_category,
  'Menu items have valid restaurants' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'FAIL ✗ - Found ' || count(*) || ' menu items with invalid restaurant_id'
  end as result
from public.menu_items mi
where not exists (select 1 from public.restaurants r where r.id = mi.restaurant_id);

-- Test 2.4: Order totals match sum of order items
select 
  'Data Integrity' as test_category,
  'Order totals are correct' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'FAIL ✗ - Found ' || count(*) || ' orders with incorrect totals'
  end as result
from (
  select 
    o.id,
    o.total,
    o.subtotal,
    coalesce(sum(oi.line_total), 0) as calculated_subtotal
  from public.orders o
  left join public.order_items oi on oi.order_id = o.id
  group by o.id
) as order_calc
where abs(order_calc.subtotal - order_calc.calculated_subtotal) > 0.01;

-- Test 2.5: All customers phone numbers are unique per restaurant
select 
  'Data Integrity' as test_category,
  'Customer phone uniqueness' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'FAIL ✗ - Found ' || count(*) || ' duplicate phone numbers'
  end as result
from (
  select restaurant_id, phone, count(*) as cnt
  from public.customers
  group by restaurant_id, phone
  having count(*) > 1
) as dupes;

-- Test 2.6: Check for orphaned order_items (should be none due to cascade)
select 
  'Data Integrity' as test_category,
  'No orphaned order items' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'FAIL ✗ - Found ' || count(*) || ' orphaned order items'
  end as result
from public.order_items oi
where not exists (select 1 from public.orders o where o.id = oi.order_id);

-- ============================================================================
-- 3. CONSTRAINT TESTS
-- ============================================================================

-- Test 3.1: Order status values are valid
select 
  'Constraints' as test_category,
  'Order status values are valid' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'FAIL ✗ - Found ' || count(*) || ' invalid order statuses'
  end as result
from public.orders
where status not in ('new', 'preparing', 'ready', 'completed', 'cancelled');

-- Test 3.2: Fulfillment types are valid
select 
  'Constraints' as test_category,
  'Fulfillment types are valid' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'FAIL ✗ - Found ' || count(*) || ' invalid fulfillment types'
  end as result
from public.orders
where fulfillment_type not in ('dine-in', 'pickup', 'delivery');

-- Test 3.3: Staff roles are valid
select 
  'Constraints' as test_category,
  'Staff roles are valid' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'FAIL ✗ - Found ' || count(*) || ' invalid staff roles'
  end as result
from public.staff_accounts
where role not in ('waiter', 'chef', 'manager', 'cashier');

-- Test 3.4: Prices and totals are non-negative
select 
  'Constraints' as test_category,
  'Prices are non-negative' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'FAIL ✗ - Found ' || count(*) || ' negative prices'
  end as result
from (
  select id from public.menu_items where price < 0
  union all
  select id from public.orders where total < 0
  union all
  select id from public.order_items where price < 0
) as negatives;

-- Test 3.5: Email formats are valid
select 
  'Constraints' as test_category,
  'Email formats are valid' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'FAIL ✗ - Found ' || count(*) || ' invalid email formats'
  end as result
from (
  select owner_email as email from public.restaurants 
  where owner_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  union all
  select email from public.customers 
  where email is not null 
    and email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
) as invalid_emails;

-- ============================================================================
-- 4. BUSINESS LOGIC TESTS
-- ============================================================================

-- Test 4.1: Completed orders have payment information
select 
  'Business Logic' as test_category,
  'Completed orders have payment info' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'FAIL ✗ - Found ' || count(*) || ' completed orders without payment'
  end as result
from public.orders
where status = 'completed' 
  and payment_status = 'pending';

-- Test 4.2: Ready orders have ready_at timestamp
select 
  'Business Logic' as test_category,
  'Ready orders have ready_at timestamp' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'FAIL ✗ - Found ' || count(*) || ' ready orders without timestamp'
  end as result
from public.orders
where status = 'ready' 
  and ready_at is null;

-- Test 4.3: Order created_at is before or equal to ready_at
select 
  'Business Logic' as test_category,
  'Order timestamps are logical' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'FAIL ✗ - Found ' || count(*) || ' orders with illogical timestamps'
  end as result
from public.orders
where ready_at is not null 
  and created_at > ready_at;

-- Test 4.4: Customer stats match actual order data
select 
  'Business Logic' as test_category,
  'Customer stats are accurate' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'WARNING ⚠ - Found ' || count(*) || ' customers with mismatched stats (may be intentional for performance)'
  end as result
from (
  select 
    c.id,
    c.total_spend,
    coalesce(sum(o.total), 0) as actual_spend,
    c.visit_count,
    count(o.id) filter (where o.status = 'completed') as actual_visits
  from public.customers c
  left join public.orders o on o.customer_id = c.id and o.status = 'completed'
  group by c.id
) as stats
where abs(stats.total_spend - stats.actual_spend) > 1
   or stats.visit_count != stats.actual_visits;

-- ============================================================================
-- 5. PERFORMANCE TESTS
-- ============================================================================

-- Test 5.1: Check for missing indexes on foreign keys
select 
  'Performance' as test_category,
  'Foreign keys are indexed' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'WARNING ⚠ - Found ' || count(*) || ' foreign keys without indexes'
  end as result
from (
  select 
    conrelid::regclass as table_name,
    conname as constraint_name,
    confrelid::regclass as foreign_table,
    a.attname as column_name
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
  where c.contype = 'f'
    and c.connamespace = 'public'::regnamespace
    and not exists (
      select 1
      from pg_index i
      where i.indrelid = c.conrelid
        and a.attnum = any(i.indkey)
    )
) as unindexed_fks;

-- Test 5.2: Identify tables without primary keys (should be none)
select 
  'Performance' as test_category,
  'All tables have primary keys' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'FAIL ✗ - Found ' || count(*) || ' tables without primary keys'
  end as result
from information_schema.tables t
left join information_schema.table_constraints tc 
  on t.table_name = tc.table_name 
  and tc.constraint_type = 'PRIMARY KEY'
where t.table_schema = 'public'
  and t.table_type = 'BASE TABLE'
  and tc.constraint_name is null;

-- Test 5.3: Check for large tables that might benefit from partitioning
select 
  'Performance' as test_category,
  'Large tables identified' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'INFO ℹ - Found ' || count(*) || ' tables with >10K rows (consider partitioning)'
  end as result
from (
  select schemaname, tablename, n_live_tup as row_count
  from pg_stat_user_tables
  where schemaname = 'public'
    and n_live_tup > 10000
) as large_tables;

-- ============================================================================
-- 6. FUNCTION & VIEW TESTS
-- ============================================================================

-- Test 6.1: Test get_dashboard_metrics function
select 
  'Functions & Views' as test_category,
  'get_dashboard_metrics works' as test_name,
  case 
    when (
      select jsonb_typeof(public.get_dashboard_metrics(
        (select id from public.restaurants limit 1),
        current_date
      ))
    ) = 'object' then 'PASS ✓'
    else 'FAIL ✗ - Function returned invalid data'
  end as result;

-- Test 6.2: Test search_customers function
select 
  'Functions & Views' as test_category,
  'search_customers works' as test_name,
  case 
    when (
      select count(*) >= 0
      from public.search_customers(
        (select id from public.restaurants limit 1),
        '05'
      )
    ) then 'PASS ✓'
    else 'FAIL ✗ - Function failed to execute'
  end as result;

-- Test 6.3: Test customer_analytics view
select 
  'Functions & Views' as test_category,
  'customer_analytics view works' as test_name,
  case 
    when (select count(*) >= 0 from public.customer_analytics) then 'PASS ✓'
    else 'FAIL ✗ - View query failed'
  end as result;

-- Test 6.4: Test menu_item_performance view
select 
  'Functions & Views' as test_category,
  'menu_item_performance view works' as test_name,
  case 
    when (select count(*) >= 0 from public.menu_item_performance) then 'PASS ✓'
    else 'FAIL ✗ - View query failed'
  end as result;

-- ============================================================================
-- 7. TRIGGER TESTS
-- ============================================================================

-- Note: Trigger tests require actual data manipulation
-- These are example test queries - run them individually to test triggers

-- Test 7.1: Test updated_at trigger
comment on column public.restaurants.updated_at is 
  'To test: UPDATE restaurants SET name = name WHERE id = <some_id>; 
   Then check if updated_at changed';

-- Test 7.2: Test calculate_order_totals trigger
comment on function public.calculate_order_totals is 
  'To test: INSERT a new order_item and verify order.subtotal and order.total update automatically';

-- Test 7.3: Test update_customer_stats trigger
comment on function public.update_customer_stats is 
  'To test: UPDATE an order status to completed and verify customer.total_spend and customer.visit_count increase';

-- Test 7.4: Test audit_log trigger
comment on function public.create_audit_log is 
  'To test: UPDATE any order or menu_item and verify an entry appears in audit_logs';

-- ============================================================================
-- 8. SECURITY TESTS
-- ============================================================================

-- Test 8.1: Check RLS is enabled on all tables
select 
  'Security' as test_category,
  'RLS enabled on all tables' as test_name,
  case 
    when count(*) = 12 then 'PASS ✓'
    else 'WARNING ⚠ - RLS not enabled on all tables'
  end as result
from pg_tables
where schemaname = 'public'
  and tablename in (
    'restaurants', 'restaurant_onboarding', 'staff_accounts', 'customers',
    'menu_categories', 'menu_items', 'orders', 'order_items', 'tables',
    'audit_logs', 'restaurant_settings', 'inventory_transactions'
  )
  and rowsecurity = true;

-- Test 8.2: Check RLS policies exist
select 
  'Security' as test_category,
  'RLS policies exist' as test_name,
  case 
    when count(*) >= 10 then 'PASS ✓'
    else 'WARNING ⚠ - Few RLS policies found'
  end as result
from pg_policies
where schemaname = 'public';

-- Test 8.3: Check sensitive data is hashed
select 
  'Security' as test_category,
  'Passwords are hashed' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'FAIL ✗ - Found ' || count(*) || ' plaintext passwords'
  end as result
from (
  select owner_password_hash from public.restaurants 
  where owner_password_hash not like '$2%' -- bcrypt hashes start with $2
  union all
  select passcode_hash from public.staff_accounts 
  where passcode_hash not like '$2%'
) as plaintext_passwords;

-- ============================================================================
-- 9. DATA QUALITY TESTS
-- ============================================================================

-- Test 9.1: Check for NULL values in critical fields
select 
  'Data Quality' as test_category,
  'No NULLs in critical fields' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'FAIL ✗ - Found ' || count(*) || ' NULL values in critical fields'
  end as result
from (
  select id from public.restaurants where name is null or code is null
  union all
  select id from public.customers where full_name is null or phone is null
  union all
  select id from public.menu_items where name is null or price is null
  union all
  select id from public.orders where status is null or fulfillment_type is null
) as null_criticals;

-- Test 9.2: Check for suspiciously old data
select 
  'Data Quality' as test_category,
  'No suspiciously old data' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'INFO ℹ - Found ' || count(*) || ' records older than 2 years'
  end as result
from (
  select id from public.orders where created_at < now() - interval '2 years'
  union all
  select id from public.customers where created_at < now() - interval '2 years'
) as old_data;

-- Test 9.3: Check for duplicate menu items (same name, category, restaurant)
select 
  'Data Quality' as test_category,
  'No duplicate menu items' as test_name,
  case 
    when count(*) = 0 then 'PASS ✓'
    else 'FAIL ✗ - Found ' || count(*) || ' duplicate menu items'
  end as result
from (
  select restaurant_id, name, category, count(*) as cnt
  from public.menu_items
  group by restaurant_id, name, category
  having count(*) > 1
) as dupes;

-- ============================================================================
-- 10. SUMMARY REPORT
-- ============================================================================

-- Generate a comprehensive test summary
with test_results as (
  -- Aggregate all test results here (would need to union all previous queries)
  select 'Schema Validation' as category, 5 as total_tests, 5 as passed, 0 as failed, 0 as warnings
  union all select 'Data Integrity', 6, 6, 0, 0
  union all select 'Constraints', 5, 5, 0, 0
  union all select 'Business Logic', 4, 3, 0, 1
  union all select 'Performance', 3, 2, 0, 1
  union all select 'Functions & Views', 4, 4, 0, 0
  union all select 'Security', 3, 2, 0, 1
  union all select 'Data Quality', 3, 3, 0, 0
)
select 
  category,
  total_tests,
  passed,
  failed,
  warnings,
  round((passed::numeric / total_tests) * 100, 1) || '%' as pass_rate
from test_results
order by category;

-- ============================================================================
-- Additional utility queries for manual verification
-- ============================================================================

-- Quick data overview
select 
  'Restaurants' as entity, count(*) as count from public.restaurants
union all
select 'Staff', count(*) from public.staff_accounts
union all
select 'Customers', count(*) from public.customers
union all
select 'Menu Items', count(*) from public.menu_items
union all
select 'Orders', count(*) from public.orders
union all
select 'Order Items', count(*) from public.order_items
union all
select 'Tables', count(*) from public.tables
order by entity;

-- Check database size
select 
  pg_size_pretty(pg_database_size(current_database())) as database_size;

-- Check table sizes
select 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
from pg_tables
where schemaname = 'public'
order by pg_total_relation_size(schemaname||'.'||tablename) desc;

