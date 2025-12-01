-- Migration 003: Enhance orders and order_items with additional fields

-- Add new status values and fields to orders table
alter table public.orders alter column status drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check 
  check (status in ('new', 'preparing', 'ready', 'completed', 'cancelled'));

-- Add financial fields
alter table public.orders add column if not exists subtotal numeric(10, 2) default 0 check (subtotal >= 0);
alter table public.orders add column if not exists tax numeric(10, 2) default 0 check (tax >= 0);
alter table public.orders add column if not exists discount numeric(10, 2) default 0 check (discount >= 0);
alter table public.orders add column if not exists tip numeric(10, 2) default 0 check (tip >= 0);

-- Add delivery fields
alter table public.orders add column if not exists delivery_address text;
alter table public.orders add column if not exists delivery_phone text;

-- Add payment fields
alter table public.orders add column if not exists payment_method text 
  check (payment_method in ('cash', 'card', 'digital-wallet', 'pending'));
alter table public.orders add column if not exists payment_status text default 'pending' 
  check (payment_status in ('pending', 'paid', 'refunded'));

-- Add timestamp fields
alter table public.orders add column if not exists confirmed_at timestamptz;
alter table public.orders add column if not exists preparing_at timestamptz;
alter table public.orders add column if not exists completed_at timestamptz;
alter table public.orders add column if not exists cancelled_at timestamptz;
alter table public.orders add column if not exists updated_at timestamptz default now();

-- Add prep time and priority
alter table public.orders add column if not exists estimated_prep_minutes integer;
alter table public.orders add column if not exists priority integer default 5 check (priority between 1 and 10);

-- Enhance order_items table
alter table public.order_items add column if not exists modifiers jsonb default '[]'::jsonb;
alter table public.order_items add column if not exists status text default 'pending' 
  check (status in ('pending', 'preparing', 'ready', 'served'));
alter table public.order_items add column if not exists preparing_at timestamptz;
alter table public.order_items add column if not exists ready_at timestamptz;

-- Add computed column for line_total
alter table public.order_items 
  add column if not exists line_total numeric(10, 2) 
  generated always as (price * quantity) stored;

-- Create trigger to auto-calculate order totals
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

-- Create trigger for order timestamp updates
create or replace function public.set_order_timestamps()
returns trigger as $$
begin
  if new.status != coalesce(old.status, '') then
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

-- Create indexes for new fields
create index if not exists idx_orders_payment on public.orders (restaurant_id, payment_status) 
  where payment_status = 'pending';
create index if not exists idx_orders_active on public.orders (restaurant_id, status, created_at) 
  where status in ('new', 'preparing', 'ready');

