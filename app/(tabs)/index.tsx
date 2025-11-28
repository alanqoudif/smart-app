import { useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { formatCurrency } from '@/lib/format';
import { useSmartApp } from '@/providers/smart-app-provider';
import { useStaffSession } from '@/providers/staff-session-provider';
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
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { menu, createOrder, refresh, isSyncing, dataSourceId, lastError } = useSmartApp();
  const { session } = useStaffSession();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [note, setNote] = useState('');
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
  const isFormValid =
    customerName.trim().length > 1 &&
    phoneDigits.length >= 8 &&
    cartItems.length > 0 &&
    (fulfillmentType !== 'dine-in' || tableNumber.trim().length > 0);

  const disabledReason = (() => {
    if (!customerName.trim()) return 'أدخل اسم العميل';
    if (phoneDigits.length < 8) return 'أدخل رقم جوال صحيح';
    if (fulfillmentType === 'dine-in' && !tableNumber.trim()) return 'أدخل رقم الطاولة';
    if (cartItems.length === 0) return 'أضف عناصر من القائمة أولاً';
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
    setNote('');
    setCartItems([]);
    setFulfillmentType('dine-in');
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setIsSubmitting(true);
    try {
      await createOrder({
        customer: { fullName: customerName.trim(), phone: phoneDigits },
        fulfillmentType,
        tableNumber: fulfillmentType === 'dine-in' ? tableNumber.trim() : undefined,
        note: note.trim() || undefined,
        items: cartItems.map((item) => ({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      });
      Alert.alert('تم إرسال الطلب', 'وصل الطلب للمطبخ وانحفظ في قاعدة البيانات');
      resetForm();
    } catch (error) {
      Alert.alert('خطأ في إرسال الطلب', error instanceof Error ? error.message : 'حاول مرة أخرى');
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
        <View style={styles.headerRow}>
            <Text style={styles.title}>تسجيل طلب جديد</Text>
            <View style={styles.dataSourceChip}>
              <Text style={styles.chipText}>
                {dataSourceId === 'supabase' ? 'وضع الإنتاج' : 'وضع تجريبي بدون إنترنت'}
              </Text>
            </View>
          </View>

          {lastError ? <Text style={styles.errorText}>{lastError}</Text> : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>بيانات العميل</Text>
            <TextInput
              placeholder="اسم العميل"
              placeholderTextColor={theme.muted}
              value={customerName}
              onChangeText={setCustomerName}
              style={styles.input}
            />
            <TextInput
              placeholder="رقم الجوال"
              placeholderTextColor={theme.muted}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
              style={styles.input}
            />

            <Text style={styles.sectionTitle}>طريقة الخدمة</Text>
            <View style={styles.segment}>
              {FULFILLMENT_OPTIONS.map((option) => {
                const selected = option.value === fulfillmentType;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.segmentButton, selected && styles.segmentButtonSelected]}
                    onPress={() => setFulfillmentType(option.value)}>
                    <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {fulfillmentType === 'dine-in' ? (
              <TextInput
                placeholder="رقم الطاولة"
                placeholderTextColor={theme.muted}
                value={tableNumber}
                onChangeText={setTableNumber}
                style={styles.input}
              />
            ) : null}
            <TextInput
              placeholder="ملاحظات خاصة (اختياري)"
              placeholderTextColor={theme.muted}
              value={note}
              onChangeText={setNote}
              style={[styles.input, styles.multilineInput]}
              multiline
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>قائمة المطعم</Text>
            {Object.keys(groupedMenu).length === 0 ? (
              <Text style={styles.mutedText}>لم يتم تعريف القائمة بعد.</Text>
            ) : (
              Object.entries(groupedMenu).map(([category, items]) => (
                <View key={category} style={styles.menuSection}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  {items.map((item) => (
                    <View key={item.id} style={styles.menuItemRow}>
                      <View>
                        <Text style={styles.menuItemName}>{item.name}</Text>
                        <Text style={styles.mutedText}>
                          {formatCurrency(item.price)} • {item.prepTimeMinutes} د
                        </Text>
                      </View>
                      <TouchableOpacity
                        disabled={!item.isAvailable}
                        onPress={() => handleAddItem(item.id, item.name, item.price)}
                        style={[
                          styles.addButton,
                          !item.isAvailable && styles.addButtonDisabled,
                        ]}>
                        <Text style={styles.addButtonText}>{item.isAvailable ? '+ أضف' : 'متوقف'}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.summaryHeader}>
              <Text style={styles.sectionTitle}>ملخص الطلب</Text>
              <Text style={styles.totalLabel}>{formatCurrency(orderTotal)}</Text>
            </View>
            {cartItems.length === 0 ? (
              <Text style={styles.mutedText}>أضف عناصر من القائمة لبدء الطلب.</Text>
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
                      <Text style={styles.removeText}>حذف</Text>
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
                {isSubmitting ? 'جارٍ الإرسال...' : 'إرسال الطلب للمطبخ'}
              </Text>
            </TouchableOpacity>
            {!isFormValid && disabledReason ? (
              <Text style={styles.helperText}>{disabledReason}</Text>
            ) : null}
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
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
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
  });
