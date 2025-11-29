import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

import * as SecureStore from 'expo-secure-store';

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
  staff: 'smart_app.staff_accounts',
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

const normalizeRestaurantCode = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  const normalized = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  if (normalized.length === 0) {
    return `restaurant-${Math.random().toString(36).slice(2, 6)}`;
  }
  return normalized;
};

const createOwnerSession = (profile: RestaurantProfile): StaffSession => ({
  staffId: `owner-${profile.id}`,
  staffName: profile.ownerName,
  restaurantCode: profile.code,
  role: 'manager',
  isOwner: true,
});

export function StaffSessionProvider({ children }: PropsWithChildren<object>) {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [restaurantProfile, setRestaurantProfile] = useState<RestaurantProfile | null>(null);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [onboardingAnswers, setOnboardingAnswers] = useState<RestaurantOnboardingAnswers | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [sessionValue, profileValue, staffValue, onboardingValue] = await Promise.all([
          SecureStore.getItemAsync(STORAGE_KEYS.session),
          SecureStore.getItemAsync(STORAGE_KEYS.profile),
          SecureStore.getItemAsync(STORAGE_KEYS.staff),
          SecureStore.getItemAsync(STORAGE_KEYS.onboarding),
        ]);

        if (!isMounted) return;

        setSession(parseJSON<StaffSession>(sessionValue));
        setRestaurantProfile(parseJSON<RestaurantProfile>(profileValue));
        setStaffAccounts(parseJSON<StaffAccount[]>(staffValue) ?? []);
        setOnboardingAnswers(parseJSON<RestaurantOnboardingAnswers>(onboardingValue));
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

  const persistStaffAccounts = async (next: StaffAccount[]) => {
    setStaffAccounts(next);
    await SecureStore.setItemAsync(STORAGE_KEYS.staff, JSON.stringify(next));
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
    if (restaurantProfile) {
      throw new Error('يوجد مطعم مسجل مسبقاً على هذا الجهاز');
    }

    const normalizedCode = normalizeRestaurantCode(payload.restaurantCode ?? payload.restaurantName);
    const nextProfile: RestaurantProfile = {
      id: `restaurant-${Date.now().toString(36)}`,
      name: payload.restaurantName.trim(),
      code: normalizedCode,
      ownerName: payload.ownerName.trim(),
      ownerEmail: payload.ownerEmail.trim().toLowerCase(),
      ownerPassword: payload.password.trim(),
      experienceType: payload.experienceType,
      specialties: payload.specialties,
      createdAt: new Date().toISOString(),
      onboardingComplete: false,
    };

    await persistProfile(nextProfile);
    await persistOnboarding(null);
    await persistStaffAccounts([]);

    const ownerSession = createOwnerSession(nextProfile);
    await persistSession(ownerSession);

    return { session: ownerSession, requiresOnboarding: true };
  };

  const loginOwner = async ({ email, password }: OwnerLoginPayload): Promise<AuthResult> => {
    if (!restaurantProfile) {
      throw new Error('لم يتم إنشاء مطعم بعد. سجّل مطعمك أولاً');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (restaurantProfile.ownerEmail !== normalizedEmail || restaurantProfile.ownerPassword !== normalizedPassword) {
      throw new Error('بيانات الدخول غير صحيحة');
    }

    const ownerSession = createOwnerSession(restaurantProfile);
    await persistSession(ownerSession);

    return { session: ownerSession, requiresOnboarding: !restaurantProfile.onboardingComplete };
  };

  const loginStaff = async ({ restaurantCode, passcode }: StaffLoginPayload): Promise<AuthResult> => {
    if (!restaurantProfile) {
      throw new Error('لا يوجد أي مطعم نشط على هذا الجهاز');
    }

    const normalizedCode = normalizeRestaurantCode(restaurantCode);
    if (restaurantProfile.code !== normalizedCode) {
      throw new Error('كود المطعم غير صحيح');
    }

    const normalizedPasscode = passcode.trim();
    const account = staffAccounts.find((staff) => staff.passcode === normalizedPasscode);
    if (!account) {
      throw new Error('كود الموظف أو كلمة المرور غير صحيحة');
    }

    const staffSession: StaffSession = {
      staffId: account.id,
      staffName: account.name,
      restaurantCode: restaurantProfile.code,
      role: account.role,
      isOwner: false,
    };
    await persistSession(staffSession);
    return { session: staffSession, requiresOnboarding: false };
  };

  const createStaffAccount = async ({ name, role, passcode }: CreateStaffAccountPayload) => {
    if (!session?.isOwner || !restaurantProfile) {
      throw new Error('فقط الأدمن يستطيع إدارة الفريق');
    }

    const normalizedPin = passcode.trim();
    if (normalizedPin.length < 4) {
      throw new Error('كود الموظف يجب أن يتكون من 4 أحرف أو أكثر');
    }

    if (staffAccounts.some((staff) => staff.passcode === normalizedPin)) {
      throw new Error('هذا الكود مستخدم من قبل موظف آخر');
    }

    const account: StaffAccount = {
      id: `staff-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || 'موظف المطعم',
      role,
      passcode: normalizedPin,
      createdAt: new Date().toISOString(),
    };

    const next = [...staffAccounts, account];
    await persistStaffAccounts(next);
    return account;
  };

  const removeStaffAccount = async (accountId: string) => {
    if (!session?.isOwner) {
      throw new Error('فقط الأدمن يستطيع إدارة الفريق');
    }
    const next = staffAccounts.filter((staff) => staff.id !== accountId);
    await persistStaffAccounts(next);
  };

  const completeOnboarding = async (answers: RestaurantOnboardingAnswers) => {
    await persistOnboarding(answers);
    if (restaurantProfile) {
      const updatedProfile: RestaurantProfile = { ...restaurantProfile, onboardingComplete: true };
      await persistProfile(updatedProfile);
    }
  };

  const switchRole = async (role: StaffRole) => {
    if (!session || !session.isOwner) return;
    await persistSession({ ...session, role });
  };

  const logout = async () => {
    await persistSession(null);
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
