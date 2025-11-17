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

export class UserListResponseDto {
	@ApiProperty({
		description: 'List of users',
		type: [UserResponseDto],
		isArray: true
	})
	users!: UserResponseDto[];
}

export class UserCreateResponseDto {
	@ApiProperty({
		description: 'Success message',
		example: 'User created successfully'
	})
	message!: string;

	@ApiProperty({
		description: 'Created user object',
		type: UserResponseDto
	})
	user!: UserResponseDto;
}

export class UserUpdateResponseDto {
	@ApiProperty({
		description: 'Success message',
		example: 'User updated successfully'
	})
	message!: string;

	@ApiProperty({
		description: 'Updated user object',
		type: UserResponseDto
	})
	user!: UserResponseDto;
}

export class UserDeleteResponseDto {
	@ApiProperty({
		description: 'Success message',
		example: 'User deleted successfully'
	})
	message!: string;
}

