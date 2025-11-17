import { Preferences } from '@capacitor/preferences'

/**
 * Capacitor Preferences wrapper for secure storage
 * Works on both web and mobile platforms
 */
class Storage {
  async get<T>(key: string): Promise<T | null> {
    try {
      const { value } = await Preferences.get({ key })
      if (!value) return null
      return JSON.parse(value) as T
    } catch (error) {
      console.error(`Error getting key ${key}:`, error)
      return null
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      await Preferences.set({
        key,
        value: JSON.stringify(value),
      })
    } catch (error) {
      console.error(`Error setting key ${key}:`, error)
      throw error
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await Preferences.remove({ key })
    } catch (error) {
      console.error(`Error removing key ${key}:`, error)
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      await Preferences.clear()
    } catch (error) {
      console.error('Error clearing storage:', error)
      throw error
    }
  }

  async keys(): Promise<string[]> {
    try {
      const { keys } = await Preferences.keys()
      return keys
    } catch (error) {
      console.error('Error getting keys:', error)
      return []
    }
  }
}

export const storage = new Storage()

