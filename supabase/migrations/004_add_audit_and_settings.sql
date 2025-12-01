-- Migration 004: Add audit logs and restaurant settings

-- Create audit logs table
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  staff_id uuid references public.staff_accounts (id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null check (action in ('create', 'update', 'delete', 'status_change')),
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

create index idx_audit_restaurant on public.audit_logs (restaurant_id, created_at desc);
create index idx_audit_entity on public.audit_logs (entity_type, entity_id);
create index idx_audit_staff on public.audit_logs (staff_id);

-- Create restaurant settings table
create table if not exists public.restaurant_settings (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade unique,
  business_hours jsonb default '{
    "monday": {"open": "09:00", "close": "22:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "22:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "22:00", "closed": false},
    "thursday": {"open": "09:00", "close": "22:00", "closed": false},
    "friday": {"open": "09:00", "close": "22:00", "closed": false},
    "saturday": {"open": "09:00", "close": "22:00", "closed": false},
    "sunday": {"open": "09:00", "close": "22:00", "closed": false}
  }'::jsonb,
  tax_rate numeric(5, 2) default 0 check (tax_rate >= 0 and tax_rate <= 100),
  tax_inclusive boolean default false,
  service_charge_rate numeric(5, 2) default 0 check (service_charge_rate >= 0 and service_charge_rate <= 100),
  min_order_amount numeric(10, 2) default 0,
  delivery_fee numeric(10, 2) default 0,
  free_delivery_threshold numeric(10, 2),
  auto_accept_orders boolean default false,
  default_prep_time_minutes integer default 20,
  notify_new_orders boolean default true,
  notify_low_stock boolean default true,
  notification_email text,
  notification_phone text,
  receipt_header text,
  receipt_footer text,
  enable_loyalty_points boolean default false,
  loyalty_points_per_currency_unit integer default 1,
  enable_table_management boolean default true,
  enable_delivery boolean default true,
  enable_pickup boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create audit log trigger function
create or replace function public.create_audit_log()
returns trigger as $$
declare
  v_staff_id uuid;
  v_restaurant_id uuid;
begin
  v_staff_id = coalesce(
    nullif(current_setting('app.current_staff_id', true), '')::uuid,
    null
  );
  
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

-- Trigger for restaurant_settings updated_at
create trigger update_restaurant_settings_updated_at before update on public.restaurant_settings
  for each row execute function public.update_updated_at_column();

