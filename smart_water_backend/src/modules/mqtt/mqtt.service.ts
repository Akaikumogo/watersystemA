import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Inject,
  forwardRef
} from '@nestjs/common';
import { connect, MqttClient } from 'mqtt';
import { ConfigService } from '@nestjs/config';
import { DevicesService } from '../devices/devices.service';

type SensorPayload = {
  waterDepth?: number;
  height?: number;
  totalLitres?: number;
  totalElectricity?: number;
  motorState?: string;
  timerActive?: boolean;
  timerDuration?: number;
  deviceName?: string;
  location?: string;
  motorOnline?: boolean;
  motorBy?: string; // Event type: BOOT, MANUAL_ON, TIMER_START, etc.
  status?: string; // ONLINE or OFFLINE
  ultrasonicMode?: boolean;
  activeMotor2?: boolean;
};

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client?: MqttClient;
  private readonly logger = new Logger(MqttService.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(forwardRef(() => DevicesService))
    private readonly devicesService: DevicesService
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('MQTT_BROKER_URL');
    if (!url) {
      this.logger.warn('MQTT_BROKER_URL not set; MQTT will be disabled.');
      return;
    }
    const username = this.config.get<string>('MQTT_USERNAME');
    const password = this.config.get<string>('MQTT_PASSWORD');
    this.client = connect(url, {
      username,
      password
    });
    this.client.on('connect', () =>
      this.logger.log('Connected to MQTT broker')
    );
    this.client.on('error', (err) =>
      this.logger.error('MQTT error', err.stack)
    );

    // Subscribe to all device topics using wildcard
    this.client.subscribe(
      [
        'sensor/data',
        'device/status',
        'device/+/sensor/data',
        'device/+/status',
        'device/+/settings/request' // ESP32 sozlamalarni so'rash uchun
      ],
      (err) => {
        if (err) this.logger.error('Failed to subscribe to topics', err);
      }
    );
    this.client.on('message', (topic, payload) => {
      const message = payload.toString();
      this.logger.debug(`MQTT message ${topic}: ${message}`);

      // Handle global topics (backward compatibility)
      if (topic === 'sensor/data') {
        // sensor/data topic'ida deviceName payload ichida keladi
        this.handleSensorMessage(message);
      } else if (topic === 'device/status') {
        // Global status - deviceName payload ichida bo'lishi kerak yoki default
        this.handleStatusMessage(message, null);
      }
      // Handle device-specific topics: device/{deviceName}/sensor/data
      else if (topic.startsWith('device/') && topic.endsWith('/sensor/data')) {
        // Topic'dan deviceName ni olish: device/{deviceName}/sensor/data
        const deviceName = topic.split('/')[1];
        this.handleSensorMessage(message, deviceName);
      }
      // Handle device-specific status: device/{deviceName}/status
      else if (topic.startsWith('device/') && topic.endsWith('/status')) {
        // Topic'dan deviceName ni olish: device/{deviceName}/status
        const deviceName = topic.split('/')[1];
        this.handleStatusMessage(message, deviceName);
      }
      // Handle device settings request: device/{deviceName}/settings/request
      else if (topic.startsWith('device/') && topic.endsWith('/settings/request')) {
        // Topic'dan deviceName ni olish: device/{deviceName}/settings/request
        const deviceName = topic.split('/')[1];
        this.handleSettingsRequest(message, deviceName);
      }
    });
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end(true);
    }
  }

  publish(topic: string, message: string | number | boolean) {
    if (!this.client) {
      throw new Error('MQTT client not connected');
    }
    const payload = typeof message === 'string' ? message : String(message);
    this.client.publish(topic, payload);
    return { message: 'Message published successfully' };
  }

  // Publish with device ID in topic
  publishToDevice(
    deviceId: string,
    topic: string,
    message: string | number | boolean
  ) {
    const deviceTopic = `device/${deviceId}/${topic}`;
    return this.publish(deviceTopic, message);
  }

  publishMotor(deviceId: string, state: 'ON' | 'OFF') {
    const normalized = state.toUpperCase() === 'ON' ? 'ON' : 'OFF';
    return this.publishToDevice(deviceId, 'motor/command', normalized);
  }

  publishTimer(deviceId: string, durationSeconds: number) {
    const safe = Math.max(0, Math.floor(durationSeconds));
    return this.publishToDevice(deviceId, 'timer/command', safe);
  }

  publishHeight(deviceId: string, height: number) {
    const safe = Math.max(0, Math.floor(height));
    return this.publishToDevice(deviceId, 'height/command', safe);
  }

  publishMotorSwitch(deviceId: string, motorNumber: '1' | '2') {
    return this.publishToDevice(deviceId, 'motor/switch', motorNumber);
  }

  publishLanguage(deviceId: string, language: 'uz' | 'en' | 'ru') {
    return this.publishToDevice(deviceId, 'language/command', language);
  }

  publishUltrasonic(deviceId: string, enabled: boolean) {
    return this.publishToDevice(
      deviceId,
      'ultrasonic/command',
      enabled ? 'true' : 'false'
    );
  }

  // Publish device settings to ESP32 (height, activeMotor2, ultrasonic)
  publishDeviceSettings(
    deviceId: string,
    settings: {
      height?: number;
      activeMotor2?: boolean;
      ultrasonic?: boolean;
    }
  ) {
    if (settings.height !== undefined) {
      this.publishHeight(deviceId, settings.height);
    }
    if (settings.activeMotor2 !== undefined) {
      this.publishMotorSwitch(deviceId, settings.activeMotor2 ? '2' : '1');
    }
    if (settings.ultrasonic !== undefined) {
      this.publishUltrasonic(deviceId, settings.ultrasonic);
    }
  }

  // Publish device settings as JSON to settings/response topic
  publishDeviceSettingsAsJson(deviceId: string, settings: {
    height?: number;
    activeMotor2?: boolean;
    ultrasonic?: boolean;
  }) {
    const settingsJson = JSON.stringify({
      height: settings.height ?? 0,
      activeMotor2: settings.activeMotor2 ?? false,
      ultrasonic: settings.ultrasonic ?? true
    });
    return this.publishToDevice(deviceId, 'settings/response', settingsJson);
  }

  private handleSensorMessage(message: string, deviceNameFromTopic?: string) {
    if (!message) return;
    try {
      const data = JSON.parse(message) as SensorPayload;

      // deviceName ni aniqlash: payload ichida yoki topic'dan
      const deviceName = data.deviceName || deviceNameFromTopic;

      if (!deviceName) {
        this.logger.warn('Sensor message missing deviceName, skipping');
        return;
      }

      // Update status if provided (with metrics)
      if (data.status) {
        void this.devicesService.updateStatus(
          {
            status: data.status,
            waterDepth: this.toNumber(data.waterDepth),
            totalLitres: this.toNumber(data.totalLitres),
            totalElectricity: this.toNumber(data.totalElectricity),
            ultrasonicMode:
              data.ultrasonicMode !== undefined
                ? Boolean(data.ultrasonicMode)
                : undefined,
            activeMotor2:
              data.activeMotor2 !== undefined
                ? Boolean(data.activeMotor2)
                : undefined,
            height: this.toNumber(data.height),
            motorState: data.motorState
          },
          deviceName
        );
      }

      void this.devicesService.upsertSensorSnapshot({
        deviceName: deviceName,
        location: data.location,
        waterDepth: this.toNumber(data.waterDepth),
        height: this.toNumber(data.height),
        totalLitres: this.toNumber(data.totalLitres),
        totalElectricity: this.toNumber(data.totalElectricity),
        motorState: data.motorState,
        timerActive: Boolean(data.timerActive),
        timerDuration: this.toNumber(data.timerDuration),
        motorOnline: Boolean(data.motorOnline),
        motorBy: data.motorBy
      });

      this.logger.debug(`Processed sensor data for device: ${deviceName}`);
    } catch (error) {
      this.logger.error(
        'Failed to parse sensor payload',
        error instanceof Error ? error.message : error
      );
    }
  }

  private handleStatusMessage(message: string, deviceNameFromTopic?: string) {
    // Status payload JSON yoki oddiy string bo'lishi mumkin
    try {
      const parsed = JSON.parse(message);
      const deviceName = parsed.deviceName || deviceNameFromTopic || null;
      void this.devicesService.updateStatus(
        {
          status: parsed.status || 'ONLINE',
          waterDepth: this.toNumber(parsed.waterDepth),
          totalLitres: this.toNumber(parsed.totalLitres),
          totalElectricity: this.toNumber(parsed.totalElectricity),
          ultrasonicMode:
            parsed.ultrasonicMode !== undefined
              ? Boolean(parsed.ultrasonicMode)
              : undefined,
          activeMotor2:
            parsed.activeMotor2 !== undefined
              ? Boolean(parsed.activeMotor2)
              : undefined,
          height: this.toNumber(parsed.height),
          motorState: parsed.motorState
        },
        deviceName
      );
      return;
    } catch {
      // JSON emas, oddiy string
    }

    const deviceName = deviceNameFromTopic || null;
    void this.devicesService.updateStatus(
      { status: message },
      deviceName
    );
  }

  private async handleSettingsRequest(message: string, deviceName: string) {
    try {
      this.logger.log(`Settings request received from device: ${deviceName}`);
      
      // Device'ni DB'dan topish
      const device = await this.devicesService.getDeviceByName(deviceName);
      
      if (device) {
        // Device topildi, sozlamalarni JSON formatida yuborish
        this.publishDeviceSettingsAsJson(deviceName, {
          height: device.height ?? 0,
          activeMotor2: device.activeMotor2 ?? false,
          ultrasonic: device.ultrasonic ?? true
        });
        this.logger.log(
          `Settings sent to ${deviceName}: height=${device.height ?? 0}, activeMotor2=${
            device.activeMotor2 ?? false
          }, ultrasonic=${device.ultrasonic ?? true}`
        );
      } else {
        this.logger.warn(`Device not found: ${deviceName}`);
        // Device topilmasa, default sozlamalarni yuborish
        this.publishDeviceSettingsAsJson(deviceName, {
          height: 0,
          activeMotor2: false,
          ultrasonic: true
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle settings request for ${deviceName}`,
        error instanceof Error ? error.message : error
      );
    }
  }

  private toNumber(value: unknown): number | undefined {
    if (value === undefined || value === null) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
