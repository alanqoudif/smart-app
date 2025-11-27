import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { calculateDashboardMetrics } from '@/lib/metrics';
import { getDataSource } from '@/lib/data-source';
import { CreateOrderPayload, Customer, DashboardMetrics, MenuItem, Order, OrderStatus } from '@/types';

type SmartAppContextValue = {
  menu: MenuItem[];
  orders: Order[];
  customers: Customer[];
  metrics: DashboardMetrics;
  isSyncing: boolean;
  lastError?: string | null;
  dataSourceId: 'memory' | 'supabase';
  refresh(): Promise<void>;
  createOrder(payload: CreateOrderPayload): Promise<Order>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order>;
};

const SmartAppContext = createContext<SmartAppContextValue | undefined>(undefined);

export function SmartAppProvider({ children }: PropsWithChildren<object>) {
  const dataSource = useMemo(() => getDataSource(), []);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isSyncing, setIsSyncing] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [menuData, ordersData, customersData] = await Promise.all([
        dataSource.listMenuItems(),
        dataSource.listOrders(),
        dataSource.listCustomers(),
      ]);
      setMenu(menuData);
      setOrders(ordersData);
      setCustomers(customersData);
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'تعذر مزامنة البيانات');
    } finally {
      setIsSyncing(false);
    }
  }, [dataSource]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createOrder = useCallback(
    async (payload: CreateOrderPayload) => {
      try {
        const created = await dataSource.createOrder(payload);
        await refresh();
        return created;
      } catch (error) {
        setLastError(error instanceof Error ? error.message : 'تعذر إنشاء الطلب');
        throw error;
      }
    },
    [dataSource, refresh],
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      try {
        const updated = await dataSource.updateOrderStatus(orderId, status);
        await refresh();
        return updated;
      } catch (error) {
        setLastError(error instanceof Error ? error.message : 'تعذر تحديث حالة الطلب');
        throw error;
      }
    },
    [dataSource, refresh],
  );

  const metrics = useMemo(() => calculateDashboardMetrics(orders), [orders]);

  const value = useMemo(
    () => ({
      menu,
      orders,
      customers,
      metrics,
      isSyncing,
      lastError,
      dataSourceId: dataSource.id,
      refresh,
      createOrder,
      updateOrderStatus,
    }),
    [menu, orders, customers, metrics, isSyncing, lastError, dataSource, refresh, createOrder, updateOrderStatus],
  );

  return <SmartAppContext.Provider value={value}>{children}</SmartAppContext.Provider>;
}

export function useSmartApp() {
  const context = useContext(SmartAppContext);
  if (!context) {
    throw new Error('useSmartApp must be used within SmartAppProvider');
  }
  return context;
}
