import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Edit,
  Trash2,
  Plus,
  Table2,
  Grid3x3,
  Search,
  Wifi,
  WifiOff,
  Eye,
} from 'lucide-react'
import { useDevices } from '@/hooks/useDevices'
import { useUsers } from '@/hooks/useUsers'
import { useViewStore } from '@/store/viewStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Device, CreateDeviceDto, UpdateDeviceDto } from '@/types'

interface DeviceFormData {
  name: string
  location: string
}

const DeviceTable: React.FC<{
  devices: Device[]
  onEdit: (device: Device) => void
  onDelete: (id: string) => void
  loading: boolean
}> = ({ devices, onEdit, onDelete, loading }) => {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (devices.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {t('common.noData')}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full" role="table">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-700">
              {t('devices.name')}
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">
              {t('devices.location')}
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">
              {t('devices.status')}
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">
              {t('devices.powerUsage')}
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">
              {t('devices.waterDepth')}
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">
              {t('common.actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <motion.tr
              key={device._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-3 px-4 font-medium">{device.name}</td>
              <td className="py-3 px-4">{device.location}</td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {device.status === 'ONLINE' ? (
                    <Wifi className="w-4 h-4 text-green-600" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-600" />
                  )}
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      device.status === 'ONLINE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {device.status === 'ONLINE'
                      ? t('devices.online')
                      : t('devices.offline')}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">{(device.powerUsage ?? 0).toFixed(2)} W</td>
              <td className="py-3 px-4">{(device.waterDepth ?? 0).toFixed(2)} cm</td>
              <td className="py-3 px-4">
                <div className="flex gap-2">
                  <Link
                    to={`/dashboard/devices/${device._id}`}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus-visible-ring"
                    aria-label={t('common.view')}
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => onEdit(device)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors focus-visible-ring"
                    aria-label={t('common.edit')}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(device._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors focus-visible-ring"
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const DeviceGrid: React.FC<{
  devices: Device[]
  onEdit: (device: Device) => void
  onDelete: (id: string) => void
  loading: boolean
}> = ({ devices, onEdit, onDelete, loading }) => {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    )
  }

  if (devices.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {t('common.noData')}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {devices.map((device) => (
        <motion.div
          key={device._id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">{device.name}</h3>
            <div className="flex items-center gap-2">
              {device.status === 'ONLINE' ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  device.status === 'ONLINE'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {device.status === 'ONLINE'
                  ? t('devices.online')
                  : t('devices.offline')}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">{device.location}</p>
          <div className="space-y-1 text-sm text-gray-600 mb-4">
            <p>
              {t('devices.powerUsage')}: {(device.powerUsage ?? 0).toFixed(2)} W
            </p>
            <p>
              {t('devices.waterDepth')}: {(device.waterDepth ?? 0).toFixed(2)} cm
            </p>
            <p>
              {t('devices.totalLitres')}: {(device.totalLitres ?? 0).toFixed(2)} L
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/dashboard/devices/${device._id}`}
              className="flex-1"
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-1" />
                {t('common.view')}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(device)}
              className="flex-1"
            >
              <Edit className="w-4 h-4 mr-1" />
              {t('common.edit')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(device._id)}
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {t('common.delete')}
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export const Devices: React.FC = () => {
  const { t } = useTranslation()
  const { devices, loading, createDevice, updateDevice, deleteDevice } =
    useDevices()
  const { devicesViewMode, setDevicesViewMode } = useViewStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<DeviceFormData>({
    defaultValues: {
      name: '',
      location: '',
    },
  })

  const filteredDevices = devices.filter(
    (device) =>
      device.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.location?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenModal = (device?: Device) => {
    if (device) {
      setEditingDevice(device)
      setValue('name', device.name || '')
      setValue('location', device.location || '')
    } else {
      setEditingDevice(null)
      reset()
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingDevice(null)
    reset()
  }

  const onSubmit = async (data: DeviceFormData) => {
    if (editingDevice) {
      const updateData: UpdateDeviceDto = {
        name: data.name,
        location: data.location,
      }
      const result = await updateDevice(editingDevice._id, updateData)
      if (result.success) {
        handleCloseModal()
      }
    } else {
      const createData: CreateDeviceDto = {
        name: data.name,
        location: data.location,
      }
      const result = await createDevice(createData)
      if (result.success) {
        handleCloseModal()
      }
    }
  }

  const handleDelete = async (id: string) => {
    const result = await deleteDevice(id)
    if (result.success) {
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('devices.title')}
        </h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          {t('devices.createDevice')}
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label={t('common.search')}
              />
            </div>
          </div>
          <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setDevicesViewMode('table')}
              className={`p-2 rounded-md transition-colors ${
                devicesViewMode === 'table'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-pressed={devicesViewMode === 'table'}
              aria-label={t('common.table')}
            >
              <Table2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setDevicesViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                devicesViewMode === 'grid'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-pressed={devicesViewMode === 'grid'}
              aria-label={t('common.grid')}
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {devicesViewMode === 'table' ? (
          <DeviceTable
            devices={filteredDevices}
            onEdit={handleOpenModal}
            onDelete={(id) => setDeleteConfirm(id)}
            loading={loading}
          />
        ) : (
          <DeviceGrid
            devices={filteredDevices}
            onEdit={handleOpenModal}
            onDelete={(id) => setDeleteConfirm(id)}
            loading={loading}
          />
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={
          editingDevice ? t('devices.editDevice') : t('devices.createDevice')
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={t('devices.name')}
            error={errors.name?.message}
            {...register('name', {
              required: t('devices.name') + ' ' + t('common.error'),
            })}
            aria-required="true"
          />
          <Input
            label={t('devices.location')}
            error={errors.location?.message}
            {...register('location', {
              required: t('devices.location') + ' ' + t('common.error'),
            })}
            aria-required="true"
          />
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">
              {editingDevice ? t('common.update') : t('common.create')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title={t('devices.deleteDevice')}
        size="sm"
      >
        <p className="mb-6 text-gray-700">{t('devices.deleteConfirm')}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

