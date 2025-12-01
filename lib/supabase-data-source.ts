import { CreateOrderPayload, Customer, MenuItem, Order, OrderStatus } from '@/types';

import { SmartDataSource } from './data-source';
import { supabase } from './supabase';

type SupabaseCustomerRow = {
  id: string;
  full_name: string;
  phone: string;
  total_spend: number;
  visit_count: number;
  last_order_at: string;
  favorite_dish?: string;
};

type SupabaseOrderRow = {
  id: string;
  status: OrderStatus;
  fulfillment_type: string;
  car_number?: string | null;
  table_number?: string | null;
  total: number;
  created_at: string;
  note?: string | null;
  ready_at?: string | null;
  source?: string | null;
  customers: SupabaseCustomerRow | null;
  order_items: Array<{
    id: string;
    menu_item_id?: string | null;
    name: string;
    price: number;
    quantity: number;
    notes?: string | null;
  }>;
};

function mapCustomer(row: SupabaseCustomerRow): Customer {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    totalSpend: row.total_spend ?? 0,
    visitCount: row.visit_count ?? 0,
    lastOrderAt: row.last_order_at,
    favoriteDish: row.favorite_dish ?? undefined,
  };
}

function mapOrder(row: SupabaseOrderRow): Order {
  if (!row.customers) {
    throw new Error('Order is missing a customer relation');
  }

  return {
    id: row.id,
    status: row.status,
    fulfillmentType: row.fulfillment_type as Order['fulfillmentType'],
    carNumber: row.car_number ?? undefined,
    tableNumber: row.table_number ?? undefined,
    customer: mapCustomer(row.customers),
    total: row.total,
    createdAt: row.created_at,
    note: row.note ?? undefined,
    readyAt: row.ready_at ?? undefined,
    source: row.source ?? undefined,
    items: row.order_items.map((item) => ({
      id: item.id,
      menuItemId: item.menu_item_id ?? undefined,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      notes: item.notes ?? undefined,
    })),
  };
}

async function upsertCustomer(payload: CreateOrderPayload['customer'], total: number): Promise<string> {
  const fullName = payload.fullName?.trim() || 'بدون اسم';
  const normalizedPhone = payload.phone?.trim() ?? '';

  if (!normalizedPhone) {
    const { data: createdNoPhone, error: insertWithoutPhone } = await supabase!
      .from('customers')
      .insert({
        full_name: fullName,
        phone: 'غير متوفر',
        total_spend: total,
        visit_count: 1,
        last_order_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertWithoutPhone) {
      throw insertWithoutPhone;
    }

    return createdNoPhone.id;
  }

  const { data: existing, error } = await supabase!
    .from('customers')
    .select('*')
    .eq('phone', normalizedPhone)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!existing) {
    const { data: created, error: insertError } = await supabase!
      .from('customers')
      .insert({
        full_name: fullName,
        phone: normalizedPhone,
        total_spend: total,
        visit_count: 1,
        last_order_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }
    return created.id;
  }

  const { data: updated, error: updateError } = await supabase!
    .from('customers')
    .update({
      full_name: fullName,
      total_spend: existing.total_spend + total,
      visit_count: existing.visit_count + 1,
      last_order_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  return updated.id;
}

export const supabaseDataSource: SmartDataSource | null = supabase
  ? {
      id: 'supabase',
      async listMenuItems(): Promise<MenuItem[]> {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .order('category', { ascending: true });
        if (error) {
          throw error;
        }
        return data.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          isAvailable: item.is_available,
          prepTimeMinutes: item.prep_time_minutes ?? 0,
        }));
      },
      async listOrders(): Promise<Order[]> {
        const { data, error } = await supabase
          .from('orders')
          .select(
            `
            id,
            status,
            fulfillment_type,
            car_number,
            table_number,
            total,
            note,
            created_at,
            ready_at,
            source,
            customers:customer_id (
              id,
              full_name,
              phone,
              total_spend,
              visit_count,
              last_order_at,
              favorite_dish
            ),
            order_items (
              id,
              menu_item_id,
              name,
              price,
              quantity,
              notes
            )
          `,
          )
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }
        return data.map((row) => mapOrder(row as SupabaseOrderRow));
      },
      async listCustomers(): Promise<Customer[]> {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('last_order_at', { ascending: false });
        if (error) {
          throw error;
        }
        return data.map((row) => mapCustomer(row as SupabaseCustomerRow));
      },
      async createOrder(payload: CreateOrderPayload): Promise<Order> {
        const total = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const customerId = await upsertCustomer(payload.customer, total);

        const { data: orderRow, error } = await supabase
          .from('orders')
          .insert({
            customer_id: customerId,
            status: 'new',
            fulfillment_type: payload.fulfillmentType,
            car_number: payload.carNumber ?? null,
            table_number: payload.tableNumber ?? null,
            total,
            note: payload.note ?? null,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        const { error: itemsError } = await supabase.from('order_items').insert(
          payload.items.map((item) => ({
            order_id: orderRow.id,
            menu_item_id: item.menuItemId ?? null,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            notes: item.notes ?? null,
          })),
        );

        if (itemsError) {
          throw itemsError;
        }

        // Re-fetch the order with relations to keep the UI in sync.
        const [order] = await this.listOrders();
        const created = order ?? (await this.listOrders()).find((o) => o.id === orderRow.id);
        if (!created) {
          throw new Error('تعذر تحميل الطلب بعد إنشائه');
        }
        return created;
      },
      async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
        const { data, error } = await supabase
          .from('orders')
          .update({
            status,
            ready_at: status === 'ready' ? new Date().toISOString() : null,
          })
          .eq('id', orderId)
          .select(
            `
            id,
            status,
            fulfillment_type,
            car_number,
            table_number,
            total,
            note,
            created_at,
            ready_at,
            source,
            customers:customer_id (
              id,
              full_name,
              phone,
              total_spend,
              visit_count,
              last_order_at,
              favorite_dish
            ),
            order_items (
              id,
              menu_item_id,
              name,
              price,
              quantity,
              notes
            )
          `,
          )
          .single();

        if (error) {
          throw error;
        }

        return mapOrder(data as SupabaseOrderRow);
      },
    }
  : null;
