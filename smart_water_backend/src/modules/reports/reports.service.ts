import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EnergyConsumption } from './schemas/energy-consumption.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(EnergyConsumption)
    private readonly energyRepo: Repository<EnergyConsumption>,
    private readonly dataSource: DataSource
  ) {}

  async saveHourlyConsumption(
    deviceId: string,
    userId: string,
    data: {
      energyUsed: number;
      waterUsed?: number;
      motorState?: string;
      timerActive?: boolean;
    }
  ): Promise<void> {
    const now = new Date();
    const timestamp = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      0,
      0,
      0
    );

    await this.energyRepo.upsert(
      {
        deviceId,
        userId,
        timestamp,
        energyUsed: data.energyUsed,
        waterUsed: data.waterUsed ?? 0,
        motorState: data.motorState ?? 'OFF',
        timerActive: data.timerActive ?? false
      },
      { conflictPaths: ['deviceId', 'userId', 'timestamp'] }
    );
  }

  async getDaily(userId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0,
      0,
      0,
      0
    );
    const endOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23,
      59,
      59,
      999
    );

    const dateStr = startOfDay.toISOString().slice(0, 10);

    const results = await this.dataSource.query(
      `
      SELECT
        e."deviceId" AS "deviceId",
        ROUND(SUM(e."energyUsed")::numeric, 2)::float AS "totalEnergy",
        ROUND(SUM(e."waterUsed")::numeric, 2)::float AS "totalWater",
        COUNT(*)::int AS hours,
        d.name AS "deviceName",
        d.location AS "deviceLocation",
        $4::text AS date
      FROM energy_consumption e
      LEFT JOIN devices d ON d.id::text = e."deviceId"
      WHERE e."userId" = $1 AND e.timestamp >= $2 AND e.timestamp <= $3
      GROUP BY e."deviceId", d.name, d.location
      `,
      [userId, startOfDay, endOfDay, dateStr]
    );

    return {
      date: dateStr,
      devices: results,
      totalEnergy: results.reduce((sum: number, d: { totalEnergy: number }) => sum + Number(d.totalEnergy), 0),
      totalWater: results.reduce((sum: number, d: { totalWater: number }) => sum + Number(d.totalWater), 0)
    };
  }

  async getWeekly(userId: string, weekStart?: string) {
    let startOfWeek: Date;
    if (weekStart) {
      startOfWeek = new Date(weekStart);
    } else {
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek = new Date(today);
      startOfWeek.setDate(diff);
    }
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const results = await this.dataSource.query(
      `
      WITH daily AS (
        SELECT
          e."deviceId",
          to_char(e.timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
          SUM(e."energyUsed") AS energy,
          SUM(e."waterUsed") AS water
        FROM energy_consumption e
        WHERE e."userId" = $1 AND e.timestamp >= $2 AND e.timestamp <= $3
        GROUP BY e."deviceId", to_char(e.timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ),
      by_device AS (
        SELECT
          "deviceId",
          json_agg(
            json_build_object(
              'date', day,
              'energy', ROUND(energy::numeric, 2)::float,
              'water', ROUND(water::numeric, 2)::float
            ) ORDER BY day
          ) AS days,
          SUM(energy) AS "totalEnergy",
          SUM(water) AS "totalWater"
        FROM daily
        GROUP BY "deviceId"
      )
      SELECT
        b."deviceId" AS "deviceId",
        d.name AS "deviceName",
        d.location AS "deviceLocation",
        b.days,
        ROUND(b."totalEnergy"::numeric, 2)::float AS "totalEnergy",
        ROUND(b."totalWater"::numeric, 2)::float AS "totalWater"
      FROM by_device b
      LEFT JOIN devices d ON d.id::text = b."deviceId"
      ORDER BY b."deviceId"
      `,
      [userId, startOfWeek, endOfWeek]
    );

    return {
      weekStart: startOfWeek.toISOString().slice(0, 10),
      weekEnd: endOfWeek.toISOString().slice(0, 10),
      devices: results,
      totalEnergy: results.reduce((sum: number, d: { totalEnergy: number }) => sum + Number(d.totalEnergy), 0),
      totalWater: results.reduce((sum: number, d: { totalWater: number }) => sum + Number(d.totalWater), 0)
    };
  }

  async getMonthly(userId: string, month?: string) {
    let targetMonth: Date;
    if (month) {
      targetMonth = new Date(month + '-01');
    } else {
      targetMonth = new Date();
    }
    const startOfMonth = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      1,
      0,
      0,
      0,
      0
    );
    const endOfMonth = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const results = await this.dataSource.query(
      `
      WITH daily AS (
        SELECT
          e."deviceId",
          to_char(e.timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
          SUM(e."energyUsed") AS energy,
          SUM(e."waterUsed") AS water
        FROM energy_consumption e
        WHERE e."userId" = $1 AND e.timestamp >= $2 AND e.timestamp <= $3
        GROUP BY e."deviceId", to_char(e.timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ),
      by_device AS (
        SELECT
          "deviceId",
          json_agg(
            json_build_object(
              'date', day,
              'energy', ROUND(energy::numeric, 2)::float,
              'water', ROUND(water::numeric, 2)::float
            ) ORDER BY day
          ) AS days,
          SUM(energy) AS "totalEnergy",
          SUM(water) AS "totalWater",
          COUNT(*)::int AS "daysCount"
        FROM daily
        GROUP BY "deviceId"
      )
      SELECT
        b."deviceId" AS "deviceId",
        d.name AS "deviceName",
        d.location AS "deviceLocation",
        b.days,
        ROUND(b."totalEnergy"::numeric, 2)::float AS "totalEnergy",
        ROUND(b."totalWater"::numeric, 2)::float AS "totalWater",
        b."daysCount"
      FROM by_device b
      LEFT JOIN devices d ON d.id::text = b."deviceId"
      ORDER BY b."deviceId"
      `,
      [userId, startOfMonth, endOfMonth]
    );

    return {
      month: startOfMonth.toISOString().slice(0, 7),
      devices: results,
      totalEnergy: results.reduce((sum: number, d: { totalEnergy: number }) => sum + Number(d.totalEnergy), 0),
      totalWater: results.reduce((sum: number, d: { totalWater: number }) => sum + Number(d.totalWater), 0)
    };
  }

  async getYearly(userId: string, year?: string) {
    let targetYear: number;
    if (year) {
      targetYear = parseInt(year, 10);
    } else {
      targetYear = new Date().getFullYear();
    }
    const startOfYear = new Date(targetYear, 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    const results = await this.dataSource.query(
      `
      WITH monthly AS (
        SELECT
          e."deviceId",
          to_char(e.timestamp AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
          SUM(e."energyUsed") AS energy,
          SUM(e."waterUsed") AS water
        FROM energy_consumption e
        WHERE e."userId" = $1 AND e.timestamp >= $2 AND e.timestamp <= $3
        GROUP BY e."deviceId", to_char(e.timestamp AT TIME ZONE 'UTC', 'YYYY-MM')
      ),
      by_device AS (
        SELECT
          "deviceId",
          json_agg(
            json_build_object(
              'month', month,
              'energy', ROUND(energy::numeric, 2)::float,
              'water', ROUND(water::numeric, 2)::float
            ) ORDER BY month
          ) AS months,
          SUM(energy) AS "totalEnergy",
          SUM(water) AS "totalWater",
          COUNT(*)::int AS "monthsCount"
        FROM monthly
        GROUP BY "deviceId"
      )
      SELECT
        b."deviceId" AS "deviceId",
        d.name AS "deviceName",
        d.location AS "deviceLocation",
        b.months,
        ROUND(b."totalEnergy"::numeric, 2)::float AS "totalEnergy",
        ROUND(b."totalWater"::numeric, 2)::float AS "totalWater",
        b."monthsCount"
      FROM by_device b
      LEFT JOIN devices d ON d.id::text = b."deviceId"
      ORDER BY b."deviceId"
      `,
      [userId, startOfYear, endOfYear]
    );

    return {
      year: targetYear.toString(),
      devices: results,
      totalEnergy: results.reduce((sum: number, d: { totalEnergy: number }) => sum + Number(d.totalEnergy), 0),
      totalWater: results.reduce((sum: number, d: { totalWater: number }) => sum + Number(d.totalWater), 0)
    };
  }
}
