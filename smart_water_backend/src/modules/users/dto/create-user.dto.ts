import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Role } from '../../auth/schemas/user.entity';

export class CreateUserDto {
	@ApiProperty({
		description: 'Username for the user account',
		example: 'john_doe',
		minLength: 3,
		maxLength: 50
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(3)
	username!: string;

	@ApiProperty({
		description: 'Password for the user account',
		example: 'SecurePassword123!',
		minLength: 6,
		format: 'password'
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(6)
	password!: string;

	@ApiPropertyOptional({
		enum: ['ADMIN', 'USER'],
		description: 'Role of the user',
		example: 'USER',
		default: 'USER'
	})
	@IsOptional()
	@IsEnum(['ADMIN', 'USER'])
	role?: Role;
}

