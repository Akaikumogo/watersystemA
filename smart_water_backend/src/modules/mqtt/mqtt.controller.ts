import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards
} from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

class MotorCommandDto {
  state!: string;
  deviceId?: string; // Optional device ID, defaults to 'ESP32Controller' for backward compatibility
}

class TimerCommandDto {
  durationSeconds!: number;
  deviceId?: string; // Optional device ID, defaults to 'ESP32Controller' for backward compatibility
}

class HeightCommandDto {
  height!: number;
  deviceId?: string; // Optional device ID, defaults to 'ESP32Controller' for backward compatibility
}

@ApiTags('mqtt')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mqtt')
export class MqttController {
  constructor(private readonly mqttService: MqttService) {}

  @Roles('ADMIN')
  @Post('motor')
  sendMotorCommand(@Body() dto: MotorCommandDto) {
    const state = dto.state?.toUpperCase();
    if (state !== 'ON' && state !== 'OFF') {
      throw new BadRequestException('state must be ON or OFF');
    }
    const deviceId = dto.deviceId || 'ESP32Controller'; // Default for backward compatibility
    return this.mqttService.publishMotor(deviceId, state as 'ON' | 'OFF');
  }

  @Roles('ADMIN')
  @Post('timer')
  sendTimerCommand(@Body() dto: TimerCommandDto) {
    if (
      dto.durationSeconds === undefined ||
      dto.durationSeconds === null ||
      Number.isNaN(Number(dto.durationSeconds))
    ) {
      throw new BadRequestException('durationSeconds must be a number');
    }
    const deviceId = dto.deviceId || 'ESP32Controller'; // Default for backward compatibility
    return this.mqttService.publishTimer(deviceId, Number(dto.durationSeconds));
  }

  @Roles('ADMIN')
  @Post('height')
  sendHeightCommand(@Body() dto: HeightCommandDto) {
    if (
      dto.height === undefined ||
      dto.height === null ||
      Number.isNaN(Number(dto.height))
    ) {
      throw new BadRequestException('height must be a number');
    }
    const deviceId = dto.deviceId || 'ESP32Controller'; // Default for backward compatibility
    return this.mqttService.publishHeight(deviceId, Number(dto.height));
  }
}
