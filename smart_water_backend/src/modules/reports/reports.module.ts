import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Device, DeviceSchema } from '../devices/schemas/device.schema';

@Module({
	imports: [MongooseModule.forFeature([{ name: Device.name, schema: DeviceSchema }])],
	controllers: [ReportsController],
	providers: [ReportsService]
})
export class ReportsModule {}


