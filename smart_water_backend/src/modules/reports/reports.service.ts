import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Device } from '../devices/schemas/device.schema';
import { EnergyConsumption } from './schemas/energy-consumption.schema';

@Injectable()
export class ReportsService {
	constructor(
		@InjectModel(Device.name) private readonly deviceModel: Model<Device>,
		@InjectModel(EnergyConsumption.name) private readonly energyModel: Model<EnergyConsumption>
	) {}

	/**
	 * Save hourly energy consumption data
	 */
	async saveHourlyConsumption(deviceId: string, userId: string, data: {
		energyUsed: number;
		waterUsed?: number;
		motorState?: string;
		timerActive?: boolean;
	}): Promise<void> {
		const now = new Date();
		// Round to the nearest hour
		const timestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);

		await this.energyModel.findOneAndUpdate(
			{
				deviceId,
				userId,
				timestamp
			},
			{
				$set: {
					energyUsed: data.energyUsed,
					waterUsed: data.waterUsed ?? 0,
					motorState: data.motorState ?? 'OFF',
					timerActive: data.timerActive ?? false
				}
			},
			{ upsert: true, new: true }
		);
	}

	/**
	 * Get daily energy consumption report for a user
	 */
	async getDaily(userId: string, date?: string) {
		const targetDate = date ? new Date(date) : new Date();
		const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
		const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

		const results = await this.energyModel.aggregate([
			{
				$match: {
					userId,
					timestamp: {
						$gte: startOfDay,
						$lte: endOfDay
					}
				}
			},
			{
				$group: {
					_id: '$deviceId',
					totalEnergy: { $sum: '$energyUsed' },
					totalWater: { $sum: '$waterUsed' },
					hours: { $sum: 1 },
					deviceId: { $first: '$deviceId' }
				}
			},
			{
				$lookup: {
					from: 'devices',
					localField: 'deviceId',
					foreignField: '_id',
					as: 'device'
				}
			},
			{
				$unwind: {
					path: '$device',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$project: {
					deviceId: '$_id',
					deviceName: '$device.name',
					deviceLocation: '$device.location',
					totalEnergy: { $round: ['$totalEnergy', 2] },
					totalWater: { $round: ['$totalWater', 2] },
					hours: 1,
					date: startOfDay.toISOString().slice(0, 10)
				}
			}
		]);

		return {
			date: startOfDay.toISOString().slice(0, 10),
			devices: results,
			totalEnergy: results.reduce((sum, d) => sum + d.totalEnergy, 0),
			totalWater: results.reduce((sum, d) => sum + d.totalWater, 0)
		};
	}

	/**
	 * Get weekly energy consumption report for a user
	 */
	async getWeekly(userId: string, weekStart?: string) {
		let startOfWeek: Date;
		if (weekStart) {
			startOfWeek = new Date(weekStart);
		} else {
			const today = new Date();
			const day = today.getDay();
			const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
			startOfWeek = new Date(today.setDate(diff));
		}
		startOfWeek.setHours(0, 0, 0, 0);
		const endOfWeek = new Date(startOfWeek);
		endOfWeek.setDate(startOfWeek.getDate() + 6);
		endOfWeek.setHours(23, 59, 59, 999);

		const results = await this.energyModel.aggregate([
			{
				$match: {
					userId,
					timestamp: {
						$gte: startOfWeek,
						$lte: endOfWeek
					}
				}
			},
			{
				$group: {
					_id: {
						deviceId: '$deviceId',
						date: {
							$dateToString: {
								format: '%Y-%m-%d',
								date: '$timestamp'
							}
						}
					},
					totalEnergy: { $sum: '$energyUsed' },
					totalWater: { $sum: '$waterUsed' }
				}
			},
			{
				$group: {
					_id: '$_id.deviceId',
					days: {
						$push: {
							date: '$_id.date',
							energy: { $round: ['$totalEnergy', 2] },
							water: { $round: ['$totalWater', 2] }
						}
					},
					totalEnergy: { $sum: '$totalEnergy' },
					totalWater: { $sum: '$totalWater' }
				}
			},
			{
				$lookup: {
					from: 'devices',
					localField: '_id',
					foreignField: '_id',
					as: 'device'
				}
			},
			{
				$unwind: {
					path: '$device',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$project: {
					deviceId: '$_id',
					deviceName: '$device.name',
					deviceLocation: '$device.location',
					days: 1,
					totalEnergy: { $round: ['$totalEnergy', 2] },
					totalWater: { $round: ['$totalWater', 2] }
				}
			}
		]);

		return {
			weekStart: startOfWeek.toISOString().slice(0, 10),
			weekEnd: endOfWeek.toISOString().slice(0, 10),
			devices: results,
			totalEnergy: results.reduce((sum, d) => sum + d.totalEnergy, 0),
			totalWater: results.reduce((sum, d) => sum + d.totalWater, 0)
		};
	}

	/**
	 * Get monthly energy consumption report for a user
	 */
	async getMonthly(userId: string, month?: string) {
		let targetMonth: Date;
		if (month) {
			targetMonth = new Date(month + '-01');
		} else {
			targetMonth = new Date();
		}
		const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1, 0, 0, 0, 0);
		const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59, 999);

		const results = await this.energyModel.aggregate([
			{
				$match: {
					userId,
					timestamp: {
						$gte: startOfMonth,
						$lte: endOfMonth
					}
				}
			},
			{
				$group: {
					_id: {
						deviceId: '$deviceId',
						day: {
							$dateToString: {
								format: '%Y-%m-%d',
								date: '$timestamp'
							}
						}
					},
					totalEnergy: { $sum: '$energyUsed' },
					totalWater: { $sum: '$waterUsed' }
				}
			},
			{
				$group: {
					_id: '$_id.deviceId',
					days: {
						$push: {
							date: '$_id.day',
							energy: { $round: ['$totalEnergy', 2] },
							water: { $round: ['$totalWater', 2] }
						}
					},
					totalEnergy: { $sum: '$totalEnergy' },
					totalWater: { $sum: '$totalWater' },
					daysCount: { $sum: 1 }
				}
			},
			{
				$lookup: {
					from: 'devices',
					localField: '_id',
					foreignField: '_id',
					as: 'device'
				}
			},
			{
				$unwind: {
					path: '$device',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$project: {
					deviceId: '$_id',
					deviceName: '$device.name',
					deviceLocation: '$device.location',
					days: 1,
					totalEnergy: { $round: ['$totalEnergy', 2] },
					totalWater: { $round: ['$totalWater', 2] },
					daysCount: 1
				}
			}
		]);

		return {
			month: startOfMonth.toISOString().slice(0, 7),
			devices: results,
			totalEnergy: results.reduce((sum, d) => sum + d.totalEnergy, 0),
			totalWater: results.reduce((sum, d) => sum + d.totalWater, 0)
		};
	}
}
