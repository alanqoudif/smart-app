import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useStaffSession } from '@/providers/staff-session-provider';

export function RoleSwitcher() {
  const { session, switchRole, logout } = useStaffSession();
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();

  if (!session) return null;

  const handleSwitch = async (nextRole: typeof session.role) => {
    await switchRole(nextRole);
    router.replace(nextRole === 'chef' ? '/(tabs)/kitchen' : '/(tabs)');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.meta}>
        <Text style={styles.metaTitle}>{session.restaurantCode}</Text>
        <Text style={styles.metaSubtitle}>{session.staffName}</Text>
      </View>
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.roleButton, session.role === 'waiter' && styles.roleButtonActive]}
          onPress={() => handleSwitch('waiter')}>
          <Text style={[styles.roleText, session.role === 'waiter' && styles.roleTextActive]}>ويتر</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleButton, session.role === 'chef' && styles.roleButtonActive]}
          onPress={() => handleSwitch('chef')}>
          <Text style={[styles.roleText, session.role === 'chef' && styles.roleTextActive]}>شيف</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>خروج</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: theme.card,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    meta: {
      flex: 1,
      gap: 2,
    },
    metaTitle: {
      fontWeight: '700',
      color: theme.text,
    },
    metaSubtitle: {
      color: theme.muted,
      fontSize: 13,
    },
    buttons: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    roleButton: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.backgroundAlt,
    },
    roleButtonActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryMuted,
    },
    roleText: {
      fontWeight: '700',
      color: theme.text,
    },
    roleTextActive: {
      color: theme.primary,
    },
    logoutButton: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    logoutText: {
      color: theme.danger,
      fontWeight: '700',
    },
  });
