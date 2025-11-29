import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Redirect, useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { getInitialRouteForRole } from '@/lib/navigation';
import { useTranslation } from '@/providers/language-provider';
import { useStaffSession } from '@/providers/staff-session-provider';
import { FulfillmentType } from '@/types';

const SERVICE_OPTIONS: { label: string; value: FulfillmentType }[] = [
  { label: 'طلبات الصالة', value: 'dine-in' },
  { label: 'سفري واستلام', value: 'pickup' },
  { label: 'توصيل', value: 'delivery' },
];

const PRICE_OPTIONS = [
  { label: 'قيمة اقتصادية', value: 'value' },
  { label: 'متوسط', value: 'standard' },
  { label: 'فاخر', value: 'premium' },
];

const CUISINE_OPTIONS = [
  { key: 'saudi', label: 'سعودي' },
  { key: 'italian', label: 'إيطالي' },
  { key: 'coffee', label: 'قهوة مختصة' },
  { key: 'desserts', label: 'حلويات' },
  { key: 'international', label: 'مأكولات عالمية' },
  { key: 'bakery', label: 'مخبوزات' },
];

export default function OnboardingScreen() {
  const theme = useThemeColors();
  const { t, isRTL } = useTranslation();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const router = useRouter();
  const { session, restaurantProfile, onboardingAnswers, completeOnboarding } = useStaffSession();

  const [serviceModes, setServiceModes] = useState<FulfillmentType[]>(['dine-in']);
  const [pricePosition, setPricePosition] = useState<'value' | 'standard' | 'premium'>('standard');
  const [cuisineFocus, setCuisineFocus] = useState<string[]>(['سعودي']);
  const [conceptVision, setConceptVision] = useState('');
  const [guestNotes, setGuestNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textAlign = isRTL ? 'right' : 'left';
  const rowDirection = isRTL ? 'row-reverse' : 'row';

  useEffect(() => {
    if (onboardingAnswers) {
      setServiceModes(onboardingAnswers.serviceModes);
      setPricePosition(onboardingAnswers.pricePosition ?? 'standard');
      setCuisineFocus(onboardingAnswers.cuisineFocus);
      setConceptVision(onboardingAnswers.conceptVision);
      setGuestNotes(onboardingAnswers.guestNotes ?? '');
    }
  }, [onboardingAnswers]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!session.isOwner || (restaurantProfile && restaurantProfile.onboardingComplete)) {
    return <Redirect href={getInitialRouteForRole(session.role)} />;
  }

  const toggleServiceMode = (value: FulfillmentType) => {
    setServiceModes((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const toggleCuisine = (value: string) => {
    setCuisineFocus((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const handleSubmit = async () => {
    if (serviceModes.length === 0) {
      Alert.alert(t('onboarding.serviceMissing', 'اختر طريقة تقديم واحدة على الأقل'));
      return;
    }

    setIsSubmitting(true);
    try {
      await completeOnboarding({
        conceptVision: conceptVision.trim() || 'تجربة مدروسة لضيوفنا',
        serviceModes,
        cuisineFocus,
        guestNotes: guestNotes.trim() || undefined,
        pricePosition,
      });
      router.replace(getInitialRouteForRole(session.role));
    } catch (error) {
      Alert.alert(
        t('onboarding.errorTitle', 'تعذر حفظ الإجابات'),
        error instanceof Error ? error.message : t('common.tryAgain', 'حاول مرة أخرى'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    await completeOnboarding({
      conceptVision: conceptVision.trim() || 'تجربة مدروسة لضيوفنا',
      serviceModes: serviceModes.length ? serviceModes : ['dine-in'],
      cuisineFocus: cuisineFocus.length ? cuisineFocus : ['سعودي'],
      pricePosition,
      guestNotes: guestNotes.trim() || undefined,
    });
    router.replace(getInitialRouteForRole(session.role));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('onboarding.title', 'خصص تجربة مطعمك')}</Text>
          <Text style={styles.subtitle}>
            {t(
              'onboarding.subtitle',
              'هذه الأسئلة السريعة ستساعدنا على إظهار شاشات ولوحات تناسب نوع نشاطك وأهدافك. يمكنك تعديلها لاحقاً من الإعدادات.',
            )}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('onboarding.serviceTitle', 'طرق تقديم الطلبات')}</Text>
          <View style={[styles.optionsRow, { flexDirection: rowDirection }]}>
            {SERVICE_OPTIONS.map((option) => {
              const selected = serviceModes.includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionChip, selected && styles.optionChipActive]}
                  onPress={() => toggleServiceMode(option.value)}>
                  <Text style={[styles.optionChipText, selected && { color: theme.primary }, { textAlign }]}>
                    {t(`onboarding.service.${option.value}`, option.label)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('onboarding.priceTitle', 'السعر المستهدف')}</Text>
          <View style={[styles.optionsRow, { flexDirection: rowDirection }]}>
            {PRICE_OPTIONS.map((option) => {
              const selected = pricePosition === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionCard, selected && styles.optionCardActive]}
                  onPress={() => setPricePosition(option.value as typeof pricePosition)}>
                  <Text style={[styles.optionLabel, selected && { color: theme.primary }, { textAlign }]}>
                    {t(`onboarding.price.${option.value}`, option.label)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('onboarding.cuisineTitle', 'هوية المطبخ')}</Text>
          <View style={[styles.tagsRow, { flexDirection: rowDirection }]}>
            {CUISINE_OPTIONS.map((item) => {
              const selected = cuisineFocus.includes(item.label);
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.tag, selected && styles.tagActive]}
                  onPress={() => toggleCuisine(item.label)}>
                  <Text style={[styles.tagText, selected && { color: theme.primary }, { textAlign }]}>
                    {t(`onboarding.cuisine.${item.key}`, item.label)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('onboarding.visionTitle', 'ما الذي يميز تجربتك؟')}</Text>
          <TextInput
            value={conceptVision}
            onChangeText={setConceptVision}
            placeholder={t('onboarding.visionPlaceholder', 'مثال: مطعم سعودي مع لمسة عصرية وسرعة في الخدمة')}
            multiline
            style={[
              styles.input,
              {
                height: 110,
                borderColor: theme.border,
                color: theme.text,
                backgroundColor: theme.background,
                textAlign,
              },
            ]}
            placeholderTextColor={theme.muted}
          />
          <Text style={styles.label}>{t('onboarding.notesLabel', 'ملاحظات إضافية للضيوف أو الطاقم')}</Text>
          <TextInput
            value={guestNotes}
            onChangeText={setGuestNotes}
            placeholder={t('onboarding.notesPlaceholder', 'اختياري')}
            multiline
            style={[
              styles.input,
              {
                height: 80,
                borderColor: theme.border,
                color: theme.text,
                backgroundColor: theme.background,
                textAlign,
              },
            ]}
            placeholderTextColor={theme.muted}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, isSubmitting && { backgroundColor: theme.border }]}
          disabled={isSubmitting}
          onPress={handleSubmit}>
          <Text style={styles.primaryBtnText}>
            {isSubmitting ? t('onboarding.saving', 'جارٍ الحفظ...') : t('onboarding.submit', 'حفظ والانتقال للوحة')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>{t('onboarding.skip', 'التخطي حالياً')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: typeof Colors.light, isRTL: boolean) => {
  const textAlign = isRTL ? 'right' : 'left';
  const rowDirection = isRTL ? 'row-reverse' : 'row';
  const alignItems = isRTL ? 'flex-end' : 'flex-start';
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.backgroundAlt,
    },
    content: {
      padding: 20,
      gap: 16,
    },
    header: {
      gap: 8,
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
      lineHeight: 22,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      gap: 12,
    },
    cardTitle: {
      fontWeight: '700',
      color: theme.text,
      fontSize: 18,
      textAlign,
    },
    optionsRow: {
      flexDirection: rowDirection,
      flexWrap: 'wrap',
      gap: 10,
    },
    optionChip: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.backgroundAlt,
    },
    optionChipActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryMuted,
    },
    optionChipText: {
      color: theme.text,
      fontWeight: '600',
      textAlign,
    },
    optionCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 14,
      alignItems,
      backgroundColor: theme.backgroundAlt,
      gap: 6,
    },
    optionCardActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryMuted,
    },
    optionLabel: {
      fontWeight: '700',
      color: theme.text,
      textAlign,
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
    input: {
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      textAlignVertical: 'top',
    },
    label: {
      fontWeight: '600',
      color: theme.text,
      textAlign,
    },
    primaryBtn: {
      backgroundColor: theme.primary,
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: 'center',
    },
    primaryBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
      textAlign,
    },
    skipBtn: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    skipText: {
      color: theme.muted,
      fontWeight: '600',
      textAlign,
    },
  });
};
