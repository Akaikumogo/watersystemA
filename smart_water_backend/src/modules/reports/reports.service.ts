import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Device } from '../devices/schemas/device.schema';

@Injectable()
export class ReportsService {
	constructor(@InjectModel(Device.name) private readonly deviceModel: Model<Device>) {}

	async getDaily() {
		// Placeholder aggregation for daily usage; replace with actual time-series data source
		const devices = await this.deviceModel.find().lean();
		return devices.map(d => ({
			deviceId: d._id,
			date: new Date().toISOString().slice(0, 10),
			energyUsed: d.powerUsage,
			timestamp: new Date()
		}));
	}

	async getMonthly() {
		const devices = await this.deviceModel.find().lean();
		return devices.map(d => ({
			deviceId: d._id,
			month: new Date().toISOString().slice(0, 7),
			energyUsed: d.powerUsage * 30,
			timestamp: new Date()
		}));
	}
}


