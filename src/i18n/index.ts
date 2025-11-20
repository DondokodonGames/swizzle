import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import en from './locales/en.json';
import ja from './locales/ja.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import de from './locales/de.json';
import es from './locales/es.json';
import zh from './locales/zh.json';
import ko from './locales/ko.json';
import pt from './locales/pt.json';

const resources = {
  en: { translation: en },
  ja: { translation: ja },
  fr: { translation: fr },
  it: { translation: it },
  de: { translation: de },
  es: { translation: es },
  zh: { translation: zh },
  ko: { translation: ko },
  pt: { translation: pt },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: true, // デバッグモードを有効化

    interpolation: {
      escapeValue: false, // React already escapes
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'swizzle-language',
    },
  });

export default i18n;

// Helper to get supported languages
export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
] as const;

export type SupportedLanguage = typeof supportedLanguages[number]['code'];
