export interface User {
  _id: string
  username: string
  role: 'ADMIN' | 'USER'
  language?: 'uz' | 'en' | 'ru'
  createdAt?: string
  updatedAt?: string
}

export interface Device {
  _id: string
  name: string
  location: string
  status: 'ONLINE' | 'OFFLINE'
  lastUpdated: string
  powerUsage: number
  waterDepth: number
  height: number
  totalLitres: number
  totalElectricity: number
  motorState: string
  timerActive: boolean
  userIds: string[]
  createdAt?: string
  updatedAt?: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthResponse {
  access_token: string
  user: User
}

export interface CreateUserDto {
  username: string
  password: string
  role: 'ADMIN' | 'USER'
}

export interface UpdateUserDto {
  username?: string
  password?: string
  role?: 'ADMIN' | 'USER'
}

export interface CreateDeviceDto {
  name: string
  location: string
}

export interface UpdateDeviceDto {
  name?: string
  location?: string
}

export interface AssignUsersDto {
  userIds: string[]
}

export type ViewMode = 'table' | 'grid'

