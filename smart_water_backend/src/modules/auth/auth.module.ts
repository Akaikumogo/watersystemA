import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './schemas/user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AdminSeedService } from './admin-seed.service';
import { DevicesModule } from '../devices/devices.module';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
	imports: [
		ConfigModule,
		TypeOrmModule.forFeature([User]),
		JwtModule.registerAsync({
			useFactory: (config: ConfigService) => ({
				secret: config.get<string>('JWT_SECRET'),
				signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '7d' }
			}),
			inject: [ConfigService]
		}),
		forwardRef(() => DevicesModule),
		forwardRef(() => MqttModule)
	],
	controllers: [AuthController],
	providers: [AuthService, JwtStrategy, AdminSeedService],
	exports: [TypeOrmModule, AuthService]
})
export class AuthModule {}
