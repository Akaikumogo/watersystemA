import axios, { AxiosInstance } from 'axios';
import type {
  User,
  Device,
  LoginCredentials,
  AuthResponse,
  CreateUserDto,
  UpdateUserDto,
  CreateDeviceDto,
  UpdateDeviceDto,
  AssignUsersDto,
  Contact
} from '@/types';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://asadbek.akaikumogo.uz/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        // Try to get token from zustand persist storage
        try {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            const token = parsed?.state?.token;
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
              return config;
            }
          }
        } catch (error) {
          // Fallback to direct localStorage access
        }

        // Fallback: check localStorage directly (for backward compatibility)
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear auth storage
          localStorage.removeItem('auth-storage');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Redirect to login
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
    return data;
  }

  async getCurrentUser(): Promise<User> {
    const { data } = await this.client.get<User>('/auth/me');
    return data;
  }

  async updatePreferences(language: 'uz' | 'en' | 'ru'): Promise<User> {
    const { data } = await this.client.patch<{ user: User }>(
      '/auth/preferences',
      { language }
    );
    return data.user;
  }

  // Users
  async getUsers(): Promise<User[]> {
    const { data } = await this.client.get<User[]>('/users');
    return data;
  }

  async getUser(id: string): Promise<User> {
    const { data } = await this.client.get<User>(`/users/${id}`);
    return data;
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    const { data } = await this.client.post<{ user: User }>(
      `/auth/register`,
      dto
    );
    return data.user;
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const { data } = await this.client.patch<{ user: User }>(
      `/users/${id}`,
      dto
    );
    return data.user;
  }

  async deleteUser(id: string): Promise<void> {
    await this.client.delete(`/users/${id}`);
  }

  async getUserDevices(userId: string): Promise<Device[]> {
    const { data } = await this.client.get<Device[]>(
      `/users/${userId}/devices`
    );
    return data;
  }

  // Devices
  async getDevices(): Promise<Device[]> {
    const { data } = await this.client.get<Device[]>('/devices');
    return data;
  }

  async getDevice(id: string): Promise<Device> {
    const { data } = await this.client.get<Device>(`/devices/${id}`);
    return data;
  }

  async createDevice(dto: CreateDeviceDto): Promise<Device> {
    const { data } = await this.client.post<{ device: Device }>(
      '/devices',
      dto
    );
    return data.device;
  }

  async updateDevice(id: string, dto: UpdateDeviceDto): Promise<Device> {
    const { data } = await this.client.patch<{ device: Device }>(
      `/devices/${id}`,
      dto
    );
    return data.device;
  }

  async deleteDevice(id: string): Promise<void> {
    await this.client.delete(`/devices/${id}`);
  }

  async assignUsers(deviceId: string, dto: AssignUsersDto): Promise<Device> {
    const { data } = await this.client.post<{ device: Device }>(
      `/devices/${deviceId}/assign-users`,
      dto
    );
    return data.device;
  }

  async unassignUsers(deviceId: string, dto: AssignUsersDto): Promise<Device> {
    const { data } = await this.client.post<{ device: Device }>(
      `/devices/${deviceId}/unassign-users`,
      dto
    );
    return data.device;
  }

  async getDeviceUsers(deviceId: string): Promise<User[]> {
    const device = await this.getDevice(deviceId);
    if (!device.userIds || device.userIds.length === 0) {
      return [];
    }
    // Fetch all users and filter by device userIds
    const allUsers = await this.getUsers();
    return allUsers.filter((user) => device.userIds.includes(user._id));
  }

  // Contacts
  async getContacts(): Promise<{
    contacts: Contact[];
    total: number;
    unread: number;
  }> {
    const { data } = await this.client.get<{
      contacts: Contact[];
      total: number;
      unread: number;
    }>('/contacts');
    return data;
  }

  async getContact(id: string): Promise<Contact> {
    const { data } = await this.client.get<Contact>(`/contacts/${id}`);
    return data;
  }

  async markContactAsRead(id: string): Promise<Contact> {
    const { data } = await this.client.patch<{
      message: string;
      contact: Contact;
    }>(`/contacts/${id}/read`);
    return data.contact;
  }

  async markContactAsUnread(id: string): Promise<Contact> {
    const { data } = await this.client.patch<{
      message: string;
      contact: Contact;
    }>(`/contacts/${id}/unread`);
    return data.contact;
  }

  async deleteContact(id: string): Promise<void> {
    await this.client.delete(`/contacts/${id}`);
  }
}

export const api = new ApiClient();
