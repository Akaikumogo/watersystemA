import { ApiProperty } from '@nestjs/swagger';
import { DeviceStatus } from '../schemas/device.schema';

export class DeviceResponseDto {
	@ApiProperty({
		description: 'Device ID',
		example: '507f1f77bcf86cd799439011'
	})
	_id!: string;

	@ApiProperty({
		description: 'Device name',
		example: 'ESP32Controller'
	})
	name!: string;

	@ApiProperty({
		description: 'Device location',
		example: 'Building A, Floor 2'
	})
	location!: string;

	@ApiProperty({
		enum: ['ONLINE', 'OFFLINE'],
		description: 'Device status',
		example: 'ONLINE'
	})
	status!: DeviceStatus;

	@ApiProperty({
		description: 'Last updated timestamp',
		example: '2024-01-01T00:00:00.000Z'
	})
	lastUpdated!: Date;

	@ApiProperty({
		description: 'Power usage in watts',
		example: 150.5
	})
	powerUsage!: number;

	@ApiProperty({
		description: 'Water depth in centimeters',
		example: 45.2
	})
	waterDepth!: number;

	@ApiProperty({
		description: 'Height in centimeters',
		example: 200.0
	})
	height!: number;

	@ApiProperty({
		description: 'Total litres of water',
		example: 5000.75
	})
	totalLitres!: number;

	@ApiProperty({
		description: 'Total electricity consumption in kWh',
		example: 1250.5
	})
	totalElectricity!: number;

	@ApiProperty({
		description: 'Motor state',
		example: 'ON'
	})
	motorState!: string;

	@ApiProperty({
		description: 'Timer active status',
		example: true
	})
	timerActive!: boolean;

	@ApiProperty({
		type: [String],
		description: 'Array of user IDs assigned to this device',
		example: ['507f1f77bcf86cd799439011', '507f191e810c19729de860ea'],
		isArray: true
	})
	userIds!: string[];

	@ApiProperty({
		description: 'Created at timestamp',
		example: '2024-01-01T00:00:00.000Z'
	})
	createdAt?: Date;

	@ApiProperty({
		description: 'Updated at timestamp',
		example: '2024-01-01T00:00:00.000Z'
	})
	updatedAt?: Date;
}

export class DeviceCreateResponseDto {
	@ApiProperty({
		description: 'Success message',
		example: 'Device created successfully'
	})
	message!: string;

	@ApiProperty({
		description: 'Created device object',
		type: DeviceResponseDto
	})
	device!: DeviceResponseDto;
}

export class DeviceUpdateResponseDto {
	@ApiProperty({
		description: 'Success message',
		example: 'Device updated successfully'
	})
	message!: string;

	@ApiProperty({
		description: 'Updated device object',
		type: DeviceResponseDto
	})
	device!: DeviceResponseDto;
}

export class DeviceDeleteResponseDto {
	@ApiProperty({
		description: 'Success message',
		example: 'Device deleted successfully'
	})
	message!: string;
}

export class AssignUsersResponseDto {
	@ApiProperty({
		description: 'Success message',
		example: 'Users assigned successfully'
	})
	message!: string;

	@ApiProperty({
		description: 'Updated device object',
		type: DeviceResponseDto
	})
	device!: DeviceResponseDto;
}

