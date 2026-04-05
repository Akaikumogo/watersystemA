import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { Language } from '../schemas/user.entity';

export class UpdatePreferencesDto {
	@ApiProperty({
		description: 'Preferred language',
		enum: ['uz', 'en', 'ru'],
		example: 'uz'
	})
	@IsEnum(['uz', 'en', 'ru'])
	@IsNotEmpty()
	language!: Language;
}

