import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Users, Droplet, Wifi, WifiOff } from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'
import { useDevices } from '@/hooks/useDevices'
import { Skeleton } from '@/components/ui/Skeleton'

const StatCard: React.FC<{
  title: string
  value: string | number
  icon: React.ReactNode
  loading?: boolean
}> = ({ title, value, icon, loading }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          )}
        </div>
        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
          {icon}
        </div>
      </div>
    </motion.div>
  )
}

export const Dashboard: React.FC = () => {
  const { t } = useTranslation()
  const { users, loading: usersLoading } = useUsers()
  const { devices, loading: devicesLoading } = useDevices()

  const onlineDevices = devices.filter((d) => d.status === 'ONLINE').length
  const offlineDevices = devices.filter((d) => d.status === 'OFFLINE').length

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('dashboard.overview')}
        </h1>
        <p className="text-gray-600">{t('dashboard.title')}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t('dashboard.totalUsers')}
          value={users.length}
          icon={<Users className="w-6 h-6 text-primary-600" />}
          loading={usersLoading}
        />
        <StatCard
          title={t('dashboard.totalDevices')}
          value={devices.length}
          icon={<Droplet className="w-6 h-6 text-primary-600" />}
          loading={devicesLoading}
        />
        <StatCard
          title={t('dashboard.onlineDevices')}
          value={onlineDevices}
          icon={<Wifi className="w-6 h-6 text-green-600" />}
          loading={devicesLoading}
        />
        <StatCard
          title={t('dashboard.offlineDevices')}
          value={offlineDevices}
          icon={<WifiOff className="w-6 h-6 text-red-600" />}
          loading={devicesLoading}
        />
      </div>
    </div>
  )
}

