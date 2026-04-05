import axios, { AxiosInstance, AxiosError } from 'axios';
import { Capacitor } from '@capacitor/core';
import type {
  User,
  Device,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse
} from '@/types';
import { storage } from './storage';

// Get API URL - handle mobile vs web
const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    // On mobile, use full URL from env or default
    // For development, use your computer's IP address
    // Example: http://192.168.1.100:5001/api/v1
    if (envUrl && !envUrl.includes('localhost')) {
      return envUrl;
    }
    // If localhost, try to construct from socket URL or use default
    const socketUrl = import.meta.env.VITE_SOCKET_URL;
    if (socketUrl && !socketUrl.includes('localhost')) {
      return `${socketUrl}/api/v1`;
    }
    // Default fallback - you should set VITE_API_URL for mobile
    console.warn(
      'API URL not configured for mobile. Please set VITE_API_URL to your server IP address.'
    );
    return '/api/v1'; // This won't work on mobile, but prevents errors
  }

  // For web, use relative or localhost
  return envUrl || '/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

/** Backend may send `id` and/or `_id` (Postgres UUID); UI expects `_id`. */
function normalizeUser(raw: User & { id?: string }): User {
  const _id = String(raw._id ?? raw.id ?? '').trim();
  if (!_id) {
    throw new Error('Invalid user: missing id');
  }
  return { ...raw, _id };
}

function normalizeDevice(raw: Device & { id?: string }): Device {
  const _id = String(raw._id ?? raw.id ?? '').trim();
  if (!_id) {
    throw new Error('Invalid device: missing id');
  }
  return { ...raw, _id };
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const authData = await storage.get<{ token: string }>('auth');
        if (authData?.token) {
          config.headers.Authorization = `Bearer ${authData.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          await storage.remove('auth');
          await storage.remove('user');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await this.client.post<AuthResponse>(
      '/auth/login',
      credentials
    );
    return {
      ...data,
      user: normalizeUser(data.user as User & { id?: string })
    };
  }

  async register(
    credentials: RegisterCredentials
  ): Promise<{ message: string; userId: string }> {
    const { data } = await this.client.post<{
      message: string;
      userId: string;
    }>('/auth/register-client', credentials);
    return data;
  }

  async getCurrentUser(): Promise<User> {
    const { data } = await this.client.get<User>('/auth/me');
    return normalizeUser(data as User & { id?: string });
  }

  async updatePreferences(language: 'uz' | 'en' | 'ru'): Promise<User> {
    const { data } = await this.client.patch<User>('/auth/preferences', {
      language
    });
    return normalizeUser(data as User & { id?: string });
  }

  // Devices
  async getDevices(): Promise<Device[]> {
    const { data } = await this.client.get<Device[]>('/devices');
    return data.map((d) => normalizeDevice(d as Device & { id?: string }));
  }

  async getDevice(id: string): Promise<Device> {
    const { data } = await this.client.get<Device>(`/devices/${id}`);
    return normalizeDevice(data as Device & { id?: string });
  }

  async getUserDevices(): Promise<Device[]> {
    const user = await storage.get<User>('user');
    if (!user?._id) {
      throw new Error('User not found');
    }
    const { data } = await this.client.get<Device[]>(
      `/devices/user/${user._id}`
    );
    return data.map((d) => normalizeDevice(d as Device & { id?: string }));
  }

  async createDevice(deviceData: {
    name: string;
    location?: string;
    status?: 'ONLINE' | 'OFFLINE';
    powerUsage?: number;
    userIds?: string[];
  }): Promise<Device> {
    const { data } = await this.client.post<Device>('/devices', deviceData);
    return normalizeDevice(data as Device & { id?: string });
  }

  async assignUsers(deviceId: string, userIds: string[]): Promise<Device> {
    const cleaned = userIds.map((x) => String(x).trim()).filter(Boolean);
    const { data } = await this.client.post<Device>(
      `/devices/${deviceId}/assign-users`,
      { userIds: cleaned }
    );
    return normalizeDevice(data as Device & { id?: string });
  }

  async getUsers(): Promise<User[]> {
    const { data } = await this.client.get<User[]>('/users');
    return data.map((u) => normalizeUser(u as User & { id?: string }));
  }

  async sendDeviceCommand(
    deviceId: string,
    command: {
      motor?: 'ON' | 'OFF';
      height?: number;
      timer?: number;
      switchMotor?: boolean;
      ultrasonic?: boolean;
    }
  ): Promise<Device> {
    const { data } = await this.client.post<{ device: Device }>(
      `/devices/${deviceId}/command`,
      command
    );
    return normalizeDevice(data.device as Device & { id?: string });
  }

  // Reports
  async getDailyReport(date?: string) {
    const params = date ? { date } : {};
    const { data } = await this.client.get('/reports/daily', { params });
    return data;
  }

  async getWeeklyReport(weekStart?: string) {
    const params = weekStart ? { weekStart } : {};
    const { data } = await this.client.get('/reports/weekly', { params });
    return data;
  }

  async getMonthlyReport(month?: string) {
    const params = month ? { month } : {};
    const { data } = await this.client.get('/reports/monthly', { params });
    return data;
  }

  async getYearlyReport(year?: string) {
    const params = year ? { year } : {};
    const { data } = await this.client.get('/reports/yearly', { params });
    return data;
  }
}

export const api = new ApiClient();
