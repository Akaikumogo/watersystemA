import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterPushTokenDto {
  @ApiProperty({
    description: 'FCM/APNS token from the mobile device',
    example: 'fcm_token_here'
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    description: 'Device platform',
    example: 'android',
    enum: ['android', 'ios', 'web']
  })
  @IsString()
  @IsIn(['android', 'ios', 'web'])
  platform!: 'android' | 'ios' | 'web';

  @ApiPropertyOptional({
    description:
      'Optional MongoDB Device ID (so the app can later route to detail page by deviceId)',
    example: '507f1f77bcf86cd799439011'
  })
  @IsOptional()
  @IsString()
  deviceId?: string;
}


