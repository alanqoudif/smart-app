import { useEffect, useMemo, useState } from 'react';
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

import { useRouter } from 'expo-router';

import { LanguageSwitcher } from '@/components/language-switcher';
import { Colors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTranslation } from '@/providers/language-provider';
import { useStaffSession } from '@/providers/staff-session-provider';
import { RestaurantExperience } from '@/types';

const EXPERIENCE_OPTIONS: { label: string; value: RestaurantExperience; description: string }[] = [
  { label: 'مطعم', value: 'restaurant', description: 'تقديم وجبات داخل الصالة مع طلبات سفري' },
  { label: 'كوفي', value: 'cafe', description: 'تركيز على المشروبات والحلويات' },
  { label: 'هجين', value: 'hybrid', description: 'خليط بين المطعم والكوفي أو مطبخ سحابي' },
];

const SPECIALTY_OPTIONS = [
  { key: 'grills', label: 'مشاوي' },
  { key: 'traditional', label: 'أطباق شعبية' },
  { key: 'coffee', label: 'قهوة مختصة' },
  { key: 'desserts', label: 'حلويات' },
  { key: 'pasta', label: 'باستا' },
  { key: 'burger', label: 'برجر' },
  { key: 'seafood', label: 'مأكولات بحرية' },
];

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, '-')
    .replace(/(^-|-$)+/g, '');

export default function RegisterScreen() {
  const theme = useThemeColors();
  const { t, isRTL } = useTranslation();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const router = useRouter();
  const { registerRestaurant } = useStaffSession();
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantCode, setRestaurantCode] = useState('');
  const [codeEdited, setCodeEdited] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [experienceType, setExperienceType] = useState<RestaurantExperience>('restaurant');
  const [specialties, setSpecialties] = useState<string[]>(['مشاوي']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textAlign = isRTL ? 'right' : 'left';
  const rowDirection = isRTL ? 'row-reverse' : 'row';

  useEffect(() => {
    if (!codeEdited) {
      setRestaurantCode(slugify(restaurantName));
    }
  }, [restaurantName, codeEdited]);

  const toggleSpecialty = (value: string) => {
    setSpecialties((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const handleSubmit = async () => {
    if (!restaurantName.trim() || !ownerName.trim() || !email.trim()) {
      Alert.alert(
        t('register.missingTitle', 'بيانات ناقصة'),
        t('register.missingMessage', 'املأ بيانات المطعم والمالك أولاً'),
      );
      return;
    }
    if (password.trim().length < 6) {
      Alert.alert(
        t('register.passwordWeakTitle', 'كلمة المرور ضعيفة'),
        t('register.passwordWeakMessage', 'اختر كلمة مرور مكونة من 6 أحرف على الأقل'),
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await registerRestaurant({
        restaurantName: restaurantName.trim(),
        restaurantCode: restaurantCode.trim(),
        ownerName: ownerName.trim(),
        ownerEmail: email.trim(),
        password: password.trim(),
        experienceType,
        specialties,
      });
      router.replace('/onboarding');
    } catch (error) {
      Alert.alert(
        t('register.errorTitle', 'تعذر إنشاء المطعم'),
        error instanceof Error ? error.message : t('common.tryAgain', 'حاول مرة أخرى'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.switcherRow}>
            <LanguageSwitcher />
          </View>
          <View style={styles.header}>
            <Text style={styles.title}>{t('register.title', 'إنشاء مطعمك')}</Text>
            <Text style={styles.subtitle}>
              {t(
                'register.subtitle',
                'هذه الواجهة التعريفية تسمح لك بتجهيز المطعم قبل منح الصلاحيات للطاقم',
              )}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('register.restaurantSection', 'بيانات المطعم')}</Text>
            <Text style={styles.label}>{t('register.restaurantName', 'اسم المطعم')}</Text>
            <TextInput
              value={restaurantName}
              onChangeText={setRestaurantName}
              placeholder={t('register.restaurantPlaceholder', 'مثال: مطعم سما')}
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  color: theme.text,
                  backgroundColor: theme.background,
                  textAlign,
                },
              ]}
              placeholderTextColor={theme.muted}
            />
            <Text style={styles.label}>
              {t('register.restaurantCodeLabel', 'كود المطعم (يُشارك مع الموظفين)')}
            </Text>
            <View style={styles.codeRow}>
              <TextInput
                value={restaurantCode}
                onChangeText={(value) => {
                  setCodeEdited(true);
                  setRestaurantCode(value);
                }}
                placeholder={t('register.codePlaceholder', 'sama-restaurant')}
                autoCapitalize="none"
                style={[
                  styles.input,
                  {
                    flex: 1,
                    borderColor: theme.border,
                    color: theme.text,
                    backgroundColor: theme.background,
                    textAlign,
                  },
                ]}
                placeholderTextColor={theme.muted}
              />
              <TouchableOpacity
                style={styles.chipButton}
                onPress={() => {
                  setCodeEdited(false);
                  setRestaurantCode(slugify(restaurantName || 'restaurant'));
                }}>
                <Text style={styles.chipText}>{t('register.codeSuggest', 'اقتراح')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('register.ownerSection', 'معلومات المالك')}</Text>
            <Text style={styles.label}>{t('register.ownerName', 'اسم الأدمن')}</Text>
            <TextInput
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder={t('register.ownerNamePlaceholder', 'الاسم الكامل')}
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  color: theme.text,
                  backgroundColor: theme.background,
                  textAlign,
                },
              ]}
              placeholderTextColor={theme.muted}
            />
            <Text style={styles.label}>{t('register.ownerEmail', 'البريد الإلكتروني')}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@restaurant.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  color: theme.text,
                  backgroundColor: theme.background,
                  textAlign,
                },
              ]}
              placeholderTextColor={theme.muted}
            />
            <Text style={styles.label}>{t('register.ownerPassword', 'كلمة المرور')}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••"
              secureTextEntry
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  color: theme.text,
                  backgroundColor: theme.background,
                  textAlign,
                },
              ]}
              placeholderTextColor={theme.muted}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('register.experienceTitle', 'طبيعة النشاط')}</Text>
            <View style={styles.optionList}>
              {EXPERIENCE_OPTIONS.map((option) => {
                const selected = experienceType === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.optionCard, selected && styles.optionCardActive]}
                    onPress={() => setExperienceType(option.value)}>
                    <Text
                      style={[styles.optionLabel, selected && { color: theme.primary, textAlign }, { textAlign }]}>
                      {t(`register.experience.${option.value}.label`, option.label)}
                    </Text>
                    <Text style={[styles.optionDescription, { textAlign }]}>
                      {t(`register.experience.${option.value}.description`, option.description)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('register.specialtiesTitle', 'تخصصاتك')}</Text>
            <View style={[styles.tagsRow, { flexDirection: rowDirection }]}>
              {SPECIALTY_OPTIONS.map((item) => {
                const selected = specialties.includes(item.label);
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.tag, selected && styles.tagActive]}
                    onPress={() => toggleSpecialty(item.label)}>
                    <Text style={[styles.tagText, selected && { color: theme.primary }, { textAlign }]}>
                      {t(`register.specialties.${item.key}`, item.label)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && { backgroundColor: theme.border }]}
            disabled={isSubmitting}
            onPress={handleSubmit}>
            <Text style={styles.submitText}>
              {isSubmitting
                ? t('register.submitting', 'جارٍ الإنشاء...')
                : t('register.submit', 'احفظ واذهب للأسئلة')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/login')}>
            <Text style={styles.linkText}>{t('register.backToLogin', 'لديك حساب؟ الرجوع لتسجيل الدخول')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: typeof Colors.light, isRTL: boolean) => {
  const textAlign = isRTL ? 'right' : 'left';
  const rowDirection = isRTL ? 'row-reverse' : 'row';
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.backgroundAlt,
    },
    content: {
      padding: 20,
      gap: 16,
      paddingBottom: 60,
    },
    switcherRow: {
      marginBottom: 10,
    },
    header: {
      gap: 6,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: theme.text,
      textAlign,
    },
    subtitle: {
      color: theme.muted,
      textAlign,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      gap: 10,
    },
    cardTitle: {
      fontWeight: '700',
      color: theme.text,
      fontSize: 18,
      textAlign,
    },
    label: {
      fontWeight: '600',
      color: theme.text,
      textAlign,
    },
    input: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    codeRow: {
      flexDirection: rowDirection,
      alignItems: 'center',
      gap: 8,
    },
    chipButton: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.primaryMuted,
    },
    chipText: {
      color: theme.primary,
      fontWeight: '700',
      textAlign,
    },
    optionList: {
      gap: 10,
    },
    optionCard: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 14,
      gap: 6,
      backgroundColor: theme.backgroundAlt,
    },
    optionCardActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryMuted,
    },
    optionLabel: {
      fontWeight: '700',
      textAlign,
      color: theme.text,
    },
    optionDescription: {
      color: theme.muted,
      textAlign,
      lineHeight: 18,
    },
    tagsRow: {
      flexDirection: rowDirection,
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: isRTL ? 'flex-end' : 'flex-start',
    },
    tag: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.backgroundAlt,
    },
    tagActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryMuted,
    },
    tagText: {
      color: theme.text,
      fontWeight: '600',
      textAlign,
    },
    submitButton: {
      backgroundColor: theme.primary,
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: 'center',
    },
    submitText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
      textAlign,
    },
    linkButton: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    linkText: {
      color: theme.primary,
      fontWeight: '700',
      textAlign,
    },
  });
};
