import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Device, CreateDeviceDto, UpdateDeviceDto, AssignUsersDto } from '@/types'

export const useDevices = () => {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getDevices()
      setDevices(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch devices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  const createDevice = useCallback(async (dto: CreateDeviceDto) => {
    try {
      const newDevice = await api.createDevice(dto)
      setDevices((prev) => [...prev, newDevice])
      return { success: true }
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to create device',
      }
    }
  }, [])

  const updateDevice = useCallback(async (id: string, dto: UpdateDeviceDto) => {
    try {
      const updatedDevice = await api.updateDevice(id, dto)
      setDevices((prev) => prev.map((d) => (d._id === id ? updatedDevice : d)))
      return { success: true }
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to update device',
      }
    }
  }, [])

  const deleteDevice = useCallback(async (id: string) => {
    try {
      await api.deleteDevice(id)
      setDevices((prev) => prev.filter((d) => d._id !== id))
      return { success: true }
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to delete device',
      }
    }
  }, [])

  const assignUsers = useCallback(async (deviceId: string, dto: AssignUsersDto) => {
    try {
      const updatedDevice = await api.assignUsers(deviceId, dto)
      setDevices((prev) => prev.map((d) => (d._id === deviceId ? updatedDevice : d)))
      return { success: true }
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to assign users',
      }
    }
  }, [])

  return {
    devices,
    loading,
    error,
    fetchDevices,
    createDevice,
    updateDevice,
    deleteDevice,
    assignUsers,
  }
}

