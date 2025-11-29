import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Redirect, useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { getInitialRouteForRole } from '@/lib/navigation';
import { useStaffSession } from '@/providers/staff-session-provider';

type LoginMode = 'owner' | 'staff';

export default function LoginScreen() {
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const {
    session,
    isHydrating,
    restaurantProfile,
    isOnboardingRequired,
    loginOwner,
    loginStaff,
  } = useStaffSession();
  const [mode, setMode] = useState<LoginMode>('owner');
  const [email, setEmail] = useState(restaurantProfile?.ownerEmail ?? '');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [restaurantCode, setRestaurantCode] = useState(restaurantProfile?.code ?? '');
  const [staffPasscode, setStaffPasscode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isHydrating && session) {
    const nextRoute = session.isOwner && isOnboardingRequired ? '/onboarding' : getInitialRouteForRole(session.role);
    return <Redirect href={nextRoute} />;
  }

  const handleOwnerLogin = async () => {
    if (!email.trim() || !ownerPassword.trim()) {
      Alert.alert('بيانات ناقصة', 'اكتب البريد وكلمة المرور');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await loginOwner({ email, password: ownerPassword });
      router.replace(result.requiresOnboarding ? '/onboarding' : getInitialRouteForRole(result.session.role));
    } catch (error) {
      Alert.alert('تعذر تسجيل الدخول', error instanceof Error ? error.message : 'حاول مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStaffLogin = async () => {
    if (!restaurantCode.trim() || !staffPasscode.trim()) {
      Alert.alert('بيانات ناقصة', 'أدخل كود المطعم وكود الموظف');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await loginStaff({ restaurantCode, passcode: staffPasscode });
      router.replace(getInitialRouteForRole(result.session.role));
    } catch (error) {
      Alert.alert('تعذر تسجيل الدخول', error instanceof Error ? error.message : 'تأكد من الكود');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>عدنا للوحة الفريق</Text>
            <Text style={styles.heroSubtitle}>
              لاختيار تجربة الموظف الصحيحة نبدأ أولاً بصاحب المطعم ثم نسمح للطاقم بالدخول عبر الكود الذي أنشأه الأدمن.
            </Text>
            <View style={styles.modeSwitcher}>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'owner' && styles.modeButtonActive]}
                onPress={() => setMode('owner')}>
                <Text style={[styles.modeText, mode === 'owner' && styles.modeTextActive]}>مالك المطعم</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'staff' && styles.modeButtonActive]}
                onPress={() => setMode('staff')}>
                <Text style={[styles.modeText, mode === 'staff' && styles.modeTextActive]}>ويتر / شيف / كاشير</Text>
              </TouchableOpacity>
            </View>
          </View>

          {mode === 'owner' ? (
            <View style={styles.card}>
              <Text style={styles.label}>البريد الإلكتروني</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="owner@restaurant.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.label}>كلمة المرور</Text>
              <TextInput
                style={styles.input}
                value={ownerPassword}
                onChangeText={setOwnerPassword}
                placeholder="••••••"
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.primaryBtn, isSubmitting && { backgroundColor: theme.border }]}
                disabled={isSubmitting}
                onPress={handleOwnerLogin}>
                <Text style={styles.primaryBtnText}>{isSubmitting ? 'جارٍ التحقق...' : 'تسجيل دخول الأدمن'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.label}>كود المطعم</Text>
              <TextInput
                style={styles.input}
                value={restaurantCode}
                onChangeText={setRestaurantCode}
                placeholder="restaurant-code"
                autoCapitalize="none"
              />
              <Text style={styles.label}>كود الموظف / كلمة المرور</Text>
              <TextInput
                style={styles.input}
                value={staffPasscode}
                onChangeText={setStaffPasscode}
                placeholder="1234"
                secureTextEntry
              />
              <Text style={styles.helperText}>
                اطلب من صاحب المطعم مشاركة كود المطعم والرمز الخاص بك (مكون من 4 أرقام على الأقل) للدخول المباشر إلى شاشة دورك.
              </Text>
              <TouchableOpacity
                style={[styles.primaryBtn, isSubmitting && { backgroundColor: theme.border }]}
                disabled={isSubmitting}
                onPress={handleStaffLogin}>
                <Text style={styles.primaryBtnText}>{isSubmitting ? 'جارٍ التحقق...' : 'دخول الموظف'}</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/register')}>
            <Text style={styles.linkText}>أحتاج لإنشاء مطعم جديد</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => router.replace('/')}> 
            <Text style={[styles.linkText, { color: theme.muted }]}>العودة للواجهة الترحيبية</Text>
          </TouchableOpacity>
        </ScrollView>
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
    content: {
      padding: 20,
      gap: 16,
      paddingBottom: 60,
    },
    heroCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 10,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: theme.text,
      textAlign: 'right',
    },
    heroSubtitle: {
      color: theme.muted,
      lineHeight: 20,
      textAlign: 'right',
    },
    modeSwitcher: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    modeButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: theme.backgroundAlt,
    },
    modeButtonActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryMuted,
    },
    modeText: {
      color: theme.text,
      fontWeight: '700',
    },
    modeTextActive: {
      color: theme.primary,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 10,
    },
    label: {
      fontWeight: '700',
      color: theme.text,
      textAlign: 'right',
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      textAlign: 'right',
    },
    helperText: {
      color: theme.muted,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'right',
    },
    primaryBtn: {
      marginTop: 6,
      backgroundColor: theme.primary,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
    },
    linkButton: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    linkText: {
      color: theme.primary,
      fontWeight: '700',
    },
  });
