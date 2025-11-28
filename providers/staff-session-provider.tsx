import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

import * as SecureStore from 'expo-secure-store';

import { StaffRole, StaffSession } from '@/types';

type LoginPayload = {
  staffName: string;
  restaurantCode: string;
  role: StaffRole;
};

type StaffSessionContextValue = {
  session: StaffSession | null;
  isHydrating: boolean;
  login(payload: LoginPayload): Promise<void>;
  switchRole(role: StaffRole): Promise<void>;
  logout(): Promise<void>;
};

// SecureStore keys must be alphanumeric plus ".", "-", and "_" only.
const STORAGE_KEY = 'smart_app.staff_session';

const StaffSessionContext = createContext<StaffSessionContextValue | undefined>(undefined);

export function StaffSessionProvider({ children }: PropsWithChildren<object>) {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((value) => {
        if (value) {
          setSession(JSON.parse(value));
        }
      })
      .finally(() => setIsHydrating(false));
  }, []);

  const persistSession = async (next: StaffSession | null) => {
    setSession(next);
    if (next) {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  };

  const login = async ({ staffName, restaurantCode, role }: LoginPayload) => {
    const trimmedName = staffName.trim();
    const trimmedRestaurant = restaurantCode.trim();
    const normalized: StaffSession = {
      staffName: trimmedName || 'ضيف المطعم',
      restaurantCode: trimmedRestaurant || 'demo-restaurant',
      role,
    };
    await persistSession(normalized);
  };

  const switchRole = async (role: StaffRole) => {
    if (!session) return;
    await persistSession({ ...session, role });
  };

  const logout = async () => {
    await persistSession(null);
  };

  const value = useMemo(
    () => ({
      session,
      isHydrating,
      login,
      switchRole,
      logout,
    }),
    [session, isHydrating],
  );

  return <StaffSessionContext.Provider value={value}>{children}</StaffSessionContext.Provider>;
}

export function useStaffSession() {
  const context = useContext(StaffSessionContext);
  if (!context) {
    throw new Error('useStaffSession must be used within StaffSessionProvider');
  }
  return context;
}
