import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { formatCurrency } from '@/lib/format';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useSmartApp } from '@/providers/smart-app-provider';
import { useStaffSession } from '@/providers/staff-session-provider';
import { OrderStatus, StaffRole } from '@/types';

const METRIC_LABELS: {
  key: keyof ReturnType<typeof useSmartApp>['metrics'];
  title: string;
  subtitle: string;
}[] = [
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

const HERO_COPY: Record<StaffRole, { badge: string; title: string; subtitle: string; helper?: string }> =
  {
    manager: {
      badge: 'إدارة المطعم',
      title: 'لوحة الأداء اليومية',
      subtitle: 'هوية مطابقة لصفحة الترحيب لكن مع أرقام صريحة للمبيعات والمطبخ.',
    },
    waiter: {
      badge: 'فريق الصالة',
      title: 'ربط مباشر بين الكاشير والمطبخ',
      subtitle: 'كل حالة طلب موضحة حسب الطاولة لتعرف ما ينتظر التسليم فوراً.',
    },
    cashier: {
      badge: 'تجربة الكاشير • iPad',
      title: 'صف دفع واضح وسريع',
      subtitle: 'اللوحة موزعة على عمودين لتناسب شاشة 11" وتعرض القنوات المختلفة للخدمة.',
      helper: 'طالما تم تحديث الحالة في شاشة المطبخ ستظهر هنا إشعارات جاهزية الطلبات.',
    },
    chef: {
      badge: 'شاشة المطبخ',
      title: 'إدارة الحمل بثلاث حالات',
      subtitle: 'طلبات جديدة، قيد التحضير، وجاهزة تظهر بنفس الهوية لسرعة اتخاذ القرار.',
    },
  };

type StatusCard = { label: string; value: string | number; hint: string; color: string };

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
  const role: StaffRole = session?.role ?? 'manager';
  const hero = HERO_COPY[role];

  const latestOrders = orders.slice(0, 5);
  const readyOrders = orders.filter((order) => order.status === 'ready');
  const newOrders = orders.filter((order) => order.status === 'new');
  const preparingOrders = orders.filter((order) => order.status === 'preparing');
  const dineInOrders = orders.filter((order) => order.fulfillmentType === 'dine-in');
  const pickupOrders = orders.filter((order) => order.fulfillmentType === 'pickup');
  const deliveryOrders = orders.filter((order) => order.fulfillmentType === 'delivery');

  const avgPrepMinutes = (() => {
    const durations = orders
      .map((order) => order.prepTimeMinutes ?? 0)
      .filter((value) => value > 0);
    if (durations.length === 0) return 0;
    const total = durations.reduce((sum, value) => sum + value, 0);
    return Math.round(total / durations.length);
  })();

  const renderStatusGrid = (cards: StatusCard[]) => (
    <View style={styles.statusGrid}>
      {cards.map((card) => (
        <View
          key={card.label}
          style={[
            styles.statusChip,
            { borderColor: card.color, backgroundColor: `${card.color}15` },
          ]}>
          <Text style={styles.statusChipLabel}>{card.label}</Text>
          <Text style={[styles.statusChipValue, { color: card.color }]}>{card.value}</Text>
          <Text style={styles.statusChipHint}>{card.hint}</Text>
        </View>
      ))}
    </View>
  );

  const renderLatestOrdersCard = (title: string, subtitle?: string) => (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {latestOrders.length === 0 ? (
        <Text style={styles.mutedText}>لم يتم تسجيل أي طلب حتى الآن.</Text>
      ) : (
        latestOrders.map((order) => (
          <View key={order.id} style={styles.orderRow}>
            <View>
              <Text style={styles.listName}>{order.customer.fullName}</Text>
              <Text style={styles.mutedText}>
                {order.items.length} صنف •{' '}
                {order.fulfillmentType === 'dine-in'
                  ? `صالة ${order.tableNumber ?? '-'}`
                  : order.fulfillmentType === 'pickup'
                    ? 'استلام من الفرع'
                    : 'توصيل خارجي'}
              </Text>
            </View>
            <View style={styles.orderMeta}>
              <Text style={styles.listValue}>{formatCurrency(order.total)}</Text>
              <Text
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusBadgeColors[order.status] },
                ]}>
                {STATUS_LABELS[order.status]}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderManagerSections = () => (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ملخص اليوم</Text>
          <Text style={styles.sectionSubtitle}>تحديث حي بعد كل طلب جديد</Text>
        </View>
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
      </View>

      <View style={styles.card}>
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

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>حالة المطبخ</Text>
        {Object.entries(metrics.statusBreakdown).map(([status, value]) => {
          const total = metrics.totalOrdersToday || 1;
          const percentage = Math.round((value / total) * 100);
          return (
            <View key={status} style={styles.progressRow}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>{STATUS_LABELS[status as OrderStatus]}</Text>
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

      {renderLatestOrdersCard('أحدث الطلبات', 'لمحة عن آخر خمس تحركات')}
    </>
  );

  const renderWaiterSections = () => (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>مزامنة المطبخ</Text>
          <Text style={styles.sectionSubtitle}>يعتمد على الحالات التي يُحدّثها الشيف</Text>
        </View>
        {renderStatusGrid([
          { label: 'طلبات جديدة', value: newOrders.length, hint: 'بانتظار الاعتماد', color: theme.warning },
          { label: 'قيد التحضير', value: preparingOrders.length, hint: 'في المطبخ الآن', color: theme.primary },
          { label: 'جاهزة للتسليم', value: readyOrders.length, hint: 'اذهب للطباخ', color: theme.success },
        ])}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>طلبات جاهزة للتسليم</Text>
        <Text style={styles.smallMeta}>سيظهر تنبيه فور تحويل الطلب إلى جاهز</Text>
        {readyOrders.length === 0 ? (
          <Text style={styles.mutedText}>لا يوجد طلبات جاهزة الآن.</Text>
        ) : (
          readyOrders.slice(0, 4).map((order) => (
            <View key={order.id} style={styles.orderRow}>
              <View>
                <Text style={styles.listName}>
                  {order.customer.fullName}{' '}
                  {order.tableNumber ? `• طاولة ${order.tableNumber}` : ''}
                </Text>
                <Text style={styles.mutedText}>
                  {order.items.length} صنف •{' '}
                  {order.fulfillmentType === 'dine-in'
                    ? 'صالة'
                    : order.fulfillmentType === 'pickup'
                      ? 'استلام'
                      : 'توصيل'}
                </Text>
              </View>
              <View style={styles.readyPill}>
                <Text style={styles.readyPillText}>جاهز</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>الصالة الحالية</Text>
        <Text style={styles.smallMeta}>ترتيب حسب رقم الطاولة</Text>
        {dineInOrders.length === 0 ? (
          <Text style={styles.mutedText}>سجّل أول طلب من شاشة الويتر.</Text>
        ) : (
          dineInOrders.map((order) => (
            <View key={order.id} style={styles.listRow}>
              <View>
                <Text style={styles.listName}>
                  طاولة {order.tableNumber ?? '--'}
                </Text>
                <Text style={styles.mutedText}>{order.customer.fullName}</Text>
              </View>
              <Text
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusBadgeColors[order.status] },
                ]}>
                {STATUS_LABELS[order.status]}
              </Text>
            </View>
          ))
        )}
      </View>
    </>
  );

  const renderCashierSections = () => (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>قنوات الخدمة</Text>
          <Text style={styles.sectionSubtitle}>يعرض توزيع الطلبات حسب نوعها</Text>
        </View>
        {renderStatusGrid([
          { label: 'داخل المطعم', value: dineInOrders.length, hint: 'انتظر رقم الطاولة', color: theme.primary },
          { label: 'استلام من الفرع', value: pickupOrders.length, hint: 'جاهز للشباك', color: theme.warning },
          { label: 'توصيل خارجي', value: deliveryOrders.length, hint: 'تابع مع السائق', color: theme.success },
        ])}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>صف الدفع السريع</Text>
        <Text style={styles.smallMeta}>يتحدّث مباشرة مع شاشة المطبخ</Text>
        {readyOrders.length === 0 ? (
          <Text style={styles.mutedText}>لا يوجد تسليمات جاهزة.</Text>
        ) : (
          readyOrders.map((order) => (
            <View key={order.id} style={styles.orderRow}>
              <View>
                <Text style={styles.listName}>
                  {order.customer.fullName}{' '}
                  {order.tableNumber ? `• طاولة ${order.tableNumber}` : ''}
                </Text>
                <Text style={styles.mutedText}>
                  {order.fulfillmentType === 'dine-in'
                    ? 'دفع من الطاولة'
                    : order.fulfillmentType === 'pickup'
                      ? 'استلام من الشباك'
                      : 'توصيل خارجي'}
                </Text>
              </View>
              <Text style={styles.listValue}>{formatCurrency(order.total)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>تدفق الفريق</Text>
        <View style={styles.flowGrid}>
          <View style={styles.flowCard}>
            <Text style={styles.flowLabel}>الويتر</Text>
            <Text style={styles.flowValue}>{newOrders.length}</Text>
            <Text style={styles.flowHint}>طلبات أُنشئت</Text>
          </View>
          <View style={styles.flowCard}>
            <Text style={styles.flowLabel}>المطبخ</Text>
            <Text style={styles.flowValue}>{preparingOrders.length}</Text>
            <Text style={styles.flowHint}>قيد التحضير</Text>
          </View>
          <View style={styles.flowCard}>
            <Text style={styles.flowLabel}>الكاشير</Text>
            <Text style={styles.flowValue}>{readyOrders.length}</Text>
            <Text style={styles.flowHint}>جاهزة للدفع</Text>
          </View>
        </View>
      </View>
    </>
  );

  const renderChefSections = () => (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>عبء العمل الحالي</Text>
          <Text style={styles.sectionSubtitle}>نفس الحالات الموجودة في شاشة المطبخ</Text>
        </View>
        {renderStatusGrid([
          { label: 'جديد', value: newOrders.length, hint: 'بانتظار التوزيع', color: theme.warning },
          { label: 'قيد التحضير', value: preparingOrders.length, hint: 'أولوية المطبخ', color: theme.primary },
          { label: 'جاهز', value: readyOrders.length, hint: 'أخبر الويتر فوراً', color: theme.success },
        ])}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>طلبات قيد التحضير</Text>
        <Text style={styles.smallMeta}>متوسط وقت التحضير {avgPrepMinutes || 0} دقيقة</Text>
        {preparingOrders.length === 0 && newOrders.length === 0 ? (
          <Text style={styles.mutedText}>لا يوجد مهام مفتوحة حالياً.</Text>
        ) : (
          [...newOrders, ...preparingOrders].slice(0, 4).map((order) => (
            <View key={order.id} style={styles.orderRow}>
              <View>
                <Text style={styles.listName}>
                  {order.customer.fullName}{' '}
                  {order.tableNumber ? `• طاولة ${order.tableNumber}` : ''}
                </Text>
                <Text style={styles.mutedText}>
                  {order.items.length} صنف • {formatCurrency(order.total)}
                </Text>
              </View>
              <View style={styles.orderMeta}>
                <Text style={styles.mutedText}>
                  {order.prepTimeMinutes ? `${order.prepTimeMinutes} د` : 'بدون تقدير'}
                </Text>
                <Text
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusBadgeColors[order.status] },
                  ]}>
                  {STATUS_LABELS[order.status]}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.screen}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={refresh} />}
        contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroBadge}>{hero.badge}</Text>
          <Text style={styles.heroTitle}>{hero.title}</Text>
          <Text style={styles.heroSubtitle}>{hero.subtitle}</Text>
          {hero.helper ? <Text style={styles.heroHelper}>{hero.helper}</Text> : null}
          <Text style={styles.heroMeta}>
            {session?.restaurantCode ?? 'demo-restaurant'} • {session?.staffName ?? 'فريق العمل'}
          </Text>
        </View>

        {role === 'manager' && renderManagerSections()}
        {role === 'waiter' && renderWaiterSections()}
        {role === 'cashier' && renderCashierSections()}
        {role === 'chef' && renderChefSections()}

        {role !== 'manager' && renderLatestOrdersCard('سجل الطلبات', 'من نفس قاعدة البيانات المركزية')}
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
      paddingBottom: 32,
    },
    heroCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 8,
    },
    heroBadge: {
      alignSelf: 'flex-start',
      backgroundColor: theme.primaryMuted,
      color: theme.primary,
      fontWeight: '700',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      fontSize: 13,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: theme.text,
    },
    heroSubtitle: {
      color: theme.muted,
      lineHeight: 20,
    },
    heroHelper: {
      fontSize: 13,
      color: theme.text,
    },
    heroMeta: {
      marginTop: 8,
      color: theme.muted,
      fontSize: 12,
    },
    section: {
      gap: 12,
    },
    sectionHeader: {
      flexDirection: 'column',
      gap: 4,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    sectionSubtitle: {
      color: theme.muted,
      fontSize: 13,
    },
    statusGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statusChip: {
      flex: 1,
      minWidth: 100,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1.5,
      gap: 6,
    },
    statusChipLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    statusChipValue: {
      fontSize: 22,
      fontWeight: '800',
    },
    statusChipHint: {
      fontSize: 12,
      color: theme.muted,
    },
    smallMeta: {
      fontSize: 12,
      color: theme.muted,
      marginBottom: 8,
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
      borderWidth: 1,
      borderColor: theme.border,
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
      borderWidth: 1,
      borderColor: theme.border,
      gap: 12,
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
      alignItems: 'center',
    },
    listName: {
      fontWeight: '600',
      color: theme.text,
    },
    listValue: {
      fontWeight: '700',
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
      gap: 12,
      alignItems: 'center',
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
      overflow: 'hidden',
    },
    readyPill: {
      backgroundColor: `${theme.success}20`,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    readyPillText: {
      color: theme.success,
      fontWeight: '700',
    },
    flowGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    flowCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 12,
      alignItems: 'flex-start',
      gap: 4,
    },
    flowLabel: {
      fontSize: 13,
      color: theme.muted,
    },
    flowValue: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.text,
    },
    flowHint: {
      fontSize: 12,
      color: theme.muted,
    },
  });
