import { io, type Socket } from 'socket.io-client';
import { Capacitor } from '@capacitor/core';
import { storage } from './storage';

// Get Socket URL - handle mobile vs web
const getSocketUrl = (): string => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    // On mobile, use full URL from env
    // Example: http://192.168.1.100:5001
    if (envUrl && !envUrl.includes('localhost')) {
      return envUrl;
    }
    // Default fallback
    console.warn(
      'Socket URL not configured for mobile. Please set VITE_SOCKET_URL to your server IP address.'
    );
    return 'http://localhost:5001'; // This won't work on mobile, but prevents errors
  }

  // For web, use relative or localhost
  return envUrl || 'http://localhost:5001';
};

class SocketManager {
  private socket: Socket | null = null;
  private socketUrl: string;
  private subscriptions: Set<string> = new Set(); // QO'SHISH: Subscription'larni saqlash

  constructor() {
    this.socketUrl = getSocketUrl();
  }

  async connect(): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    try {
      // Get auth token from storage
      const authData = await storage.get<{ token: string }>('auth');
      const token = authData?.token;

      if (!token) {
        console.warn('No auth token found, WebSocket connection may fail');
      }

      // Connect to WebSocket server
      this.socket = io(`${this.socketUrl}/devices`, {
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        // QO'SHISH: Reconnect bo'lganda subscription'larni qayta yaratish
        this.resubscribe();
      });

      this.socket.on('reconnect', () => {
        console.log('WebSocket reconnected');
        // QO'SHISH: Reconnect bo'lganda subscription'larni qayta yaratish
        this.resubscribe();
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
      });

      this.socket.on('connected', (data) => {
        console.log('WebSocket server confirmed connection:', data);
      });

      return this.socket;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      // Return a mock socket if connection fails
      return {
        connected: false,
        on: () => {},
        off: () => {},
        emit: () => {},
        disconnect: () => {}
      } as unknown as Socket;
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // QO'SHISH: Subscription'larni saqlash
  subscribe(deviceId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:device', deviceId);
      this.subscriptions.add(deviceId);
    }
  }

  // QO'SHISH: Barcha subscription'larni qayta yaratish
  private resubscribe(): void {
    if (this.socket?.connected) {
      this.subscriptions.forEach(deviceId => {
        this.socket?.emit('subscribe:device', deviceId);
      });
    }
  }
}

export const socketManager = new SocketManager();
