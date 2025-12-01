-- Migration 005: Add enhanced features (categories, tables, inventory, customer fields)

-- Add enhanced customer fields
alter table public.customers add column if not exists email text 
  check (email is null or email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
alter table public.customers add column if not exists notes text;
alter table public.customers add column if not exists loyalty_points integer default 0 check (loyalty_points >= 0);
alter table public.customers add column if not exists is_vip boolean default false;
alter table public.customers add column if not exists tags text[] default '{}';
alter table public.customers add column if not exists updated_at timestamptz default now();

-- Create menu categories table
create table if not exists public.menu_categories (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  display_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(restaurant_id, name)
);

create index idx_menu_categories_restaurant on public.menu_categories (restaurant_id, display_order);

-- Add enhanced menu item fields
alter table public.menu_items add column if not exists category_id uuid 
  references public.menu_categories (id) on delete set null;
alter table public.menu_items add column if not exists description text;
alter table public.menu_items add column if not exists cost numeric(10, 2) check (cost is null or cost >= 0);
alter table public.menu_items add column if not exists is_popular boolean default false;
alter table public.menu_items add column if not exists image_url text;
alter table public.menu_items add column if not exists allergens text[] default '{}';
alter table public.menu_items add column if not exists dietary_tags text[] default '{}';
alter table public.menu_items add column if not exists stock_quantity integer;
alter table public.menu_items add column if not exists low_stock_threshold integer default 5;
alter table public.menu_items add column if not exists display_order integer default 0;

create index idx_menu_items_category_id on public.menu_items (category_id);
create index idx_menu_items_popular on public.menu_items (restaurant_id) where is_popular = true;

-- Create tables table for dine-in management
create table if not exists public.tables (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_number text not null,
  capacity integer not null check (capacity > 0),
  status text default 'available' check (status in ('available', 'occupied', 'reserved', 'cleaning')),
  current_order_id uuid references public.orders (id) on delete set null,
  section text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(restaurant_id, table_number)
);

create index idx_tables_restaurant on public.tables (restaurant_id);
create index idx_tables_status on public.tables (restaurant_id, status);

-- Create inventory transactions table
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

create index idx_inventory_restaurant on public.inventory_transactions (restaurant_id, created_at desc);
create index idx_inventory_menu_item on public.inventory_transactions (menu_item_id);

-- Trigger: Update customer stats when order is completed
create or replace function public.update_customer_stats()
returns trigger as $$
begin
  if new.status = 'completed' and (old.status is null or old.status != 'completed') then
    update public.customers
    set
      total_spend = total_spend + new.total,
      visit_count = visit_count + 1,
      last_order_at = new.completed_at,
      updated_at = now()
    where id = new.customer_id;
  end if;
  
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

-- Trigger: Update inventory when orders are placed
create or replace function public.update_menu_stock()
returns trigger as $$
declare
  v_item record;
begin
  select * into v_item from public.menu_items where id = coalesce(new.menu_item_id, old.menu_item_id);
  
  if v_item.stock_quantity is not null then
    if TG_OP = 'INSERT' then
      update public.menu_items
      set stock_quantity = greatest(0, stock_quantity - new.quantity)
      where id = new.menu_item_id;
      
      insert into public.inventory_transactions (
        restaurant_id, menu_item_id, transaction_type, quantity,
        previous_quantity, new_quantity
      )
      values (
        v_item.restaurant_id, v_item.id, 'sale', -new.quantity,
        v_item.stock_quantity, greatest(0, v_item.stock_quantity - new.quantity)
      );
      
    elsif TG_OP = 'DELETE' then
      update public.menu_items
      set stock_quantity = stock_quantity + old.quantity
      where id = old.menu_item_id;
      
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

-- Trigger for tables updated_at
create trigger update_tables_updated_at before update on public.tables
  for each row execute function public.update_updated_at_column();

