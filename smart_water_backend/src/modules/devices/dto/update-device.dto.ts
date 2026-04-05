import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsUUID,
  IsBoolean,
  Min
} from 'class-validator';
import { DeviceStatus } from '../schemas/device.entity';

export class UpdateDeviceDto {
  @ApiPropertyOptional({
    description: 'Name of the device',
    example: 'ESP32Controller_Updated',
    minLength: 1,
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Location of the device',
    example: 'Building B, Floor 3'
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    enum: ['ONLINE', 'OFFLINE'],
    description: 'Status of the device',
    example: 'ONLINE'
  })
  @IsOptional()
  @IsEnum(['ONLINE', 'OFFLINE'])
  status?: DeviceStatus;

  @ApiPropertyOptional({
    description: 'Power usage in watts',
    example: 150.5,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  powerUsage?: number;

  @ApiPropertyOptional({
    description: 'Water depth in centimeters',
    example: 45.2,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  waterDepth?: number;

  @ApiPropertyOptional({
    description: 'Height in centimeters',
    example: 200.0,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;

  @ApiPropertyOptional({
    description: 'Total litres of water',
    example: 5000.75,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalLitres?: number;

  @ApiPropertyOptional({
    description: 'Total electricity consumption in kWh',
    example: 1250.5,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalElectricity?: number;

  @ApiPropertyOptional({
    description: 'Motor state',
    example: 'ON',
    enum: ['ON', 'OFF']
  })
  @IsOptional()
  @IsString()
  motorState?: string;

  @ApiPropertyOptional({
    description: 'Timer active status',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  timerActive?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of user IDs (UUID) assigned to this device',
    example: [
      'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
    ],
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  userIds?: string[];

  @ApiPropertyOptional({
    description: 'Ultrasonic auto mode (true = auto, false = manual)',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  ultrasonic?: boolean;

  @ApiPropertyOptional({
    description: 'Motor online/offline status',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  motorOnline?: boolean;
}
