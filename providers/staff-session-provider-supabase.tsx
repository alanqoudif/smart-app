/**
 * Staff Session Provider - Supabase Integration
 * Handles authentication and session management with Supabase backend
 */

import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import {
  registerRestaurant as registerRestaurantAPI,
  loginRestaurantOwner,
  loginStaff as loginStaffAPI,
  createStaffAccount as createStaffAPI,
  deleteStaffAccount as deleteStaffAPI,
  listStaffAccounts,
  completeOnboarding as completeOnboardingAPI,
  setRestaurantContext,
} from '@/lib/auth-service';

import {
  RestaurantExperience,
  RestaurantOnboardingAnswers,
  RestaurantProfile,
  StaffAccount,
  StaffRole,
  StaffSession,
} from '@/types';

export type RegisterRestaurantPayload = {
  restaurantName: string;
  restaurantCode?: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
  experienceType: RestaurantExperience;
  specialties: string[];
};

export type OwnerLoginPayload = {
  email: string;
  password: string;
};

export type StaffLoginPayload = {
  restaurantCode: string;
  name: string;
  passcode: string;
};

export type CreateStaffAccountPayload = {
  name: string;
  role: StaffRole;
  passcode: string;
};

type AuthResult = {
  session: StaffSession;
  requiresOnboarding: boolean;
};

type StaffSessionContextValue = {
  session: StaffSession | null;
  restaurantProfile: RestaurantProfile | null;
  onboardingAnswers: RestaurantOnboardingAnswers | null;
  staffAccounts: StaffAccount[];
  isHydrating: boolean;
  isOnboardingRequired: boolean;
  registerRestaurant(payload: RegisterRestaurantPayload): Promise<AuthResult>;
  loginOwner(payload: OwnerLoginPayload): Promise<AuthResult>;
  loginStaff(payload: StaffLoginPayload): Promise<AuthResult>;
  createStaffAccount(payload: CreateStaffAccountPayload): Promise<StaffAccount>;
  removeStaffAccount(accountId: string): Promise<void>;
  completeOnboarding(answers: RestaurantOnboardingAnswers): Promise<void>;
  switchRole(role: StaffRole): Promise<void>;
  logout(): Promise<void>;
};

const STORAGE_KEYS = {
  session: 'smart_app.staff_session',
  profile: 'smart_app.restaurant_profile',
  onboarding: 'smart_app.restaurant_onboarding',
};

const StaffSessionContext = createContext<StaffSessionContextValue | undefined>(undefined);

const parseJSON = <T,>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export function StaffSessionProvider({ children }: PropsWithChildren<object>) {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [restaurantProfile, setRestaurantProfile] = useState<RestaurantProfile | null>(null);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [onboardingAnswers, setOnboardingAnswers] = useState<RestaurantOnboardingAnswers | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  // Hydrate from secure storage on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [sessionValue, profileValue, onboardingValue] = await Promise.all([
          SecureStore.getItemAsync(STORAGE_KEYS.session),
          SecureStore.getItemAsync(STORAGE_KEYS.profile),
          SecureStore.getItemAsync(STORAGE_KEYS.onboarding),
        ]);

        if (!isMounted) return;

        const hydratedSession = parseJSON<StaffSession>(sessionValue);
        const hydratedProfile = parseJSON<RestaurantProfile>(profileValue);
        const hydratedOnboarding = parseJSON<RestaurantOnboardingAnswers>(onboardingValue);

        setSession(hydratedSession);
        setRestaurantProfile(hydratedProfile);
        setOnboardingAnswers(hydratedOnboarding);

        // If we have a valid session, fetch staff accounts from database
        if (hydratedProfile && hydratedSession?.isOwner) {
          const accounts = await listStaffAccounts(hydratedProfile.id);
          if (isMounted) {
            setStaffAccounts(accounts);
          }
        }
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Set RLS context whenever session changes
  useEffect(() => {
    if (session && restaurantProfile) {
      setRestaurantContext(restaurantProfile.id, session.staffId);
    }
  }, [session, restaurantProfile]);

  const persistSession = async (next: StaffSession | null) => {
    setSession(next);
    if (next) {
      await SecureStore.setItemAsync(STORAGE_KEYS.session, JSON.stringify(next));
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.session);
    }
  };

  const persistProfile = async (next: RestaurantProfile | null) => {
    setRestaurantProfile(next);
    if (next) {
      await SecureStore.setItemAsync(STORAGE_KEYS.profile, JSON.stringify(next));
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.profile);
    }
  };

  const persistOnboarding = async (next: RestaurantOnboardingAnswers | null) => {
    setOnboardingAnswers(next);
    if (next) {
      await SecureStore.setItemAsync(STORAGE_KEYS.onboarding, JSON.stringify(next));
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.onboarding);
    }
  };

  const registerRestaurant = async (payload: RegisterRestaurantPayload): Promise<AuthResult> => {
    const { restaurant, error } = await registerRestaurantAPI({
      restaurantCode: payload.restaurantCode || payload.restaurantName,
      restaurantName: payload.restaurantName,
      ownerName: payload.ownerName,
      ownerEmail: payload.ownerEmail,
      ownerPassword: payload.password,
      experienceType: payload.experienceType,
    });

    if (error || !restaurant) {
      throw new Error(error || 'فشل إنشاء المطعم');
    }

    await persistProfile(restaurant);
    await persistOnboarding(null);

    // Create owner session
    const ownerSession: StaffSession = {
      staffId: '', // Will be populated on first full login
      staffName: restaurant.ownerName,
      restaurantCode: restaurant.code,
      role: 'manager',
      isOwner: true,
    };

    await persistSession(ownerSession);

    return { session: ownerSession, requiresOnboarding: !restaurant.onboardingComplete };
  };

  const loginOwner = async ({ email, password }: OwnerLoginPayload): Promise<AuthResult> => {
    const { restaurant, session: newSession, error } = await loginRestaurantOwner({
      email,
      password,
    });

    if (error || !restaurant || !newSession) {
      throw new Error(error || 'فشل تسجيل الدخول');
    }

    await persistProfile(restaurant);
    await persistSession(newSession);

    // Load staff accounts for owner
    if (newSession.isOwner) {
      const accounts = await listStaffAccounts(restaurant.id);
      setStaffAccounts(accounts);
    }

    return { session: newSession, requiresOnboarding: !restaurant.onboardingComplete };
  };

  const loginStaff = async ({
    restaurantCode,
    name,
    passcode,
  }: StaffLoginPayload): Promise<AuthResult> => {
    const { session: newSession, error } = await loginStaffAPI({
      restaurantCode,
      name,
      passcode,
    });

    if (error || !newSession) {
      throw new Error(error || 'فشل تسجيل الدخول');
    }

    await persistSession(newSession);

    return { session: newSession, requiresOnboarding: false };
  };

  const createStaffAccount = async ({
    name,
    role,
    passcode,
  }: CreateStaffAccountPayload): Promise<StaffAccount> => {
    if (!session?.isOwner || !restaurantProfile) {
      throw new Error('فقط الأدمن يستطيع إدارة الفريق');
    }

    const { staff, error } = await createStaffAPI({
      restaurantId: restaurantProfile.id,
      name,
      role,
      passcode,
    });

    if (error || !staff) {
      throw new Error(error || 'فشل إنشاء حساب الموظف');
    }

    // Update local state
    setStaffAccounts((prev) => [...prev, staff]);

    return staff;
  };

  const removeStaffAccount = async (accountId: string) => {
    if (!session?.isOwner) {
      throw new Error('فقط الأدمن يستطيع إدارة الفريق');
    }

    const { success, error } = await deleteStaffAPI(accountId);

    if (!success) {
      throw new Error(error || 'فشل حذف الموظف');
    }

    // Update local state
    setStaffAccounts((prev) => prev.filter((staff) => staff.id !== accountId));
  };

  const completeOnboarding = async (answers: RestaurantOnboardingAnswers) => {
    if (!restaurantProfile) {
      throw new Error('لا يوجد مطعم نشط');
    }

    const { success, error } = await completeOnboardingAPI(restaurantProfile.id, answers);

    if (!success) {
      throw new Error(error || 'فشل إكمال التهيئة');
    }

    await persistOnboarding(answers);

    // Update profile
    const updatedProfile: RestaurantProfile = {
      ...restaurantProfile,
      onboardingComplete: true,
    };
    await persistProfile(updatedProfile);
  };

  const switchRole = async (role: StaffRole) => {
    if (!session || !session.isOwner) return;
    await persistSession({ ...session, role });
  };

  const logout = async () => {
    await persistSession(null);
    await persistProfile(null);
    await persistOnboarding(null);
    setStaffAccounts([]);
  };

  const isOnboardingRequired = Boolean(
    session?.isOwner && restaurantProfile && !restaurantProfile.onboardingComplete,
  );

  const value = useMemo(
    () => ({
      session,
      restaurantProfile,
      onboardingAnswers,
      staffAccounts,
      isHydrating,
      isOnboardingRequired,
      registerRestaurant,
      loginOwner,
      loginStaff,
      createStaffAccount,
      removeStaffAccount,
      completeOnboarding,
      switchRole,
      logout,
    }),
    [
      session,
      restaurantProfile,
      onboardingAnswers,
      staffAccounts,
      isHydrating,
      isOnboardingRequired,
    ],
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

