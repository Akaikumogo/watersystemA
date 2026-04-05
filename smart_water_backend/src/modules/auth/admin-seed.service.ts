import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './schemas/user.entity';

@Injectable()
export class AdminSeedService implements OnModuleInit {
	private readonly logger = new Logger(AdminSeedService.name);

	constructor(@InjectRepository(User) private readonly userRepo: Repository<User>) {}

	async onModuleInit() {
		const existingAdmin = await this.userRepo.findOne({ where: { username: 'admin' } });
		const hashed = await bcrypt.hash('admin123', 10);

		if (!existingAdmin) {
			await this.userRepo.save(
				this.userRepo.create({
					username: 'admin',
					password: hashed,
					role: 'ADMIN'
				})
			);
			this.logger.log('Default admin user created (username: admin / password: admin123)');
			return;
		}

		if (typeof existingAdmin.password !== 'string' || !existingAdmin.password.startsWith('$2')) {
			await this.userRepo.update(
				{ id: existingAdmin.id },
				{
					password: hashed,
					role: 'ADMIN'
				}
			);
			this.logger.warn('Default admin password reset to admin123 due to missing/invalid hash.');
		}
	}
}
