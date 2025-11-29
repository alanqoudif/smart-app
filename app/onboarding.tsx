import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Redirect, useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { getInitialRouteForRole } from '@/lib/navigation';
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

const CUISINE_OPTIONS = ['سعودي', 'إيطالي', 'قهوة مختصة', 'حلويات', 'مأكولات عالمية', 'مخبوزات'];

export default function OnboardingScreen() {
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { session, restaurantProfile, onboardingAnswers, completeOnboarding } = useStaffSession();

  const [serviceModes, setServiceModes] = useState<FulfillmentType[]>(['dine-in']);
  const [pricePosition, setPricePosition] = useState<'value' | 'standard' | 'premium'>('standard');
  const [cuisineFocus, setCuisineFocus] = useState<string[]>(['سعودي']);
  const [conceptVision, setConceptVision] = useState('');
  const [guestNotes, setGuestNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      Alert.alert('اختر طريقة تقديم واحدة على الأقل');
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
      Alert.alert('تعذر حفظ الإجابات', error instanceof Error ? error.message : 'حاول مرة أخرى');
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
          <Text style={styles.title}>خصص تجربة مطعمك</Text>
          <Text style={styles.subtitle}>
            هذه الأسئلة السريعة ستساعدنا على إظهار شاشات ولوحات تناسب نوع نشاطك وأهدافك. يمكنك تعديلها لاحقاً من الإعدادات.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>طرق تقديم الطلبات</Text>
          <View style={styles.optionsRow}>
            {SERVICE_OPTIONS.map((option) => {
              const selected = serviceModes.includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionChip, selected && styles.optionChipActive]}
                  onPress={() => toggleServiceMode(option.value)}>
                  <Text style={[styles.optionChipText, selected && { color: theme.primary }]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>السعر المستهدف</Text>
          <View style={styles.optionsRow}>
            {PRICE_OPTIONS.map((option) => {
              const selected = pricePosition === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionCard, selected && styles.optionCardActive]}
                  onPress={() => setPricePosition(option.value as typeof pricePosition)}>
                  <Text style={[styles.optionLabel, selected && { color: theme.primary }]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>هوية المطبخ</Text>
          <View style={styles.tagsRow}>
            {CUISINE_OPTIONS.map((item) => {
              const selected = cuisineFocus.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.tag, selected && styles.tagActive]}
                  onPress={() => toggleCuisine(item)}>
                  <Text style={[styles.tagText, selected && { color: theme.primary }]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>ما الذي يميز تجربتك؟</Text>
          <TextInput
            value={conceptVision}
            onChangeText={setConceptVision}
            placeholder="مثال: مطعم سعودي مع لمسة عصرية وسرعة في الخدمة"
            multiline
            style={[styles.input, { height: 110 }]}
          />
          <Text style={styles.label}>ملاحظات إضافية للضيوف أو الطاقم</Text>
          <TextInput
            value={guestNotes}
            onChangeText={setGuestNotes}
            placeholder="اختياري"
            multiline
            style={[styles.input, { height: 80 }]}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, isSubmitting && { backgroundColor: theme.border }]}
          disabled={isSubmitting}
          onPress={handleSubmit}>
          <Text style={styles.primaryBtnText}>{isSubmitting ? 'جارٍ الحفظ...' : 'حفظ والانتقال للوحة'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>التخطي حالياً</Text>
        </TouchableOpacity>
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
      gap: 16,
    },
    header: {
      gap: 8,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: theme.text,
      textAlign: 'right',
    },
    subtitle: {
      color: theme.muted,
      textAlign: 'right',
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
      textAlign: 'right',
    },
    optionsRow: {
      flexDirection: 'row-reverse',
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
    },
    optionCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 14,
      alignItems: 'center',
      backgroundColor: theme.backgroundAlt,
    },
    optionCardActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryMuted,
    },
    optionLabel: {
      fontWeight: '700',
      color: theme.text,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'flex-end',
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
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      textAlignVertical: 'top',
      textAlign: 'right',
      color: theme.text,
    },
    label: {
      fontWeight: '600',
      color: theme.text,
      textAlign: 'right',
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
    },
    skipBtn: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    skipText: {
      color: theme.muted,
      fontWeight: '600',
    },
  });
