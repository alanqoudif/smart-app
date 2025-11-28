import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { formatCurrency } from '@/lib/format';
import { useSmartApp } from '@/providers/smart-app-provider';
import { useStaffSession } from '@/providers/staff-session-provider';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MenuManagementScreen() {
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { menu, refresh, isSyncing } = useSmartApp();
  const { session } = useStaffSession();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form state
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemPrepTime, setItemPrepTime] = useState('');

  const groupedMenu = useMemo(() => {
    return menu.reduce<Record<string, typeof menu>>((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [menu]);

  const handleAddNewItem = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategory('');
    setItemPrice('');
    setItemPrepTime('');
    setIsModalVisible(true);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategory(item.category);
    setItemPrice(item.price.toString());
    setItemPrepTime(item.prepTimeMinutes.toString());
    setIsModalVisible(true);
  };

  const handleSaveItem = () => {
    if (!itemName.trim() || !itemCategory.trim() || !itemPrice || !itemPrepTime) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    // هنا يمكنك إضافة منطق الحفظ إلى قاعدة البيانات
    Alert.alert(
      'نجح',
      editingItem ? 'تم تحديث الصنف بنجاح' : 'تم إضافة الصنف بنجاح',
      [
        {
          text: 'حسناً',
          onPress: () => {
            setIsModalVisible(false);
            refresh();
          },
        },
      ],
    );
  };

  const handleDeleteItem = (item: any) => {
    Alert.alert('حذف صنف', `هل تريد حذف "${item.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => {
          // هنا يمكنك إضافة منطق الحذف من قاعدة البيانات
          Alert.alert('تم الحذف', 'تم حذف الصنف بنجاح');
          refresh();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>إدارة المنيو</Text>
            <Text style={styles.headerSubtitle}>
              {session?.restaurantCode || 'demo-restaurant'}
            </Text>
          </View>
          <Pressable style={styles.addButton} onPress={handleAddNewItem}>
            <IconSymbol name="plus.circle.fill" size={14} color="#ffffff" />
            <Text style={styles.addButtonText}>إضافة</Text>
          </Pressable>
        </View>

        {/* Menu List */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isSyncing} onRefresh={refresh} tintColor={theme.primary} />
          }
          showsVerticalScrollIndicator={false}>
          {Object.entries(groupedMenu).map(([category, items]) => (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{category}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{items.length}</Text>
                </View>
              </View>

              {items.map((item) => (
                <View key={item.id} style={styles.menuItemCard}>
                  <View style={styles.menuItemContent}>
                    <View style={styles.menuItemInfo}>
                      <Text style={styles.menuItemName}>{item.name}</Text>
                      <View style={styles.menuItemMeta}>
                        <View style={styles.metaItem}>
                          <IconSymbol name="banknote" size={14} color={theme.primary} />
                          <Text style={styles.metaText}>{formatCurrency(item.price)}</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <IconSymbol name="clock" size={14} color={theme.muted} />
                          <Text style={styles.metaText}>{item.prepTimeMinutes} دقيقة</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.menuItemActions}>
                      <Pressable
                        style={[styles.actionButton, { backgroundColor: theme.primary }]}
                        onPress={() => handleEditItem(item)}>
                        <IconSymbol name="pencil" size={12} color="#ffffff" />
                      </Pressable>
                      <Pressable
                        style={[styles.actionButton, { backgroundColor: theme.danger }]}
                        onPress={() => handleDeleteItem(item)}>
                        <IconSymbol name="trash" size={12} color="#ffffff" />
                      </Pressable>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.availabilityBadge,
                      {
                        backgroundColor: item.isAvailable
                          ? `${theme.success}20`
                          : `${theme.muted}20`,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.availabilityText,
                        { color: item.isAvailable ? theme.success : theme.muted },
                      ]}>
                      {item.isAvailable ? 'متوفر' : 'غير متوفر'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))}

          {menu.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol name="tray" size={64} color={theme.muted} style={{ opacity: 0.3 }} />
              <Text style={styles.emptyText}>لا توجد أصناف في المنيو</Text>
              <Text style={styles.emptySubtext}>اضغط على زر "إضافة صنف" لبدء إنشاء المنيو</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Add/Edit Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingItem ? 'تعديل الصنف' : 'إضافة صنف جديد'}
            </Text>
            <Pressable onPress={() => setIsModalVisible(false)}>
              <IconSymbol name="xmark.circle.fill" size={28} color={theme.muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>اسم الصنف *</Text>
              <TextInput
                style={styles.input}
                placeholder="مثال: برجر دجاج"
                placeholderTextColor={theme.muted}
                value={itemName}
                onChangeText={setItemName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>الفئة *</Text>
              <TextInput
                style={styles.input}
                placeholder="مثال: Burgers"
                placeholderTextColor={theme.muted}
                value={itemCategory}
                onChangeText={setItemCategory}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>السعر (ر.ع.) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="3.500"
                  placeholderTextColor={theme.muted}
                  value={itemPrice}
                  onChangeText={setItemPrice}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>وقت التحضير (دقيقة) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="15"
                  placeholderTextColor={theme.muted}
                  value={itemPrepTime}
                  onChangeText={setItemPrepTime}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.border }]}
                onPress={() => setIsModalVisible(false)}>
                <Text style={[styles.modalButtonText, { color: theme.text }]}>إلغاء</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.primary, flex: 1 }]}
                onPress={handleSaveItem}>
                <Text style={[styles.modalButtonText, { color: '#ffffff' }]}>
                  {editingItem ? 'تحديث' : 'إضافة'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    headerContent: {
      flex: 1,
      alignItems: 'flex-end',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'right',
    },
    headerSubtitle: {
      fontSize: 13,
      color: theme.muted,
      marginTop: 2,
      textAlign: 'right',
    },
    addButton: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.primary,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 6,
    },
    addButtonText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '600',
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
    },
    categorySection: {
      marginBottom: 24,
    },
    categoryHeader: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    categoryTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'right',
    },
    categoryBadge: {
      backgroundColor: theme.primaryMuted,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    categoryBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    menuItemCard: {
      backgroundColor: theme.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    menuItemContent: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    menuItemInfo: {
      flex: 1,
      alignItems: 'flex-end',
    },
    menuItemName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 6,
      textAlign: 'right',
    },
    menuItemMeta: {
      flexDirection: 'row-reverse',
      gap: 16,
    },
    metaItem: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 13,
      color: theme.muted,
    },
    menuItemActions: {
      flexDirection: 'row-reverse',
      gap: 8,
    },
    actionButton: {
      width: 28,
      height: 28,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    availabilityBadge: {
      alignSelf: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    availabilityText: {
      fontSize: 12,
      fontWeight: '600',
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
      textAlign: 'center',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.background,
    },
    modalHeader: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
    },
    modalContent: {
      flex: 1,
    },
    modalScrollContent: {
      padding: 20,
    },
    formGroup: {
      marginBottom: 20,
    },
    formRow: {
      flexDirection: 'row-reverse',
      gap: 12,
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'right',
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.card,
      textAlign: 'right',
    },
    modalActions: {
      flexDirection: 'row-reverse',
      gap: 12,
      marginTop: 20,
    },
    modalButton: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonText: {
      fontSize: 15,
      fontWeight: '600',
    },
  });

