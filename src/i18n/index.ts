import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

/**
 * Swizzle Localization System
 *
 * Structure:
 * src/i18n/locales/{lang}/
 * ├── index.ts          # Merges all JSON files
 * ├── common.json       # common, errors, success
 * ├── auth.json         # auth
 * ├── editor.json       # editor (large section)
 * ├── gameLogic.json    # conditions, actions, movements, effects, positions, speeds, durations, difficulties
 * ├── social.json       # gameFeed, profile
 * ├── monetization.json # monetization, pricing
 * └── game.json         # game, bridge
 */

// Import translations - all languages use split structure
import en from './locales/en';
import ja from './locales/ja';
import fr from './locales/fr';
import it from './locales/it';
import es from './locales/es';
import zh from './locales/zh';
import ko from './locales/ko';
import pt from './locales/pt';

// German still uses legacy single JSON file (not yet migrated)
import de from './locales/de.json';

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
    lng: 'en', // Default language (international community strategy)
    fallbackLng: 'en',
    debug: false,

    interpolation: {
      escapeValue: false, // React already escapes
    },

    detection: {
      // Prioritize localStorage, fallback to English
      order: ['localStorage', 'querystring', 'cookie'],
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

export type SupportedLanguage = (typeof supportedLanguages)[number]['code'];
