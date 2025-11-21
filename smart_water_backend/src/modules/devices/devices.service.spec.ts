import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException, forwardRef } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { Device } from './schemas/device.schema';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { MqttService } from '../mqtt/mqtt.service';
import { DevicesGateway } from './devices.gateway';
import { ReportsService } from '../reports/reports.service';

describe('DevicesService', () => {
  let service: DevicesService;
  let deviceModel: any;

  const mockDeviceModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockMqttService = {
    publishCommand: jest.fn(),
  };

  const mockDevicesGateway = {
    emitDeviceUpdate: jest.fn(),
    emitDeviceStatus: jest.fn(),
  };

  const mockReportsService = {
    generateDailyReport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        {
          provide: getModelToken(Device.name),
          useValue: mockDeviceModel,
        },
        {
          provide: MqttService,
          useValue: mockMqttService,
        },
        {
          provide: DevicesGateway,
          useValue: mockDevicesGateway,
        },
        {
          provide: ReportsService,
          useValue: mockReportsService,
        },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
    deviceModel = module.get(getModelToken(Device.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of devices', async () => {
      const mockDevices = [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Device 1',
          location: 'Location 1',
          status: 'ONLINE',
        },
        {
          _id: '507f1f77bcf86cd799439012',
          name: 'Device 2',
          location: 'Location 2',
          status: 'OFFLINE',
        },
      ];

      mockDeviceModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockDevices),
      });

      const result = await service.findAll();

      expect(result).toEqual(mockDevices);
      expect(mockDeviceModel.find).toHaveBeenCalled();
    });
  });

  describe('getPublicStats', () => {
    it('should return public statistics', async () => {
      mockDeviceModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { status: 'ONLINE', totalLitres: 100, totalElectricity: 50 },
          { status: 'ONLINE', totalLitres: 200, totalElectricity: 100 },
          { status: 'OFFLINE', totalLitres: 50, totalElectricity: 25 },
        ]),
      });

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
        _id: '507f1f77bcf86cd799439011',
        name: 'Device 1',
        location: 'Location 1',
        status: 'ONLINE',
        toObject: () => ({
          _id: '507f1f77bcf86cd799439011',
          name: 'Device 1',
          location: 'Location 1',
          status: 'ONLINE',
        }),
      };

      mockDeviceModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockDevice),
      });

      const result = await service.findOne('507f1f77bcf86cd799439011');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Device 1');
    });

    it('should throw NotFoundException if device not found', async () => {
      mockDeviceModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne('507f1f77bcf86cd799439011')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new device', async () => {
      const createDeviceDto: CreateDeviceDto = {
        name: 'New Device',
        location: 'New Location',
      };

      const mockDevice = {
        _id: '507f1f77bcf86cd799439011',
        ...createDeviceDto,
        status: 'OFFLINE',
        toObject: () => ({
          _id: '507f1f77bcf86cd799439011',
          ...createDeviceDto,
          status: 'OFFLINE',
        }),
      };

      mockDeviceModel.findOne.mockResolvedValue(null);
      mockDeviceModel.create.mockResolvedValue(mockDevice);

      const result = await service.create(createDeviceDto);

      expect(result).toBeDefined();
      expect(result.device.name).toBe('New Device');
      expect(mockDeviceModel.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a device', async () => {
      const updateDeviceDto: UpdateDeviceDto = {
        name: 'Updated Device',
      };

      const mockDevice = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Updated Device',
        location: 'Location 1',
        toObject: () => ({
          _id: '507f1f77bcf86cd799439011',
          name: 'Updated Device',
          location: 'Location 1',
        }),
      };

      mockDeviceModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockDevice),
      });
      mockDeviceModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockDevice),
      });

      const result = await service.update('507f1f77bcf86cd799439011', updateDeviceDto);

      expect(result).toBeDefined();
      expect(result.device.name).toBe('Updated Device');
    });

    it('should throw NotFoundException if device not found', async () => {
      mockDeviceModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      mockDeviceModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update('507f1f77bcf86cd799439011', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a device', async () => {
      const mockDevice = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Device 1',
      };

      mockDeviceModel.findByIdAndDelete.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockDevice),
      });

      const result = await service.remove('507f1f77bcf86cd799439011');

      expect(result).toHaveProperty('message', 'Device deleted successfully');
      expect(mockDeviceModel.findByIdAndDelete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if device not found', async () => {
      mockDeviceModel.findByIdAndDelete.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('507f1f77bcf86cd799439011')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

