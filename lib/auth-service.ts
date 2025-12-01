/**
 * Authentication Service
 * Handles restaurant owner and staff authentication
 */

import { supabase } from './supabase';
import type { 
  RestaurantProfile, 
  StaffAccount, 
  StaffSession, 
  StaffRole,
  RestaurantExperience,
  RestaurantOnboardingAnswers 
} from '@/types';

// ============================================================================
// RESTAURANT OWNER AUTHENTICATION
// ============================================================================

export interface RestaurantSignupData {
  restaurantCode: string;
  restaurantName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  experienceType: RestaurantExperience;
  phone?: string;
  city?: string;
}

export interface RestaurantLoginData {
  email: string;
  password: string;
}

/**
 * Register a new restaurant and owner account
 */
export async function registerRestaurant(data: RestaurantSignupData): Promise<{
  restaurant: RestaurantProfile;
  error?: string;
}> {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // 1. Check if restaurant code is already taken
    const { data: existingCode } = await supabase
      .from('restaurants')
      .select('id')
      .eq('code', data.restaurantCode.toUpperCase())
      .maybeSingle();

    if (existingCode) {
      return { restaurant: null as any, error: 'رمز المطعم مستخدم بالفعل' };
    }

    // 2. Check if email is already taken
    const { data: existingEmail } = await supabase
      .from('restaurants')
      .select('id')
      .eq('owner_email', data.ownerEmail.toLowerCase())
      .maybeSingle();

    if (existingEmail) {
      return { restaurant: null as any, error: 'البريد الإلكتروني مستخدم بالفعل' };
    }

    // 3. Hash password (In production, use proper bcrypt. For now, we'll use a simple hash)
    // Note: Ideally this should be done server-side with Supabase Edge Functions
    const hashedPassword = await hashPassword(data.ownerPassword);

    // 4. Create restaurant record
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({
        code: data.restaurantCode.toUpperCase(),
        name: data.restaurantName,
        owner_name: data.ownerName,
        owner_email: data.ownerEmail.toLowerCase(),
        owner_password_hash: hashedPassword,
        experience_type: data.experienceType,
        phone: data.phone,
        city: data.city,
        onboarding_complete: false,
        is_active: true,
      })
      .select()
      .single();

    if (restaurantError) {
      throw restaurantError;
    }

    // 5. Create owner as a staff account with manager role
    const { error: staffError } = await supabase
      .from('staff_accounts')
      .insert({
        restaurant_id: restaurant.id,
        name: data.ownerName,
        role: 'manager',
        passcode_hash: hashedPassword, // Same password for now
        is_owner: true,
        is_active: true,
      });

    if (staffError) {
      // Rollback restaurant creation if staff creation fails
      await supabase.from('restaurants').delete().eq('id', restaurant.id);
      throw staffError;
    }

    // 6. Create default restaurant settings
    await supabase.from('restaurant_settings').insert({
      restaurant_id: restaurant.id,
      tax_rate: 15.0, // Default 15% VAT for Saudi Arabia
      tax_inclusive: false,
      default_prep_time_minutes: 20,
      notify_new_orders: true,
      enable_loyalty_points: true,
    });

    return {
      restaurant: mapRestaurantProfile(restaurant),
    };
  } catch (error) {
    console.error('Restaurant registration error:', error);
    return {
      restaurant: null as any,
      error: error instanceof Error ? error.message : 'فشل إنشاء الحساب',
    };
  }
}

/**
 * Login as restaurant owner
 */
export async function loginRestaurantOwner(data: RestaurantLoginData): Promise<{
  restaurant: RestaurantProfile | null;
  session: StaffSession | null;
  error?: string;
}> {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // 1. Find restaurant by email
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_email', data.email.toLowerCase())
      .eq('is_active', true)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      return {
        restaurant: null,
        session: null,
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      };
    }

    // 2. Verify password
    const passwordValid = await verifyPassword(data.password, restaurant.owner_password_hash);
    if (!passwordValid) {
      return {
        restaurant: null,
        session: null,
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      };
    }

    // 3. Get owner's staff account
    const { data: ownerStaff } = await supabase
      .from('staff_accounts')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('is_owner', true)
      .eq('is_active', true)
      .maybeSingle();

    // 4. Set RLS context
    await setRestaurantContext(restaurant.id);

    // 5. Create session
    const session: StaffSession = {
      staffId: ownerStaff?.id || '',
      staffName: restaurant.owner_name,
      restaurantCode: restaurant.code,
      role: 'manager',
      isOwner: true,
    };

    return {
      restaurant: mapRestaurantProfile(restaurant),
      session,
    };
  } catch (error) {
    console.error('Owner login error:', error);
    return {
      restaurant: null,
      session: null,
      error: error instanceof Error ? error.message : 'فشل تسجيل الدخول',
    };
  }
}

// ============================================================================
// STAFF AUTHENTICATION
// ============================================================================

export interface StaffLoginData {
  restaurantCode: string;
  name: string;
  passcode: string;
}

/**
 * Login as staff member (waiter, chef, cashier, manager)
 */
export async function loginStaff(data: StaffLoginData): Promise<{
  session: StaffSession | null;
  error?: string;
}> {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // 1. Find restaurant by code
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, code, name, is_active')
      .eq('code', data.restaurantCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      return {
        session: null,
        error: 'رمز المطعم غير صحيح',
      };
    }

    // 2. Find staff account by name and restaurant
    const { data: staff, error: staffError } = await supabase
      .from('staff_accounts')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .ilike('name', data.name.trim()) // Case-insensitive match
      .eq('is_active', true)
      .maybeSingle();

    if (staffError || !staff) {
      return {
        session: null,
        error: 'الاسم أو الرمز السري غير صحيح',
      };
    }

    // 3. Verify passcode
    const passcodeValid = await verifyPassword(data.passcode, staff.passcode_hash);
    if (!passcodeValid) {
      return {
        session: null,
        error: 'الاسم أو الرمز السري غير صحيح',
      };
    }

    // 4. Update last login timestamp
    await supabase
      .from('staff_accounts')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', staff.id);

    // 5. Set RLS context
    await setRestaurantContext(restaurant.id, staff.id);

    // 6. Create session
    const session: StaffSession = {
      staffId: staff.id,
      staffName: staff.name,
      restaurantCode: restaurant.code,
      role: staff.role as StaffRole,
      isOwner: staff.is_owner,
    };

    return { session };
  } catch (error) {
    console.error('Staff login error:', error);
    return {
      session: null,
      error: error instanceof Error ? error.message : 'فشل تسجيل الدخول',
    };
  }
}

// ============================================================================
// STAFF MANAGEMENT (Owner/Manager Only)
// ============================================================================

export interface CreateStaffData {
  restaurantId: string;
  name: string;
  role: StaffRole;
  passcode: string; // 4-6 digit PIN
}

/**
 * Create a new staff account (called by owner/manager)
 */
export async function createStaffAccount(data: CreateStaffData): Promise<{
  staff: StaffAccount | null;
  error?: string;
}> {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // Validate passcode (should be 4-6 digits)
    if (!/^\d{4,6}$/.test(data.passcode)) {
      return {
        staff: null,
        error: 'الرمز السري يجب أن يكون من 4 إلى 6 أرقام',
      };
    }

    // Hash passcode
    const hashedPasscode = await hashPassword(data.passcode);

    // Create staff account
    const { data: staff, error } = await supabase
      .from('staff_accounts')
      .insert({
        restaurant_id: data.restaurantId,
        name: data.name.trim(),
        role: data.role,
        passcode_hash: hashedPasscode,
        is_owner: false,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      staff: mapStaffAccount(staff),
    };
  } catch (error) {
    console.error('Create staff error:', error);
    return {
      staff: null,
      error: error instanceof Error ? error.message : 'فشل إنشاء حساب الموظف',
    };
  }
}

/**
 * Get all staff accounts for a restaurant
 */
export async function listStaffAccounts(restaurantId: string): Promise<StaffAccount[]> {
  try {
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('staff_accounts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map(mapStaffAccount);
  } catch (error) {
    console.error('List staff error:', error);
    return [];
  }
}

/**
 * Update staff account
 */
export async function updateStaffAccount(
  staffId: string,
  updates: Partial<Pick<StaffAccount, 'name' | 'role' | 'isActive'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.role) dbUpdates.role = updates.role;
    if (typeof updates.isActive === 'boolean') dbUpdates.is_active = updates.isActive;

    const { error } = await supabase
      .from('staff_accounts')
      .update(dbUpdates)
      .eq('id', staffId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Update staff error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'فشل تحديث الموظف',
    };
  }
}

/**
 * Delete (deactivate) staff account
 */
export async function deleteStaffAccount(staffId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('staff_accounts')
      .update({ is_active: false })
      .eq('id', staffId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Delete staff error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'فشل حذف الموظف',
    };
  }
}

// ============================================================================
// ONBOARDING
// ============================================================================

/**
 * Complete restaurant onboarding
 */
export async function completeOnboarding(
  restaurantId: string,
  answers: RestaurantOnboardingAnswers
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // 1. Save onboarding answers
    const { error: onboardingError } = await supabase
      .from('restaurant_onboarding')
      .upsert({
        restaurant_id: restaurantId,
        concept_vision: answers.conceptVision,
        service_modes: answers.serviceModes,
        cuisine_focus: answers.cuisineFocus,
        guest_notes: answers.guestNotes,
        price_position: answers.pricePosition,
      });

    if (onboardingError) {
      throw onboardingError;
    }

    // 2. Mark restaurant as onboarding complete
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ onboarding_complete: true })
      .eq('id', restaurantId);

    if (updateError) {
      throw updateError;
    }

    return { success: true };
  } catch (error) {
    console.error('Complete onboarding error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'فشل إكمال التهيئة',
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Set RLS context for multi-tenant queries
 */
export async function setRestaurantContext(
  restaurantId: string,
  staffId?: string
): Promise<void> {
  if (!supabase) return;

  try {
    // Set restaurant context
    await supabase.rpc('set_config', {
      setting: 'app.current_restaurant_id',
      value: restaurantId,
    }).catch(() => {
      // Fallback: RPC might not exist, that's ok
      console.warn('Could not set RLS context - RLS may not be configured');
    });

    // Set staff context if provided
    if (staffId) {
      await supabase.rpc('set_config', {
        setting: 'app.current_staff_id',
        value: staffId,
      }).catch(() => {
        // Fallback: RPC might not exist, that's ok
      });
    }
  } catch (error) {
    console.warn('Failed to set RLS context:', error);
  }
}

/**
 * Simple password hashing (for demo purposes)
 * In production, use bcrypt or similar on the server side
 */
async function hashPassword(password: string): Promise<string> {
  // This is a placeholder. In production:
  // 1. Use Supabase Edge Function to hash with bcrypt
  // 2. Or use a proper crypto library
  
  // For now, we'll prepend a dummy bcrypt-like hash
  // The actual hashing should happen server-side
  return `$2a$10$${btoa(password).substring(0, 53)}`; // Placeholder only!
}

/**
 * Verify password against hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // This is a placeholder. In production:
  // 1. Use Supabase Edge Function to verify with bcrypt
  // 2. Or use a proper crypto library
  
  const testHash = await hashPassword(password);
  return testHash === hash;
}

/**
 * Map database row to RestaurantProfile type
 */
function mapRestaurantProfile(row: any): RestaurantProfile {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    ownerPassword: '', // Never return password
    experienceType: row.experience_type as RestaurantExperience,
    specialties: row.specialties || [],
    createdAt: row.created_at,
    onboardingComplete: row.onboarding_complete,
  };
}

/**
 * Map database row to StaffAccount type
 */
function mapStaffAccount(row: any): StaffAccount {
  return {
    id: row.id,
    name: row.name,
    role: row.role as StaffRole,
    passcode: '', // Never return passcode
    createdAt: row.created_at,
  };
}

