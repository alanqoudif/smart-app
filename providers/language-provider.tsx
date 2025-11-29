import * as SecureStore from 'expo-secure-store';
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { LANGUAGE_OPTIONS, LanguageCode, literalTranslations, translations } from '@/constants/translations';

type TranslationParams = Record<string, string | number>;

type LanguageContextValue = {
  language: LanguageCode;
  isRTL: boolean;
  setLanguage: (code: LanguageCode) => Promise<void>;
  t: (key: string, fallback: string, params?: TranslationParams) => string;
  translateLiteral: (text: string) => string;
  options: typeof LANGUAGE_OPTIONS;
};

const STORAGE_KEY = 'smart_app.language';

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const formatTemplate = (template: string, params?: TranslationParams) => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, token: string) =>
    params[token] !== undefined ? String(params[token]) : `{${token}}`,
  );
};

export function LanguageProvider({ children }: PropsWithChildren<object>) {
  const [language, setLanguageState] = useState<LanguageCode>('ar');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((stored) => {
        if (!isMounted) return;
        if (stored === 'ar' || stored === 'en') {
          setLanguageState(stored);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsReady(true);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const persistLanguage = useCallback(async (next: LanguageCode) => {
    setLanguageState(next);
    await SecureStore.setItemAsync(STORAGE_KEY, next);
  }, []);

  const translate = useCallback(
    (key: string, fallback: string, params?: TranslationParams) => {
      const template = translations[language]?.[key];
      const base = template ?? fallback;
      return formatTemplate(base, params);
    },
    [language],
  );

  const translateLiteral = useCallback(
    (text: string) => {
      if (language === 'ar') return text;
      return literalTranslations[text] ?? text;
    },
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      isRTL: language === 'ar',
      setLanguage: persistLanguage,
      t: translate,
      translateLiteral,
      options: LANGUAGE_OPTIONS,
    }),
    [language, persistLanguage, translate, translateLiteral],
  );

  if (!isReady) {
    return null;
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }
  return context;
}
