import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export const Header: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAuthStore()

  return (
    <header
      className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6"
      role="banner"
    >
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('dashboard.title')}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
          <span className="text-sm text-gray-600">{t('common.username')}:</span>
          <span className="text-sm font-medium text-gray-900">{user?.username}</span>
        </div>
      </div>
    </header>
  )
}

