import { StaffRole } from '@/types';

export function getInitialRouteForRole(role: StaffRole) {
  switch (role) {
    case 'chef':
      return '/(tabs)/kitchen';
    case 'manager':
      return '/(tabs)/dashboard';
    default:
      return '/(tabs)';
  }
}
