import { create } from 'zustand'
import { storage } from '@/lib/storage'

// Premium solid colors - nafis, og'ir bosiq ranglar
export const PREMIUM_COLORS = {
  blue: {
    name: 'Blue',
    value: '#2563eb', // Deep blue
    class: 'blue'
  },
  indigo: {
    name: 'Indigo',
    value: '#4f46e5', // Rich indigo
    class: 'indigo'
  },
  purple: {
    name: 'Purple',
    value: '#7c3aed', // Deep purple
    class: 'purple'
  },
  violet: {
    name: 'Violet',
    value: '#8b5cf6', // Rich violet
    class: 'violet'
  },
  emerald: {
    name: 'Emerald',
    value: '#059669', // Deep emerald
    class: 'emerald'
  },
  teal: {
    name: 'Teal',
    value: '#0d9488', // Rich teal
    class: 'teal'
  },
  slate: {
    name: 'Slate',
    value: '#475569', // Deep slate
    class: 'slate'
  },
  zinc: {
    name: 'Zinc',
    value: '#52525b', // Rich zinc
    class: 'zinc'
  },
  rose: {
    name: 'Rose',
    value: '#e11d48', // Deep rose
    class: 'rose'
  },
  amber: {
    name: 'Amber',
    value: '#d97706', // Rich amber
    class: 'amber'
  }
} as const

export type ColorKey = keyof typeof PREMIUM_COLORS

interface ThemeState {
  primaryColor: ColorKey
  isDark: boolean
  setPrimaryColor: (color: ColorKey) => Promise<void>
  toggleTheme: () => Promise<void>
  setTheme: (isDark: boolean) => Promise<void>
  loadTheme: () => Promise<void>
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  primaryColor: 'blue', // Default
  isDark: false, // Default light mode

  setPrimaryColor: async (color: ColorKey) => {
    set({ primaryColor: color })
    await storage.set('primaryColor', color)
    
    // Update CSS custom property
    const root = document.documentElement
    const colorValue = PREMIUM_COLORS[color].value
    root.style.setProperty('--primary-color', colorValue)
    
    // Update HeroUI theme dynamically
    const style = document.createElement('style')
    style.id = 'dynamic-theme'
    style.textContent = `
      :root {
        --heroui-primary: ${colorValue};
        --heroui-primary-foreground: #ffffff;
        --heroui-focus: ${colorValue};
      }
      [data-theme="light"] {
        --heroui-primary: ${colorValue};
        --heroui-primary-foreground: #ffffff;
        --heroui-focus: ${colorValue};
      }
      [data-theme="dark"] {
        --heroui-primary: ${colorValue};
        --heroui-primary-foreground: #ffffff;
        --heroui-focus: ${colorValue};
      }
    `
    const existingStyle = document.getElementById('dynamic-theme')
    if (existingStyle) {
      existingStyle.remove()
    }
    document.head.appendChild(style)
  },

  toggleTheme: async () => {
    const currentTheme = get().isDark
    const newTheme = !currentTheme
    set({ isDark: newTheme })
    await storage.set('isDark', newTheme)
    
    // Apply theme to document
    if (newTheme) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  },

  setTheme: async (isDark: boolean) => {
    set({ isDark })
    await storage.set('isDark', isDark)
    
    // Apply theme to document
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  },

  loadTheme: async () => {
    try {
      const savedColor = await storage.get<ColorKey>('primaryColor')
      const savedIsDark = await storage.get<boolean>('isDark')
      const color = savedColor || 'blue'
      const isDark = savedIsDark || false
      
      set({ primaryColor: color, isDark })
      
      // Apply dark mode to document
      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      
      // Apply to document
      const root = document.documentElement
      const colorValue = PREMIUM_COLORS[color].value
      root.style.setProperty('--primary-color', colorValue)
      
      // Update HeroUI theme dynamically
      const style = document.createElement('style')
      style.id = 'dynamic-theme'
      style.textContent = `
        :root {
          --heroui-primary: ${colorValue};
          --heroui-primary-foreground: #ffffff;
          --heroui-focus: ${colorValue};
        }
        [data-theme="light"] {
          --heroui-primary: ${colorValue};
          --heroui-primary-foreground: #ffffff;
          --heroui-focus: ${colorValue};
        }
        [data-theme="dark"] {
          --heroui-primary: ${colorValue};
          --heroui-primary-foreground: #ffffff;
          --heroui-focus: ${colorValue};
        }
      `
      const existingStyle = document.getElementById('dynamic-theme')
      if (existingStyle) {
        existingStyle.remove()
      }
      document.head.appendChild(style)
    } catch (error) {
      console.error('Error loading theme:', error)
      set({ primaryColor: 'blue' })
    }
  },
}))

