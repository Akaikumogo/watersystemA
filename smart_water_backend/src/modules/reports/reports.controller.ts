import { Controller, Get, Query, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
	constructor(private readonly reportsService: ReportsService) {}

	@ApiOperation({
		summary: 'Get daily energy consumption report',
		description: 'Get daily energy and water consumption report for the authenticated user'
	})
	@ApiQuery({ name: 'date', required: false, description: 'Date in YYYY-MM-DD format (default: today)' })
	@ApiResponse({ status: 200, description: 'Daily report retrieved successfully' })
	@Get('daily')
	getDaily(@Req() req: any, @Query('date') date?: string) {
		const userId = req.user?.userId ?? req.user?.id;
		if (!userId) {
			throw new UnauthorizedException('User ID not found in token');
		}
		return this.reportsService.getDaily(userId, date);
	}

	@ApiOperation({
		summary: 'Get weekly energy consumption report',
		description: 'Get weekly energy and water consumption report for the authenticated user'
	})
	@ApiQuery({ name: 'weekStart', required: false, description: 'Week start date in YYYY-MM-DD format (default: current week)' })
	@ApiResponse({ status: 200, description: 'Weekly report retrieved successfully' })
	@Get('weekly')
	getWeekly(@Req() req: any, @Query('weekStart') weekStart?: string) {
		const userId = req.user?.userId ?? req.user?.id;
		if (!userId) {
			throw new UnauthorizedException('User ID not found in token');
		}
		return this.reportsService.getWeekly(userId, weekStart);
	}

	@ApiOperation({
		summary: 'Get monthly energy consumption report',
		description: 'Get monthly energy and water consumption report for the authenticated user'
	})
	@ApiQuery({ name: 'month', required: false, description: 'Month in YYYY-MM format (default: current month)' })
	@ApiResponse({ status: 200, description: 'Monthly report retrieved successfully' })
	@Get('monthly')
	getMonthly(@Req() req: any, @Query('month') month?: string) {
		const userId = req.user?.userId ?? req.user?.id;
		if (!userId) {
			throw new UnauthorizedException('User ID not found in token');
		}
		return this.reportsService.getMonthly(userId, month);
	}
}
