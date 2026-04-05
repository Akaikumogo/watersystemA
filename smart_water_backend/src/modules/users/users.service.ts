import {
	Injectable,
	NotFoundException,
	ConflictException,
	Inject,
	forwardRef
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { User } from '../auth/schemas/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DevicesService } from '../devices/devices.service';
import * as bcrypt from 'bcryptjs';
import { toApiDoc, toApiDocs } from '../../common/utils/mongo-compat';

@Injectable()
export class UsersService {
	constructor(
		@InjectRepository(User) private readonly userRepo: Repository<User>,
		@Inject(forwardRef(() => DevicesService))
		private readonly devicesService: DevicesService
	) {}

	async findAll() {
		const users = await this.userRepo.find({
			select: ['id', 'username', 'role', 'language', 'createdAt', 'updatedAt'],
			order: { createdAt: 'ASC' }
		});
		return toApiDocs(users as unknown as Record<string, unknown>[]);
	}

	async findOne(id: string) {
		const user = await this.userRepo.findOne({
			where: { id },
			select: ['id', 'username', 'role', 'language', 'createdAt', 'updatedAt']
		});
		if (!user) {
			throw new NotFoundException('User not found');
		}
		return toApiDoc(user as unknown as Record<string, unknown>);
	}

	async create(dto: CreateUserDto) {
		const existing = await this.userRepo.findOne({ where: { username: dto.username } });
		if (existing) {
			throw new ConflictException('Username already exists');
		}
		const hashed = await bcrypt.hash(dto.password, 10);
		const user = await this.userRepo.save(
			this.userRepo.create({
				username: dto.username,
				password: hashed,
				role: dto.role ?? 'USER'
			})
		);
		const { password: _p, ...userObj } = user;
		return {
			message: 'User created successfully',
			user: toApiDoc(userObj as unknown as Record<string, unknown>)
		};
	}

	async update(id: string, dto: UpdateUserDto) {
		const updateData: Partial<User> = {};

		if (dto.username) {
			const existing = await this.userRepo.findOne({
				where: { username: dto.username, id: Not(id) }
			});
			if (existing) {
				throw new ConflictException('Username already exists');
			}
			updateData.username = dto.username;
		}

		if (dto.password) {
			updateData.password = await bcrypt.hash(dto.password, 10);
		}

		if (dto.role) {
			updateData.role = dto.role;
		}

		await this.userRepo.update({ id }, updateData);
		const user = await this.userRepo.findOne({
			where: { id },
			select: ['id', 'username', 'role', 'language', 'createdAt', 'updatedAt']
		});

		if (!user) {
			throw new NotFoundException('User not found');
		}

		return { message: 'User updated successfully', user: toApiDoc(user as unknown as Record<string, unknown>) };
	}

	async remove(id: string) {
		const res = await this.userRepo.delete({ id });
		if (!res.affected) {
			throw new NotFoundException('User not found');
		}
		return { message: 'User deleted successfully' };
	}

	async getUserDevices(userId: string) {
		const user = await this.userRepo.findOne({ where: { id: userId } });
		if (!user) {
			throw new NotFoundException('User not found');
		}
		return this.devicesService.getUserDevices(userId);
	}
}
