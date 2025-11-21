import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Device, DeviceSchema } from '../devices/schemas/device.schema';
import { EnergyConsumption, EnergyConsumptionSchema } from './schemas/energy-consumption.schema';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: Device.name, schema: DeviceSchema },
			{ name: EnergyConsumption.name, schema: EnergyConsumptionSchema }
		])
	],
	controllers: [ReportsController],
	providers: [ReportsService],
	exports: [ReportsService]
})
export class ReportsModule {}


