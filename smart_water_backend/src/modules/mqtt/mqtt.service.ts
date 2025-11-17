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
  deviceName?: string;
  location?: string;
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
        'device/+/status'
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
        this.handleSensorMessage(message);
      } else if (topic === 'device/status') {
        this.handleStatusMessage(message);
      }
      // Handle device-specific topics: device/{deviceId}/sensor/data
      else if (topic.startsWith('device/') && topic.endsWith('/sensor/data')) {
        this.handleSensorMessage(message);
      }
      // Handle device-specific status: device/{deviceId}/status
      else if (topic.startsWith('device/') && topic.endsWith('/status')) {
        this.handleStatusMessage(message);
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

  private handleSensorMessage(message: string) {
    if (!message) return;
    try {
      const data = JSON.parse(message) as SensorPayload;
      void this.devicesService.upsertSensorSnapshot({
        deviceName: data.deviceName,
        location: data.location,
        waterDepth: this.toNumber(data.waterDepth),
        height: this.toNumber(data.height),
        totalLitres: this.toNumber(data.totalLitres),
        totalElectricity: this.toNumber(data.totalElectricity),
        motorState: data.motorState,
        timerActive: Boolean(data.timerActive)
      });
    } catch (error) {
      this.logger.error(
        'Failed to parse sensor payload',
        error instanceof Error ? error.message : error
      );
    }
  }

  private handleStatusMessage(message: string) {
    void this.devicesService.updateStatus(message);
  }

  private toNumber(value: unknown): number | undefined {
    if (value === undefined || value === null) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
