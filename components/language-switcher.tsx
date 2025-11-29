import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { LANGUAGE_OPTIONS } from '@/constants/translations';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTranslation } from '@/providers/language-provider';

type LanguageSwitcherProps = {
  mode?: 'sheet' | 'inline';
};

export function LanguageSwitcher({ mode = 'sheet' }: LanguageSwitcherProps) {
  const { language, setLanguage, t, isRTL } = useTranslation();
  const theme = useThemeColors();
  const [isVisible, setIsVisible] = useState(false);

  const currentOption = LANGUAGE_OPTIONS.find((option) => option.code === language) ?? LANGUAGE_OPTIONS[0];
  const textAlign = isRTL ? 'right' : 'left';
  const rowDirection = isRTL ? 'row-reverse' : 'row';

  if (mode === 'inline') {
    return (
      <View style={[styles.inlineCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <Text style={[styles.inlineTitle, { color: theme.text, textAlign }]}>
          {t('language.title', 'اللغة')}
        </Text>
        <Text style={[styles.inlineSubtitle, { color: theme.muted, textAlign }]}>
          {t('language.inlineDescription', 'متاحة لكل أفراد الفريق')}
        </Text>
        <View style={[styles.inlineOptions, { flexDirection: rowDirection }]}>
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = option.code === language;
            return (
              <TouchableOpacity
                key={option.code}
                style={[
                  styles.inlineOption,
                  {
                    borderColor: selected ? theme.primary : theme.border,
                    backgroundColor: selected ? theme.primaryMuted : theme.background,
                  },
                ]}
                onPress={() => {
                  void setLanguage(option.code);
                }}>
                <Text
                  style={[
                    styles.inlineOptionLabel,
                    { color: selected ? theme.primary : theme.text, textAlign },
                  ]}>
                  {option.label}
                </Text>
                {option.helper ? (
                  <Text style={[styles.inlineOptionHelper, { color: theme.muted, textAlign }]}>
                    {option.helper}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          { borderColor: theme.border, backgroundColor: theme.card, flexDirection: rowDirection },
        ]}
        onPress={() => setIsVisible(true)}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.triggerLabel, { color: theme.muted, textAlign }]}>
            {t('language.quickToggle', 'اللغة')}
          </Text>
          <Text style={[styles.triggerValue, { color: theme.text, textAlign }]}>
            {currentOption.label}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: theme.primaryMuted }]}>
          <Text style={[styles.badgeText, { color: theme.primary }]}>{currentOption.shortLabel}</Text>
        </View>
      </TouchableOpacity>

      <Modal transparent visible={isVisible} animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setIsVisible(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.card }]}>
            <Text style={[styles.sheetTitle, { color: theme.text, textAlign }]}>
              {t('language.modalTitle', 'اختر لغتك')}
            </Text>
            {LANGUAGE_OPTIONS.map((option) => {
              const selected = option.code === language;
              return (
                <TouchableOpacity
                  key={option.code}
                  style={[
                    styles.sheetOption,
                    {
                      flexDirection: rowDirection,
                      borderColor: selected ? theme.primary : theme.border,
                      backgroundColor: selected ? theme.primaryMuted : theme.backgroundAlt,
                    },
                  ]}
                  onPress={() => {
                    setIsVisible(false);
                    void setLanguage(option.code);
                  }}>
                  <View>
                    <Text style={[styles.optionLabel, { color: theme.text, textAlign }]}>
                      {option.label}
                    </Text>
                    {option.helper ? (
                      <Text style={[styles.optionHelper, { color: theme.muted, textAlign }]}>
                        {option.helper}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}>
                    {selected ? <View style={[styles.radioDot, { backgroundColor: theme.primary }]} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  triggerLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  triggerValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 13,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  sheetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  optionHelper: {
    fontSize: 12,
    marginTop: 4,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  inlineCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  inlineTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  inlineSubtitle: {
    fontSize: 13,
  },
  inlineOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  inlineOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  inlineOptionLabel: {
    fontWeight: '700',
  },
  inlineOptionHelper: {
    fontSize: 11,
  },
});
