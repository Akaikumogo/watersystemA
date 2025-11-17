import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Patch,
	Post,
	UseGuards
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
	ApiBearerAuth,
	ApiOperation,
	ApiParam,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
	UserResponseDto,
	UserCreateResponseDto,
	UserUpdateResponseDto,
	UserDeleteResponseDto
} from './dto/user-response.dto';
import { DeviceResponseDto } from '../devices/dto/device-response.dto';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@ApiOperation({
		summary: 'Get all users',
		description: 'Retrieve a list of all users. Available for all authenticated users.'
	})
	@Roles('ADMIN', 'USER')
	@Get()
	@HttpCode(HttpStatus.OK)
	@ApiResponse({
		status: 200,
		description: 'List of users retrieved successfully',
		type: [UserResponseDto]
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	findAll() {
		return this.usersService.findAll();
	}

	@ApiOperation({
		summary: 'Get user devices',
		description: 'Get all devices assigned to a specific user'
	})
	@Get(':id/devices')
	@HttpCode(HttpStatus.OK)
	@ApiParam({ name: 'id', description: 'User ID', example: '507f1f77bcf86cd799439011' })
	@ApiResponse({
		status: 200,
		description: 'User devices retrieved successfully',
		type: [DeviceResponseDto]
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'User not found' })
	getUserDevices(@Param('id') id: string) {
		return this.usersService.getUserDevices(id);
	}

	@ApiOperation({
		summary: 'Get user by ID',
		description: 'Retrieve a specific user by their ID. Admin only.'
	})
	@Roles('ADMIN')
	@Get(':id')
	@HttpCode(HttpStatus.OK)
	@ApiParam({ name: 'id', description: 'User ID', example: '507f1f77bcf86cd799439011' })
	@ApiResponse({
		status: 200,
		description: 'User retrieved successfully',
		type: UserResponseDto
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
	@ApiResponse({ status: 404, description: 'User not found' })
	findOne(@Param('id') id: string) {
		return this.usersService.findOne(id);
	}

	@ApiOperation({
		summary: 'Create a new user',
		description: 'Create a new user account. Admin only.'
	})
	@Roles('ADMIN')
	@Post()
	@HttpCode(HttpStatus.CREATED)
	@ApiResponse({
		status: 201,
		description: 'User created successfully',
		type: UserCreateResponseDto
	})
	@ApiResponse({ status: 400, description: 'Bad request - validation failed' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
	@ApiResponse({ status: 409, description: 'Conflict - username already exists' })
	create(@Body() dto: CreateUserDto) {
		return this.usersService.create(dto);
	}

	@ApiOperation({
		summary: 'Update user',
		description: 'Update user information. Admin only.'
	})
	@Roles('ADMIN')
	@Patch(':id')
	@HttpCode(HttpStatus.OK)
	@ApiParam({ name: 'id', description: 'User ID', example: '507f1f77bcf86cd799439011' })
	@ApiResponse({
		status: 200,
		description: 'User updated successfully',
		type: UserUpdateResponseDto
	})
	@ApiResponse({ status: 400, description: 'Bad request - validation failed' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
	@ApiResponse({ status: 404, description: 'User not found' })
	@ApiResponse({ status: 409, description: 'Conflict - username already exists' })
	update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
		return this.usersService.update(id, dto);
	}

	@ApiOperation({
		summary: 'Delete user',
		description: 'Delete a user account. Admin only.'
	})
	@Roles('ADMIN')
	@Delete(':id')
	@HttpCode(HttpStatus.OK)
	@ApiParam({ name: 'id', description: 'User ID', example: '507f1f77bcf86cd799439011' })
	@ApiResponse({
		status: 200,
		description: 'User deleted successfully',
		type: UserDeleteResponseDto
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
	@ApiResponse({ status: 404, description: 'User not found' })
	remove(@Param('id') id: string) {
		return this.usersService.remove(id);
	}
}

