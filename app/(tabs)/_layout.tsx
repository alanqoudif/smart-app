import { Redirect, Tabs } from 'expo-router';
import React, { useMemo } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useSmartApp } from '@/providers/smart-app-provider';
import { useStaffSession } from '@/providers/staff-session-provider';

export default function TabLayout() {
  const theme = useThemeColors();
  const { session, isHydrating, isOnboardingRequired } = useStaffSession();
  const { orders } = useSmartApp();

  if (isHydrating) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (session.isOwner && isOnboardingRequired) {
    return <Redirect href="/onboarding" />;
  }

  const isWaiter = session.role === 'waiter' || session.role === 'cashier';
  const isChef = session.role === 'chef';
  const isManager = session.role === 'manager';
  const canSeeCustomers = session.role !== 'waiter' && session.role !== 'chef';
  const readyCount = orders.filter((order) => order.status === 'ready').length;
  const kitchenQueue = orders.filter((order) => order.status === 'new' || order.status === 'preparing');
  const kitchenQueueCount = kitchenQueue.length;

  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: theme.card,
      borderRadius: 26,
      marginHorizontal: 16,
      marginBottom: 12,
      height: 70,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 16,
      elevation: 8,
      overflow: 'hidden',
    }),
    [theme],
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarHideOnKeyboard: true,
      }}>
      {/* طلبات الصالة - للويتر فقط */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'طلبات الصالة',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="cart.fill" color={color} />,
          tabBarBadge: isWaiter && readyCount > 0 ? (readyCount > 9 ? '9+' : readyCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.primary,
            color: '#fff',
          },
          href: isWaiter ? '/(tabs)' : null,
        }}
      />
      
      {/* شاشة المطبخ - للشيف فقط */}
      <Tabs.Screen
        name="kitchen"
        options={{
          title: 'شاشة المطبخ',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="tray.full.fill" color={color} />,
          tabBarBadge: isChef && kitchenQueueCount > 0 ? kitchenQueueCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.warning,
          },
          href: isChef ? '/(tabs)/kitchen' : null,
        }}
      />
      
      {/* إدارة المنيو - للمدير فقط */}
      <Tabs.Screen
        name="menu-management"
        options={{
          title: 'إدارة المنيو',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="list.bullet.clipboard.fill" color={color} />,
          href: isManager ? '/(tabs)/menu-management' : null,
        }}
      />
      
      {/* لوحة التحكم - للجميع */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'لوحة التحكم',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar.fill" color={color} />,
        }}
      />
      
      {/* العملاء - للجميع */}
      <Tabs.Screen
        name="customers"
        options={{
          title: 'العملاء',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.3.fill" color={color} />,
          href: canSeeCustomers ? '/(tabs)/customers' : null,
        }}
      />
      
      {/* الإعدادات - للجميع */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'الإعدادات',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
