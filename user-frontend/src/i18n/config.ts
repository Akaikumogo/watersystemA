import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import uzTranslations from './locales/uz.json'
import enTranslations from './locales/en.json'
import ruTranslations from './locales/ru.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      uz: { translation: uzTranslations },
      en: { translation: enTranslations },
      ru: { translation: ruTranslations },
    },
    fallbackLng: 'uz', // Default: O'zbek tili
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n

