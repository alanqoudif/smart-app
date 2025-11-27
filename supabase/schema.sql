-- Enable UUID helpers in case the project doesn't have them yet.
create extension if not exists "uuid-ossp";

create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  phone text not null unique,
  total_spend numeric(12, 2) default 0,
  visit_count integer default 0,
  last_order_at timestamptz default now(),
  favorite_dish text,
  created_at timestamptz default now()
);

create table if not exists public.menu_items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,
  price numeric(10, 2) not null,
  prep_time_minutes integer default 0,
  is_available boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references public.customers (id) on delete set null,
  status text not null default 'new',
  fulfillment_type text not null,
  table_number text,
  total numeric(10, 2) not null default 0,
  note text,
  ready_at timestamptz,
  source text,
  created_at timestamptz default now()
);

create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id),
  name text not null,
  price numeric(10, 2) not null,
  quantity integer not null default 1,
  notes text,
  created_at timestamptz default now()
);

create or replace view public.customer_order_activity as
select
  c.*,
  coalesce(sum(o.total), 0) as lifetime_sales,
  count(o.id) filter (where date_trunc('day', o.created_at) = date_trunc('day', now())) as orders_today
from public.customers c
left join public.orders o on o.customer_id = c.id
group by c.id;

create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_customers_phone on public.customers (phone);
