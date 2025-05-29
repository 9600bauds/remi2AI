// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

const viteBaseUrl = import.meta.env.BASE_URL;

const i18nInitializationPromise = i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'es'],
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    backend: {
      loadPath: `${viteBaseUrl}locales/{{lng}}.json`,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
      lookupLocalStorage: 'preferredLang',
    },
  });

i18nInitializationPromise.catch((error) => {
  console.error('i18next initialization failed:', error);
});

export default i18n;
