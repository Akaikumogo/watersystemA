import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ViewMode } from '@/types'

interface ViewState {
  usersViewMode: ViewMode
  devicesViewMode: ViewMode
  setUsersViewMode: (mode: ViewMode) => void
  setDevicesViewMode: (mode: ViewMode) => void
}

export const useViewStore = create<ViewState>()(
  persist(
    (set) => ({
      usersViewMode: 'table',
      devicesViewMode: 'table',
      setUsersViewMode: (mode) => set({ usersViewMode: mode }),
      setDevicesViewMode: (mode) => set({ devicesViewMode: mode }),
    }),
    {
      name: 'view-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

