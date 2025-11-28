import { useMemo } from 'react';

import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';

import { RoleSwitcher } from '@/components/role-switcher';
import { Colors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { formatCurrency, formatShortDate } from '@/lib/format';
import { useSmartApp } from '@/providers/smart-app-provider';
import { useStaffSession } from '@/providers/staff-session-provider';
import { Order, OrderStatus } from '@/types';

const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
  new: 'preparing',
  preparing: 'ready',
  ready: null,
};

const STATUS_TITLES: Record<OrderStatus, string> = {
  new: 'طلبات جديدة',
  preparing: 'قيد التحضير',
  ready: 'جاهز للتسليم',
};

export default function KitchenScreen() {
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const statusColors: Record<OrderStatus, string> = {
    new: theme.warning,
    preparing: theme.primary,
    ready: theme.success,
  };
  const { orders, updateOrderStatus, refresh, isSyncing } = useSmartApp();
  const { session, switchRole } = useStaffSession();
  const isChef = session?.role === 'chef';

  const handleSwitchToChef = async () => {
    await switchRole('chef');
    router.replace('/(tabs)/kitchen');
  };

  const grouped: Record<OrderStatus, Order[]> = {
    new: [],
    preparing: [],
    ready: [],
  };

  orders.forEach((order) => {
    grouped[order.status].push(order);
  });

  const renderActionButton = (order: Order) => {
    const nextStatus = STATUS_FLOW[order.status];
    if (!nextStatus) return null;
    const label = nextStatus === 'preparing' ? 'بدء التحضير' : 'جاهز للتقديم';
    return (
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: statusColors[nextStatus] }]}
        onPress={() => updateOrderStatus(order.id, nextStatus)}>
        <Text style={styles.actionText}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.screen}>
        <RoleSwitcher />
        {!isChef ? (
          <View style={styles.guardCard}>
            <Text style={styles.guardTitle}>هذه الشاشة مخصصة للشيف</Text>
            <Text style={styles.guardText}>بدّل إلى وضع الشيف لمتابعة الطلبات التي يرسلها الويتر.</Text>
            <TouchableOpacity style={styles.guardButton} onPress={handleSwitchToChef}>
              <Text style={styles.guardButtonText}>تبديل إلى شيف</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={refresh} />}
            horizontal
            contentContainerStyle={styles.columnsWrapper}
            showsHorizontalScrollIndicator={false}>
            {(Object.keys(grouped) as OrderStatus[]).map((status) => (
              <View key={status} style={styles.column}>
                <Text style={styles.columnTitle}>{STATUS_TITLES[status]}</Text>
                <Text style={[styles.pill, { backgroundColor: statusColors[status] }]}>
                  {grouped[status].length} طلب
                </Text>
                {grouped[status].length === 0 ? (
                  <Text style={styles.emptyState}>لا يوجد طلبات حالياً</Text>
                ) : (
                  grouped[status].map((order) => (
                    <View key={order.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.orderId}>#{order.id.slice(-4).toUpperCase()}</Text>
                        <Text style={styles.orderTime}>{formatShortDate(order.createdAt)}</Text>
                      </View>
                      <Text style={styles.customer}>{order.customer.fullName}</Text>
                      <Text style={styles.metaText}>
                        {order.fulfillmentType === 'dine-in'
                          ? `طاولة ${order.tableNumber ?? '-'}`
                          : order.fulfillmentType === 'pickup'
                            ? 'استلام من الفرع'
                            : 'توصيل خارجي'}
                      </Text>
                      <View style={styles.divider} />
                      {order.items.map((item) => (
                        <View key={item.id} style={styles.itemRow}>
                          <Text style={styles.itemName}>
                            {item.quantity} × {item.name}
                          </Text>
                          <Text style={styles.itemPrice}>{formatCurrency(item.price * item.quantity)}</Text>
                        </View>
                      ))}
                      <View style={styles.divider} />
                      <View style={styles.footerRow}>
                        <Text style={styles.totalText}>{formatCurrency(order.total)}</Text>
                        {renderActionButton(order)}
                      </View>
                    </View>
                  ))
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
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
      padding: 12,
    },
    columnsWrapper: {
      paddingVertical: 16,
      gap: 12,
      paddingHorizontal: 12,
    },
    column: {
      width: 280,
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 14,
    },
    guardCard: {
      backgroundColor: theme.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 6,
    },
    guardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    guardText: {
      color: theme.muted,
    },
    guardButton: {
      alignSelf: 'flex-start',
      marginTop: 4,
      backgroundColor: theme.primary,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
    },
    guardButtonText: {
      color: '#fff',
      fontWeight: '700',
    },
    columnTitle: {
      fontSize: 17,
      fontWeight: '700',
      marginBottom: 6,
    },
    pill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      color: '#fff',
      fontWeight: '600',
      marginBottom: 12,
    },
    emptyState: {
      color: theme.muted,
      fontStyle: 'italic',
    },
    card: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 12,
      marginBottom: 12,
      gap: 6,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    orderId: {
      fontWeight: '700',
      color: theme.primary,
    },
    orderTime: {
      color: theme.muted,
      fontSize: 12,
    },
    customer: {
      fontSize: 16,
      fontWeight: '600',
    },
    metaText: {
      color: theme.muted,
      fontSize: 13,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 4,
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    itemName: {
      fontSize: 14,
    },
    itemPrice: {
      fontWeight: '600',
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
      gap: 8,
    },
    totalText: {
      fontWeight: '700',
      fontSize: 15,
    },
    actionButton: {
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    actionText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 13,
    },
  });
