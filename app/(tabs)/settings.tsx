import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useRouter } from 'expo-router';

import { LanguageSwitcher } from '@/components/language-switcher';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { useStaffSession } from '@/providers/staff-session-provider';
import { useTranslation } from '@/providers/language-provider';
import { StaffRole } from '@/types';

type ThemeMode = 'light' | 'dark' | 'auto';

export default function SettingsScreen() {
  const { colorScheme, themeMode, setThemeMode } = useTheme();
  const { session, logout, staffAccounts, restaurantProfile, createStaffAccount, removeStaffAccount } = useStaffSession();
  const colors = Colors[colorScheme];
  const { t, isRTL } = useTranslation();
  const textAlign = isRTL ? 'right' : 'left';
  const rowDirection = isRTL ? 'row-reverse' : 'row';
  const router = useRouter();
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>('waiter');
  const [newStaffPasscode, setNewStaffPasscode] = useState('');
  const [isSavingStaff, setIsSavingStaff] = useState(false);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'waiter':
        return t('roles.waiter', 'ويتر');
      case 'chef':
        return t('roles.chef', 'شيف');
      case 'manager':
        return t('roles.manager', 'مدير المطعم');
      case 'cashier':
        return t('roles.cashier', 'كاشير');
      default:
        return t('roles.member', 'موظف');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'waiter':
        return 'cart.fill';
      case 'chef':
        return 'flame.fill';
      case 'manager':
        return 'star.fill';
      case 'cashier':
        return 'creditcard.fill';
      default:
        return 'person.fill';
    }
  };

  const staffRoleOptions: { label: string; value: StaffRole }[] = useMemo(
    () => [
      { label: t('roles.waiter', 'ويتر'), value: 'waiter' },
      { label: t('roles.cashier', 'كاشير'), value: 'cashier' },
      { label: t('roles.chef', 'شيف'), value: 'chef' },
    ],
    [t],
  );

  const canManageStaff = Boolean(session?.isOwner);

  const handleCreateStaff = async () => {
    if (!newStaffPasscode.trim()) {
      Alert.alert(
        t('settings.staff.missingPasscodeTitle', 'أدخل كود الموظف'),
        t('settings.staff.missingPasscodeMessage', 'الكود يجب أن يتكون من 4 أحرف على الأقل'),
      );
      return;
    }
    setIsSavingStaff(true);
    try {
      await createStaffAccount({
        name: newStaffName,
        role: newStaffRole,
        passcode: newStaffPasscode,
      });
      setNewStaffName('');
      setNewStaffPasscode('');
      Alert.alert(
        t('settings.staff.addedTitle', 'تم إضافة الموظف'),
        t('settings.staff.addedMessage', 'شارك الكود معه للدخول مباشرة'),
      );
    } catch (error) {
      Alert.alert(
        t('settings.staff.errorAddTitle', 'تعذر إضافة الموظف'),
        error instanceof Error ? error.message : t('common.tryAgain', 'حاول مرة أخرى'),
      );
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleRemoveStaff = (staffId: string, staffName: string) => {
    Alert.alert(
      t('settings.staff.removeTitle', 'حذف موظف'),
      t('settings.staff.removeMessage', 'هل تريد حذف {name}؟', { name: staffName }),
      [
        { text: t('common.cancel', 'إلغاء'), style: 'cancel' },
      {
        text: t('common.delete', 'حذف'),
        style: 'destructive',
        onPress: async () => {
          try {
            await removeStaffAccount(staffId);
          } catch (error) {
            Alert.alert(
              t('settings.staff.removeErrorTitle', 'تعذر الحذف'),
              error instanceof Error ? error.message : t('common.tryAgain', 'حاول مرة أخرى'),
            );
          }
        },
      },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert(t('settings.logout.title', 'تسجيل الخروج'), t('settings.logout.message', 'هل أنت متأكد من تسجيل الخروج؟'), [
      { text: t('common.cancel', 'إلغاء'), style: 'cancel' },
      {
        text: t('settings.logout.button', 'تسجيل الخروج'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const themeOptions: { mode: ThemeMode; label: string; icon: string }[] = useMemo(
    () => [
      { mode: 'light', label: t('settings.theme.light', 'نهاري'), icon: 'sun.max.fill' },
      { mode: 'dark', label: t('settings.theme.dark', 'ليلي'), icon: 'moon.fill' },
      { mode: 'auto', label: t('settings.theme.auto', 'تلقائي'), icon: 'sparkles' },
    ],
    [t],
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text, textAlign }]}>
          {t('settings.title', 'الإعدادات')}
        </Text>
      </View>

      <View style={styles.section}>
        <LanguageSwitcher mode="inline" />
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text, textAlign }]}>
          {t('settings.account.title', 'معلومات الحساب')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.accountInfo, { flexDirection: rowDirection }]}>
            <View
              style={[styles.avatarContainer, { backgroundColor: colors.primaryMuted }]}>
              <IconSymbol 
                name={getRoleIcon(session?.role || 'waiter')} 
                size={32} 
                color={colors.primary} 
              />
            </View>
            <View
              style={[
                styles.accountDetails,
                { alignItems: isRTL ? 'flex-end' : 'flex-start' },
              ]}>
              <Text style={[styles.accountName, { color: colors.text, textAlign }]}>
                {session?.staffName || t('settings.account.fallbackName', 'موظف المطعم')}
              </Text>
              <View
                style={[
                  styles.roleContainer,
                  { alignSelf: isRTL ? 'flex-end' : 'flex-start' },
                ]}>
                <View
                  style={[
                    styles.roleBadge,
                    { flexDirection: rowDirection },
                    { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
                  ]}>
                  <IconSymbol
                    name={getRoleIcon(session?.role || 'waiter')}
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={[styles.roleText, { color: colors.primary, textAlign }]}>
                    {getRoleLabel(session?.role || 'waiter')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.restaurantCode, { color: colors.muted, textAlign }]}>
                {session?.restaurantCode || 'demo-restaurant'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Theme Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text, textAlign }]}>
          {t('settings.theme.title', 'المظهر')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.muted, textAlign }]}>
            {t('settings.theme.modeLabel', 'الوضع')}
          </Text>
          <View style={[styles.themeOptions, { flexDirection: rowDirection }]}>
            {themeOptions.map((option) => (
              <Pressable
                key={option.mode}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor:
                      themeMode === option.mode ? colors.primary : colors.backgroundAlt,
                    borderColor: themeMode === option.mode ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setThemeMode(option.mode)}>
                <IconSymbol
                  name={option.icon}
                  size={24}
                  color={themeMode === option.mode ? '#ffffff' : colors.icon}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    {
                      color: themeMode === option.mode ? '#ffffff' : colors.text,
                      textAlign,
                    },
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {themeMode === 'auto' && (
            <Text style={[styles.themeNote, { color: colors.muted, textAlign }]}>
              {t('settings.theme.autoNote', 'سيتغير المظهر تلقائياً حسب إعدادات الجهاز')}
            </Text>
          )}
        </View>
      </View>

      {canManageStaff && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign }]}>
            {t('settings.staff.title', 'فريق المطعم')}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 16 }]}>
            <View style={[styles.codeBanner, { borderColor: colors.border, backgroundColor: colors.backgroundAlt }]}>
              <Text style={[styles.codeLabel, { color: colors.muted, textAlign }]}>
                {t('settings.staff.restaurantCode', 'كود المطعم')}
              </Text>
              <Text style={[styles.codeValue, { color: colors.text, textAlign }]}>
                {restaurantProfile?.code || t('settings.staff.codeMissing', 'لم يحدد بعد')}
              </Text>
            </View>

            <View style={styles.staffList}>
              {staffAccounts.length === 0 ? (
                <Text style={[styles.emptyStaff, { color: colors.muted, textAlign }]}>
                  {t('settings.staff.empty', 'لم يتم إضافة أي موظف بعد')}
                </Text>
              ) : (
                staffAccounts.map((staff) => (
                  <View
                    key={staff.id}
                    style={[
                      styles.staffRow,
                      { flexDirection: rowDirection, borderBottomColor: colors.border },
                    ]}>
                    <View
                      style={[
                        styles.staffInfo,
                        { alignItems: isRTL ? 'flex-end' : 'flex-start' },
                      ]}>
                      <Text style={[styles.staffName, { color: colors.text, textAlign }]}>
                        {staff.name}
                      </Text>
                      <Text style={[styles.staffMeta, { color: colors.muted, textAlign }]}>
                        {t('settings.staff.meta', '{role} • الكود: {code}', {
                          role: getRoleLabel(staff.role),
                          code: staff.passcode,
                        })}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.removeStaffBtn} onPress={() => handleRemoveStaff(staff.id, staff.name)}>
                      <IconSymbol name="trash.fill" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <View style={styles.staffForm}>
              <TextInput
                style={[
                  styles.staffInput,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                    textAlign,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholder={t('settings.staff.namePlaceholder', 'اسم الموظف')}
                placeholderTextColor={colors.muted}
                value={newStaffName}
                onChangeText={setNewStaffName}
              />
              <View style={[styles.roleSelector, { flexDirection: rowDirection }]}>
                {staffRoleOptions.map((option) => {
                  const selected = newStaffRole === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.roleChip,
                        { borderColor: colors.border },
                        selected && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                      ]}
                      onPress={() => setNewStaffRole(option.value)}>
                      <Text
                        style={[
                          styles.roleChipText,
                          { color: selected ? colors.primary : colors.text, textAlign },
                        ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                style={[
                  styles.staffInput,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                    textAlign,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholder={t('settings.staff.passcodePlaceholder', 'كود الموظف (مثال: 4021)')}
                placeholderTextColor={colors.muted}
                value={newStaffPasscode}
                onChangeText={setNewStaffPasscode}
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.addStaffButton, { backgroundColor: colors.primary }, isSavingStaff && { backgroundColor: colors.border }]}
                disabled={isSavingStaff}
                onPress={handleCreateStaff}>
                <Text style={styles.addStaffText}>
                  {isSavingStaff
                    ? t('common.saving', 'جارٍ الحفظ...')
                    : t('settings.staff.addButton', 'إضافة موظف')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Logout Section */}
      <View style={styles.section}>
        <Pressable
          style={[
            styles.logoutButton,
            { backgroundColor: colors.danger, flexDirection: rowDirection },
          ]}
          onPress={handleLogout}>
          <IconSymbol name="arrow.right.square.fill" size={20} color="#ffffff" />
          <Text style={styles.logoutText}>{t('settings.logout.button', 'تسجيل الخروج')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'right',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  accountInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountDetails: {
    flex: 1,
    marginRight: 16,
    alignItems: 'flex-end',
  },
  accountName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountRole: {
    fontSize: 14,
  },
  roleContainer: {
    marginTop: 8,
  },
  roleBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    alignSelf: 'flex-end',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  restaurantCode: {
    fontSize: 12,
    marginTop: 4,
  },
  cardLabel: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'right',
  },
  themeOptions: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 12,
  },
  themeOption: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    gap: 8,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  themeNote: {
    fontSize: 12,
    textAlign: 'right',
  },
  logoutButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  codeBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  codeLabel: {
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'right',
  },
  codeValue: {
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'right',
  },
  staffList: {
    gap: 8,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  staffInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  staffName: {
    fontWeight: '700',
  },
  staffMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  emptyStaff: {
    textAlign: 'center',
    paddingVertical: 8,
  },
  removeStaffBtn: {
    padding: 8,
    borderRadius: 999,
  },
  staffForm: {
    gap: 10,
  },
  staffInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: 'right',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  roleChip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roleChipText: {
    fontWeight: '600',
  },
  addStaffButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addStaffText: {
    color: '#fff',
    fontWeight: '700',
  },
});
