import { DashboardMetrics, Order } from '@/types';

const STATUS_ORDER = ['new', 'preparing', 'ready'] as const;

export function calculateDashboardMetrics(orders: Order[]): DashboardMetrics {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now);
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const todaysOrders = orders.filter((order) => new Date(order.createdAt) >= startOfDay);
  const weekOrders = orders.filter((order) => new Date(order.createdAt) >= startOfWeek);
  const monthOrders = orders.filter((order) => new Date(order.createdAt) >= startOfMonth);

  const totalSalesToday = todaysOrders.reduce((sum, order) => sum + order.total, 0);
  const totalRevenueToday = totalSalesToday;
  const totalRevenueWeek = weekOrders.reduce((sum, order) => sum + order.total, 0);
  const totalRevenueMonth = monthOrders.reduce((sum, order) => sum + order.total, 0);

  const avgTicketSize =
    todaysOrders.length === 0 ? 0 : parseFloat((totalSalesToday / todaysOrders.length).toFixed(2));

  const statusBreakdown = STATUS_ORDER.reduce(
    (acc, status) => ({ ...acc, [status]: todaysOrders.filter((o) => o.status === status).length }),
    {} as DashboardMetrics['statusBreakdown'],
  );

  const readyPercentage =
    todaysOrders.length === 0 ? 0 : (statusBreakdown.ready / todaysOrders.length) * 100;

  const activeCustomers = new Set(todaysOrders.map((order) => order.customer.id)).size;

  const menuMap = new Map<string, number>();
  todaysOrders.forEach((order) => {
    order.items.forEach((item) => {
      const current = menuMap.get(item.name) ?? 0;
      menuMap.set(item.name, current + item.quantity);
    });
  });
  const topMenuItems = Array.from(menuMap.entries())
    .map(([name, totalSold]) => ({ name, totalSold }))
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 5);

  const hourlyBuckets = new Map<number, number>();
  todaysOrders.forEach((order) => {
    const createdAt = new Date(order.createdAt);
    const hour = createdAt.getHours();
    hourlyBuckets.set(hour, (hourlyBuckets.get(hour) ?? 0) + order.total);
  });

  const hourlySales = Array.from(hourlyBuckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([hour, total]) => ({
      hourLabel: `${hour.toString().padStart(2, '0')}:00`,
      total,
    }));

  return {
    totalOrdersToday: todaysOrders.length,
    totalSalesToday,
    avgTicketSize,
    readyPercentage,
    activeCustomers,
    topMenuItems,
    hourlySales,
    statusBreakdown,
    totalRevenueToday,
    totalRevenueWeek,
    totalRevenueMonth,
  };
}
