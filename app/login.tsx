import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Redirect, useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useStaffSession } from '@/providers/staff-session-provider';
import { StaffRole } from '@/types';

const ROLE_OPTIONS: { label: string; value: StaffRole; description: string }[] = [
  { label: 'ويتر', value: 'waiter', description: 'تسجيل الطلبات وإرسالها للمطبخ' },
  { label: 'شيف', value: 'chef', description: 'استقبال الطلبات الجاهزة للتحضير' },
];

export default function LoginScreen() {
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { session, login, isHydrating } = useStaffSession();
  const [restaurantCode, setRestaurantCode] = useState('demo-restaurant');
  const [staffName, setStaffName] = useState('');
  const [role, setRole] = useState<StaffRole>('waiter');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (session && !isHydrating) {
    return <Redirect href={session.role === 'chef' ? '/(tabs)/kitchen' : '/(tabs)/index'} />;
  }

  const handleSubmit = async () => {
    if (!restaurantCode.trim() || !staffName.trim()) {
      Alert.alert('بيانات ناقصة', 'اكتب اسم الموظف وكود المطعم للمتابعة');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ restaurantCode, staffName, role });
      router.replace(role === 'chef' ? '/(tabs)/kitchen' : '/(tabs)/index');
    } catch (error) {
      Alert.alert('تعذر تسجيل الدخول', error instanceof Error ? error.message : 'حاول مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.screen]}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>لوحة موظفي المطعم</Text>
          <Text style={styles.heroSubtitle}>سجّل دخولك كويتر أو شيف بنفس المطعم وتابع الطلبات لحظياً.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>كود المطعم</Text>
          <TextInput
            placeholder="restaurant-123"
            autoCapitalize="none"
            value={restaurantCode}
            onChangeText={setRestaurantCode}
            style={styles.input}
          />

          <Text style={styles.label}>اسمك</Text>
          <TextInput
            placeholder="مثال: أحمد"
            value={staffName}
            onChangeText={setStaffName}
            style={styles.input}
          />

          <Text style={styles.label}>اختر طبيعة عملك الآن</Text>
          <View style={styles.rolesRow}>
            {ROLE_OPTIONS.map((option) => {
              const selected = role === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.roleCard, selected && { borderColor: theme.primary, backgroundColor: theme.primaryMuted }]}
                  onPress={() => setRole(option.value)}>
                  <Text style={[styles.roleLabel, selected && { color: theme.primary }]}>{option.label}</Text>
                  <Text style={styles.roleDescription}>{option.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && { backgroundColor: theme.border }]}
            disabled={isSubmitting}
            onPress={handleSubmit}>
            <Text style={styles.submitText}>{isSubmitting ? 'جارٍ الدخول...' : 'دخول للوحة'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
      padding: 16,
      gap: 16,
    },
    heroCard: {
      backgroundColor: theme.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 8,
    },
    heroSubtitle: {
      color: theme.muted,
      lineHeight: 20,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 10,
    },
    label: {
      fontWeight: '700',
      color: theme.text,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      marginBottom: 6,
    },
    rolesRow: {
      flexDirection: 'row',
      gap: 10,
    },
    roleCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      padding: 12,
      gap: 6,
    },
    roleLabel: {
      fontWeight: '700',
      fontSize: 16,
    },
    roleDescription: {
      color: theme.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    submitButton: {
      marginTop: 8,
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    submitText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
    },
  });
