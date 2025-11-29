import { useMemo, useState } from 'react';

import { cacheDirectory, documentDirectory, EncodingType, writeAsStringAsync } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { formatCurrency, formatPhone, formatShortDate } from '@/lib/format';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useSmartApp } from '@/providers/smart-app-provider';

export default function CustomersScreen() {
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { customers, refresh, isSyncing } = useSmartApp();
  const [search, setSearch] = useState('');

  const filtered = customers.filter((customer) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      customer.fullName.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query)
    );
  });

  const exportFileName = `customers-${new Date().toISOString()}.csv`;

  const handleExport = async () => {
    const header = ['Full Name', 'Phone', 'Total Spend', 'Visits', 'Last Order'];
    const rows = filtered.map((customer) => [
      customer.fullName,
      customer.phone,
      customer.totalSpend.toString(),
      customer.visitCount.toString(),
      customer.lastOrderAt,
    ]);
    const csv = [header, ...rows].map((row) => row.join(',')).join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = exportFileName;
      link.click();
      URL.revokeObjectURL(link.href);
      return;
    }

    const targetDir = cacheDirectory ?? documentDirectory;
    if (!targetDir) {
      Alert.alert('تعذر إنشاء الملف', 'صلاحيات الملف غير متوفرة على هذا الجهاز.');
      return;
    }
    const tempPath = `${targetDir}${exportFileName}`;
    await writeAsStringAsync(tempPath, csv, { encoding: EncodingType.UTF8 });
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('الميزة غير مدعومة', 'جرّب التصدير عبر الويب أو جهاز يدعم المشاركة.');
      return;
    }
    await Sharing.shareAsync(tempPath);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.screen}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={refresh} />}
        contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>ملف العملاء</Text>
          <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
            <Text style={styles.exportText}>تصدير Excel</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          placeholder="ابحث بالاسم أو الجوال"
          style={styles.input}
          placeholderTextColor={theme.muted}
          value={search}
          onChangeText={setSearch}
        />

        {filtered.map((customer) => (
          <View key={customer.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.customerName}>{customer.fullName}</Text>
              <Text style={styles.customerPhone}>{formatPhone(customer.phone)}</Text>
            </View>
            <View style={styles.statsRow}>
              <View>
                <Text style={styles.statLabel}>إجمالي الصرف</Text>
                <Text style={styles.statValue}>{formatCurrency(customer.totalSpend)}</Text>
              </View>
              <View>
                <Text style={styles.statLabel}>زيارات</Text>
                <Text style={styles.statValue}>{customer.visitCount}</Text>
              </View>
              <View>
                <Text style={styles.statLabel}>آخر طلب</Text>
                <Text style={styles.statValue}>{formatShortDate(customer.lastOrderAt)}</Text>
              </View>
            </View>
            {customer.favoriteDish ? (
              <Text style={styles.favorite}>يعشق: {customer.favoriteDish}</Text>
            ) : null}
          </View>
        ))}
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
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
    },
    exportButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
    },
    exportText: {
      color: '#fff',
      fontWeight: '600',
    },
    input: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: theme.text,
      backgroundColor: theme.card,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    customerName: {
      fontSize: 16,
      fontWeight: '700',
    },
    customerPhone: {
      color: theme.muted,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statLabel: {
      color: theme.muted,
      fontSize: 12,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '700',
    },
    favorite: {
      color: theme.primary,
      fontWeight: '600',
    },
  });
