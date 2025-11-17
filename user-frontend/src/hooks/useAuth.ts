import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLanguageStore } from '@/store/languageStore'
import { api } from '@/lib/api'
import type { LoginCredentials, RegisterCredentials } from '@/types'

export const useAuth = () => {
  const navigate = useNavigate()
  const { setAuth, logout: logoutStore, isAuthenticated, user } = useAuthStore()
  const { setLanguage } = useLanguageStore()

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        const response = await api.login(credentials)
        await setAuth(response.user, response.access_token)
        // Set language from user preferences (default: 'uz')
        if (response.user.language) {
          await setLanguage(response.user.language as 'uz' | 'en' | 'ru')
        }
        navigate('/dashboard')
        return { success: true }
      } catch (error: any) {
        return {
          success: false,
          error:
            error.response?.data?.message ||
            error.message ||
            'Login failed. Please check your credentials.',
        }
      }
    },
    [navigate, setAuth, setLanguage]
  )

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      try {
        const response = await api.register(credentials)
        await setAuth(response.user, response.access_token)
        // Set language from user preferences (default: 'uz')
        if (response.user.language) {
          await setLanguage(response.user.language as 'uz' | 'en' | 'ru')
        }
        navigate('/dashboard')
        return { success: true }
      } catch (error: any) {
        return {
          success: false,
          error:
            error.response?.data?.message ||
            error.message ||
            'Registration failed. Please try again.',
        }
      }
    },
    [navigate, setAuth, setLanguage]
  )

  const logout = useCallback(async () => {
    await logoutStore()
    navigate('/login')
  }, [navigate, logoutStore])

  return {
    login,
    register,
    logout,
    isAuthenticated,
    user,
  }
}

