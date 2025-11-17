import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsArray, IsMongoId, Min } from 'class-validator';
import { DeviceStatus } from '../schemas/device.schema';

export class CreateDeviceDto {
	@ApiProperty({
		description: 'Name of the device',
		example: 'ESP32Controller',
		minLength: 1,
		maxLength: 100
	})
	@IsString()
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
		description: 'Array of user IDs assigned to this device',
		example: ['507f1f77bcf86cd799439011', '507f191e810c19729de860ea'],
		isArray: true
	})
	@IsOptional()
	@IsArray()
	@IsMongoId({ each: true })
	userIds?: string[];
}


