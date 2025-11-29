import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Redirect, useRouter } from 'expo-router';

import { LanguageSwitcher } from '@/components/language-switcher';
import { Colors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { getInitialRouteForRole } from '@/lib/navigation';
import { useTranslation } from '@/providers/language-provider';
import { useStaffSession } from '@/providers/staff-session-provider';

const FEATURE_CARDS = [
  {
    key: 'welcome.features.roles',
    title: 'تجربة موحدة لكل الأدوار',
    description: 'أدمن المطعم يضبط الإعدادات ويُنشئ حسابات الويتر، الشيف والكاشير من مكان واحد.',
  },
  {
    key: 'welcome.features.questions',
    title: 'أسئلة ذكية عند التسجيل',
    description: 'نجمع تفضيلات المطعم (نوع النشاط، التخصص، طرق التقديم) لتخصيص الواجهة والمزايا.',
  },
  {
    key: 'welcome.features.dashboard',
    title: 'لوحة متابعة لحظية',
    description: 'الطلبات، العملاء، والمطبخ في شاشة واحدة مع نفس الألوان والهوية الحالية لكن بتجربة أعمق.',
  },
];

export default function WelcomeScreen() {
  const theme = useThemeColors();
  const { t, isRTL } = useTranslation();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const router = useRouter();
  const rowDirection = isRTL ? 'row-reverse' : 'row';
  const { session, isHydrating, isOnboardingRequired } = useStaffSession();

  if (!isHydrating && session) {
    const nextRoute = session.isOwner && isOnboardingRequired ? '/onboarding' : getInitialRouteForRole(session.role);
    return <Redirect href={nextRoute} />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.languageRow}>
          <LanguageSwitcher />
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.badge}>smart app</Text>
          <Text style={styles.heroTitle}>{t('welcome.heroTitle', 'منصة واحدة لكل فريق مطعمك')}</Text>
          <Text style={styles.heroSubtitle}>
            {t(
              'welcome.heroSubtitle',
              'ابدأ بواجهة ترحيبية، أنشئ مطعمك، أجب عن الأسئلة المخصصة، ثم وزّع أكواد الدخول على الويتر والشيف والكاشير.',
            )}
          </Text>
        </View>

        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>
            {t('welcome.actionsTitle', 'إختر خطوتك التالية')}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {t(
              'welcome.actionsSubtitle',
              'قسمنا الواجهة بين إنشاء مطعم جديد وتسجيل الدخول لتكون البداية أوضح.',
            )}
          </Text>
          <View style={[styles.actionButtons, { flexDirection: rowDirection }]}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/register')}>
              <Text style={styles.primaryBtnText}>
                {t('welcome.primaryCta', 'إنشاء مطعم جديد')}
              </Text>
              <Text style={styles.ctaHelper}>
                {t('welcome.primaryCtaHelper', 'ننقلك لأسئلة تعريف النشاط والتخصص.')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/login')}>
              <Text style={styles.secondaryBtnText}>{t('welcome.secondaryCta', 'تسجيل دخول')}</Text>
              <Text style={[styles.ctaHelper, { color: theme.muted }]}>
                {t('welcome.secondaryCtaHelper', 'لديك مطعم منشأ مسبقاً؟ ادخل مباشرة.')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {t('welcome.featuresTitle', 'لماذا نبدأ بواجهة ترحيبية؟')}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {t(
              'welcome.featuresSubtitle',
              'نفس الألوان والهوية الحالية لكن تجربة مدروسة تبدأ بالتعريف ثم التفويض',
            )}
          </Text>
        </View>

        <View style={styles.featuresGrid}>
          {FEATURE_CARDS.map((card) => (
            <View key={card.title} style={styles.featureCard}>
              <Text style={styles.featureTitle}>
                {t(`${card.key}.title`, card.title)}
              </Text>
              <Text style={styles.featureDescription}>
                {t(`${card.key}.description`, card.description)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: typeof Colors.light, isRTL: boolean) => {
  const textAlign = isRTL ? 'right' : 'left';
  const alignStart = isRTL ? 'flex-end' : 'flex-start';
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.backgroundAlt,
    },
    content: {
      padding: 20,
      gap: 18,
    },
    languageRow: {
      marginBottom: 6,
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
      alignSelf: alignStart,
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
      textAlign,
    },
    heroSubtitle: {
      color: theme.muted,
      lineHeight: 22,
      fontSize: 15,
      textAlign,
    },
    actionsCard: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 10,
    },
    actionButtons: {
      gap: 12,
    },
    primaryBtn: {
      flex: 1,
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: 16,
      paddingHorizontal: 14,
      alignItems: alignStart,
      gap: 4,
    },
    primaryBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
      textAlign,
    },
    ctaHelper: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 13,
      textAlign,
    },
    secondaryBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: alignStart,
      backgroundColor: theme.backgroundAlt,
      paddingHorizontal: 14,
      gap: 4,
    },
    secondaryBtnText: {
      color: theme.text,
      fontWeight: '700',
      fontSize: 16,
      textAlign,
    },
    sectionHeader: {
      gap: 6,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      textAlign,
    },
    sectionSubtitle: {
      color: theme.muted,
      textAlign,
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
      textAlign,
    },
    featureDescription: {
      color: theme.muted,
      lineHeight: 20,
      textAlign,
    },
  });
};
