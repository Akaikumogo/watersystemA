import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateContactDto {
  @ApiPropertyOptional({
    description: 'Mark message as read/unread',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  read?: boolean;
}

