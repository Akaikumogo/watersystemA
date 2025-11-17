import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Droplet,
  MapPin,
  Activity,
  Wifi,
  WifiOff,
  Users,
  Calendar,
  Zap,
  Waves,
  Gauge,
} from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Device, User } from '@/types'

export const DeviceDetail: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [device, setDevice] = useState<Device | null>(null)
  const [deviceUsers, setDeviceUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)
        const deviceData = await api.getDevice(id)
        setDevice(deviceData)

        // Fetch users assigned to this device
        if (deviceData.userIds && deviceData.userIds.length > 0) {
          const allUsers = await api.getUsers()
          const assignedUsers = allUsers.filter((user) =>
            deviceData.userIds.includes(user._id)
          )
          setDeviceUsers(assignedUsers)
        } else {
          setDeviceUsers([])
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load device data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !device) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error || 'Device not found'}
        </div>
        <Button
          onClick={() => navigate('/dashboard/devices')}
          className="mt-4"
          variant="secondary"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          onClick={() => navigate('/dashboard/devices')}
          variant="ghost"
          size="sm"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">{t('devices.title')}</h1>
      </div>

      {/* Device Information Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('devices.name')} {t('common.information')}
          </h2>
          <div className="flex items-center gap-2">
            {device.status === 'ONLINE' ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-600" />
            )}
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                device.status === 'ONLINE'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {device.status === 'ONLINE' ? t('devices.online') : t('devices.offline')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Droplet className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('devices.name')}</p>
              <p className="font-medium text-gray-900">{device.name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('devices.location')}</p>
              <p className="font-medium text-gray-900">{device.location}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('devices.powerUsage')}</p>
              <p className="font-medium text-gray-900">
                {(device.powerUsage ?? 0).toFixed(2)} W
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Waves className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('devices.waterDepth')}</p>
              <p className="font-medium text-gray-900">
                {(device.waterDepth ?? 0).toFixed(2)} cm
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Gauge className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('devices.height')}</p>
              <p className="font-medium text-gray-900">
                {(device.height ?? 0).toFixed(2)} cm
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('devices.totalLitres')}</p>
              <p className="font-medium text-gray-900">
                {(device.totalLitres ?? 0).toFixed(2)} L
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('devices.totalElectricity')}</p>
              <p className="font-medium text-gray-900">
                {(device.totalElectricity ?? 0).toFixed(2)} kWh
              </p>
            </div>
          </div>

          {device.createdAt && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('common.createdAt')}</p>
                <p className="font-medium text-gray-900">
                  {new Date(device.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Assigned Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('devices.assignedUsers')} ({deviceUsers.length})
          </h2>
        </div>

        {deviceUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>{t('common.noData')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deviceUsers.map((user) => (
              <motion.div
                key={user._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <Link
                  to={`/dashboard/users/${user._id}`}
                  className="block"
                  aria-label={`View user ${user.username}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{user.username}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {user.role === 'ADMIN' ? t('users.admin') : t('users.user')}
                    </span>
                  </div>
                  {user.createdAt && (
                    <p className="text-sm text-gray-600">
                      {t('common.createdAt')}:{' '}
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

