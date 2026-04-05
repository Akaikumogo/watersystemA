import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Role } from '../../auth/schemas/user.entity';

export class UpdateUserDto {
	@ApiPropertyOptional({
		description: 'Username for the user account',
		example: 'john_doe_updated',
		minLength: 3,
		maxLength: 50
	})
	@IsOptional()
	@IsString()
	@MinLength(3)
	username?: string;

	@ApiPropertyOptional({
		description: 'Password for the user account',
		example: 'NewSecurePassword123!',
		minLength: 6,
		format: 'password'
	})
	@IsOptional()
	@IsString()
	@MinLength(6)
	password?: string;

	@ApiPropertyOptional({
		enum: ['ADMIN', 'USER'],
		description: 'Role of the user',
		example: 'ADMIN'
	})
	@IsOptional()
	@IsEnum(['ADMIN', 'USER'])
	role?: Role;
}

