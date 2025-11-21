import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from './schemas/user.schema';

@Injectable()
export class AdminSeedService implements OnModuleInit {
	private readonly logger = new Logger(AdminSeedService.name);

	constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

	async onModuleInit() {
		await this.dropLegacyEmailIndexIfExists();
		const existingAdmin = await this.userModel.findOne({ username: 'admin' }).lean();
		const hashed = await bcrypt.hash('admin123', 10);

		if (!existingAdmin) {
			await this.userModel.create({
				username: 'admin',
				password: hashed,
				role: 'ADMIN'
			});
			this.logger.log('Default admin user created (username: admin / password: admin123)');
			return;
		}

		if (typeof existingAdmin.password !== 'string' || !existingAdmin.password.startsWith('$2')) {
			await this.userModel.updateOne(
				{ _id: existingAdmin._id },
				{
					$set: {
						password: hashed,
						role: 'ADMIN'
					}
				}
			);
			this.logger.warn('Default admin password reset to admin123 due to missing/invalid hash.');
		}
	}

	private async dropLegacyEmailIndexIfExists() {
		try {
			const indexes = await this.userModel.collection.indexes();
			const hasLegacyEmailIndex = indexes.some((idx) => idx.name === 'email_1');
			if (hasLegacyEmailIndex) {
				await this.userModel.collection.dropIndex('email_1');
				this.logger.log('Removed legacy unique email index to prevent duplicate null errors.');
			}
		} catch (error) {
      this.logger.warn(`Failed to check/drop legacy email index: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}


