import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { formatCurrency } from '@/lib/format';
import { useSmartApp } from '@/providers/smart-app-provider';
import { useStaffSession } from '@/providers/staff-session-provider';
import { useTranslation } from '@/providers/language-provider';
import { FulfillmentType } from '@/types';

type CartItem = {
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
};

const FULFILLMENT_OPTIONS: { label: string; value: FulfillmentType }[] = [
  { label: 'صالة', value: 'dine-in' },
  { label: 'سفري', value: 'pickup' },
  { label: 'توصيل', value: 'delivery' },
];

export default function WaiterScreen() {
  const theme = useThemeColors();
  const { t, translateLiteral: tl, isRTL } = useTranslation();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const { menu, orders, createOrder, refresh, isSyncing, dataSourceId, lastError } = useSmartApp();
  const { session } = useStaffSession();
  const { width } = useWindowDimensions();
  const isCashier = session?.role === 'cashier';
  const isSplitLayout = width >= 900;
  const badgeLabel = isCashier ? tl('شاشة الكاشير') : tl('فريق الصالة');
  const heroTitle = isCashier ? tl('شاشة كاشير متوافقة مع الآيباد') : tl('تسجيل طلب جديد');
  const heroSubtitle = isCashier
    ? tl('يتكيف تلقائياً مع الهاتف ويتحول لعمودين بمجرد تشغيله على آيباد.')
    : tl('اربط الطلب بالمطبخ واستلم إشعاراً لحظة انتهاء الشيف.');
  const heroHelper = isCashier
    ? tl('واجهة مستوحاة من صفحة الترحيب مع حقل السيارة للطلبات الخارجية.')
    : tl('الشيف، الويتر، والكاشير يشاركون نفس هذا النموذج دون إعداد إضافي.');
  const readyOrders = useMemo(() => orders.filter((order) => order.status === 'ready'), [orders]);
  const newKitchenOrders = useMemo(() => orders.filter((order) => order.status === 'new'), [orders]);
  const preparingOrders = useMemo(
    () => orders.filter((order) => order.status === 'preparing'),
    [orders],
  );
  const notifiedReadyOrders = useRef<Set<string>>(new Set());
  const hasSyncedReady = useRef(false);

  useEffect(() => {
    if (!hasSyncedReady.current) {
      readyOrders.forEach((order) => notifiedReadyOrders.current.add(order.id));
      hasSyncedReady.current = true;
      return;
    }
    const unseen = readyOrders.filter((order) => !notifiedReadyOrders.current.has(order.id));
    if (unseen.length === 0) {
      return;
    }
    unseen.forEach((order) => notifiedReadyOrders.current.add(order.id));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const message =
      unseen.length === 1
        ? t('waiter.readySingle', 'الطلب رقم {orderId} جاهز للاستلام من المطبخ.', {
            orderId: unseen[0].id.slice(-5).toUpperCase(),
          })
        : t('waiter.readyMultiple', '{count} طلبات جاهزة للاستلام من المطبخ.', {
            count: unseen.length,
          });
    Alert.alert(t('waiter.kitchenAlertTitle', 'تنبيه من المطبخ'), message);
  }, [readyOrders, t]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [note, setNote] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('dine-in');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const groupedMenu = useMemo(() => {
    return menu.reduce<Record<string, typeof menu>>((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [menu]);

  const orderTotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [cartItems],
  );

  const phoneDigits = customerPhone.replace(/\D/g, '');
  const requiresTableNumber = fulfillmentType === 'dine-in';
  const requiresCarNumber = fulfillmentType === 'pickup';
  const trimmedTableNumber = tableNumber.trim();
  const trimmedCarNumber = carNumber.trim();
  const isFormValid =
    cartItems.length > 0 &&
    (!requiresTableNumber || trimmedTableNumber.length > 0) &&
    (!requiresCarNumber || trimmedCarNumber.length >= 3);

  const disabledReason = (() => {
    if (cartItems.length === 0) return tl('أضف عناصر من القائمة أولاً');
    if (requiresTableNumber && !trimmedTableNumber) return tl('أدخل رقم الطاولة');
    if (requiresCarNumber && trimmedCarNumber.length < 3) return tl('أدخل رقم السيارة للطلبات الخارجية');
    return null;
  })();

  const handleAddItem = (menuItemId: string, name: string, price: number) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.menuItemId === menuItemId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }
      return [...prev, { menuItemId, name, price, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.menuItemId === itemId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.menuItemId !== itemId));
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setTableNumber('');
    setCarNumber('');
    setNote('');
    setCartItems([]);
    setFulfillmentType('dine-in');
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setIsSubmitting(true);
    try {
      await createOrder({
        customer: {
          fullName: customerName.trim() || undefined,
          phone: phoneDigits || undefined,
        },
        fulfillmentType,
        tableNumber: requiresTableNumber ? trimmedTableNumber : undefined,
        carNumber: requiresCarNumber ? trimmedCarNumber : undefined,
        note: note.trim() || undefined,
        items: cartItems.map((item) => ({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      });
      Alert.alert(
        t('waiter.submitSuccessTitle', 'تم إرسال الطلب'),
        t('waiter.submitSuccessMessage', 'وصل الطلب للمطبخ وانحفظ في قاعدة البيانات'),
      );
      resetForm();
    } catch (error) {
      Alert.alert(
        t('waiter.submitErrorTitle', 'خطأ في إرسال الطلب'),
        error instanceof Error ? error.message : t('common.tryAgain', 'حاول مرة أخرى'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={refresh} />}>
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{badgeLabel}</Text>
            </View>
            <View style={styles.dataSourceChip}>
              <Text style={styles.chipText}>
                {dataSourceId === 'supabase' ? tl('وضع الإنتاج') : tl('وضع تجريبي بدون إنترنت')}
              </Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
          <Text style={styles.heroHelper}>{heroHelper}</Text>
        </View>

        {lastError ? <Text style={styles.errorText}>{lastError}</Text> : null}

        <View style={[styles.layout, isSplitLayout && styles.layoutTablet]}>
          <View style={[styles.column, isSplitLayout && styles.primaryColumnTablet]}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{tl('بيانات العميل')}</Text>
              <TextInput
                placeholder={tl('اسم العميل')}
                placeholderTextColor={theme.muted}
                value={customerName}
                onChangeText={setCustomerName}
                style={styles.input}
              />
              <TextInput
                placeholder={tl('رقم الجوال')}
                placeholderTextColor={theme.muted}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                keyboardType="phone-pad"
                style={styles.input}
              />

              <Text style={styles.sectionTitle}>{tl('طريقة الخدمة')}</Text>
              <View style={styles.segment}>
                {FULFILLMENT_OPTIONS.map((option) => {
                  const selected = option.value === fulfillmentType;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.segmentButton, selected && styles.segmentButtonSelected]}
                      onPress={() => setFulfillmentType(option.value)}>
                      <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                        {tl(option.label)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

            {fulfillmentType === 'dine-in' ? (
              <TextInput
                placeholder={tl('رقم الطاولة')}
                placeholderTextColor={theme.muted}
                value={tableNumber}
                onChangeText={setTableNumber}
                style={styles.input}
              />
            ) : null}
            {fulfillmentType === 'pickup' ? (
              <TextInput
                placeholder={tl('رقم السيارة (مثال: ع م 1234)')}
                placeholderTextColor={theme.muted}
                value={carNumber}
                onChangeText={setCarNumber}
                style={styles.input}
              />
            ) : null}
            <TextInput
              placeholder={tl('ملاحظات خاصة (اختياري)')}
              placeholderTextColor={theme.muted}
              value={note}
              onChangeText={setNote}
                style={[styles.input, styles.multilineInput]}
                multiline
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{tl('قائمة المطعم')}</Text>
              {Object.keys(groupedMenu).length === 0 ? (
                <Text style={styles.mutedText}>{tl('لم يتم تعريف القائمة بعد.')}</Text>
              ) : (
                Object.entries(groupedMenu).map(([category, items]) => (
                  <View key={category} style={styles.menuSection}>
                    <Text style={styles.categoryTitle}>{category}</Text>
                    {items.map((item) => (
                      <View key={item.id} style={styles.menuItemRow}>
                        <View>
                          <Text style={styles.menuItemName}>{item.name}</Text>
                          <Text style={styles.mutedText}>
                            {t('waiter.priceMinutes', '{price} • {minutes} د', {
                              price: formatCurrency(item.price),
                              minutes: item.prepTimeMinutes,
                            })}
                          </Text>
                        </View>
                        <TouchableOpacity
                          disabled={!item.isAvailable}
                          onPress={() => handleAddItem(item.id, item.name, item.price)}
                          style={[
                            styles.addButton,
                            !item.isAvailable && styles.addButtonDisabled,
                          ]}>
                          <Text style={styles.addButtonText}>
                            {item.isAvailable ? tl('+ أضف') : tl('متوقف')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={[styles.column, styles.summaryColumn, isSplitLayout && styles.summaryColumnTablet]}>
            <View style={styles.card}>
              <View style={styles.summaryHeader}>
                <Text style={styles.sectionTitle}>{tl('ملخص الطلب')}</Text>
                <Text style={styles.totalLabel}>{formatCurrency(orderTotal)}</Text>
              </View>
              {cartItems.length === 0 ? (
                <Text style={styles.mutedText}>{tl('أضف عناصر من القائمة لبدء الطلب.')}</Text>
              ) : (
                cartItems.map((item) => (
                  <View key={item.menuItemId} style={styles.cartRow}>
                    <View>
                      <Text style={styles.menuItemName}>{item.name}</Text>
                      <Text style={styles.mutedText}>{formatCurrency(item.price * item.quantity)}</Text>
                    </View>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity onPress={() => handleUpdateQuantity(item.menuItemId!, -1)}>
                        <Text style={styles.iconButton}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.quantity}>{item.quantity}</Text>
                      <TouchableOpacity onPress={() => handleUpdateQuantity(item.menuItemId!, 1)}>
                        <Text style={styles.iconButton}>+</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemoveItem(item.menuItemId!)}>
                        <Text style={styles.removeText}>{tl('حذف')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity
                style={[styles.submitButton, (!isFormValid || isSubmitting) && styles.submitButtonDisabled]}
                disabled={!isFormValid || isSubmitting}
                onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? tl('جارٍ الإرسال...') : tl('إرسال الطلب للمطبخ')}
                </Text>
              </TouchableOpacity>
              {!isFormValid && disabledReason ? (
                <Text style={styles.helperText}>{disabledReason}</Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <View style={styles.summaryHeader}>
                <Text style={styles.sectionTitle}>{tl('تنبيهات المطبخ')}</Text>
                <Text style={styles.totalLabel}>
                  {readyOrders.length > 0 ? `${readyOrders.length} ${tl('جاهز')}` : tl('متزامن لحظياً')}
                </Text>
              </View>
              <View style={styles.statusRow}>
                {[
                  { label: tl('جديد'), value: newKitchenOrders.length, color: theme.warning },
                  { label: tl('قيد التحضير'), value: preparingOrders.length, color: theme.primary },
                  { label: tl('جاهز'), value: readyOrders.length, color: theme.success },
                ].map((pill) => (
                  <View key={pill.label} style={[styles.statusPill, { borderColor: pill.color }]}>
                    <Text style={styles.statusPillLabel}>{pill.label}</Text>
                    <Text style={[styles.statusPillValue, { color: pill.color }]}>{pill.value}</Text>
                  </View>
                ))}
              </View>
              {readyOrders.length === 0 ? (
                <Text style={styles.mutedText}>{tl('بانتظار تحديث من الشيف...')}</Text>
              ) : (
                <View style={styles.readyList}>
                  {readyOrders.slice(0, 3).map((order) => (
                    <View key={order.id} style={styles.readyRow}>
                      <View>
                        <Text style={styles.menuItemName}>{order.customer.fullName}</Text>
                        <Text style={styles.mutedText}>
                          {order.fulfillmentType === 'dine-in'
                            ? `${tl('طاولة')} ${order.tableNumber ?? '-'}`
                            : order.fulfillmentType === 'pickup'
                              ? tl('استلام')
                              : tl('توصيل')}
                        </Text>
                        {order.carNumber ? (
                          <Text style={styles.carMeta}>
                            {tl('سيارة')}: {order.carNumber}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.readyBadge}>
                        <Text style={styles.readyBadgeText}>{tl('جاهز')}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.kitchenNote}>
                {tl('بمجرد ضغط الشيف على «جاهز» يصل الإشعار للكاشير والويتر في نفس اللحظة.')}
              </Text>
            </View>

            {isCashier ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{tl('إرشادات شاشة الآيباد')}</Text>
                <Text style={styles.mutedText}>
                  {tl('صممت الأعمدة لتكون على يسار (القائمة) ويمين (الملخص) الشاشة، ويمكنك تشغيلها على آيباد 11" دون الحاجة لتكبير إضافي.')}
                </Text>
              </View>
            ) : null}
          </View>
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
      paddingBottom: 48,
    },
    heroCard: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 8,
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    heroBadge: {
      backgroundColor: theme.primaryMuted,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    heroBadgeText: {
      color: theme.primary,
      fontWeight: '700',
      fontSize: 13,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.text,
    },
    heroSubtitle: {
      color: theme.muted,
      lineHeight: 20,
      fontSize: 14,
    },
    heroHelper: {
      color: theme.text,
      fontSize: 13,
    },
    layout: {
      gap: 16,
    },
    layoutTablet: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 16,
    },
    column: {
      flex: 1,
      gap: 16,
    },
    primaryColumnTablet: {
      flex: 1.3,
    },
    summaryColumn: {
      gap: 16,
    },
    summaryColumnTablet: {
      flex: 1,
      maxWidth: 420,
    },
    dataSourceChip: {
      backgroundColor: theme.primaryMuted,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    chipText: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: '600',
    },
    errorText: {
      color: theme.danger,
      fontWeight: '600',
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
      color: theme.text,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 12,
      fontSize: 15,
      color: theme.text,
      backgroundColor: theme.card,
    },
    multilineInput: {
      minHeight: 70,
      textAlignVertical: 'top',
    },
    segment: {
      flexDirection: 'row',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      marginBottom: 12,
    },
    segmentButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
    },
    segmentButtonSelected: {
      backgroundColor: theme.primaryMuted,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    segmentTextSelected: {
      color: theme.primary,
    },
    menuSection: {
      marginBottom: 16,
    },
    categoryTitle: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 8,
      color: theme.text,
    },
    menuItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    menuItemName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    mutedText: {
      color: theme.muted,
      marginTop: 4,
    },
    addButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: theme.primary,
    },
    addButtonDisabled: {
      backgroundColor: theme.border,
    },
    addButtonText: {
      color: '#fff',
      fontWeight: '600',
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    statusRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    totalLabel: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.primary,
    },
    cartRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    quantityControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    quantity: {
      fontSize: 16,
      fontWeight: '600',
    },
    iconButton: {
      fontSize: 20,
      width: 28,
      height: 28,
      textAlign: 'center',
      borderRadius: 8,
      backgroundColor: theme.backgroundAlt,
    },
    removeText: {
      color: theme.danger,
      fontSize: 13,
    },
    submitButton: {
      marginTop: 12,
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      backgroundColor: theme.border,
    },
    submitButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    helperText: {
      marginTop: 8,
      color: theme.muted,
      textAlign: 'center',
    },
    statusPill: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      paddingVertical: 10,
      alignItems: 'center',
    },
    statusPillLabel: {
      fontSize: 13,
      color: theme.muted,
    },
    statusPillValue: {
      fontSize: 18,
      fontWeight: '700',
    },
    readyList: {
      gap: 8,
      marginTop: 4,
    },
    readyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.backgroundAlt,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    readyBadge: {
      backgroundColor: theme.primaryMuted,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 999,
    },
    readyBadgeText: {
      color: theme.primary,
      fontWeight: '700',
    },
    carMeta: {
      color: theme.text,
      fontSize: 12,
    },
    kitchenNote: {
      marginTop: 8,
      color: theme.muted,
      fontSize: 12,
    },
  });
