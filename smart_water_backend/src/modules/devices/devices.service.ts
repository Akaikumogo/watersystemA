import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Device, DeviceStatus } from './schemas/device.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceCommandDto } from './dto/device-command.dto';
import { MqttService } from '../mqtt/mqtt.service';
import { DevicesGateway } from './devices.gateway';
import { ReportsService } from '../reports/reports.service';
import { PushService } from '../push/push.service';
import { toApiDoc } from '../../common/utils/mongo-compat';

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
  motorBy?: string;
  ultrasonicMode?: boolean;
  activeMotor2?: boolean;
};

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectRepository(Device) private readonly deviceRepo: Repository<Device>,
    @Inject(forwardRef(() => MqttService))
    private readonly mqttService?: MqttService,
    @Inject(forwardRef(() => DevicesGateway))
    private readonly devicesGateway?: DevicesGateway,
    @Inject(forwardRef(() => ReportsService))
    private readonly reportsService?: ReportsService,
    private readonly pushService?: PushService
  ) {}

  private leanDevice(d: Device) {
    return toApiDoc(JSON.parse(JSON.stringify(d)) as Record<string, unknown>);
  }

  private normalizeMotorState(state: unknown): 'ON' | 'OFF' | string {
    const s = String(state ?? '')
      .trim()
      .toUpperCase();
    if (s === 'ON') return 'ON';
    if (s === 'OFF') return 'OFF';
    return s || 'OFF';
  }

  private motorTitleAndBody(input: {
    deviceName: string;
    mode: 'manual' | 'sensor' | 'generic';
    state: 'ON' | 'OFF';
  }) {
    if (input.mode === 'manual') {
      return {
        title: 'Manual rejim',
        body: `${input.deviceName}: motor ${input.state === 'ON' ? 'yoqildi' : "o'chirildi"}`
      };
    }
    if (input.mode === 'sensor') {
      return {
        title: 'Sensor',
        body: `${input.deviceName}: motor ${input.state === 'ON' ? 'yoqildi' : "o'chirildi"}`
      };
    }
    return {
      title: input.state === 'ON' ? 'Motor yoqildi' : "Motor o'chirildi",
      body: `${input.deviceName}: motor ${input.state}`
    };
  }

  async findAll() {
    const list = await this.deviceRepo.find({ order: { name: 'ASC' } });
    return list.map((d) => this.leanDevice(d));
  }

  async getPublicStats() {
    const devices = await this.deviceRepo.find();
    const total = devices.length;
    const online = devices.filter((d) => d.status === 'ONLINE').length;
    const offline = devices.filter((d) => d.status === 'OFFLINE').length;
    const totalWater = devices.reduce((sum, d) => sum + (d.totalLitres || 0), 0);
    const totalEnergy = devices.reduce((sum, d) => sum + (d.totalElectricity || 0), 0);

    return {
      total,
      online,
      offline,
      totalWater: Math.round(totalWater),
      totalEnergy: Math.round(totalEnergy * 100) / 100
    };
  }

  async findOne(id: string) {
    const device = await this.deviceRepo.findOne({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');
    return this.leanDevice(device);
  }

  async getDeviceByName(name: string) {
    const device = await this.deviceRepo.findOne({ where: { name } });
    return device ? this.leanDevice(device) : null;
  }

  async create(dto: CreateDeviceDto, createdByUserId?: string) {
    const initialUserIds = dto.userIds ?? [];
    const userIds = createdByUserId
      ? Array.from(new Set([...initialUserIds, createdByUserId]))
      : initialUserIds;

    const device = await this.deviceRepo.save(
      this.deviceRepo.create({
        name: dto.name,
        location: dto.location ?? 'Unknown',
        status: dto.status ?? 'OFFLINE',
        powerUsage: dto.powerUsage ?? 0,
        userIds,
        lastUpdated: new Date()
      })
    );
    return { message: 'Device created successfully', device: this.leanDevice(device) };
  }

  async update(id: string, dto: UpdateDeviceDto) {
    const device = await this.deviceRepo.findOne({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');

    Object.assign(device, { ...dto, lastUpdated: new Date() });
    if (dto.userIds !== undefined) {
      device.userIds = dto.userIds;
    }
    const saved = await this.deviceRepo.save(device);
    return { message: 'Device updated successfully', device: this.leanDevice(saved) };
  }

  async remove(id: string) {
    const res = await this.deviceRepo.delete({ id });
    if (!res.affected) throw new NotFoundException('Device not found');
    return { message: 'Device deleted successfully' };
  }

  async upsertSensorSnapshot(snapshot: SensorSnapshot) {
    if (!snapshot.deviceName) {
      this.logger.warn('Sensor snapshot missing deviceName, skipping');
      return;
    }

    const name = snapshot.deviceName;
    const now = new Date();
    const prev = await this.deviceRepo.findOne({ where: { name } });

    const update: Partial<Device> = {
      name,
      location: snapshot.location ?? 'Remote node',
      status: 'ONLINE',
      lastUpdated: now,
      waterDepth: snapshot.waterDepth ?? 0,
      height: snapshot.height ?? 0,
      totalLitres: snapshot.totalLitres ?? 0,
      totalElectricity: snapshot.totalElectricity ?? 0,
      motorState: snapshot.motorState ?? 'OFF',
      timerActive: snapshot.timerActive ?? false,
      timerDuration:
        snapshot.timerActive && snapshot.timerDuration ? snapshot.timerDuration : 0,
      motorOnline: snapshot.motorOnline ?? false
    };

    if (snapshot.ultrasonicMode !== undefined) {
      update.ultrasonic = Boolean(snapshot.ultrasonicMode);
    }
    if (snapshot.activeMotor2 !== undefined) {
      update.activeMotor2 = Boolean(snapshot.activeMotor2);
    }

    let device: Device;
    if (!prev) {
      device = this.deviceRepo.create({
        ...update,
        powerUsage: 0,
        motorFault: false,
        ultrasonic: update.ultrasonic ?? true,
        activeMotor2: update.activeMotor2 ?? false,
        userIds: [],
        timerEndTime: null
      } as Device);
    } else {
      Object.assign(prev, Object.fromEntries(Object.entries(update).filter(([, v]) => v !== undefined)));
      device = prev;
    }

    device = await this.deviceRepo.save(device);

    try {
      const prevMotor = this.normalizeMotorState(prev?.motorState);
      const nextMotor = this.normalizeMotorState(device.motorState);
      const userIds = (device.userIds ?? []).map(String);
      const deviceId = device.id;
      const deviceName = String(device.name ?? name);
      const ultrasonic = Boolean(device.ultrasonic);
      const motorBy = String(snapshot.motorBy ?? '').toUpperCase();

      if (this.pushService && prev && userIds.length && deviceId) {
        if (!ultrasonic && (motorBy === 'MANUAL_ON' || motorBy === 'MANUAL_OFF')) {
          if (prevMotor !== nextMotor && (nextMotor === 'ON' || nextMotor === 'OFF')) {
            const msg = this.motorTitleAndBody({
              deviceName,
              mode: 'manual',
              state: nextMotor as 'ON' | 'OFF'
            });
            await this.pushService.sendToUsers({
              userIds,
              title: msg.title,
              body: msg.body,
              data: {
                deviceId,
                eventType: nextMotor === 'ON' ? 'MANUAL_MOTOR_ON' : 'MANUAL_MOTOR_OFF'
              }
            });
          }
        }

        if (ultrasonic && (motorBy === 'AUTO_LEVEL' || motorBy === 'AUTO_LEVEL_OFF')) {
          if (prevMotor !== nextMotor && (nextMotor === 'ON' || nextMotor === 'OFF')) {
            const msg = this.motorTitleAndBody({
              deviceName,
              mode: 'sensor',
              state: nextMotor as 'ON' | 'OFF'
            });
            await this.pushService.sendToUsers({
              userIds,
              title: msg.title,
              body: msg.body,
              data: {
                deviceId,
                eventType: nextMotor === 'ON' ? 'SENSOR_MOTOR_ON' : 'SENSOR_MOTOR_OFF'
              }
            });
          }
        }

        if (motorBy === 'TIMER_START') {
          const prevTimer = Boolean(prev?.timerActive);
          const nextTimer = Boolean(device.timerActive);
          if (!prevTimer && nextTimer) {
            await this.pushService.sendToUsers({
              userIds,
              title: "Timer o'rnatildi",
              body: `${deviceName}: motor yoqildi`,
              data: { deviceId, eventType: 'TIMER_SET' }
            });
          }
        }

        if (snapshot.activeMotor2 !== undefined && prev) {
          const prevActive = Boolean(prev.activeMotor2);
          const nextActive = Boolean(device.activeMotor2);
          if (prevActive !== nextActive) {
            await this.pushService.sendToUsers({
              userIds,
              title: 'Motor almashtirildi',
              body: `${deviceName}: aktiv motor ${nextActive ? '2' : '1'}`,
              data: { deviceId, eventType: 'MOTOR_SWITCH', activeMotor: nextActive ? '2' : '1' }
            });
          }
        }
      }
    } catch (e) {
      this.logger.warn(
        `Push send failed (upsertSensorSnapshot): ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }

    if (device && this.mqttService && snapshot.deviceName) {
      const deviceName = device.name;
      const isBootEvent = snapshot.motorBy === 'BOOT';

      if (isBootEvent) {
        this.logger.log(`BOOT event detected. Sending device settings to ESP32: ${deviceName}`);
        this.mqttService.publishDeviceSettings(deviceName, {
          height: device.height ?? 0,
          activeMotor2: device.activeMotor2 ?? false,
          ultrasonic: device.ultrasonic ?? true
        });
        this.logger.log(
          `Settings sent: height=${device.height ?? 0}, activeMotor2=${
            device.activeMotor2 ?? false
          }, ultrasonic=${device.ultrasonic ?? true}`
        );
      }
    }

    if (device && this.devicesGateway) {
      this.devicesGateway.emitDeviceUpdate(device);
      this.devicesGateway.emitDeviceStatus({
        deviceId: device.id,
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
    const name = deviceName || (data as { deviceName?: string }).deviceName || 'ESP32Controller';
    const normalized = data.status?.toLowerCase();
    const deviceStatus: DeviceStatus = normalized === 'offline' ? 'OFFLINE' : 'ONLINE';

    const existing = await this.deviceRepo.findOne({ where: { name } });

    const updateFields: Partial<Device> = {
      status: deviceStatus,
      lastUpdated: new Date()
    };

    if (data.waterDepth !== undefined) updateFields.waterDepth = data.waterDepth;
    if (data.totalLitres !== undefined) updateFields.totalLitres = data.totalLitres;
    if (data.totalElectricity !== undefined) updateFields.totalElectricity = data.totalElectricity;
    if (data.ultrasonicMode !== undefined) updateFields.ultrasonic = data.ultrasonicMode;
    if (data.activeMotor2 !== undefined) updateFields.activeMotor2 = data.activeMotor2;
    if (data.height !== undefined) updateFields.height = data.height;
    if (data.motorState !== undefined) updateFields.motorState = data.motorState;

    let device: Device;
    if (!existing) {
      device = this.deviceRepo.create({
        name,
        location: 'Unknown',
        userIds: [],
        timerEndTime: null,
        ...updateFields
      } as Device);
    } else {
      Object.assign(existing, updateFields);
      device = existing;
    }

    device = await this.deviceRepo.save(device);

    if (device && this.devicesGateway) {
      const deviceId = device.id;
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
        this.devicesGateway.emitDeviceUpdate(device);
      }
    }

    this.logger.debug(`Updated status for device: ${name} -> ${deviceStatus}`);
  }

  async assignUsers(deviceId: string, userIds: string[], requestingUserId?: string) {
    const device = await this.deviceRepo.findOne({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const assigned = device.userIds ?? [];
    if (requestingUserId && !assigned.includes(requestingUserId)) {
      throw new NotFoundException('Device not found or access denied');
    }

    device.userIds = [...new Set([...assigned, ...userIds])];
    await this.deviceRepo.save(device);
    return { message: 'Users assigned successfully', device: this.leanDevice(device) };
  }

  async unassignUsers(deviceId: string, userIds: string[]) {
    const device = await this.deviceRepo.findOne({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    const assigned = device.userIds ?? [];
    device.userIds = assigned.filter((id) => !userIds.includes(id));
    await this.deviceRepo.save(device);
    return { message: 'Users unassigned successfully', device: this.leanDevice(device) };
  }

  async getUserDevices(userId: string) {
    const list = await this.deviceRepo
      .createQueryBuilder('d')
      .where(':uid = ANY(d.userIds)', { uid: userId })
      .getMany();
    return list.map((d) => this.leanDevice(d));
  }

  async sendCommand(deviceId: string, command: DeviceCommandDto, requestingUserId?: string) {
    const device = await this.deviceRepo.findOne({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const assigned = device.userIds ?? [];
    if (requestingUserId && !assigned.includes(requestingUserId)) {
      throw new ForbiddenException('Access denied to this device');
    }

    const updateData: Partial<Device> = {
      lastUpdated: new Date()
    };

    if (command.motor !== undefined) {
      updateData.motorState = command.motor;
      if (command.motor === 'OFF') {
        updateData.timerActive = false;
      }
    }

    if (command.height !== undefined) {
      updateData.height = command.height;
    }

    if (command.timer !== undefined) {
      const timerSeconds = command.timer;
      updateData.timerActive = true;
      updateData.timerDuration = timerSeconds;
      updateData.timerEndTime = new Date(Date.now() + timerSeconds * 1000);
      updateData.motorState = 'ON';
    }

    if (command.switchMotor !== undefined) {
      updateData.activeMotor2 = command.switchMotor;
    }

    if (command.ultrasonic !== undefined) {
      updateData.ultrasonic = command.ultrasonic;
    }

    const prevMotorForPush = this.normalizeMotorState(device.motorState);
    const prevActiveMotor2 = Boolean(device.activeMotor2);

    Object.assign(device, updateData);
    const updatedDevice = await this.deviceRepo.save(device);

    try {
      const userIds = (updatedDevice.userIds ?? []).map(String);
      const deviceIdStr = updatedDevice.id;
      const deviceName = String(updatedDevice.name ?? 'Device');
      const ultrasonic = Boolean(updatedDevice.ultrasonic);
      if (this.pushService && userIds.length && deviceIdStr) {
        if (command.motor !== undefined && !ultrasonic) {
          const nextMotor = this.normalizeMotorState(command.motor);
          if (prevMotorForPush !== nextMotor && (nextMotor === 'ON' || nextMotor === 'OFF')) {
            const msg = this.motorTitleAndBody({
              deviceName,
              mode: 'manual',
              state: nextMotor as 'ON' | 'OFF'
            });
            await this.pushService.sendToUsers({
              userIds,
              title: msg.title,
              body: msg.body,
              data: {
                deviceId: deviceIdStr,
                eventType: nextMotor === 'ON' ? 'MANUAL_MOTOR_ON' : 'MANUAL_MOTOR_OFF'
              }
            });
          }
        }

        if (command.timer !== undefined) {
          await this.pushService.sendToUsers({
            userIds,
            title: "Timer o'rnatildi",
            body: `${deviceName}: ${Number(command.timer)} s, motor yoqildi`,
            data: { deviceId: deviceIdStr, eventType: 'TIMER_SET' }
          });
        }

        if (command.switchMotor !== undefined) {
          const nextActive = Boolean(command.switchMotor);
          if (prevActiveMotor2 !== nextActive) {
            await this.pushService.sendToUsers({
              userIds,
              title: 'Motor almashtirildi',
              body: `${deviceName}: aktiv motor ${nextActive ? '2' : '1'}`,
              data: {
                deviceId: deviceIdStr,
                eventType: 'MOTOR_SWITCH',
                activeMotor: nextActive ? '2' : '1'
              }
            });
          }
        }
      }
    } catch (e) {
      this.logger.warn(
        `Push send failed (sendCommand): ${e instanceof Error ? e.message : String(e)}`
      );
    }

    try {
      if (this.mqttService && updatedDevice) {
        const deviceIdentifier = updatedDevice.name || 'ESP32Controller';

        if (command.motor !== undefined) {
          this.mqttService.publishMotor(deviceIdentifier, command.motor);
        }
        if (command.height !== undefined) {
          this.mqttService.publishHeight(deviceIdentifier, command.height);
        }
        if (command.timer !== undefined) {
          this.mqttService.publishTimer(deviceIdentifier, command.timer);
        }
        if (command.switchMotor !== undefined) {
          this.mqttService.publishMotorSwitch(deviceIdentifier, command.switchMotor ? '2' : '1');
        }
        if (command.ultrasonic !== undefined) {
          this.mqttService.publishUltrasonic(deviceIdentifier, command.ultrasonic);
        }
      }
    } catch (error) {
      console.error('Failed to send MQTT command:', error);
    }

    if (this.devicesGateway) {
      this.devicesGateway.emitDeviceUpdate(updatedDevice);
    }

    return {
      message: 'Command sent successfully',
      device: this.leanDevice(updatedDevice)
    };
  }

  @Cron('*/30 * * * * *')
  async checkDeviceStatus() {
    const now = new Date();
    const offlineThreshold = new Date(now.getTime() - 60000);

    const offlineDevices = await this.deviceRepo.find({
      where: {
        status: 'ONLINE',
        lastUpdated: LessThan(offlineThreshold)
      }
    });

    for (const device of offlineDevices) {
      try {
        device.status = 'OFFLINE';
        device.lastUpdated = new Date();
        await this.deviceRepo.save(device);

        if (this.devicesGateway) {
          this.devicesGateway.emitDeviceStatus({
            deviceId: device.id,
            status: 'OFFLINE'
          });
        }
      } catch (error) {
        this.logger.error(`Failed to mark device ${device.id} as offline`, error);
      }
    }
  }

  @Cron('0 * * * *')
  async saveHourlyEnergyConsumption() {
    try {
      const devices = await this.deviceRepo.find({ where: { status: 'ONLINE' } });

      for (const device of devices) {
        const dId = device.id;
        const userIds = device.userIds || [];

        for (const userId of userIds) {
          if (this.reportsService) {
            await this.reportsService.saveHourlyConsumption(dId, userId, {
              energyUsed: device.totalElectricity ?? 0,
              waterUsed: device.totalLitres ?? 0,
              motorState: device.motorState ?? 'OFF',
              timerActive: device.timerActive ?? false
            });
          }
        }
      }

      this.logger.log(`Saved hourly energy consumption data for ${devices.length} devices`);
    } catch (error) {
      this.logger.error('Failed to save hourly energy consumption', error);
    }
  }

  @Cron(CronExpression.EVERY_SECOND)
  async checkTimers() {
    const now = new Date();
    const devicesWithExpiredTimers = await this.deviceRepo.find({
      where: {
        timerActive: true,
        timerEndTime: LessThanOrEqual(now)
      }
    });

    for (const dev of devicesWithExpiredTimers) {
      try {
        dev.timerActive = false;
        dev.motorState = 'OFF';
        dev.timerDuration = 0;
        dev.timerEndTime = null;
        dev.lastUpdated = new Date();
        const updatedDevice = await this.deviceRepo.save(dev);

        if (this.mqttService) {
          const deviceName = dev.name || 'ESP32Controller';
          this.mqttService.publishMotor(deviceName, 'OFF');
          this.logger.log(`Timer expired for device ${dev.id}, motor turned OFF`);
        }

        if (updatedDevice && this.devicesGateway) {
          this.devicesGateway.emitDeviceUpdate(updatedDevice);
        }

        try {
          const userIds = (updatedDevice.userIds ?? []).map(String);
          const deviceId = updatedDevice.id;
          const deviceName = String(updatedDevice.name ?? 'Device');
          if (this.pushService && userIds.length && deviceId) {
            await this.pushService.sendToUsers({
              userIds,
              title: 'Timer tugadi',
              body: `${deviceName}: motor o'chirildi`,
              data: { deviceId, eventType: 'TIMER_END' }
            });
          }
        } catch (e) {
          this.logger.warn(
            `Push send failed (checkTimers): ${e instanceof Error ? e.message : String(e)}`
          );
        }
      } catch (error) {
        this.logger.error(`Failed to process expired timer for device ${dev.id}`, error);
      }
    }
  }
}
