import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Spinner,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Select,
  SelectItem,
} from '@heroui/react'
import {
  Droplet,
  Wifi,
  WifiOff,
  Zap,
  Waves,
  MapPin,
  Plus,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useDevices } from '@/hooks/useDevices'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { createDeviceSchema, type CreateDeviceFormData } from '@/utils/validations'
import { motion } from 'framer-motion'
import { backgroundMonitorService } from '@/lib/backgroundMonitor'
import { socketManager } from '@/lib/socket'

export const Dashboard: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { devices, loading, error, refetch } = useDevices()
  const { loadAuth } = useAuthStore()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CreateDeviceFormData>({
    resolver: zodResolver(createDeviceSchema),
    defaultValues: {
      name: '',
      location: '',
      status: 'OFFLINE',
      powerUsage: undefined,
    },
  })

  useEffect(() => {
    loadAuth()
  }, [loadAuth])

  // Start background monitoring when devices are loaded
  useEffect(() => {
    if (devices.length > 0 && !loading) {
      backgroundMonitorService.startMonitoring(devices)
    }

    return () => {
      backgroundMonitorService.stopMonitoring()
    }
  }, [devices, loading])

  // Listen for device updates via WebSocket
  useEffect(() => {
    const socket = socketManager.getSocket()
    if (!socket) {
      return
    }

    const handleDeviceUpdate = (device: any) => {
      // Update background monitor with new device state
      const updatedDevices = devices.map(d => 
        d._id === device._id ? { ...d, ...device } : d
      )
      backgroundMonitorService.updateDevices(updatedDevices)
    }

    socket.on('device:update', handleDeviceUpdate)

    return () => {
      socket.off('device:update', handleDeviceUpdate)
    }
  }, [devices])


  const onSubmit = async (data: CreateDeviceFormData) => {
    try {
      setIsSubmitting(true)
      setSubmitError(null)

      // Always include current user ID in userIds
      const userIds: string[] = []
      
      // Add current user ID first (required)
      if (user?._id) {
        userIds.push(user._id)
      }
      
      // Add any other user IDs from form data (if provided)
      if (data.userIds && Array.isArray(data.userIds)) {
        data.userIds.forEach((id) => {
          if (id && !userIds.includes(id)) {
            userIds.push(id)
          }
        })
      }

      const deviceData = {
        name: data.name,
        location: data.location || undefined,
        status: data.status || 'OFFLINE',
        powerUsage: data.powerUsage ? Number(data.powerUsage) : undefined,
        userIds: userIds.length > 0 ? userIds : undefined,
      }

      const newDevice = await api.createDevice(deviceData)
      
      // Refresh devices list
      await refetch()
      
      // Close modal and reset form
      setIsCreateModalOpen(false)
      reset()
      
      // Navigate to new device
      navigate(`/device/${newDevice._id}`)
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message || t('device.createError')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Spinner size="lg" color="primary" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="premium-card">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">
                    {t('dashboard.myDevices')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {devices.length}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <Droplet className="w-6 h-6" style={{ color: 'var(--primary-color)' }} />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="premium-card">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">
                    {t('dashboard.online')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {devices.filter((d) => d.status === 'ONLINE').length}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-success/10">
                  <Wifi className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Devices List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('dashboard.myDevices')}
            </h2>
            <Button
              color="primary"
              startContent={<Plus className="w-4 h-4 text-white" />}
              onPress={() => setIsCreateModalOpen(true)}
              size="sm"
              className="text-white bg-primary"
            >
              {t('device.createDevice')}
            </Button>
          </div>

          {error && (
            <Card className="mb-4">
              <CardBody>
                <p className="text-danger text-sm">{error}</p>
              </CardBody>
            </Card>
          )}

          {devices.length === 0 ? (
            <Card>
              <CardBody className="text-center py-12">
                <Droplet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">
                  {t('dashboard.noDevices')}
                </p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              {devices.map((device) => (
                <motion.div
                  key={device._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    isPressable
                    onPress={() => navigate(`/device/${device._id}`)}
                    className="premium-card"
                  >
                    <CardHeader className="flex items-start justify-between pb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {device.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <MapPin className="w-4 h-4" />
                          <span>{device.location}</span>
                        </div>
                      </div>
                      <Chip
                        color={device.status === 'ONLINE' ? 'success' : 'danger'}
                        variant="flat"
                        size="sm"
                        startContent={
                          device.status === 'ONLINE' ? (
                            <Wifi className="w-3 h-3" />
                          ) : (
                            <WifiOff className="w-3 h-3" />
                          )
                        }
                      >
                        {device.status === 'ONLINE'
                          ? t('dashboard.online')
                          : t('dashboard.offline')}
                      </Chip>
                    </CardHeader>
                    <CardBody className="pt-0">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-warning" />
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {t('dashboard.powerUsage')}
                            </p>
                            <p className="text-sm font-semibold">
                              {(device.powerUsage ?? 0).toFixed(2)} W
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Waves className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {t('dashboard.waterDepth')}
                            </p>
                            <p className="text-sm font-semibold">
                              {(device.waterDepth ?? 0).toFixed(2)} cm
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      {/* Create Device Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          reset()
          setSubmitError(null)
        }}
        placement="center"
        scrollBehavior="inside"
      >
        <ModalContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <ModalHeader className="flex flex-col gap-1">
              {t('device.createDeviceTitle')}
            </ModalHeader>
            <ModalBody>
              {submitError && (
                <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
                  <p className="text-sm text-danger">{submitError}</p>
                </div>
              )}

              <Input
                {...register('name')}
                label={t('device.name')}
                placeholder={t('device.name')}
                variant="bordered"
                isInvalid={!!errors.name}
                errorMessage={errors.name?.message}
                isRequired
                autoFocus
              />

              <Input
                {...register('location')}
                label={`${t('device.location')} (${t('device.optional')})`}
                placeholder={t('device.location')}
                variant="bordered"
                isInvalid={!!errors.location}
                errorMessage={errors.location?.message}
              />

              <Select
                label={t('device.status')}
                variant="bordered"
                selectedKeys={watch('status') ? [watch('status')!] : []}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as 'ONLINE' | 'OFFLINE'
                  setValue('status', value || 'OFFLINE')
                }}
              >
                <SelectItem key="ONLINE">
                  {t('dashboard.online')}
                </SelectItem>
                <SelectItem key="OFFLINE">
                  {t('dashboard.offline')}
                </SelectItem>
              </Select>

              <Input
                {...register('powerUsage', { valueAsNumber: true })}
                type="number"
                label={`${t('device.powerUsage')} (${t('device.optional')})`}
                placeholder="0"
                variant="bordered"
                isInvalid={!!errors.powerUsage}
                errorMessage={errors.powerUsage?.message}
                min={0}
                step="0.01"
              />
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={() => {
                  setIsCreateModalOpen(false)
                  reset()
                  setSubmitError(null)
                }}
                isDisabled={isSubmitting}
              >
                {t('common.cancel')}
              </Button>
              <Button
                color="primary"
                type="submit"
                isLoading={isSubmitting}
                className="text-white"
              >
                {t('common.save')}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  )
}

