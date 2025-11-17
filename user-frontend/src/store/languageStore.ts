import { create } from 'zustand'
import { storage } from '@/lib/storage'
import i18n from '@/i18n/config'
import { api } from '@/lib/api'
import { useAuthStore } from './authStore'

type Language = 'uz' | 'en' | 'ru'

interface LanguageState {
  language: Language
  setLanguage: (lang: Language) => Promise<void>
  loadLanguage: () => Promise<void>
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'uz', // Default: O'zbek tili

  setLanguage: async (lang: Language) => {
    set({ language: lang })
    i18n.changeLanguage(lang)
    await storage.set('language', lang)
    
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

  loadLanguage: async () => {
    try {
      const savedLang = await storage.get<Language>('language')
      const lang = savedLang || 'uz' // Default to Uzbek
      set({ language: lang })
      i18n.changeLanguage(lang)
    } catch (error) {
      console.error('Error loading language:', error)
      // Default to Uzbek
      set({ language: 'uz' })
      i18n.changeLanguage('uz')
    }
  },
}))

