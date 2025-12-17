import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { UnregisterPushTokenDto } from './dto/unregister-push-token.dto';
import { PushService } from './push.service';

@ApiTags('push')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @ApiOperation({
    summary: 'Register a push token (FCM/APNS) for the current user',
    description:
      'Mobile app should call this after it gets a token. Token will be used to send notifications for device events.'
  })
  @ApiResponse({ status: 200, description: 'Token registered' })
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() dto: RegisterPushTokenDto, @Req() req: any) {
    const userId = req.user?.userId ?? req.user?.id;
    return this.pushService.registerToken({
      userId,
      token: dto.token,
      platform: dto.platform,
      deviceId: dto.deviceId
    });
  }

  @ApiOperation({
    summary: 'Unregister a push token for the current user'
  })
  @ApiResponse({ status: 200, description: 'Token unregistered' })
  @Post('unregister')
  @HttpCode(HttpStatus.OK)
  async unregister(@Body() dto: UnregisterPushTokenDto, @Req() req: any) {
    const userId = req.user?.userId ?? req.user?.id;
    return this.pushService.unregisterToken({ userId, token: dto.token });
  }
}


