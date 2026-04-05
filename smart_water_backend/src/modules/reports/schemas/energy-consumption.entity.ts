import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  Index
} from 'typeorm';

@Entity('energy_consumption')
@Unique(['deviceId', 'userId', 'timestamp'])
@Index(['userId', 'timestamp'])
@Index(['deviceId', 'timestamp'])
export class EnergyConsumption {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  deviceId!: string;

  @Column({ type: 'varchar', length: 36 })
  userId!: string;

  @Column({ type: 'timestamptz' })
  timestamp!: Date;

  @Column({ type: 'double precision', default: 0 })
  energyUsed!: number;

  @Column({ type: 'double precision', default: 0 })
  waterUsed!: number;

  @Column({ default: 'OFF' })
  motorState!: string;

  @Column({ default: false })
  timerActive!: boolean;
}
