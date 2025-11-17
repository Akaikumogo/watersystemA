import { create } from 'zustand'
import type { Device } from '@/types'

interface DeviceState {
  devices: Device[]
  selectedDevice: Device | null
  isLoading: boolean
  error: string | null
  setDevices: (devices: Device[] | ((prev: Device[]) => Device[])) => void
  setSelectedDevice: (device: Device | null) => void
  updateDevice: (device: Device) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: [],
  selectedDevice: null,
  isLoading: false,
  error: null,

  setDevices: (devices) =>
    set((state) => ({
      devices: typeof devices === 'function' ? devices(state.devices) : devices,
    })),

  setSelectedDevice: (device) => set({ selectedDevice: device }),

  updateDevice: (device) =>
    set((state) => ({
      devices: state.devices.map((d) => (d._id === device._id ? device : d)),
      selectedDevice:
        state.selectedDevice?._id === device._id ? device : state.selectedDevice,
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),
}))

