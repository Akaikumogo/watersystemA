import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UnregisterPushTokenDto {
  @ApiProperty({
    description: 'FCM/APNS token to unregister',
    example: 'fcm_token_here'
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}


