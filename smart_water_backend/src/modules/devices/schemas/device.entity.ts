import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  AfterLoad
} from 'typeorm';

export type DeviceStatus = 'ONLINE' | 'OFFLINE';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @AfterLoad()
  mapLegacyId() {
    (this as unknown as { _id?: string })._id = this.id;
  }

  @Column({ unique: true })
  name!: string;

  @Column({ default: 'Unknown' })
  location!: string;

  @Column({ type: 'varchar', length: 16, default: 'OFFLINE' })
  status!: DeviceStatus;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdated!: Date;

  @Column({ type: 'double precision', default: 0 })
  powerUsage!: number;

  @Column({ type: 'double precision', default: 0 })
  waterDepth!: number;

  @Column({ type: 'double precision', default: 0 })
  height!: number;

  @Column({ type: 'double precision', default: 0 })
  totalLitres!: number;

  @Column({ type: 'double precision', default: 0 })
  totalElectricity!: number;

  @Column({ default: 'OFF' })
  motorState!: string;

  @Column({ default: false })
  timerActive!: boolean;

  @Column({ type: 'int', default: 0 })
  timerDuration!: number;

  @Column({ type: 'timestamptz', nullable: true })
  timerEndTime!: Date | null;

  @Column({ default: false })
  activeMotor2!: boolean;

  @Column({ default: false })
  motorFault!: boolean;

  @Column({ default: true })
  ultrasonic!: boolean;

  @Column({ default: false })
  motorOnline!: boolean;

  @Column('varchar', { length: 36, array: true })
  userIds!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
