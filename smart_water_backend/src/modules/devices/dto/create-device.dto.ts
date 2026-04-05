import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsArray, IsUUID, Min, IsBoolean, MinLength, MaxLength, Matches } from 'class-validator';
import { DeviceStatus } from '../schemas/device.entity';

export class CreateDeviceDto {
	@ApiProperty({
		description: 'Name of the device',
		example: 'ESP32Controller',
		minLength: 1,
		maxLength: 100
	})
	@IsString()
	@MinLength(1)
	@MaxLength(50)
	@Matches(/^[a-zA-Z0-9_-]+$/, { // QO'SHISH: Faqat alphanumeric, underscore, dash
		message: 'Device name can only contain letters, numbers, underscores, and dashes'
	})
	@IsNotEmpty()
	name!: string;

	@ApiPropertyOptional({
		description: 'Location of the device',
		example: 'Building A, Floor 2',
		default: 'Unknown'
	})
	@IsOptional()
	@IsString()
	location?: string;

	@ApiPropertyOptional({
		enum: ['ONLINE', 'OFFLINE'],
		description: 'Status of the device',
		example: 'OFFLINE',
		default: 'OFFLINE'
	})
	@IsOptional()
	@IsEnum(['ONLINE', 'OFFLINE'])
	status?: DeviceStatus;

	@ApiPropertyOptional({
		description: 'Power usage in watts',
		example: 0,
		default: 0,
		minimum: 0
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	powerUsage?: number;

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
}


