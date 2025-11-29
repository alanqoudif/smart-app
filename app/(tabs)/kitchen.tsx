import { useMemo, useState } from 'react';

import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';

import { IconSymbol } from '@/components/ui/icon-symbol';
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

const STATUS_CONFIG: Record<
  OrderStatus,
  { title: string; icon: string; actionLabel: string }
> = {
  new: { title: 'طلبات جديدة', icon: 'exclamationmark.circle.fill', actionLabel: 'بدء التحضير' },
  preparing: { title: 'قيد التحضير', icon: 'flame.fill', actionLabel: 'جاهز للتقديم' },
  ready: { title: 'جاهز للتسليم', icon: 'checkmark.circle.fill', actionLabel: '' },
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
  const { session } = useStaffSession();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('new');

  // Group orders by status
  const grouped: Record<OrderStatus, Order[]> = {
    new: [],
    preparing: [],
    ready: [],
  };

  orders.forEach((order) => {
    grouped[order.status].push(order);
  });

  // Get filtered orders based on selected status
  const filteredOrders = grouped[selectedStatus];

  const renderActionButton = (order: Order) => {
    const nextStatus = STATUS_FLOW[order.status];
    if (!nextStatus) return null;
    const label = STATUS_CONFIG[nextStatus].actionLabel || STATUS_CONFIG[order.status].actionLabel;
    return (
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: statusColors[nextStatus] }]}
        onPress={() => updateOrderStatus(order.id, nextStatus)}>
        <IconSymbol name="arrow.left" size={16} color="#ffffff" />
        <Text style={styles.actionText}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderFilterButton = (status: OrderStatus) => {
    const config = STATUS_CONFIG[status];
    const count = grouped[status].length;
    const isSelected = selectedStatus === status;

    return (
      <TouchableOpacity
        key={status}
        style={[
          styles.filterButton,
          {
            backgroundColor: isSelected ? statusColors[status] : theme.card,
            borderColor: isSelected ? statusColors[status] : theme.border,
          },
        ]}
        onPress={() => setSelectedStatus(status)}>
        <IconSymbol
          name={config.icon}
          size={20}
          color={isSelected ? '#ffffff' : statusColors[status]}
        />
        <View style={styles.filterContent}>
          <Text style={[styles.filterTitle, { color: isSelected ? '#ffffff' : theme.text }]}>
            {config.title}
          </Text>
          {count > 0 && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.3)' : statusColors[status],
                },
              ]}>
              <Text style={[styles.badgeText, { color: isSelected ? '#ffffff' : '#ffffff' }]}>
                {count}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>شاشة المطبخ</Text>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
              {(Object.keys(grouped) as OrderStatus[]).map(renderFilterButton)}
            </View>

            {/* Orders List */}
            <ScrollView
              style={styles.ordersContainer}
              contentContainerStyle={styles.ordersContent}
              refreshControl={
                <RefreshControl
                  refreshing={isSyncing}
                  onRefresh={refresh}
                  tintColor={statusColors[selectedStatus]}
                />
              }
              showsVerticalScrollIndicator={false}>
              {filteredOrders.length === 0 ? (
                <View style={styles.emptyState}>
                  <IconSymbol
                    name="tray.fill"
                    size={64}
                    color={theme.muted}
                    style={{ opacity: 0.3 }}
                  />
                  <Text style={styles.emptyText}>لا توجد طلبات في هذه الحالة</Text>
                  <Text style={styles.emptySubtext}>ستظهر الطلبات الجديدة هنا تلقائياً</Text>
                </View>
              ) : (
                filteredOrders.map((order) => (
                  <View
                    key={order.id}
                    style={[
                      styles.orderCard,
                      { borderLeftColor: statusColors[order.status], borderLeftWidth: 4 },
                    ]}>
                    {/* Order Header */}
                    <View style={styles.orderHeader}>
                      <View style={styles.orderHeaderLeft}>
                        <View
                          style={[
                            styles.statusIndicator,
                            { backgroundColor: statusColors[order.status] },
                          ]}>
                          <IconSymbol
                            name={STATUS_CONFIG[order.status].icon}
                            size={16}
                            color="#ffffff"
                          />
                        </View>
                        <View>
                          <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
                          <Text style={styles.orderTime}>{formatShortDate(order.createdAt)}</Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: `${statusColors[order.status]}20` },
                        ]}>
                        <Text style={[styles.statusBadgeText, { color: statusColors[order.status] }]}>
                          {STATUS_CONFIG[order.status].title}
                        </Text>
                      </View>
                    </View>

                    {/* Customer Info */}
                    <View style={styles.customerInfo}>
                      <View style={styles.infoRow}>
                        <IconSymbol name="person.fill" size={16} color={theme.primary} />
                        <Text style={styles.customerName}>{order.customer.fullName}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <IconSymbol
                          name={
                            order.fulfillmentType === 'dine-in'
                              ? 'fork.knife'
                              : order.fulfillmentType === 'pickup'
                                ? 'bag.fill'
                                : 'shippingbox.fill'
                          }
                          size={16}
                          color={theme.muted}
                        />
                        <Text style={styles.metaText}>
                          {order.fulfillmentType === 'dine-in'
                            ? `طاولة ${order.tableNumber ?? '-'}`
                            : order.fulfillmentType === 'pickup'
                              ? 'استلام من الفرع'
                              : 'توصيل خارجي'}
                        </Text>
                      </View>
                    </View>

                    {/* Order Items */}
                    <View style={styles.itemsContainer}>
                      <Text style={styles.itemsTitle}>الأصناف:</Text>
                      {order.items.map((item) => (
                        <View key={item.id} style={styles.itemRow}>
                          <View style={styles.itemLeft}>
                            <View style={styles.quantityBadge}>
                              <Text style={styles.quantityText}>{item.quantity}×</Text>
                            </View>
                            <Text style={styles.itemName}>{item.name}</Text>
                          </View>
                          <Text style={styles.itemPrice}>
                            {formatCurrency(item.price * item.quantity)}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {order.note && (
                      <View style={styles.noteContainer}>
                        <IconSymbol name="note.text" size={14} color={theme.warning} />
                        <Text style={styles.noteText}>{order.note}</Text>
                      </View>
                    )}

                    {/* Order Footer */}
                    <View style={styles.orderFooter}>
                      <View style={styles.totalContainer}>
                        <Text style={styles.totalLabel}>الإجمالي:</Text>
                        <Text style={styles.totalAmount}>{formatCurrency(order.total)}</Text>
                      </View>
                      {renderActionButton(order)}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
    },
    filterContainer: {
      flexDirection: 'row-reverse',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    filterButton: {
      flex: 1,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 2,
      gap: 8,
    },
    filterContent: {
      alignItems: 'center',
      gap: 4,
    },
    filterTitle: {
      fontSize: 13,
      fontWeight: '600',
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 24,
      alignItems: 'center',
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    ordersContainer: {
      flex: 1,
    },
    ordersContent: {
      padding: 20,
      gap: 16,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      gap: 12,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.muted,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.muted,
      opacity: 0.7,
    },
    orderCard: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 16,
      marginBottom: 16,
    },
    orderHeader: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    orderHeaderLeft: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 12,
    },
    statusIndicator: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    orderId: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    orderTime: {
      fontSize: 12,
      color: theme.muted,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    customerInfo: {
      gap: 8,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    infoRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 8,
    },
    customerName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    metaText: {
      fontSize: 14,
      color: theme.muted,
    },
    itemsContainer: {
      gap: 10,
    },
    itemsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.muted,
      marginBottom: 4,
    },
    itemRow: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.backgroundAlt,
      borderRadius: 10,
    },
    itemLeft: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    quantityBadge: {
      backgroundColor: theme.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      minWidth: 32,
      alignItems: 'center',
    },
    quantityText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700',
    },
    itemName: {
      fontSize: 15,
      color: theme.text,
      flex: 1,
    },
    itemPrice: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    noteContainer: {
      flexDirection: 'row-reverse',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
      backgroundColor: `${theme.warning}15`,
      borderRadius: 10,
      borderRightWidth: 3,
      borderRightColor: theme.warning,
    },
    noteText: {
      flex: 1,
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
    },
    orderFooter: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    totalContainer: {
      gap: 4,
    },
    totalLabel: {
      fontSize: 13,
      color: theme.muted,
    },
    totalAmount: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.primary,
    },
    actionButton: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
    },
    actionText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },
  });
