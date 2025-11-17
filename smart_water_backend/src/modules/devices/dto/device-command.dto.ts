import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

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
		minimum: 0
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	height?: number;

	@ApiPropertyOptional({
		description: 'Set timer duration in seconds',
		example: 300,
		minimum: 1
	})
	@IsOptional()
	@IsNumber()
	@Min(1)
	timer?: number;

	@ApiPropertyOptional({
		description: 'Switch to motor 2 (true) or motor 1 (false)',
		example: false
	})
	@IsOptional()
	@IsBoolean()
	switchMotor?: boolean;
}

