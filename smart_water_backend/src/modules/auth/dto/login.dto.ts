import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
	@ApiProperty({
		description: 'Username for authentication',
		example: 'john_doe'
	})
	@IsString()
	@IsNotEmpty()
	@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
	username!: string;

	@ApiProperty({
		description: 'Password for authentication',
		example: 'SecurePassword123!',
		format: 'password'
	})
	@IsString()
	@IsNotEmpty()
	password!: string;
}


