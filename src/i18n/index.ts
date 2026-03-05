import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import sk from './sk.json';
import en from './en.json';

const savedLang = typeof window !== 'undefined' ? (localStorage.getItem('lang') ?? 'sk') : 'sk';

i18n.use(initReactI18next).init({
  resources: {
    sk: { translation: sk },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'sk',
  interpolation: { escapeValue: false },
});

export default i18n;
