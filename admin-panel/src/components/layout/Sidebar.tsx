import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Users, LayoutDashboard, LogOut, Droplet, Globe, Mail } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils/cn'

export const Sidebar: React.FC = () => {
  const { t } = useTranslation()
  const { logout } = useAuth()

  const navItems = [
    { path: '/dashboard', label: t('dashboard.title'), icon: LayoutDashboard },
    { path: '/dashboard/users', label: t('dashboard.users'), icon: Users },
    { path: '/dashboard/devices', label: t('dashboard.devices'), icon: Droplet },
    { path: '/dashboard/contacts', label: 'Contact Messages', icon: Mail },
  ]

  return (
    <aside
      className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <Droplet className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2" aria-label="Navigation menu">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  'hover:bg-gray-100 focus-visible-ring',
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:text-gray-900'
                )
              }
              aria-current="page"
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 space-y-2">
        <a
          href={import.meta.env.VITE_LANDING_URL || 'http://localhost:3000'}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors focus-visible-ring"
          aria-label="Landing Page"
        >
          <Globe className="w-5 h-5" aria-hidden="true" />
          <span>Landing Page</span>
        </a>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors focus-visible-ring"
          aria-label={t('common.logout')}
        >
          <LogOut className="w-5 h-5" aria-hidden="true" />
          <span>{t('common.logout')}</span>
        </button>
      </div>
    </aside>
  )
}

