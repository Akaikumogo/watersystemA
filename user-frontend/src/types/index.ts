export interface User {
  _id: string;
  username: string;
  role: 'ADMIN' | 'USER';
  language?: 'uz' | 'en' | 'ru';
  createdAt?: string;
  updatedAt?: string;
}

export interface Device {
  _id: string;
  name: string;
  location: string;
  status: 'ONLINE' | 'OFFLINE';
  lastUpdated: string;
  powerUsage: number;
  waterDepth: number;
  height: number;
  totalLitres: number;
  totalElectricity: number;
  motorState: string;
  timerActive: boolean;
  timerDuration?: number;
  activeMotor2?: boolean;
  motorFault?: boolean;
  ultrasonic?: boolean;
  motorOnline?: boolean;
  userIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}

export interface CreateDeviceData {
  name: string;
  location?: string;
  status?: 'ONLINE' | 'OFFLINE';
  powerUsage?: number;
  userIds?: string[];
}
