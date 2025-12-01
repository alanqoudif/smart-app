-- Migration 001: Add restaurants and staff accounts tables
-- This migration adds multi-tenant support to the existing schema

-- Enable required extensions
create extension if not exists "pgcrypto";

-- Create restaurants table
create table if not exists public.restaurants (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique check (char_length(code) >= 4),
  name text not null check (char_length(name) >= 2),
  owner_name text not null,
  owner_email text not null unique check (owner_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  owner_password_hash text not null,
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

-- Create restaurant onboarding table
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

-- Create staff accounts table
create table if not exists public.staff_accounts (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(name) >= 2),
  role text not null check (role in ('waiter', 'chef', 'manager', 'cashier')),
  passcode_hash text not null,
  is_owner boolean default false,
  is_active boolean default true,
  last_login_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes
create index idx_restaurants_code on public.restaurants (code);
create index idx_restaurants_owner_email on public.restaurants (owner_email);
create index idx_restaurants_is_active on public.restaurants (is_active) where is_active = true;
create index idx_staff_restaurant on public.staff_accounts (restaurant_id);
create index idx_staff_role on public.staff_accounts (restaurant_id, role) where is_active = true;

-- Add updated_at trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_restaurants_updated_at before update on public.restaurants
  for each row execute function public.update_updated_at_column();

create trigger update_staff_accounts_updated_at before update on public.staff_accounts
  for each row execute function public.update_updated_at_column();

