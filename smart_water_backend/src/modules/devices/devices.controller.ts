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
	Req,
	UseGuards
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { AssignUsersDto } from './dto/assign-users.dto';
import { DeviceCommandDto } from './dto/device-command.dto';
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
	DeviceResponseDto,
	DeviceCreateResponseDto,
	DeviceUpdateResponseDto,
	DeviceDeleteResponseDto,
	AssignUsersResponseDto
} from './dto/device-response.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('devices')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devices')
export class DevicesController {
	constructor(private readonly devicesService: DevicesService) {}

	@ApiOperation({
		summary: 'Get public stats',
		description: 'Get public statistics about devices (total, online, offline). No authentication required.'
	})
	@Public()
	@Get('stats')
	@HttpCode(HttpStatus.OK)
	@ApiResponse({
		status: 200,
		description: 'Statistics retrieved successfully'
	})
	async getStats() {
		return this.devicesService.getPublicStats();
	}

	@ApiOperation({
		summary: 'Get all devices',
		description: 'Retrieve a list of all devices'
	})
	@Get()
	@HttpCode(HttpStatus.OK)
	@ApiResponse({
		status: 200,
		description: 'List of devices retrieved successfully',
		type: [DeviceResponseDto]
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	findAll() {
		return this.devicesService.findAll();
	}

	@ApiOperation({
		summary: 'Get device by ID',
		description: 'Retrieve a specific device by its ID'
	})
	@Get(':id')
	@HttpCode(HttpStatus.OK)
	@ApiParam({ name: 'id', description: 'Device ID', example: '507f1f77bcf86cd799439011' })
	@ApiResponse({
		status: 200,
		description: 'Device retrieved successfully',
		type: DeviceResponseDto
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Device not found' })
	findOne(@Param('id') id: string) {
		return this.devicesService.findOne(id);
	}

	@ApiOperation({
		summary: 'Create a new device',
		description: 'Create a new device. Available for all authenticated users. The creator will be automatically assigned to the device.'
	})
	@Roles('ADMIN', 'USER')
	@Post()
	@HttpCode(HttpStatus.CREATED)
	@ApiResponse({
		status: 201,
		description: 'Device created successfully',
		type: DeviceCreateResponseDto
	})
	@ApiResponse({ status: 400, description: 'Bad request - validation failed' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	create(@Body() dto: CreateDeviceDto, @Req() req: any) {
		const userId = req.user?.userId ?? req.user?.id;
		return this.devicesService.create(dto, userId);
	}

	@ApiOperation({
		summary: 'Update device',
		description: 'Update device information. Admin only.'
	})
	@Roles('ADMIN')
	@Patch(':id')
	@HttpCode(HttpStatus.OK)
	@ApiParam({ name: 'id', description: 'Device ID', example: '507f1f77bcf86cd799439011' })
	@ApiResponse({
		status: 200,
		description: 'Device updated successfully',
		type: DeviceUpdateResponseDto
	})
	@ApiResponse({ status: 400, description: 'Bad request - validation failed' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
	@ApiResponse({ status: 404, description: 'Device not found' })
	update(@Param('id') id: string, @Body() dto: UpdateDeviceDto) {
		return this.devicesService.update(id, dto);
	}

	@ApiOperation({
		summary: 'Delete device',
		description: 'Delete a device. Admin only.'
	})
	@Roles('ADMIN')
	@Delete(':id')
	@HttpCode(HttpStatus.OK)
	@ApiParam({ name: 'id', description: 'Device ID', example: '507f1f77bcf86cd799439011' })
	@ApiResponse({
		status: 200,
		description: 'Device deleted successfully',
		type: DeviceDeleteResponseDto
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
	@ApiResponse({ status: 404, description: 'Device not found' })
	remove(@Param('id') id: string) {
		return this.devicesService.remove(id);
	}

	@ApiOperation({
		summary: 'Assign users to device',
		description: 'Assign one or more users to a device. Available for all authenticated users, but users can only assign to devices they have access to.'
	})
	@Roles('ADMIN', 'USER')
	@Post(':id/assign-users')
	@HttpCode(HttpStatus.OK)
	@ApiParam({ name: 'id', description: 'Device ID', example: '507f1f77bcf86cd799439011' })
	@ApiResponse({
		status: 200,
		description: 'Users assigned successfully',
		type: AssignUsersResponseDto
	})
	@ApiResponse({ status: 400, description: 'Bad request - validation failed' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Device not found or access denied' })
	assignUsers(@Param('id') id: string, @Body() dto: AssignUsersDto, @Req() req: any) {
		const userId = req.user?.userId ?? req.user?.id;
		const userRole = req.user?.role;
		// For non-admin users, pass userId to check access. For admin, pass undefined to skip check
		const requestingUserId = userRole === 'ADMIN' ? undefined : userId;
		return this.devicesService.assignUsers(id, dto.userIds, requestingUserId);
	}

	@ApiOperation({
		summary: 'Unassign users from device',
		description: 'Remove one or more users from a device. Admin only.'
	})
	@Roles('ADMIN')
	@Post(':id/unassign-users')
	@HttpCode(HttpStatus.OK)
	@ApiParam({ name: 'id', description: 'Device ID', example: '507f1f77bcf86cd799439011' })
	@ApiResponse({
		status: 200,
		description: 'Users unassigned successfully',
		type: AssignUsersResponseDto
	})
	@ApiResponse({ status: 400, description: 'Bad request - validation failed' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
	@ApiResponse({ status: 404, description: 'Device not found' })
	unassignUsers(@Param('id') id: string, @Body() dto: AssignUsersDto) {
		return this.devicesService.unassignUsers(id, dto.userIds);
	}

	@ApiOperation({
		summary: 'Get user devices',
		description: 'Get all devices assigned to a specific user'
	})
	@Get('user/:userId')
	@HttpCode(HttpStatus.OK)
	@ApiParam({ name: 'userId', description: 'User ID', example: '507f1f77bcf86cd799439011' })
	@ApiResponse({
		status: 200,
		description: 'User devices retrieved successfully',
		type: [DeviceResponseDto]
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'User not found' })
	getUserDevices(@Param('userId') userId: string) {
		return this.devicesService.getUserDevices(userId);
	}

	@ApiOperation({
		summary: 'Send command to device',
		description: 'Send control commands to device (motor ON/OFF, set height, set timer, switch motor). Available for all authenticated users, but users can only control devices they have access to.'
	})
	@Roles('ADMIN', 'USER')
	@Post(':id/command')
	@HttpCode(HttpStatus.OK)
	@ApiParam({ name: 'id', description: 'Device ID', example: '507f1f77bcf86cd799439011' })
	@ApiResponse({
		status: 200,
		description: 'Command sent successfully',
		type: DeviceResponseDto
	})
	@ApiResponse({ status: 400, description: 'Bad request - validation failed' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Device not found or access denied' })
	async sendCommand(
		@Param('id') id: string,
		@Body() dto: DeviceCommandDto,
		@Req() req: any
	) {
		const userId = req.user?.userId ?? req.user?.id;
		const userRole = req.user?.role;
		const requestingUserId = userRole === 'ADMIN' ? undefined : userId;
		return this.devicesService.sendCommand(id, dto, requestingUserId);
	}
}


