import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  Inject,
  forwardRef
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { DevicesService } from '../devices/devices.service';
import { MqttService } from '../mqtt/mqtt.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
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
    const existing = await this.userModel
      .findOne({ username: dto.username })
      .lean();
    if (existing) {
      throw new ConflictException('Username already exists');
    }
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel.create({
      username: dto.username,
      password: hashed,
      role: dto.role ?? 'USER'
    });
    return {
      message: 'User created successfully',
      userId: user?._id?.toString()
    };
  }

  async validateUser(username: string, password: string) {
    if (!password) {
      throw new UnauthorizedException('Password is required');
    }
    const user = await this.userModel.findOne({ username });
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
    // Trim username to handle whitespace issues
    const trimmedUsername = dto.username.trim();
    
    // Find user by exact username match
    const user = await this.userModel.findOne({ 
      username: trimmedUsername
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
      sub: String(user._id),
      username: user.username,
      role: user.role
    };

    const userObj = user.toObject() as any;
    delete userObj.password;

    return {
      access_token: this.jwtService.sign(payload),
      user: userObj
    };
  }

  async registerClient(dto: RegisterDto) {
    const existing = await this.userModel
      .findOne({ username: dto.username })
      .lean();
    if (existing) {
      throw new ConflictException('Username already exists');
    }
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel.create({
      username: dto.username,
      password: hashed,
      role: 'USER'
    });

    return {
      message: 'User created successfully',
      userId: user._id as unknown as string
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .lean();
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    // Ensure language field exists (for existing users)
    if (!user.language) {
      await this.userModel.findByIdAndUpdate(userId, { language: 'uz' });
      user.language = 'uz';
    }
    return user;
  }

  async updateLanguage(userId: string, language: 'uz' | 'en' | 'ru') {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { language },
      { new: true }
    ).select('-password').lean();
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Send language to all user devices via MQTT
    if (this.devicesService && this.mqttService) {
      try {
        const userDevices = await this.devicesService.getUserDevices(userId);
        for (const device of userDevices) {
          const deviceId = (device as any)._id?.toString();
          const deviceName = (device as any).name || 'ESP32Controller';
          if (deviceId && deviceName) {
            this.mqttService.publishLanguage(deviceName, language);
          }
        }
      } catch (error) {
        // Log error but don't fail the request
        console.error('Failed to send language to devices:', error);
      }
    }

    return user;
  }
}
