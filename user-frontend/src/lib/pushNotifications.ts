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

  async sendLocalNotification(title: string, body: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Local notification:', title, body);
      return;
    }

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
              extra: null
            }
          ]
        });
      }
    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  }

  getToken(): string | null {
    return this.token;
  }
}

export const pushNotificationService = new PushNotificationService();

