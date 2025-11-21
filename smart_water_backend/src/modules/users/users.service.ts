import {
	Injectable,
	NotFoundException,
	ConflictException,
	ForbiddenException,
	Inject,
	forwardRef
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../auth/schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DevicesService } from '../devices/devices.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
	constructor(
		@InjectModel(User.name) private readonly userModel: Model<User>,
		@Inject(forwardRef(() => DevicesService))
		private readonly devicesService: DevicesService
	) {}

	async findAll() {
		return this.userModel.find().select('-password').lean();
	}

	async findOne(id: string) {
		const user = await this.userModel.findById(id).select('-password').lean();
		if (!user) {
			throw new NotFoundException('User not found');
		}
		return user;
	}

	async create(dto: CreateUserDto) {
		const existing = await this.userModel.findOne({ username: dto.username }).lean();
		if (existing) {
			throw new ConflictException('Username already exists');
		}
		const hashed = await bcrypt.hash(dto.password, 10);
		const user = await this.userModel.create({
			username: dto.username,
			password: hashed,
			role: dto.role ?? 'USER'
		});
		const userObj = user.toObject() as any;
		delete userObj.password;
		return { message: 'User created successfully', user: userObj };
	}

	async update(id: string, dto: UpdateUserDto) {
		const updateData: any = {};
		
		if (dto.username) {
			const existing = await this.userModel
				.findOne({ username: dto.username, _id: { $ne: id } })
				.lean();
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

		const user = await this.userModel
			.findByIdAndUpdate(id, updateData, { new: true })
			.select('-password')
			.lean();

		if (!user) {
			throw new NotFoundException('User not found');
		}

		return { message: 'User updated successfully', user };
	}

	async remove(id: string) {
		const user = await this.userModel.findByIdAndDelete(id).lean();
		if (!user) {
			throw new NotFoundException('User not found');
		}
		return { message: 'User deleted successfully' };
	}

	async getUserDevices(userId: string) {
		const user = await this.userModel.findById(userId).lean();
		if (!user) {
			throw new NotFoundException('User not found');
		}
		return this.devicesService.getUserDevices(userId);
	}
}

