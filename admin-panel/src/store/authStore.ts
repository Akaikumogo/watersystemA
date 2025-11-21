import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  initialize: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        set({ user, token, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        set({ user: null, token: null, isAuthenticated: false })
      },
      initialize: () => {
        // Check localStorage and sync state
        const token = localStorage.getItem('token')
        const userStr = localStorage.getItem('user')
        
        if (token && userStr) {
          try {
            const user = JSON.parse(userStr)
            set({ user, token, isAuthenticated: true })
          } catch (error) {
            // Invalid user data, clear it
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            set({ user: null, token: null, isAuthenticated: false })
          }
        } else {
          set({ user: null, token: null, isAuthenticated: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, check if token and user exist
        if (state) {
          const token = localStorage.getItem('token')
          const userStr = localStorage.getItem('user')
          
          if (token && userStr) {
            try {
              const user = JSON.parse(userStr)
              state.user = user
              state.token = token
              state.isAuthenticated = true
            } catch (error) {
              // Invalid data, clear it
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              state.user = null
              state.token = null
              state.isAuthenticated = false
            }
          } else {
            state.user = null
            state.token = null
            state.isAuthenticated = false
          }
        }
      },
    }
  )
)

