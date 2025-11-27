import { CreateOrderPayload, Customer, MenuItem, Order, OrderStatus } from '@/types';

import { memoryDataSource } from './memory-data-source';
import { supabaseDataSource } from './supabase-data-source';

export interface SmartDataSource {
  id: 'memory' | 'supabase';
  listMenuItems(): Promise<MenuItem[]>;
  listOrders(): Promise<Order[]>;
  listCustomers(): Promise<Customer[]>;
  createOrder(payload: CreateOrderPayload): Promise<Order>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order>;
}

export function getDataSource(): SmartDataSource {
  return supabaseDataSource ?? memoryDataSource;
}
