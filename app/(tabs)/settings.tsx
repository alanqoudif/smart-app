import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { useStaffSession } from '@/providers/staff-session-provider';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'auto';

export default function SettingsScreen() {
  const { colorScheme, themeMode, setThemeMode } = useTheme();
  const { session, logout } = useStaffSession();
  const colors = Colors[colorScheme];

  const handleSignOut = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تسجيل الخروج',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  const themeOptions: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'light', label: 'نهاري', icon: 'sun.max.fill' },
    { mode: 'dark', label: 'ليلي', icon: 'moon.fill' },
    { mode: 'auto', label: 'تلقائي', icon: 'sparkles' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>الإعدادات</Text>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>الحساب</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.accountInfo}>
            <View
              style={[styles.avatarContainer, { backgroundColor: colors.primaryMuted }]}>
              <IconSymbol name="person.fill" size={32} color={colors.primary} />
            </View>
            <View style={styles.accountDetails}>
              <Text style={[styles.accountName, { color: colors.text }]}>
                {session?.role === 'cashier' ? 'الكاشير' : session?.role === 'kitchen' ? 'المطبخ' : 'الموظف'}
              </Text>
              <Text style={[styles.accountRole, { color: colors.muted }]}>
                {session?.role === 'cashier' ? 'موظف الكاشير' : session?.role === 'kitchen' ? 'موظف المطبخ' : 'الدور'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Theme Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>المظهر</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>الوضع</Text>
          <View style={styles.themeOptions}>
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
                    },
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {themeMode === 'auto' && (
            <Text style={[styles.themeNote, { color: colors.muted }]}>
              سيتغير المظهر تلقائياً حسب إعدادات الجهاز
            </Text>
          )}
        </View>
      </View>

      {/* Sign Out */}
      <View style={styles.section}>
        <Pressable
          style={[styles.signOutButton, { backgroundColor: colors.danger }]}
          onPress={handleSignOut}>
          <IconSymbol name="arrow.right.square.fill" size={20} color="#ffffff" />
          <Text style={styles.signOutText}>تسجيل الخروج</Text>
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
  signOutButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  signOutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

