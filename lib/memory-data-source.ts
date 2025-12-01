import { CreateOrderPayload, Customer, MenuItem, Order, OrderStatus } from '@/types';

import { SmartDataSource } from './data-source';

let menuItems: MenuItem[] = [];
let customers: Customer[] = [];
let orders: Order[] = [];

function cloneOrder(order: Order): Order {
  return {
    ...order,
    customer: { ...order.customer },
    items: order.items.map((item) => ({ ...item })),
  };
}

const normalizePhone = (value?: string) => (value ?? '').replace(/\D/g, '');

function ensureCustomer(payload: CreateOrderPayload['customer'], orderTotal: number): Customer {
  const normalizedPhone = normalizePhone(payload.phone);
  const displayName = payload.fullName?.trim() || 'بدون اسم';
  const displayPhone = normalizedPhone.length > 0 ? (payload.phone?.trim() ?? normalizedPhone) : 'غير متوفر';

  if (normalizedPhone.length > 0) {
    const existing = customers.find((customer) => normalizePhone(customer.phone) === normalizedPhone);
    if (existing) {
      existing.lastOrderAt = new Date().toISOString();
      existing.totalSpend += orderTotal;
      existing.visitCount += 1;
      existing.fullName = displayName;
      existing.phone = displayPhone;
      return { ...existing };
    }
  }

  const customer: Customer = {
    id: `customer-${Math.random().toString(36).slice(2, 8)}`,
    fullName: displayName,
    phone: displayPhone,
    totalSpend: orderTotal,
    visitCount: 1,
    lastOrderAt: new Date().toISOString(),
  };
  customers = [customer, ...customers];
  return { ...customer };
}

export const memoryDataSource: SmartDataSource = {
  id: 'memory',

  async listMenuItems(): Promise<MenuItem[]> {
    return menuItems.map((item) => ({ ...item }));
  },

  async listOrders(): Promise<Order[]> {
    return orders.map(cloneOrder);
  },

  async listCustomers(): Promise<Customer[]> {
    return customers.map((customer) => ({ ...customer }));
  },

  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const total = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const customer = ensureCustomer(payload.customer, total);
    const newOrder: Order = {
      id: `order-${Math.random().toString(36).slice(2, 8)}`,
      status: 'new',
      fulfillmentType: payload.fulfillmentType,
      tableNumber: payload.tableNumber,
      carNumber: payload.carNumber?.trim() || undefined,
      customer,
      total,
      createdAt: new Date().toISOString(),
      note: payload.note,
      items: payload.items.map((item, index) => ({
        id: `item-${Date.now()}-${index}`,
        ...item,
      })),
    };
    orders = [newOrder, ...orders];
    return cloneOrder(newOrder);
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const orderIndex = orders.findIndex((order) => order.id === orderId);
    if (orderIndex === -1) {
      throw new Error('الطلب غير موجود');
    }

    const nextOrder: Order = {
      ...orders[orderIndex],
      status,
      readyAt: status === 'ready' ? new Date().toISOString() : orders[orderIndex].readyAt,
    };
    orders[orderIndex] = nextOrder;
    return cloneOrder(nextOrder);
  },
};
