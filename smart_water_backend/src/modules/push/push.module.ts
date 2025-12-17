import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { PushToken, PushTokenSchema } from './schemas/push-token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PushToken.name, schema: PushTokenSchema }])
  ],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService]
})
export class PushModule {}


