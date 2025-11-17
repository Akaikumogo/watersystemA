import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { User, CreateUserDto, UpdateUserDto } from '@/types'

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getUsers()
      setUsers(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const createUser = useCallback(async (dto: CreateUserDto) => {
    try {
      const newUser = await api.createUser(dto)
      setUsers((prev) => [...prev, newUser])
      return { success: true }
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to create user',
      }
    }
  }, [])

  const updateUser = useCallback(async (id: string, dto: UpdateUserDto) => {
    try {
      const updatedUser = await api.updateUser(id, dto)
      setUsers((prev) => prev.map((u) => (u._id === id ? updatedUser : u)))
      return { success: true }
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to update user',
      }
    }
  }, [])

  const deleteUser = useCallback(async (id: string) => {
    try {
      await api.deleteUser(id)
      setUsers((prev) => prev.filter((u) => u._id !== id))
      return { success: true }
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to delete user',
      }
    }
  }, [])

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  }
}

