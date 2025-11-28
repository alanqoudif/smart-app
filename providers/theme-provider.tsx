import * as SecureStore from 'expo-secure-store';
import { PropsWithChildren, createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ColorScheme = 'light' | 'dark';
type ThemeMode = 'light' | 'dark' | 'auto';

type ThemeContextValue = {
  colorScheme: ColorScheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme-mode';

export function ThemeProvider({ children }: PropsWithChildren<object>) {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load theme preference on mount
  useEffect(() => {
    SecureStore.getItemAsync(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'auto') {
        setThemeModeState(stored);
      }
      setIsLoaded(true);
    }).catch(() => {
      setIsLoaded(true);
    });
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await SecureStore.setItemAsync(THEME_STORAGE_KEY, mode);
  };

  // Determine actual color scheme based on theme mode
  const colorScheme: ColorScheme =
    themeMode === 'auto' ? (systemColorScheme ?? 'light') : themeMode;

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ colorScheme, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

