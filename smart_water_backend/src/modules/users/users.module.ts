import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/schemas/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DevicesModule } from '../devices/devices.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([User]),
		forwardRef(() => DevicesModule)
	],
	controllers: [UsersController],
	providers: [UsersService],
	exports: [UsersService]
})
export class UsersModule {}
