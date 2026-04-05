import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from './schemas/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { DevicesService } from '../devices/devices.service';
import { MqttService } from '../mqtt/mqtt.service';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: any;
  let jwtService: JwtService;

  const mockUserRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((x) => x),
    update: jest.fn()
  };

  const mockJwtService = {
    sign: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo
        },
        {
          provide: JwtService,
          useValue: mockJwtService
        },
        {
          provide: DevicesService,
          useValue: {
            getUserDevices: jest.fn()
          }
        },
        {
          provide: MqttService,
          useValue: {
            publishLanguage: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(User));
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
        role: 'USER'
      };

      mockUserRepo.findOne.mockResolvedValue(null);
      mockUserRepo.save.mockResolvedValue({
        id: '507f1f77-bc86-4cd7-9943-901100000000',
        username: 'testuser',
        role: 'USER'
      });

      const result = await service.register(registerDto, 'ADMIN');

      expect(result).toHaveProperty('message', 'User created successfully');
      expect(result).toHaveProperty('userId');
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({ where: { username: 'testuser' } });
      expect(mockUserRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if username already exists', async () => {
      const registerDto: RegisterDto = {
        username: 'existinguser',
        password: 'password123',
        role: 'USER'
      };

      mockUserRepo.findOne.mockResolvedValue({ username: 'existinguser' });

      await expect(service.register(registerDto, 'ADMIN')).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException if requester is not ADMIN', async () => {
      const registerDto: RegisterDto = {
        username: 'testuser',
        password: 'password123',
        role: 'USER'
      };

      await expect(service.register(registerDto, 'USER')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('login', () => {
    it('should return token and user on successful login', async () => {
      const loginDto: LoginDto = {
        username: 'testuser',
        password: 'password123'
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: '507f1f77-bc86-4cd7-9943-901100000000',
        username: 'testuser',
        password: hashedPassword,
        role: 'USER' as const
      };

      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto: LoginDto = {
        username: 'nonexistent',
        password: 'password123'
      };

      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const loginDto: LoginDto = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: '507f1f77-bc86-4cd7-9943-901100000000',
        username: 'testuser',
        password: hashedPassword,
        role: 'USER' as const
      };

      mockUserRepo.findOne.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: '507f1f77-bc86-4cd7-9943-901100000000',
        username: 'testuser',
        password: hashedPassword,
        role: 'USER' as const
      };

      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser('testuser', 'password123');

      expect(result).toBeDefined();
      expect(result?.username).toBe('testuser');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.validateUser('nonexistent', 'password123')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: '507f1f77-bc86-4cd7-9943-901100000000',
        username: 'testuser',
        password: hashedPassword,
        role: 'USER' as const
      };

      mockUserRepo.findOne.mockResolvedValue(mockUser);

      await expect(service.validateUser('testuser', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
