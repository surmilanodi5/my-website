import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { bnTranslations } from './bn.ts';
import { enTranslations } from './en.ts';

export const LANGUAGE_STORAGE_KEY = 'surmila_lang';

export type SupportedLanguage = 'en' | 'bn';

function getInitialLanguage(): SupportedLanguage {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'bn' || saved === 'en') {
      return saved;
    }
  } catch {
    // ignore storage restriction
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslations },
    bn: { translation: bnTranslations },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export function setAppLanguage(lang: SupportedLanguage): void {
  i18n.changeLanguage(lang);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
}

export function applyLanguageOverrides(
  overrides?: { en?: Record<string, string>; bn?: Record<string, string> },
): void {
  if (!overrides) return;
  (['en', 'bn'] as const).forEach((lng) => {
    const entries = overrides[lng];
    if (!entries) return;
    Object.entries(entries).forEach(([keyPath, val]) => {
      if (typeof val === 'string' && val.trim().length > 0 && keyPath.includes('.')) {
        i18n.addResource(lng, 'translation', keyPath, val.trim());
      }
    });
  });
}

export default i18n;
