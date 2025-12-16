import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Device, DeviceStatus } from './schemas/device.schema';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceCommandDto } from './dto/device-command.dto';
import { MqttService } from '../mqtt/mqtt.service';
import { DevicesGateway } from './devices.gateway';
import { ReportsService } from '../reports/reports.service';

type SensorSnapshot = {
  deviceName?: string;
  location?: string;
  waterDepth?: number;
  height?: number;
  totalLitres?: number;
  totalElectricity?: number;
  motorState?: string;
  timerActive?: boolean;
  timerDuration?: number;
  motorOnline?: boolean;
  motorBy?: string; // Event type: BOOT, MANUAL_ON, TIMER_START, etc.
};

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectModel(Device.name) private readonly deviceModel: Model<Device>,
    @Inject(forwardRef(() => MqttService))
    private readonly mqttService?: MqttService,
    @Inject(forwardRef(() => DevicesGateway))
    private readonly devicesGateway?: DevicesGateway,
    @Inject(forwardRef(() => ReportsService))
    private readonly reportsService?: ReportsService
  ) {}

  async findAll() {
    return this.deviceModel.find().lean();
  }

  async getPublicStats() {
    const devices = await this.deviceModel.find().lean();
    const total = devices.length;
    const online = devices.filter((d) => d.status === 'ONLINE').length;
    const offline = devices.filter((d) => d.status === 'OFFLINE').length;
    const totalWater = devices.reduce(
      (sum, d) => sum + (d.totalLitres || 0),
      0
    );
    const totalEnergy = devices.reduce(
      (sum, d) => sum + (d.totalElectricity || 0),
      0
    );

    return {
      total,
      online,
      offline,
      totalWater: Math.round(totalWater),
      totalEnergy: Math.round(totalEnergy * 100) / 100
    };
  }

  async findOne(id: string) {
    const device = await this.deviceModel.findById(id).lean();
    if (!device) throw new NotFoundException('Device not found');
    return device;
  }

  async getDeviceByName(name: string) {
    const device = await this.deviceModel.findOne({ name }).lean();
    return device;
  }

  async create(dto: CreateDeviceDto, createdByUserId?: string) {
    const initialUserIds = dto.userIds ?? [];
    // ensure creator user id is included if provided
    const userIds = createdByUserId
      ? Array.from(new Set([...initialUserIds, createdByUserId]))
      : initialUserIds;

    const device = await this.deviceModel.create({
      name: dto.name,
      location: dto.location ?? 'Unknown',
      status: dto.status ?? 'OFFLINE',
      powerUsage: dto.powerUsage ?? 0,
      userIds,
      lastUpdated: new Date()
    });
    return { message: 'Device created successfully', device };
  }

  async update(id: string, dto: UpdateDeviceDto) {
    const updateData: any = { ...dto, lastUpdated: new Date() };
    if (dto.userIds !== undefined) {
      updateData.userIds = dto.userIds;
    }
    const device = await this.deviceModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .lean();
    if (!device) throw new NotFoundException('Device not found');
    return { message: 'Device updated successfully', device };
  }

  async remove(id: string) {
    const res = await this.deviceModel.findByIdAndDelete(id).lean();
    if (!res) throw new NotFoundException('Device not found');
    return { message: 'Device deleted successfully' };
  }

  async upsertSensorSnapshot(snapshot: SensorSnapshot) {
    // deviceName majburiy bo'lishi kerak
    if (!snapshot.deviceName) {
      this.logger.warn('Sensor snapshot missing deviceName, skipping');
      return;
    }

    const name = snapshot.deviceName;
    const now = new Date();
    const update = {
      name,
      location: snapshot.location ?? 'Remote node',
      status: 'ONLINE' as DeviceStatus,
      lastUpdated: now,
      waterDepth: snapshot.waterDepth ?? 0,
      height: snapshot.height ?? 0,
      totalLitres: snapshot.totalLitres ?? 0,
      totalElectricity: snapshot.totalElectricity ?? 0,
      motorState: snapshot.motorState ?? 'OFF',
      timerActive: snapshot.timerActive ?? false,
      timerDuration:
        snapshot.timerActive && snapshot.timerDuration
          ? snapshot.timerDuration
          : 0,
      motorOnline: snapshot.motorOnline ?? false
    };

    const device = await this.deviceModel
      .findOneAndUpdate(
        { name },
        { $set: update },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      .lean();

    // Send device settings to ESP32 when it first connects (BOOT event)
    // Check if this is a BOOT event by checking motorBy field
    if (device && this.mqttService && snapshot.deviceName) {
      const deviceName = (device as any).name;
      const isBootEvent = snapshot.motorBy === 'BOOT';

      // Send settings on BOOT event
      if (isBootEvent) {
        this.logger.log(
          `BOOT event detected. Sending device settings to ESP32: ${deviceName}`
        );
        // Send current device settings to ESP32
        this.mqttService.publishDeviceSettings(deviceName, {
          height: (device as any).height ?? 0,
          activeMotor2: (device as any).activeMotor2 ?? false,
          ultrasonic: (device as any).ultrasonic ?? true
        });
        this.logger.log(
          `Settings sent: height=${(device as any).height ?? 0}, activeMotor2=${
            (device as any).activeMotor2 ?? false
          }, ultrasonic=${(device as any).ultrasonic ?? true}`
        );
      }
    }

    // Emit real-time update via WebSocket
    if (device && this.devicesGateway) {
      this.devicesGateway.emitDeviceUpdate(device as unknown as Device);
      this.devicesGateway.emitDeviceStatus({
        deviceId: (device as any)._id.toString(),
        status: 'ONLINE'
      });
    }
  }

  async updateStatus(
    data: {
      status: string;
      waterDepth?: number;
      totalLitres?: number;
      totalElectricity?: number;
      ultrasonicMode?: boolean;
      activeMotor2?: boolean;
      height?: number;
      motorState?: string;
    },
    deviceName?: string | null
  ) {
    // deviceName ni aniqlash
    const name = deviceName || (data as any)?.deviceName || 'ESP32Controller';
    const normalized = data.status?.toLowerCase();
    const deviceStatus: DeviceStatus =
      normalized === 'offline' ? 'OFFLINE' : 'ONLINE';

    const updateFields: any = {
      status: deviceStatus,
      lastUpdated: new Date()
    };

    if (data.waterDepth !== undefined) updateFields.waterDepth = data.waterDepth;
    if (data.totalLitres !== undefined) updateFields.totalLitres = data.totalLitres;
    if (data.totalElectricity !== undefined)
      updateFields.totalElectricity = data.totalElectricity;
    if (data.ultrasonicMode !== undefined)
      updateFields.ultrasonic = data.ultrasonicMode;
    if (data.activeMotor2 !== undefined) updateFields.activeMotor2 = data.activeMotor2;
    if (data.height !== undefined) updateFields.height = data.height;
    if (data.motorState !== undefined) updateFields.motorState = data.motorState;

    const device = await this.deviceModel
      .findOneAndUpdate(
        { name },
        { $set: updateFields },
        { upsert: true, setDefaultsOnInsert: true, new: true }
      )
      .lean();

    // Emit status change via WebSocket (with metrics)
    if (device && this.devicesGateway) {
      const deviceId = (device as any)._id?.toString();
      if (deviceId) {
        this.devicesGateway.emitDeviceStatus({
          deviceId,
          status: deviceStatus,
          waterDepth: data.waterDepth,
          totalLitres: data.totalLitres,
          totalElectricity: data.totalElectricity,
          ultrasonicMode: data.ultrasonicMode,
          activeMotor2: data.activeMotor2,
          height: data.height,
          motorState: data.motorState
        });
        this.devicesGateway.emitDeviceUpdate(device as unknown as Device);
      }
    }

    this.logger.debug(`Updated status for device: ${name} -> ${deviceStatus}`);
  }

  async assignUsers(
    deviceId: string,
    userIds: string[],
    requestingUserId?: string
  ) {
    const device = await this.deviceModel.findById(deviceId);
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // If requestingUserId is provided and user is not admin, check if user has access to this device
    if (requestingUserId && !device.userIds.includes(requestingUserId)) {
      throw new NotFoundException('Device not found or access denied');
    }

    // Remove duplicates and add new user IDs
    const uniqueUserIds = [...new Set([...device.userIds, ...userIds])];
    device.userIds = uniqueUserIds;
    await device.save();
    return { message: 'Users assigned successfully', device };
  }

  async unassignUsers(deviceId: string, userIds: string[]) {
    const device = await this.deviceModel.findById(deviceId);
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    device.userIds = device.userIds.filter((id) => !userIds.includes(id));
    await device.save();
    return { message: 'Users unassigned successfully', device };
  }

  async getUserDevices(userId: string) {
    return this.deviceModel.find({ userIds: userId }).lean();
  }

  async sendCommand(
    deviceId: string,
    command: DeviceCommandDto,
    requestingUserId?: string
  ) {
    const device = await this.deviceModel.findById(deviceId);
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Check access for non-admin users
    if (requestingUserId && !device.userIds.includes(requestingUserId)) {
      throw new ForbiddenException('Access denied to this device');
    }

    const updateData: any = {
      lastUpdated: new Date()
    };

    // Motor command
    if (command.motor !== undefined) {
      updateData.motorState = command.motor;
      if (command.motor === 'OFF') {
        updateData.timerActive = false;
      }
    }

    // Height command
    if (command.height !== undefined) {
      updateData.height = command.height;
    }

    // Timer command
    if (command.timer !== undefined) {
      const timerSeconds = command.timer;
      updateData.timerActive = true;
      updateData.timerDuration = timerSeconds;
      updateData.timerEndTime = new Date(Date.now() + timerSeconds * 1000); // Calculate end time
      updateData.motorState = 'ON';
    }

    // Switch motor command
    if (command.switchMotor !== undefined) {
      updateData.activeMotor2 = command.switchMotor;
    }

    // Ultrasonic mode command
    if (command.ultrasonic !== undefined) {
      updateData.ultrasonic = command.ultrasonic;
    }

    const updatedDevice = await this.deviceModel
      .findByIdAndUpdate(deviceId, { $set: updateData }, { new: true })
      .lean();

    if (!updatedDevice) {
      throw new NotFoundException('Device not found');
    }

    // Send command to ESP32 via MQTT with device ID in topic
    try {
      if (this.mqttService && updatedDevice) {
        const updatedDeviceId =
          (updatedDevice as any)._id?.toString() || deviceId;
        const deviceName = (updatedDevice as any).name || 'ESP32Controller';

        // Use device name as identifier (ESP32 can be configured with this)
        const deviceIdentifier = deviceName;

        if (command.motor !== undefined) {
          this.mqttService.publishMotor(deviceIdentifier, command.motor);
        }
        if (command.height !== undefined) {
          this.mqttService.publishHeight(deviceIdentifier, command.height);
        }
        if (command.timer !== undefined) {
          this.mqttService.publishTimer(deviceIdentifier, command.timer);
        }
        // Motor switching - publish to switch motor topic
        if (command.switchMotor !== undefined) {
          this.mqttService.publishMotorSwitch(
            deviceIdentifier,
            command.switchMotor ? '2' : '1'
          );
        }
        // Ultrasonic mode - publish to ultrasonic topic
        if (command.ultrasonic !== undefined) {
          this.mqttService.publishUltrasonic(
            deviceIdentifier,
            command.ultrasonic
          );
        }
      }
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to send MQTT command:', error);
    }

    // Emit real-time update via WebSocket
    if (this.devicesGateway) {
      this.devicesGateway.emitDeviceUpdate(updatedDevice as unknown as Device);
    }

    return { message: 'Command sent successfully', device: updatedDevice };
  }

  // Cron job: Check for offline devices every 30 seconds
  @Cron('*/30 * * * * *') // Every 30 seconds
  async checkDeviceStatus() {
    const now = new Date();
    const offlineThreshold = new Date(now.getTime() - 60000); // 1 minute ago

    // Find devices that haven't updated in the last minute
    const offlineDevices = await this.deviceModel
      .find({
        status: 'ONLINE',
        lastUpdated: { $lt: offlineThreshold }
      })
      .lean();

    for (const device of offlineDevices) {
      try {
        await this.deviceModel.findByIdAndUpdate(device._id, {
          $set: {
            status: 'OFFLINE' as DeviceStatus,
            lastUpdated: new Date()
          }
        });

        // Emit status change via WebSocket
        if (this.devicesGateway) {
          const deviceId = (device as any)._id.toString();
          this.devicesGateway.emitDeviceStatus({
            deviceId,
            status: 'OFFLINE'
          });
        }
      } catch (error) {
        this.logger.error(
          `Failed to mark device ${device._id} as offline`,
          error
        );
      }
    }
  }

  // Cron job: Save hourly energy consumption data
  @Cron('0 * * * *') // Every hour at minute 0
  async saveHourlyEnergyConsumption() {
    try {
      const devices = await this.deviceModel.find({ status: 'ONLINE' }).lean();

      for (const device of devices) {
        const deviceId = (device as any)._id.toString();
        const userIds = device.userIds || [];

        // Save consumption data for each user assigned to this device
        for (const userId of userIds) {
          if (this.reportsService) {
            await this.reportsService.saveHourlyConsumption(deviceId, userId, {
              energyUsed: device.totalElectricity ?? 0,
              waterUsed: device.totalLitres ?? 0,
              motorState: device.motorState ?? 'OFF',
              timerActive: device.timerActive ?? false
            });
          }
        }
      }

      this.logger.log(
        `Saved hourly energy consumption data for ${devices.length} devices`
      );
    } catch (error) {
      this.logger.error('Failed to save hourly energy consumption', error);
    }
  }

  // Cron job: Check timer every second
  @Cron(CronExpression.EVERY_SECOND)
  async checkTimers() {
    const now = new Date();
    const devicesWithExpiredTimers = await this.deviceModel
      .find({
        timerActive: true,
        timerEndTime: { $lte: now }
      })
      .lean();

    for (const device of devicesWithExpiredTimers) {
      try {
        // Update device: turn off timer and motor
        const updatedDevice = await this.deviceModel
          .findByIdAndUpdate(
            device._id,
            {
              $set: {
                timerActive: false,
                motorState: 'OFF',
                timerDuration: 0,
                timerEndTime: null,
                lastUpdated: new Date()
              }
            },
            { new: true }
          )
          .lean();

        // Send motor OFF command via MQTT
        if (this.mqttService) {
          const deviceName = (device as any).name || 'ESP32Controller';
          this.mqttService.publishMotor(deviceName, 'OFF');
          this.logger.log(
            `Timer expired for device ${device._id}, motor turned OFF`
          );
        }

        // Emit real-time update via WebSocket
        if (updatedDevice && this.devicesGateway) {
          this.devicesGateway.emitDeviceUpdate(
            updatedDevice as unknown as Device
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to process expired timer for device ${device._id}`,
          error
        );
      }
    }
  }
}
