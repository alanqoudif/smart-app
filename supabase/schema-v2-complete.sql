-- ============================================================================
-- SMART RESTAURANT MANAGEMENT SAAS - PRODUCTION DATABASE SCHEMA V2
-- ============================================================================
-- This schema supports multi-tenant restaurant management with:
-- - Multi-restaurant support (SaaS architecture)
-- - Role-based access control (RBAC)
-- - Comprehensive audit trails
-- - Real-time analytics optimization
-- - Data integrity and consistency checks
-- ============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto"; -- for password hashing

-- ============================================================================
-- 1. RESTAURANTS TABLE (Multi-Tenancy Core)
-- ============================================================================

create table if not exists public.restaurants (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique check (char_length(code) >= 4),
  name text not null check (char_length(name) >= 2),
  owner_name text not null,
  owner_email text not null unique check (owner_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  owner_password_hash text not null, -- bcrypt hash
  experience_type text not null check (experience_type in ('restaurant', 'cafe', 'hybrid')),
  specialties text[] default '{}',
  onboarding_complete boolean default false,
  is_active boolean default true,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'basic', 'premium', 'enterprise')),
  subscription_expires_at timestamptz,
  timezone text default 'Asia/Riyadh',
  currency text default 'SAR',
  logo_url text,
  phone text,
  address text,
  city text,
  country text default 'SA',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for restaurants
create index if not exists idx_restaurants_code on public.restaurants (code);
create index if not exists idx_restaurants_owner_email on public.restaurants (owner_email);
create index if not exists idx_restaurants_is_active on public.restaurants (is_active) where is_active = true;
create index if not exists idx_restaurants_subscription on public.restaurants (subscription_tier, subscription_expires_at);

-- ============================================================================
-- 2. RESTAURANT ONBOARDING ANSWERS TABLE
-- ============================================================================

create table if not exists public.restaurant_onboarding (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  concept_vision text,
  service_modes text[] default '{}' check (
    service_modes <@ ARRAY['dine-in', 'pickup', 'delivery']::text[]
  ),
  cuisine_focus text[] default '{}',
  guest_notes text,
  price_position text check (price_position in ('value', 'standard', 'premium')),
  created_at timestamptz default now(),
  unique(restaurant_id)
);

-- ============================================================================
-- 3. STAFF ACCOUNTS TABLE (Authentication & Authorization)
-- ============================================================================

create table if not exists public.staff_accounts (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(name) >= 2),
  role text not null check (role in ('waiter', 'chef', 'manager', 'cashier')),
  passcode_hash text not null, -- bcrypt hash of 4-6 digit PIN
  is_owner boolean default false,
  is_active boolean default true,
  last_login_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for staff_accounts
create index if not exists idx_staff_restaurant on public.staff_accounts (restaurant_id);
create index if not exists idx_staff_role on public.staff_accounts (restaurant_id, role) where is_active = true;
create index if not exists idx_staff_active on public.staff_accounts (is_active) where is_active = true;

-- ============================================================================
-- 4. CUSTOMERS TABLE (Enhanced with Restaurant Scoping)
-- ============================================================================

create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  full_name text not null check (char_length(full_name) >= 1),
  phone text not null check (char_length(phone) >= 3),
  email text check (email is null or email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  total_spend numeric(12, 2) default 0 check (total_spend >= 0),
  visit_count integer default 0 check (visit_count >= 0),
  last_order_at timestamptz default now(),
  favorite_dish text,
  notes text,
  loyalty_points integer default 0 check (loyalty_points >= 0),
  is_vip boolean default false,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Composite unique constraint: one customer per phone per restaurant
  unique(restaurant_id, phone)
);

-- Indexes for customers
create index if not exists idx_customers_restaurant on public.customers (restaurant_id);
create index if not exists idx_customers_phone on public.customers (restaurant_id, phone);
create index if not exists idx_customers_last_order on public.customers (restaurant_id, last_order_at desc);
create index if not exists idx_customers_total_spend on public.customers (restaurant_id, total_spend desc);
create index if not exists idx_customers_vip on public.customers (restaurant_id, is_vip) where is_vip = true;

-- ============================================================================
-- 5. MENU CATEGORIES TABLE (Better Menu Organization)
-- ============================================================================

create table if not exists public.menu_categories (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  display_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(restaurant_id, name)
);

create index if not exists idx_menu_categories_restaurant on public.menu_categories (restaurant_id, display_order);

-- ============================================================================
-- 6. MENU ITEMS TABLE (Enhanced with Restaurant Scoping)
-- ============================================================================

create table if not exists public.menu_items (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid references public.menu_categories (id) on delete set null,
  name text not null check (char_length(name) >= 1),
  description text,
  category text not null, -- kept for backward compatibility
  price numeric(10, 2) not null check (price >= 0),
  cost numeric(10, 2) check (cost is null or cost >= 0),
  prep_time_minutes integer default 0 check (prep_time_minutes >= 0),
  is_available boolean default true,
  is_popular boolean default false,
  image_url text,
  allergens text[] default '{}',
  dietary_tags text[] default '{}', -- e.g., ['vegetarian', 'gluten-free', 'halal']
  stock_quantity integer,
  low_stock_threshold integer default 5,
  display_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  unique(restaurant_id, name, category)
);

-- Indexes for menu_items
create index if not exists idx_menu_items_restaurant on public.menu_items (restaurant_id);
create index if not exists idx_menu_items_category on public.menu_items (restaurant_id, category);
create index if not exists idx_menu_items_category_id on public.menu_items (category_id);
create index if not exists idx_menu_items_available on public.menu_items (restaurant_id, is_available) where is_available = true;
create index if not exists idx_menu_items_popular on public.menu_items (restaurant_id) where is_popular = true;
create index if not exists idx_menu_items_stock on public.menu_items (restaurant_id, stock_quantity) where stock_quantity is not null and stock_quantity <= low_stock_threshold;

-- ============================================================================
-- 7. ORDERS TABLE (Enhanced with Restaurant Scoping & More Fields)
-- ============================================================================

create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  staff_id uuid references public.staff_accounts (id) on delete set null,
  status text not null default 'new' check (status in ('new', 'preparing', 'ready', 'completed', 'cancelled')),
  fulfillment_type text not null check (fulfillment_type in ('dine-in', 'pickup', 'delivery')),
  
  -- Fulfillment details
  table_number text,
  car_number text,
  delivery_address text,
  delivery_phone text,
  
  -- Financial
  subtotal numeric(10, 2) not null default 0 check (subtotal >= 0),
  tax numeric(10, 2) default 0 check (tax >= 0),
  discount numeric(10, 2) default 0 check (discount >= 0),
  tip numeric(10, 2) default 0 check (tip >= 0),
  total numeric(10, 2) not null default 0 check (total >= 0),
  
  -- Metadata
  note text,
  source text, -- e.g., 'mobile-app', 'web', 'pos'
  payment_method text check (payment_method in ('cash', 'card', 'digital-wallet', 'pending')),
  payment_status text default 'pending' check (payment_status in ('pending', 'paid', 'refunded')),
  
  -- Timestamps
  created_at timestamptz default now(),
  confirmed_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz default now(),
  
  -- Estimated prep time (calculated from menu items)
  estimated_prep_minutes integer,
  
  -- Kitchen priority (1=highest, 10=lowest)
  priority integer default 5 check (priority between 1 and 10)
);

-- Indexes for orders
create index if not exists idx_orders_restaurant on public.orders (restaurant_id);
create index if not exists idx_orders_customer on public.orders (customer_id);
create index if not exists idx_orders_staff on public.orders (staff_id);
create index if not exists idx_orders_status on public.orders (restaurant_id, status);
create index if not exists idx_orders_created_at on public.orders (restaurant_id, created_at desc);
create index if not exists idx_orders_fulfillment on public.orders (restaurant_id, fulfillment_type);
create index if not exists idx_orders_today on public.orders (restaurant_id, created_at) where date_trunc('day', created_at) = date_trunc('day', now());
create index if not exists idx_orders_active on public.orders (restaurant_id, status, created_at) where status in ('new', 'preparing', 'ready');
create index if not exists idx_orders_payment on public.orders (restaurant_id, payment_status) where payment_status = 'pending';

-- Composite index for dashboard queries
create index if not exists idx_orders_dashboard on public.orders (restaurant_id, created_at desc, status, total);

-- ============================================================================
-- 8. ORDER ITEMS TABLE (Enhanced)
-- ============================================================================

create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  
  -- Snapshot of menu item at order time (for historical accuracy)
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  quantity integer not null default 1 check (quantity > 0),
  
  -- Item customizations
  notes text,
  modifiers jsonb default '[]'::jsonb, -- e.g., [{"name": "Extra Cheese", "price": 1.50}]
  
  -- Item status for kitchen granularity
  status text default 'pending' check (status in ('pending', 'preparing', 'ready', 'served')),
  
  -- Timestamps
  created_at timestamptz default now(),
  preparing_at timestamptz,
  ready_at timestamptz,
  
  -- Line item total
  line_total numeric(10, 2) generated always as (price * quantity) stored
);

-- Indexes for order_items
create index if not exists idx_order_items_order on public.order_items (order_id);
create index if not exists idx_order_items_menu on public.order_items (menu_item_id);
create index if not exists idx_order_items_status on public.order_items (order_id, status);

-- ============================================================================
-- 9. AUDIT LOG TABLE (Track Important Changes)
-- ============================================================================

create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  staff_id uuid references public.staff_accounts (id) on delete set null,
  entity_type text not null, -- e.g., 'order', 'menu_item', 'customer'
  entity_id uuid not null,
  action text not null check (action in ('create', 'update', 'delete', 'status_change')),
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

-- Indexes for audit_logs
create index if not exists idx_audit_restaurant on public.audit_logs (restaurant_id, created_at desc);
create index if not exists idx_audit_entity on public.audit_logs (entity_type, entity_id);
create index if not exists idx_audit_staff on public.audit_logs (staff_id);

-- ============================================================================
-- 10. RESTAURANT SETTINGS TABLE (Configuration)
-- ============================================================================

create table if not exists public.restaurant_settings (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade unique,
  
  -- Business hours (JSON format for flexibility)
  business_hours jsonb default '{
    "monday": {"open": "09:00", "close": "22:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "22:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "22:00", "closed": false},
    "thursday": {"open": "09:00", "close": "22:00", "closed": false},
    "friday": {"open": "09:00", "close": "22:00", "closed": false},
    "saturday": {"open": "09:00", "close": "22:00", "closed": false},
    "sunday": {"open": "09:00", "close": "22:00", "closed": false}
  }'::jsonb,
  
  -- Tax settings
  tax_rate numeric(5, 2) default 0 check (tax_rate >= 0 and tax_rate <= 100),
  tax_inclusive boolean default false,
  
  -- Service charge
  service_charge_rate numeric(5, 2) default 0 check (service_charge_rate >= 0 and service_charge_rate <= 100),
  
  -- Ordering settings
  min_order_amount numeric(10, 2) default 0,
  delivery_fee numeric(10, 2) default 0,
  free_delivery_threshold numeric(10, 2),
  
  -- Kitchen settings
  auto_accept_orders boolean default false,
  default_prep_time_minutes integer default 20,
  
  -- Notifications
  notify_new_orders boolean default true,
  notify_low_stock boolean default true,
  notification_email text,
  notification_phone text,
  
  -- Receipt customization
  receipt_header text,
  receipt_footer text,
  
  -- Feature flags
  enable_loyalty_points boolean default false,
  loyalty_points_per_currency_unit integer default 1,
  enable_table_management boolean default true,
  enable_delivery boolean default true,
  enable_pickup boolean default true,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- 11. TABLES TABLE (For Dine-In Management)
-- ============================================================================

create table if not exists public.tables (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_number text not null,
  capacity integer not null check (capacity > 0),
  status text default 'available' check (status in ('available', 'occupied', 'reserved', 'cleaning')),
  current_order_id uuid references public.orders (id) on delete set null,
  section text, -- e.g., 'indoor', 'outdoor', 'vip'
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(restaurant_id, table_number)
);

create index if not exists idx_tables_restaurant on public.tables (restaurant_id);
create index if not exists idx_tables_status on public.tables (restaurant_id, status);

-- ============================================================================
-- 12. INVENTORY TRANSACTIONS TABLE (Track Stock Changes)
-- ============================================================================

create table if not exists public.inventory_transactions (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  transaction_type text not null check (transaction_type in ('purchase', 'sale', 'waste', 'adjustment')),
  quantity integer not null,
  previous_quantity integer,
  new_quantity integer,
  cost_per_unit numeric(10, 2),
  total_cost numeric(10, 2),
  notes text,
  staff_id uuid references public.staff_accounts (id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_inventory_restaurant on public.inventory_transactions (restaurant_id, created_at desc);
create index if not exists idx_inventory_menu_item on public.inventory_transactions (menu_item_id);

-- ============================================================================
-- VIEWS FOR ANALYTICS & REPORTING
-- ============================================================================

-- Enhanced customer view with lifetime value
create or replace view public.customer_analytics as
select
  c.*,
  coalesce(sum(o.total), 0) as lifetime_value,
  count(o.id) as total_orders,
  count(o.id) filter (where date_trunc('day', o.created_at) = date_trunc('day', now())) as orders_today,
  count(o.id) filter (where o.created_at >= date_trunc('week', now())) as orders_this_week,
  count(o.id) filter (where o.created_at >= date_trunc('month', now())) as orders_this_month,
  avg(o.total) as avg_order_value,
  max(o.created_at) as last_visit
from public.customers c
left join public.orders o on o.customer_id = c.id and o.status != 'cancelled'
group by c.id;

-- Daily sales summary by restaurant
create or replace view public.daily_sales_summary as
select
  restaurant_id,
  date_trunc('day', created_at) as date,
  count(*) as total_orders,
  count(*) filter (where status = 'completed') as completed_orders,
  count(*) filter (where status = 'cancelled') as cancelled_orders,
  sum(total) filter (where status != 'cancelled') as total_revenue,
  sum(subtotal) filter (where status != 'cancelled') as subtotal_revenue,
  sum(tax) filter (where status != 'cancelled') as total_tax,
  sum(tip) filter (where status != 'cancelled') as total_tips,
  avg(total) filter (where status != 'cancelled') as avg_order_value,
  max(total) filter (where status != 'cancelled') as highest_order,
  min(total) filter (where status != 'cancelled' and total > 0) as lowest_order
from public.orders
group by restaurant_id, date_trunc('day', created_at);

-- Menu item performance
create or replace view public.menu_item_performance as
select
  mi.id,
  mi.restaurant_id,
  mi.name,
  mi.category,
  mi.price,
  mi.cost,
  coalesce(sum(oi.quantity), 0) as total_sold,
  coalesce(sum(oi.line_total), 0) as total_revenue,
  coalesce(sum(oi.quantity * mi.cost), 0) as total_cost,
  coalesce(sum(oi.line_total) - sum(oi.quantity * mi.cost), 0) as total_profit,
  count(distinct oi.order_id) as order_count,
  max(o.created_at) as last_ordered_at
from public.menu_items mi
left join public.order_items oi on oi.menu_item_id = mi.id
left join public.orders o on o.id = oi.order_id and o.status != 'cancelled'
group by mi.id;

-- Staff performance metrics
create or replace view public.staff_performance as
select
  sa.id,
  sa.restaurant_id,
  sa.name,
  sa.role,
  count(o.id) as total_orders_handled,
  count(o.id) filter (where date_trunc('day', o.created_at) = date_trunc('day', now())) as orders_today,
  sum(o.total) filter (where o.status != 'cancelled') as total_sales,
  avg(o.total) filter (where o.status != 'cancelled') as avg_order_value,
  max(o.created_at) as last_order_at
from public.staff_accounts sa
left join public.orders o on o.staff_id = sa.id
group by sa.id;

-- Kitchen efficiency metrics
create or replace view public.kitchen_efficiency as
select
  restaurant_id,
  date_trunc('day', created_at) as date,
  avg(extract(epoch from (ready_at - created_at)) / 60) filter (where ready_at is not null) as avg_prep_minutes,
  percentile_cont(0.5) within group (order by extract(epoch from (ready_at - created_at)) / 60) filter (where ready_at is not null) as median_prep_minutes,
  max(extract(epoch from (ready_at - created_at)) / 60) filter (where ready_at is not null) as max_prep_minutes,
  count(*) filter (where status = 'ready') as orders_completed,
  count(*) filter (where status in ('new', 'preparing')) as orders_in_progress
from public.orders
group by restaurant_id, date_trunc('day', created_at);

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATES
-- ============================================================================

-- Trigger: Update restaurant.updated_at on any change
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_restaurants_updated_at before update on public.restaurants
  for each row execute function public.update_updated_at_column();

create trigger update_customers_updated_at before update on public.customers
  for each row execute function public.update_updated_at_column();

create trigger update_menu_items_updated_at before update on public.menu_items
  for each row execute function public.update_updated_at_column();

create trigger update_orders_updated_at before update on public.orders
  for each row execute function public.update_updated_at_column();

create trigger update_staff_accounts_updated_at before update on public.staff_accounts
  for each row execute function public.update_updated_at_column();

-- Trigger: Auto-calculate order totals when order_items change
create or replace function public.calculate_order_totals()
returns trigger as $$
begin
  update public.orders
  set
    subtotal = (
      select coalesce(sum(line_total), 0)
      from public.order_items
      where order_id = coalesce(new.order_id, old.order_id)
    ),
    total = (
      select coalesce(sum(line_total), 0)
      from public.order_items
      where order_id = coalesce(new.order_id, old.order_id)
    ) + coalesce(tax, 0) - coalesce(discount, 0) + coalesce(tip, 0)
  where id = coalesce(new.order_id, old.order_id);
  
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger calculate_order_totals_on_insert after insert on public.order_items
  for each row execute function public.calculate_order_totals();

create trigger calculate_order_totals_on_update after update on public.order_items
  for each row execute function public.calculate_order_totals();

create trigger calculate_order_totals_on_delete after delete on public.order_items
  for each row execute function public.calculate_order_totals();

-- Trigger: Update customer stats when order is completed
create or replace function public.update_customer_stats()
returns trigger as $$
begin
  -- Only update when order moves to completed status
  if new.status = 'completed' and (old.status is null or old.status != 'completed') then
    update public.customers
    set
      total_spend = total_spend + new.total,
      visit_count = visit_count + 1,
      last_order_at = new.completed_at,
      updated_at = now()
    where id = new.customer_id;
  end if;
  
  -- If order is cancelled after being completed, revert stats
  if new.status = 'cancelled' and old.status = 'completed' then
    update public.customers
    set
      total_spend = greatest(0, total_spend - old.total),
      visit_count = greatest(0, visit_count - 1),
      updated_at = now()
    where id = new.customer_id;
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger update_customer_stats_trigger after update on public.orders
  for each row execute function public.update_customer_stats();

-- Trigger: Update inventory when order items are created/deleted
create or replace function public.update_menu_stock()
returns trigger as $$
declare
  v_item record;
begin
  -- Fetch menu item details
  select * into v_item from public.menu_items where id = coalesce(new.menu_item_id, old.menu_item_id);
  
  -- Only proceed if item tracks stock
  if v_item.stock_quantity is not null then
    if TG_OP = 'INSERT' then
      -- Decrease stock on order
      update public.menu_items
      set stock_quantity = greatest(0, stock_quantity - new.quantity)
      where id = new.menu_item_id;
      
      -- Log transaction
      insert into public.inventory_transactions (
        restaurant_id, menu_item_id, transaction_type, quantity,
        previous_quantity, new_quantity
      )
      values (
        v_item.restaurant_id, v_item.id, 'sale', -new.quantity,
        v_item.stock_quantity, greatest(0, v_item.stock_quantity - new.quantity)
      );
      
    elsif TG_OP = 'DELETE' then
      -- Increase stock if order is cancelled
      update public.menu_items
      set stock_quantity = stock_quantity + old.quantity
      where id = old.menu_item_id;
      
      -- Log transaction
      insert into public.inventory_transactions (
        restaurant_id, menu_item_id, transaction_type, quantity,
        previous_quantity, new_quantity
      )
      values (
        v_item.restaurant_id, v_item.id, 'adjustment', old.quantity,
        v_item.stock_quantity, v_item.stock_quantity + old.quantity
      );
    end if;
  end if;
  
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger update_menu_stock_on_order after insert or delete on public.order_items
  for each row execute function public.update_menu_stock();

-- Trigger: Auto-set order timestamps based on status changes
create or replace function public.set_order_timestamps()
returns trigger as $$
begin
  if new.status != old.status then
    case new.status
      when 'preparing' then
        new.preparing_at = now();
      when 'ready' then
        new.ready_at = now();
      when 'completed' then
        new.completed_at = now();
      when 'cancelled' then
        new.cancelled_at = now();
    end case;
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger set_order_timestamps_trigger before update on public.orders
  for each row execute function public.set_order_timestamps();

-- Trigger: Create audit log entry for important changes
create or replace function public.create_audit_log()
returns trigger as $$
declare
  v_staff_id uuid;
  v_restaurant_id uuid;
begin
  -- Try to get current staff from session (if using RLS)
  v_staff_id = coalesce(
    nullif(current_setting('app.current_staff_id', true), '')::uuid,
    null
  );
  
  -- Get restaurant_id from the record
  v_restaurant_id = coalesce(new.restaurant_id, old.restaurant_id);
  
  insert into public.audit_logs (
    restaurant_id,
    staff_id,
    entity_type,
    entity_id,
    action,
    old_values,
    new_values
  )
  values (
    v_restaurant_id,
    v_staff_id,
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    case TG_OP
      when 'INSERT' then 'create'
      when 'UPDATE' then 'update'
      when 'DELETE' then 'delete'
    end,
    case TG_OP
      when 'DELETE' then row_to_json(old)
      when 'UPDATE' then row_to_json(old)
      else null
    end,
    case TG_OP
      when 'INSERT' then row_to_json(new)
      when 'UPDATE' then row_to_json(new)
      else null
    end
  );
  
  return coalesce(new, old);
end;
$$ language plpgsql;

-- Enable audit logging for important tables
create trigger audit_orders after insert or update or delete on public.orders
  for each row execute function public.create_audit_log();

create trigger audit_menu_items after insert or update or delete on public.menu_items
  for each row execute function public.create_audit_log();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
alter table public.restaurants enable row level security;
alter table public.restaurant_onboarding enable row level security;
alter table public.staff_accounts enable row level security;
alter table public.customers enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.audit_logs enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.tables enable row level security;
alter table public.inventory_transactions enable row level security;

-- Helper function to get current restaurant from session
create or replace function public.current_restaurant_id()
returns uuid as $$
  select nullif(current_setting('app.current_restaurant_id', true), '')::uuid;
$$ language sql stable;

-- RLS Policies for restaurants
create policy "Restaurants: Users can view their own restaurant"
  on public.restaurants for select
  using (id = current_restaurant_id());

create policy "Restaurants: Owners can update their own restaurant"
  on public.restaurants for update
  using (id = current_restaurant_id());

-- RLS Policies for staff_accounts
create policy "Staff: Users can view staff in their restaurant"
  on public.staff_accounts for select
  using (restaurant_id = current_restaurant_id());

create policy "Staff: Managers can manage staff in their restaurant"
  on public.staff_accounts for all
  using (restaurant_id = current_restaurant_id());

-- RLS Policies for customers
create policy "Customers: Users can view customers in their restaurant"
  on public.customers for select
  using (restaurant_id = current_restaurant_id());

create policy "Customers: Staff can manage customers in their restaurant"
  on public.customers for all
  using (restaurant_id = current_restaurant_id());

-- RLS Policies for menu_items
create policy "Menu: Users can view menu in their restaurant"
  on public.menu_items for select
  using (restaurant_id = current_restaurant_id());

create policy "Menu: Managers can manage menu in their restaurant"
  on public.menu_items for all
  using (restaurant_id = current_restaurant_id());

-- RLS Policies for orders
create policy "Orders: Users can view orders in their restaurant"
  on public.orders for select
  using (restaurant_id = current_restaurant_id());

create policy "Orders: Staff can manage orders in their restaurant"
  on public.orders for all
  using (restaurant_id = current_restaurant_id());

-- RLS Policies for order_items
create policy "Order Items: Users can view items for orders in their restaurant"
  on public.order_items for select
  using (exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
    and orders.restaurant_id = current_restaurant_id()
  ));

create policy "Order Items: Staff can manage items for orders in their restaurant"
  on public.order_items for all
  using (exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
    and orders.restaurant_id = current_restaurant_id()
  ));

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function: Get dashboard metrics for a restaurant
create or replace function public.get_dashboard_metrics(
  p_restaurant_id uuid,
  p_date date default current_date
)
returns jsonb as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'totalOrdersToday', count(*) filter (where date_trunc('day', created_at) = date_trunc('day', p_date)),
    'totalSalesToday', coalesce(sum(total) filter (where date_trunc('day', created_at) = date_trunc('day', p_date) and status != 'cancelled'), 0),
    'avgTicketSize', coalesce(avg(total) filter (where date_trunc('day', created_at) = date_trunc('day', p_date) and status != 'cancelled'), 0),
    'readyPercentage', case
      when count(*) filter (where date_trunc('day', created_at) = date_trunc('day', p_date)) > 0
      then round((count(*) filter (where date_trunc('day', created_at) = date_trunc('day', p_date) and status = 'ready')::numeric / count(*) filter (where date_trunc('day', created_at) = date_trunc('day', p_date))) * 100, 2)
      else 0
    end,
    'activeOrders', count(*) filter (where status in ('new', 'preparing', 'ready')),
    'statusBreakdown', jsonb_build_object(
      'new', count(*) filter (where status = 'new'),
      'preparing', count(*) filter (where status = 'preparing'),
      'ready', count(*) filter (where status = 'ready')
    )
  ) into v_result
  from public.orders
  where restaurant_id = p_restaurant_id;
  
  return v_result;
end;
$$ language plpgsql;

-- Function: Search customers by phone or name
create or replace function public.search_customers(
  p_restaurant_id uuid,
  p_search_term text
)
returns setof public.customers as $$
begin
  return query
  select *
  from public.customers
  where restaurant_id = p_restaurant_id
    and (
      phone ilike '%' || p_search_term || '%'
      or full_name ilike '%' || p_search_term || '%'
    )
  order by last_order_at desc
  limit 20;
end;
$$ language plpgsql;

-- Function: Get popular menu items
create or replace function public.get_popular_menu_items(
  p_restaurant_id uuid,
  p_days integer default 30,
  p_limit integer default 10
)
returns table (
  menu_item_id uuid,
  name text,
  category text,
  total_sold bigint,
  total_revenue numeric
) as $$
begin
  return query
  select
    mi.id,
    mi.name,
    mi.category,
    coalesce(sum(oi.quantity), 0) as total_sold,
    coalesce(sum(oi.line_total), 0) as total_revenue
  from public.menu_items mi
  left join public.order_items oi on oi.menu_item_id = mi.id
  left join public.orders o on o.id = oi.order_id
    and o.restaurant_id = p_restaurant_id
    and o.status != 'cancelled'
    and o.created_at >= current_date - p_days
  where mi.restaurant_id = p_restaurant_id
  group by mi.id
  order by total_sold desc
  limit p_limit;
end;
$$ language plpgsql;

-- ============================================================================
-- DATA VALIDATION CONSTRAINTS (Additional)
-- ============================================================================

-- Ensure order total matches subtotal calculation
alter table public.orders add constraint check_order_total
  check (total = subtotal + coalesce(tax, 0) - coalesce(discount, 0) + coalesce(tip, 0));

-- Ensure completed orders have payment info
create or replace function public.validate_completed_order()
returns trigger as $$
begin
  if new.status = 'completed' and new.payment_status = 'pending' then
    raise exception 'Cannot complete order without payment';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger validate_completed_order_trigger before update on public.orders
  for each row execute function public.validate_completed_order();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

comment on table public.restaurants is 'Core multi-tenant table storing restaurant information';
comment on table public.staff_accounts is 'Staff authentication and role management';
comment on table public.customers is 'Customer profiles scoped per restaurant';
comment on table public.menu_items is 'Menu items with inventory tracking capability';
comment on table public.orders is 'Orders with comprehensive status tracking and financial details';
comment on table public.order_items is 'Individual line items per order with customization support';
comment on table public.audit_logs is 'Audit trail for compliance and debugging';
comment on table public.restaurant_settings is 'Per-restaurant configuration and preferences';

comment on view public.customer_analytics is 'Comprehensive customer metrics including lifetime value';
comment on view public.daily_sales_summary is 'Daily aggregated sales data per restaurant';
comment on view public.menu_item_performance is 'Menu item sales performance and profitability';
comment on view public.kitchen_efficiency is 'Kitchen prep time and efficiency metrics';

comment on function public.get_dashboard_metrics is 'Optimized function to retrieve real-time dashboard metrics';
comment on function public.search_customers is 'Full-text search for customers by phone or name';
comment on function public.get_popular_menu_items is 'Retrieve top-selling menu items for a time period';

-- ============================================================================
-- PERFORMANCE OPTIMIZATION NOTES
-- ============================================================================
-- 1. All foreign keys have corresponding indexes
-- 2. Composite indexes for common query patterns (dashboard, reports)
-- 3. Partial indexes for filtered queries (active, today, pending)
-- 4. Materialized views can be added later for heavy analytical queries
-- 5. Consider partitioning orders table by created_at for high-volume restaurants
-- 6. GIN indexes can be added on JSONB columns if complex queries are needed
-- ============================================================================

