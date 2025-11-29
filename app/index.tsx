import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Redirect, useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { getInitialRouteForRole } from '@/lib/navigation';
import { useStaffSession } from '@/providers/staff-session-provider';

const FEATURE_CARDS = [
  {
    title: 'تجربة موحدة لكل الأدوار',
    description: 'أدمن المطعم يضبط الإعدادات ويُنشئ حسابات الويتر، الشيف والكاشير من مكان واحد.',
  },
  {
    title: 'أسئلة ذكية عند التسجيل',
    description: 'نجمع تفضيلات المطعم (نوع النشاط، التخصص، طرق التقديم) لتخصيص الواجهة والمزايا.',
  },
  {
    title: 'لوحة متابعة لحظية',
    description: 'الطلبات، العملاء، والمطبخ في شاشة واحدة مع نفس الألوان والهوية الحالية لكن بتجربة أعمق.',
  },
];

export default function WelcomeScreen() {
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { session, isHydrating, isOnboardingRequired } = useStaffSession();

  if (!isHydrating && session) {
    const nextRoute = session.isOwner && isOnboardingRequired ? '/onboarding' : getInitialRouteForRole(session.role);
    return <Redirect href={nextRoute} />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.badge}>smart app</Text>
          <Text style={styles.heroTitle}>منصة واحدة لكل فريق مطعمك</Text>
          <Text style={styles.heroSubtitle}>
            ابدأ بواجهة ترحيبية، أنشئ مطعمك، أجب عن الأسئلة المخصصة، ثم وزّع أكواد الدخول على الويتر والشيف والكاشير.
          </Text>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/register')}>
              <Text style={styles.primaryBtnText}>إنشاء مطعم جديد</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/login')}>
              <Text style={styles.secondaryBtnText}>تسجيل دخول</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>لماذا نبدأ بواجهة ترحيبية؟</Text>
          <Text style={styles.sectionSubtitle}>نفس الألوان والهوية الحالية لكن تجربة مدروسة تبدأ بالتعريف ثم التفويض</Text>
        </View>

        <View style={styles.featuresGrid}>
          {FEATURE_CARDS.map((card) => (
            <View key={card.title} style={styles.featureCard}>
              <Text style={styles.featureTitle}>{card.title}</Text>
              <Text style={styles.featureDescription}>{card.description}</Text>
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
    content: {
      padding: 20,
      gap: 18,
    },
    heroCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 16,
    },
    badge: {
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
      fontSize: 28,
      fontWeight: '800',
      color: theme.text,
      lineHeight: 34,
    },
    heroSubtitle: {
      color: theme.muted,
      lineHeight: 22,
      fontSize: 15,
    },
    heroActions: {
      flexDirection: 'row-reverse',
      gap: 12,
    },
    primaryBtn: {
      flex: 1,
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: 'center',
    },
    primaryBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
    },
    secondaryBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: 'center',
      backgroundColor: theme.backgroundAlt,
    },
    secondaryBtnText: {
      color: theme.text,
      fontWeight: '700',
      fontSize: 16,
    },
    sectionHeader: {
      gap: 6,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'right',
    },
    sectionSubtitle: {
      color: theme.muted,
      textAlign: 'right',
    },
    featuresGrid: {
      gap: 12,
    },
    featureCard: {
      backgroundColor: theme.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 6,
    },
    featureTitle: {
      fontWeight: '700',
      fontSize: 16,
      color: theme.text,
      textAlign: 'right',
    },
    featureDescription: {
      color: theme.muted,
      lineHeight: 20,
      textAlign: 'right',
    },
  });
