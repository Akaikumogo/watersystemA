import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  Inject,
  forwardRef
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './schemas/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { DevicesService } from '../devices/devices.service';
import { MqttService } from '../mqtt/mqtt.service';
import { toApiDoc } from '../../common/utils/mongo-compat';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => DevicesService))
    private readonly devicesService?: DevicesService,
    @Inject(forwardRef(() => MqttService))
    private readonly mqttService?: MqttService
  ) {}

  async register(dto: RegisterDto, requesterRole: 'ADMIN' | 'USER') {
    if (requesterRole !== 'ADMIN') {
      throw new ForbiddenException('Only admin can create users');
    }
    const existing = await this.userRepo.findOne({
      where: { username: dto.username }
    });
    if (existing) {
      throw new ConflictException('Username already exists');
    }
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepo.save(
      this.userRepo.create({
        username: dto.username,
        password: hashed,
        role: dto.role ?? 'USER'
      })
    );
    return {
      message: 'User created successfully',
      userId: user.id
    };
  }

  async validateUser(username: string, password: string) {
    if (!password) {
      throw new UnauthorizedException('Password is required');
    }
    const user = await this.userRepo.findOne({ where: { username } });
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async login(dto: LoginDto) {
    const trimmedUsername = dto.username.trim();

    const user = await this.userRepo.findOne({
      where: { username: trimmedUsername }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: String(user.id),
      username: user.username,
      role: user.role
    };

    const { password: _p, ...rest } = user;
    return {
      access_token: this.jwtService.sign(payload),
      user: toApiDoc(rest as unknown as Record<string, unknown>)
    };
  }

  async registerClient(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({
      where: { username: dto.username }
    });
    if (existing) {
      throw new ConflictException('Username already exists');
    }
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepo.save(
      this.userRepo.create({
        username: dto.username,
        password: hashed,
        role: 'USER'
      })
    );

    return {
      message: 'User created successfully',
      userId: user.id
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'username', 'role', 'language', 'createdAt', 'updatedAt']
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.language) {
      await this.userRepo.update({ id: userId }, { language: 'uz' });
      user.language = 'uz';
    }
    return toApiDoc(user as unknown as Record<string, unknown>);
  }

  async updateLanguage(userId: string, language: 'uz' | 'en' | 'ru') {
    await this.userRepo.update({ id: userId }, { language });
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'username', 'role', 'language', 'createdAt', 'updatedAt']
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (this.devicesService && this.mqttService) {
      try {
        const userDevices = await this.devicesService.getUserDevices(userId);
        for (const device of userDevices) {
          const deviceId = (device as { id?: string }).id;
          const deviceName = (device as { name?: string }).name || 'ESP32Controller';
          if (deviceId && deviceName) {
            this.mqttService.publishLanguage(deviceName, language);
          }
        }
      } catch (error) {
        console.error('Failed to send language to devices:', error);
      }
    }

    return toApiDoc(user as unknown as Record<string, unknown>);
  }
}
