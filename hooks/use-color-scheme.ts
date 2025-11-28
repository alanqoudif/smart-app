import { useTheme } from '@/providers/theme-provider';

export function useColorScheme() {
  const { colorScheme } = useTheme();
  return colorScheme;
}
