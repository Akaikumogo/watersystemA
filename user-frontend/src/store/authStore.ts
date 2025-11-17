import { create } from 'zustand'
import { storage } from '@/lib/storage'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setAuth: (user: User, token: string) => Promise<void>
  logout: () => Promise<void>
  loadAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (user, token) => {
    await storage.set('auth', { token })
    await storage.set('user', user)
    set({ user, token, isAuthenticated: true, isLoading: false })
  },

  logout: async () => {
    await storage.remove('auth')
    await storage.remove('user')
    set({ user: null, token: null, isAuthenticated: false, isLoading: false })
  },

  loadAuth: async () => {
    try {
      const authData = await storage.get<{ token: string }>('auth')
      const user = await storage.get<User>('user')

      if (authData?.token && user) {
        set({
          user,
          token: authData.token,
          isAuthenticated: true,
          isLoading: false,
        })
      } else {
        set({ isLoading: false })
      }
    } catch (error) {
      console.error('Error loading auth:', error)
      set({ isLoading: false })
    }
  },
}))

