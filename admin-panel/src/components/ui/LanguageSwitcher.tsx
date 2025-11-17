import { useTranslation } from 'react-i18next'
import { useLanguageStore } from '@/store/languageStore'
import { Globe } from 'lucide-react'
import { Button } from './Button'

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation()
  const { language, setLanguage } = useLanguageStore()

  const languages = [
    { code: 'uz', label: 'O\'zbek' },
    { code: 'en', label: 'English' },
    { code: 'ru', label: 'Русский' },
  ] as const

  const handleLanguageChange = (lang: 'uz' | 'en' | 'ru') => {
    setLanguage(lang)
    i18n.changeLanguage(lang)
  }

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-5 h-5 text-gray-600" aria-hidden="true" />
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1" role="group" aria-label="Language selector">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${language === lang.code
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
              focus-visible-ring
            `}
            aria-pressed={language === lang.code}
            aria-label={`Switch to ${lang.label}`}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  )
}

