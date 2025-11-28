import { useMemo } from 'react';

import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { formatCurrency } from '@/lib/format';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useSmartApp } from '@/providers/smart-app-provider';
import { useStaffSession } from '@/providers/staff-session-provider';
import { Order, OrderStatus } from '@/types';

const METRIC_LABELS: { key: keyof ReturnType<typeof useSmartApp>['metrics']; title: string; subtitle: string }[] = [
  { key: 'totalSalesToday', title: 'إجمالي المبيعات', subtitle: 'منذ بداية اليوم' },
  { key: 'totalOrdersToday', title: 'عدد الطلبات', subtitle: 'طلبات مسجلة اليوم' },
  { key: 'avgTicketSize', title: 'متوسط الفاتورة', subtitle: 'لكل طلب' },
  { key: 'readyPercentage', title: 'جاهزية المطبخ', subtitle: 'طلبات تم تسليمها' },
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'طلبات جديدة',
  preparing: 'قيد التحضير',
  ready: 'جاهز للتسليم',
};

const getStatusBadgeColors = (theme: typeof Colors.light): Record<OrderStatus, string> => ({
  new: theme.warning,
  preparing: theme.primary,
  ready: theme.success,
});

export default function DashboardScreen() {
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const statusBadgeColors = useMemo(() => getStatusBadgeColors(theme), [theme]);
  const { metrics, orders, refresh, isSyncing } = useSmartApp();
  const { session } = useStaffSession();
  const latestOrders = orders.slice(0, 5);
  const isManager = session?.role === 'manager';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.screen}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={refresh} />}
        contentContainerStyle={styles.content}>
        <Text style={styles.title}>لوحة المراقبة اليومية</Text>
        
        {/* Revenue Cards - Manager Only */}
        {isManager && (
          <View style={styles.revenueSection}>
            <Text style={styles.sectionTitle}>الأرباح والإيرادات</Text>
            <View style={styles.revenueGrid}>
              <View style={[styles.revenueCard, { backgroundColor: `${theme.success}15` }]}>
                <View style={styles.revenueIcon}>
                  <IconSymbol name="calendar" size={24} color={theme.success} />
                </View>
                <Text style={styles.revenueLabel}>اليوم</Text>
                <Text style={[styles.revenueValue, { color: theme.success }]}>
                  {formatCurrency(metrics.totalRevenueToday)}
                </Text>
              </View>
              
              <View style={[styles.revenueCard, { backgroundColor: `${theme.primary}15` }]}>
                <View style={styles.revenueIcon}>
                  <IconSymbol name="calendar.badge.clock" size={24} color={theme.primary} />
                </View>
                <Text style={styles.revenueLabel}>الأسبوع</Text>
                <Text style={[styles.revenueValue, { color: theme.primary }]}>
                  {formatCurrency(metrics.totalRevenueWeek)}
                </Text>
              </View>
              
              <View style={[styles.revenueCard, { backgroundColor: `${theme.warning}15` }]}>
                <View style={styles.revenueIcon}>
                  <IconSymbol name="chart.bar.fill" size={24} color={theme.warning} />
                </View>
                <Text style={styles.revenueLabel}>الشهر</Text>
                <Text style={[styles.revenueValue, { color: theme.warning }]}>
                  {formatCurrency(metrics.totalRevenueMonth)}
                </Text>
              </View>
            </View>
          </View>
        )}
        <View style={styles.grid}>
          {METRIC_LABELS.map((metric) => {
            let value: string | number = metrics.totalOrdersToday;
            switch (metric.key) {
              case 'totalSalesToday':
                value = formatCurrency(metrics.totalSalesToday);
                break;
              case 'avgTicketSize':
                value = formatCurrency(metrics.avgTicketSize);
                break;
              case 'readyPercentage':
                value = `${metrics.readyPercentage.toFixed(0)}%`;
                break;
              case 'totalOrdersToday':
                value = metrics.totalOrdersToday;
                break;
            }
            return (
              <View key={metric.key} style={styles.metricCard}>
                <Text style={styles.metricTitle}>{metric.title}</Text>
                <Text style={styles.metricValue}>{value}</Text>
                <Text style={styles.metricSubtitle}>{metric.subtitle}</Text>
              </View>
            );
          })}
        </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>حالة المطبخ</Text>
        {Object.entries(metrics.statusBreakdown).map(([status, value]) => {
          const total = metrics.totalOrdersToday || 1;
          const percentage = Math.round((value / total) * 100);
          return (
            <View key={status} style={styles.progressRow}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  {STATUS_LABELS[status as OrderStatus]}
                </Text>
                <Text style={styles.progressLabel}>{percentage}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${percentage}%` }]} />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>المنتجات الأكثر طلباً</Text>
        {metrics.topMenuItems.length === 0 ? (
          <Text style={styles.mutedText}>سيظهر هنا أعلى الأطباق بمجرد تسجيل الطلبات.</Text>
        ) : (
          metrics.topMenuItems.map((item) => (
            <View key={item.name} style={styles.listRow}>
              <Text style={styles.listName}>{item.name}</Text>
              <Text style={styles.listValue}>{item.totalSold} مبيعات</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>مبيعات حسب الساعة</Text>
        <View style={styles.chartContainer}>
          {metrics.hourlySales.length === 0 ? (
            <Text style={styles.mutedText}>لا يوجد بيانات لهذا اليوم.</Text>
          ) : (
            metrics.hourlySales.map((bucket) => (
              <View key={bucket.hourLabel} style={styles.chartBar}>
                <View style={[styles.chartBarFill, { height: Math.min(100, bucket.total) }]} />
                <Text style={styles.chartLabel}>{bucket.hourLabel}</Text>
              </View>
            ))
          )}
        </View>
      </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>أحدث الطلبات</Text>
          {latestOrders.map((order: Order) => (
            <View key={order.id} style={styles.orderRow}>
              <View>
                <Text style={styles.listName}>{order.customer.fullName}</Text>
                <Text style={styles.mutedText}>
                  {order.items.length} صنف • {order.fulfillmentType === 'dine-in' ? 'صالة' : 'سفري'}
                </Text>
              </View>
              <View style={styles.orderMeta}>
                <Text style={styles.listValue}>{formatCurrency(order.total)}</Text>
                <Text
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusBadgeColors[order.status] },
                  ]}>
                  {order.status === 'new'
                    ? 'جديد'
                    : order.status === 'preparing'
                      ? 'قيد التحضير'
                      : 'جاهز'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.backgroundAlt,
    },
    screen: {
      flex: 1,
      backgroundColor: theme.backgroundAlt,
    },
    content: {
      padding: 16,
      gap: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
    },
    revenueSection: {
      marginBottom: 8,
    },
    revenueGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    revenueCard: {
      flex: 1,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      gap: 8,
    },
    revenueIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    revenueLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.muted,
    },
    revenueValue: {
      fontSize: 18,
      fontWeight: '700',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    metricCard: {
      flexBasis: '48%',
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
    },
    metricTitle: {
      fontSize: 14,
      color: theme.muted,
    },
    metricValue: {
      fontSize: 22,
      fontWeight: '700',
      marginVertical: 4,
    },
    metricSubtitle: {
      color: theme.muted,
      fontSize: 12,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
    },
    progressRow: {
      marginBottom: 10,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    progressLabel: {
      fontSize: 13,
      color: theme.muted,
    },
    progressTrack: {
      height: 8,
      backgroundColor: theme.backgroundAlt,
      borderRadius: 8,
      marginTop: 4,
    },
    progressFill: {
      height: '100%',
      borderRadius: 8,
      backgroundColor: theme.primary,
    },
    listRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    listName: {
      fontWeight: '600',
    },
    listValue: {
      fontWeight: '600',
      color: theme.text,
    },
    mutedText: {
      color: theme.muted,
    },
    chartContainer: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-end',
    },
    chartBar: {
      alignItems: 'center',
      flex: 1,
    },
    chartBarFill: {
      width: '70%',
      backgroundColor: theme.primaryMuted,
      borderRadius: 8,
    },
    chartLabel: {
      marginTop: 4,
      fontSize: 10,
      color: theme.muted,
    },
    orderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    orderMeta: {
      alignItems: 'flex-end',
      gap: 4,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      color: '#fff',
      fontSize: 12,
      textAlign: 'center',
    },
  });
