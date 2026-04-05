import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { EnergyConsumption } from './schemas/energy-consumption.entity';

@Module({
	imports: [TypeOrmModule.forFeature([EnergyConsumption])],
	controllers: [ReportsController],
	providers: [ReportsService],
	exports: [ReportsService]
})
export class ReportsModule {}
