-- Migration 002: Add restaurant_id to existing tables (customers, menu_items, orders)
-- This migration makes the existing tables multi-tenant aware

-- Add restaurant_id to customers table
alter table public.customers 
  add column if not exists restaurant_id uuid references public.restaurants (id) on delete cascade;

-- Add restaurant_id to menu_items table
alter table public.menu_items 
  add column if not exists restaurant_id uuid references public.restaurants (id) on delete cascade;

-- Add restaurant_id to orders table
alter table public.orders 
  add column if not exists restaurant_id uuid references public.restaurants (id) on delete cascade;

-- Add staff_id to orders table
alter table public.orders 
  add column if not exists staff_id uuid references public.staff_accounts (id) on delete set null;

-- Update unique constraints to be scoped per restaurant
-- Drop old constraint on customers if it exists
alter table public.customers drop constraint if exists customers_phone_key;

-- Add new composite unique constraint
alter table public.customers 
  add constraint customers_restaurant_phone_unique unique (restaurant_id, phone);

-- Add new composite unique constraint on menu_items
alter table public.menu_items 
  drop constraint if exists menu_items_name_category_key;

alter table public.menu_items 
  add constraint menu_items_restaurant_name_category_unique unique (restaurant_id, name, category);

-- Create new indexes
create index if not exists idx_customers_restaurant on public.customers (restaurant_id);
create index if not exists idx_menu_items_restaurant on public.menu_items (restaurant_id);
create index if not exists idx_orders_restaurant on public.orders (restaurant_id);
create index if not exists idx_orders_staff on public.orders (staff_id);

-- Update existing triggers
create trigger update_customers_updated_at before update on public.customers
  for each row execute function public.update_updated_at_column();

create trigger update_menu_items_updated_at before update on public.menu_items
  for each row execute function public.update_updated_at_column();

create trigger update_orders_updated_at before update on public.orders
  for each row execute function public.update_updated_at_column();

