import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Edit, Trash2, Plus, Table2, Grid3x3, Search, Eye } from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'
import { useViewStore } from '@/store/viewStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import type { User, CreateUserDto, UpdateUserDto } from '@/types'

interface UserFormData {
  username: string
  password: string
  role: 'ADMIN' | 'USER'
}

const UserTable: React.FC<{
  users: User[]
  onEdit: (user: User) => void
  onDelete: (id: string) => void
  loading: boolean
}> = ({ users, onEdit, onDelete, loading }) => {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {t('common.noData')}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full" role="table">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-700">
              {t('common.username')}
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">
              {t('common.role')}
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">
              {t('common.createdAt')}
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">
              {t('common.actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <motion.tr
              key={user._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-3 px-4">{user.username}</td>
              <td className="py-3 px-4">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {user.role === 'ADMIN' ? t('users.admin') : t('users.user')}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-gray-600">
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : '-'}
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-2">
                  <Link
                    to={`/dashboard/users/${user._id}`}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus-visible-ring"
                    aria-label={t('common.view')}
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => onEdit(user)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors focus-visible-ring"
                    aria-label={t('common.edit')}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(user._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors focus-visible-ring"
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const UserGrid: React.FC<{
  users: User[]
  onEdit: (user: User) => void
  onDelete: (id: string) => void
  loading: boolean
}> = ({ users, onEdit, onDelete, loading }) => {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {t('common.noData')}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {users.map((user) => (
        <motion.div
          key={user._id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">{user.username}</h3>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                user.role === 'ADMIN'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {user.role === 'ADMIN' ? t('users.admin') : t('users.user')}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {t('common.createdAt')}:{' '}
            {user.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : '-'}
          </p>
          <div className="flex gap-2">
            <Link
              to={`/dashboard/users/${user._id}`}
              className="flex-1"
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-1" />
                {t('common.view')}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(user)}
              className="flex-1"
            >
              <Edit className="w-4 h-4 mr-1" />
              {t('common.edit')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(user._id)}
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {t('common.delete')}
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export const Users: React.FC = () => {
  const { t } = useTranslation()
  const { users, loading, createUser, updateUser, deleteUser } = useUsers()
  const { usersViewMode, setUsersViewMode } = useViewStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<UserFormData>({
    defaultValues: {
      username: '',
      password: '',
      role: 'USER',
    },
  })

  const filteredUsers = users.filter((user) =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false
  )

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setValue('username', user.username || '')
      setValue('role', user.role || 'USER')
      setValue('password', '')
    } else {
      setEditingUser(null)
      reset()
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
    reset()
  }

  const onSubmit = async (data: UserFormData) => {
    if (editingUser) {
      const updateData: UpdateUserDto = {
        username: data.username,
        role: data.role,
      }
      if (data.password) {
        updateData.password = data.password
      }
      const result = await updateUser(editingUser._id, updateData)
      if (result.success) {
        handleCloseModal()
      }
    } else {
      const createData: CreateUserDto = {
        username: data.username,
        password: data.password,
        role: data.role,
      }
      const result = await createUser(createData)
      if (result.success) {
        handleCloseModal()
      }
    }
  }

  const handleDelete = async (id: string) => {
    const result = await deleteUser(id)
    if (result.success) {
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{t('users.title')}</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          {t('users.createUser')}
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label={t('common.search')}
              />
            </div>
          </div>
          <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setUsersViewMode('table')}
              className={`p-2 rounded-md transition-colors ${
                usersViewMode === 'table'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-pressed={usersViewMode === 'table'}
              aria-label={t('common.table')}
            >
              <Table2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setUsersViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                usersViewMode === 'grid'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-pressed={usersViewMode === 'grid'}
              aria-label={t('common.grid')}
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {usersViewMode === 'table' ? (
          <UserTable
            users={filteredUsers}
            onEdit={handleOpenModal}
            onDelete={(id) => setDeleteConfirm(id)}
            loading={loading}
          />
        ) : (
          <UserGrid
            users={filteredUsers}
            onEdit={handleOpenModal}
            onDelete={(id) => setDeleteConfirm(id)}
            loading={loading}
          />
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingUser ? t('users.editUser') : t('users.createUser')}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={t('common.username')}
            error={errors.username?.message}
            {...register('username', {
              required: t('common.username') + ' ' + t('common.error'),
            })}
            aria-required="true"
          />
          <Input
            label={t('common.password')}
            type="password"
            error={errors.password?.message}
            {...register('password', {
              required: !editingUser ? t('common.password') + ' ' + t('common.error') : false,
            })}
            aria-required={!editingUser}
          />
          <Select
            label={t('common.role')}
            options={[
              { value: 'USER', label: t('users.user') },
              { value: 'ADMIN', label: t('users.admin') },
            ]}
            error={errors.role?.message}
            {...register('role', {
              required: t('common.role') + ' ' + t('common.error'),
            })}
            aria-required="true"
          />
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">
              {editingUser ? t('common.update') : t('common.create')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title={t('users.deleteUser')}
        size="sm"
      >
        <p className="mb-6 text-gray-700">{t('users.deleteConfirm')}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

