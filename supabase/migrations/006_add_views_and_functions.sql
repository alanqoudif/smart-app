-- Migration 006: Add analytical views and utility functions

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

-- Function: Helper to get current restaurant from session
create or replace function public.current_restaurant_id()
returns uuid as $$
  select nullif(current_setting('app.current_restaurant_id', true), '')::uuid;
$$ language sql stable;

-- Comments for documentation
comment on view public.customer_analytics is 'Comprehensive customer metrics including lifetime value';
comment on view public.daily_sales_summary is 'Daily aggregated sales data per restaurant';
comment on view public.menu_item_performance is 'Menu item sales performance and profitability';
comment on view public.kitchen_efficiency is 'Kitchen prep time and efficiency metrics';
comment on function public.get_dashboard_metrics is 'Optimized function to retrieve real-time dashboard metrics';
comment on function public.search_customers is 'Full-text search for customers by phone or name';
comment on function public.get_popular_menu_items is 'Retrieve top-selling menu items for a time period';

