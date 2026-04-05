import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { Device } from './schemas/device.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { MqttService } from '../mqtt/mqtt.service';
import { DevicesGateway } from './devices.gateway';
import { ReportsService } from '../reports/reports.service';
import { PushService } from '../push/push.service';

describe('DevicesService', () => {
  let service: DevicesService;
  let deviceRepo: any;

  const mockDeviceRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((x) => x),
    delete: jest.fn(),
    createQueryBuilder: jest.fn()
  };

  const mockMqttService = {
    publishCommand: jest.fn()
  };

  const mockDevicesGateway = {
    emitDeviceUpdate: jest.fn(),
    emitDeviceStatus: jest.fn()
  };

  const mockReportsService = {
    saveHourlyConsumption: jest.fn()
  };

  const mockPushService = {
    sendToUsers: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        {
          provide: getRepositoryToken(Device),
          useValue: mockDeviceRepo
        },
        {
          provide: MqttService,
          useValue: mockMqttService
        },
        {
          provide: DevicesGateway,
          useValue: mockDevicesGateway
        },
        {
          provide: ReportsService,
          useValue: mockReportsService
        },
        {
          provide: PushService,
          useValue: mockPushService
        }
      ]
    }).compile();

    service = module.get<DevicesService>(DevicesService);
    deviceRepo = module.get(getRepositoryToken(Device));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of devices', async () => {
      const mockDevices = [
        {
          id: '507f1f77-bc86-4cd7-9943-901100000001',
          name: 'Device 1',
          location: 'Location 1',
          status: 'ONLINE',
          userIds: []
        },
        {
          id: '507f1f77-bc86-4cd7-9943-901100000002',
          name: 'Device 2',
          location: 'Location 2',
          status: 'OFFLINE',
          userIds: []
        }
      ];

      mockDeviceRepo.find.mockResolvedValue(mockDevices);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('_id', mockDevices[0].id);
      expect(mockDeviceRepo.find).toHaveBeenCalled();
    });
  });

  describe('getPublicStats', () => {
    it('should return public statistics', async () => {
      mockDeviceRepo.find.mockResolvedValue([
        { status: 'ONLINE', totalLitres: 100, totalElectricity: 50 },
        { status: 'ONLINE', totalLitres: 200, totalElectricity: 100 },
        { status: 'OFFLINE', totalLitres: 50, totalElectricity: 25 }
      ]);

      const result = await service.getPublicStats();

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('online');
      expect(result).toHaveProperty('offline');
      expect(result).toHaveProperty('totalWater');
      expect(result).toHaveProperty('totalEnergy');
    });
  });

  describe('findOne', () => {
    it('should return a device by id', async () => {
      const mockDevice = {
        id: '507f1f77-bc86-4cd7-9943-901100000011',
        name: 'Device 1',
        location: 'Location 1',
        status: 'ONLINE',
        userIds: []
      };

      mockDeviceRepo.findOne.mockResolvedValue(mockDevice);

      const result = await service.findOne('507f1f77-bc86-4cd7-9943-901100000011');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Device 1');
      expect(result).toHaveProperty('_id', mockDevice.id);
    });

    it('should throw NotFoundException if device not found', async () => {
      mockDeviceRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('507f1f77-bc86-4cd7-9943-901100000011')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('create', () => {
    it('should create a new device', async () => {
      const createDeviceDto: CreateDeviceDto = {
        name: 'New Device',
        location: 'New Location'
      };

      const saved = {
        id: '507f1f77-bc86-4cd7-9943-901100000011',
        ...createDeviceDto,
        status: 'OFFLINE',
        userIds: []
      };

      mockDeviceRepo.save.mockResolvedValue(saved);

      const result = await service.create(createDeviceDto);

      expect(result).toBeDefined();
      expect(result.device.name).toBe('New Device');
      expect(mockDeviceRepo.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a device', async () => {
      const updateDeviceDto: UpdateDeviceDto = {
        name: 'Updated Device'
      };

      const existing = {
        id: '507f1f77-bc86-4cd7-9943-901100000011',
        name: 'Device 1',
        location: 'Location 1',
        userIds: []
      };

      mockDeviceRepo.findOne.mockResolvedValue({ ...existing });
      mockDeviceRepo.save.mockImplementation((d) => Promise.resolve(d));

      const result = await service.update('507f1f77-bc86-4cd7-9943-901100000011', updateDeviceDto);

      expect(result).toBeDefined();
      expect(result.device.name).toBe('Updated Device');
    });

    it('should throw NotFoundException if device not found', async () => {
      mockDeviceRepo.findOne.mockResolvedValue(null);

      await expect(service.update('507f1f77-bc86-4cd7-9943-901100000011', {})).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('remove', () => {
    it('should delete a device', async () => {
      mockDeviceRepo.delete.mockResolvedValue({ affected: 1 });

      const result = await service.remove('507f1f77-bc86-4cd7-9943-901100000011');

      expect(result).toHaveProperty('message', 'Device deleted successfully');
      expect(mockDeviceRepo.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if device not found', async () => {
      mockDeviceRepo.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove('507f1f77-bc86-4cd7-9943-901100000011')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
