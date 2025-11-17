import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsMongoId, ArrayMinSize } from 'class-validator';

export class AssignUsersDto {
	@ApiProperty({
		type: [String],
		description: 'Array of user IDs to assign/unassign',
		example: ['507f1f77bcf86cd799439011', '507f191e810c19729de860ea'],
		isArray: true,
		minItems: 1
	})
	@IsArray()
	@ArrayMinSize(1)
	@IsMongoId({ each: true })
	userIds!: string[];
}

