import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max
} from 'class-validator';

export class DeviceCommandDto {
  @ApiPropertyOptional({
    description: 'Motor command',
    enum: ['ON', 'OFF'],
    example: 'ON'
  })
  @IsOptional()
  @IsEnum(['ON', 'OFF'])
  motor?: 'ON' | 'OFF';

  @ApiPropertyOptional({
    description: 'Set height in centimeters',
    example: 200,
    minimum: 0,
    maximum: 1000
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  height?: number;

  @ApiPropertyOptional({
    description: 'Set timer duration in seconds',
    example: 300,
    minimum: 1,
    maximum: 86400
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(86400)
  timer?: number;

  @ApiPropertyOptional({
    description: 'Switch to motor 2 (true) or motor 1 (false)',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  switchMotor?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable ultrasonic auto mode',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  ultrasonic?: boolean;
}
