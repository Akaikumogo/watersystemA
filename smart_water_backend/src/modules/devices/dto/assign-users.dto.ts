import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class AssignUsersDto {
	@ApiProperty({
		type: [String],
		description: 'Array of user IDs (UUID) to assign/unassign',
		example: [
			'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
			'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
		],
		isArray: true,
		minItems: 1
	})
	@IsArray()
	@ArrayMinSize(1)
	@IsUUID('all', { each: true })
	userIds!: string[];
}

