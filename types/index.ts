export type OrderStatus = 'new' | 'preparing' | 'ready';
export type FulfillmentType = 'dine-in' | 'pickup' | 'delivery';

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isAvailable: boolean;
  prepTimeMinutes: number;
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  totalSpend: number;
  visitCount: number;
  lastOrderAt: string;
  favoriteDish?: string;
}

export interface OrderItem {
  id: string;
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  tableNumber?: string;
  customer: Customer;
  total: number;
  items: OrderItem[];
  createdAt: string;
  readyAt?: string;
  prepTimeMinutes?: number;
  note?: string;
  source?: string;
}

export interface CreateOrderPayload {
  customer: {
    fullName: string;
    phone: string;
  };
  fulfillmentType: FulfillmentType;
  tableNumber?: string;
  items: Array<{
    menuItemId?: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
  }>;
  note?: string;
}

export interface DashboardMetrics {
  totalOrdersToday: number;
  totalSalesToday: number;
  avgTicketSize: number;
  readyPercentage: number;
  activeCustomers: number;
  topMenuItems: { name: string; totalSold: number }[];
  hourlySales: { hourLabel: string; total: number }[];
  statusBreakdown: Record<OrderStatus, number>;
}
