import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { DevicesModule } from './modules/devices/devices.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { UsersModule } from './modules/users/users.module';
import { ContactsModule } from './modules/contacts/contacts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI')
      }),
      inject: [ConfigService]
    }),
    AuthModule,
    DevicesModule,
    ReportsModule,
    MqttModule,
    UsersModule,
    ContactsModule
  ]
})
export class AppModule {}
