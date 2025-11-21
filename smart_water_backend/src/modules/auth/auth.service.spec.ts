import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException, ForbiddenException, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { DevicesService } from '../devices/devices.service';
import { MqttService } from '../mqtt/mqtt.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let userModel: any;
  let jwtService: JwtService;

  const mockUserModel = {
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn(),
    }),
    create: jest.fn(),
    findById: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: DevicesService,
          useValue: {
            findUserDevices: jest.fn(),
          },
        },
        {
          provide: MqttService,
          useValue: {
            publishCommand: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userModel = module.get(getModelToken(User.name));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new user successfully', async () => {
      const registerDto: RegisterDto = {
        username: 'testuser',
        password: 'password123',
        role: 'USER',
      };

      mockUserModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      mockUserModel.create.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        role: 'USER',
      });

      const result = await service.register(registerDto, 'ADMIN');

      expect(result).toHaveProperty('message', 'User created successfully');
      expect(result).toHaveProperty('userId');
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ username: 'testuser' });
      expect(mockUserModel.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if username already exists', async () => {
      const registerDto: RegisterDto = {
        username: 'existinguser',
        password: 'password123',
        role: 'USER',
      };

      mockUserModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ username: 'existinguser' }),
      });

      await expect(service.register(registerDto, 'ADMIN')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ForbiddenException if requester is not ADMIN', async () => {
      const registerDto: RegisterDto = {
        username: 'testuser',
        password: 'password123',
        role: 'USER',
      };

      await expect(service.register(registerDto, 'USER')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('login', () => {
    it('should return token and user on successful login', async () => {
      const loginDto: LoginDto = {
        username: 'testuser',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        password: hashedPassword,
        role: 'USER',
        toObject: () => ({
          _id: '507f1f77bcf86cd799439011',
          username: 'testuser',
          role: 'USER',
        }),
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto: LoginDto = {
        username: 'nonexistent',
        password: 'password123',
      };

      mockUserModel.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const loginDto: LoginDto = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        password: hashedPassword,
        role: 'USER',
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        password: hashedPassword,
        role: 'USER',
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser('testuser', 'password123');

      expect(result).toBeDefined();
      expect(result?.username).toBe('testuser');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(
        service.validateUser('nonexistent', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        password: hashedPassword,
        role: 'USER',
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);

      await expect(
        service.validateUser('testuser', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

