import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import i18n from '@/i18n/config'
import { api } from '@/lib/api'
import { useAuthStore } from './authStore'

type Language = 'uz' | 'en' | 'ru'

interface LanguageState {
  language: Language
  setLanguage: (lang: Language) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'uz', // Default: O'zbek tili
      setLanguage: async (lang) => {
        set({ language: lang })
        i18n.changeLanguage(lang)
        
        // Send language to backend if user is authenticated
        const { isAuthenticated } = useAuthStore.getState()
        if (isAuthenticated) {
          try {
            await api.updatePreferences(lang)
            // Backend automatically sends language to all user devices via MQTT
          } catch (error) {
            console.error('Failed to update language preference:', error)
            // Continue anyway - language changed locally
          }
        }
      },
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.language) {
          i18n.changeLanguage(state.language)
        } else {
          // Default to Uzbek if no language is set
          i18n.changeLanguage('uz')
        }
      },
    }
  )
)

