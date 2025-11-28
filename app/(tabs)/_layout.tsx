import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStaffSession } from '@/providers/staff-session-provider';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session, isHydrating } = useStaffSession();

  if (isHydrating) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  const isWaiter = session.role === 'waiter';
  const isChef = session.role === 'chef';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      {/* طلبات الصالة - للويتر فقط */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'طلبات الصالة',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="cart.fill" color={color} />,
          href: isWaiter ? '/(tabs)/' : null,
        }}
      />
      
      {/* شاشة المطبخ - للشيف فقط */}
      <Tabs.Screen
        name="kitchen"
        options={{
          title: 'شاشة المطبخ',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="tray.full.fill" color={color} />,
          href: isChef ? '/(tabs)/kitchen' : null,
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
