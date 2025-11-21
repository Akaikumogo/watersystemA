import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

class PushNotificationService {
  private isInitialized = false;
  private token: string | null = null;

  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications only work on native platforms');
      return;
    }

    if (this.isInitialized) {
      return;
    }

    try {
      // Request permission
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive === 'granted') {
        // Register for push notifications
        await PushNotifications.register();
        this.isInitialized = true;
      } else {
        console.warn('Push notification permission denied');
      }
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }

    // Listen for registration
    PushNotifications.addListener('registration', (token) => {
      this.token = token.value;
      console.log('Push notification token:', this.token);
      // TODO: Send token to backend
    });

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push notification registration error:', error);
    });

    // Listen for push notifications
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received:', notification);
    });

    // Listen for push notification actions
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push notification action performed:', action);
    });
  }

  async sendLocalNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      // Request permission for local notifications
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: Date.now(),
              sound: 'default',
              attachments: undefined,
              actionTypeId: '',
              extra: data || null
            }
          ]
        });
      } else if (!Capacitor.isNativePlatform()) {
        // For web, use browser notification API
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/icon.png' });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            new Notification(title, { body, icon: '/icon.png' });
          }
        }
      }
    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  }

  async requestWebNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  getToken(): string | null {
    return this.token;
  }
}

export const pushNotificationService = new PushNotificationService();

