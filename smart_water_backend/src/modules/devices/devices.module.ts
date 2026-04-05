import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Device } from './schemas/device.entity';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { DevicesGateway } from './devices.gateway';
import { MqttModule } from '../mqtt/mqtt.module';
import { ReportsModule } from '../reports/reports.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device]),
    ConfigModule,
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '7d' }
      }),
      inject: [ConfigService]
    }),
    forwardRef(() => MqttModule),
    forwardRef(() => ReportsModule),
    PushModule
  ],
  controllers: [DevicesController],
  providers: [DevicesService, DevicesGateway],
  exports: [DevicesService, DevicesGateway]
})
export class DevicesModule {}
