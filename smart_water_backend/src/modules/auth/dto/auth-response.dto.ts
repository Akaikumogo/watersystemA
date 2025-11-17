import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
	@ApiProperty({
		description: 'User ID',
		example: '507f1f77bcf86cd799439011'
	})
	_id!: string;

	@ApiProperty({
		description: 'Username',
		example: 'john_doe'
	})
	username!: string;

	@ApiProperty({
		description: 'User role',
		enum: ['ADMIN', 'USER'],
		example: 'USER'
	})
	role!: string;

	@ApiProperty({
		description: 'User preferred language',
		enum: ['uz', 'en', 'ru'],
		example: 'uz',
		default: 'uz'
	})
	language!: string;

	@ApiProperty({
		description: 'Created at timestamp',
		example: '2024-01-01T00:00:00.000Z'
	})
	createdAt!: Date;

	@ApiProperty({
		description: 'Updated at timestamp',
		example: '2024-01-01T00:00:00.000Z'
	})
	updatedAt!: Date;
}

export class LoginResponseDto {
	@ApiProperty({
		description: 'JWT access token',
		example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
	})
	access_token!: string;

	@ApiProperty({
		description: 'User information',
		type: UserResponseDto
	})
	user!: UserResponseDto;
}

export class RegisterResponseDto {
	@ApiProperty({
		description: 'Success message',
		example: 'User created successfully'
	})
	message!: string;

	@ApiProperty({
		description: 'ID of the created user',
		example: '507f1f77bcf86cd799439011'
	})
	userId!: string;
}

