import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

export type PushPlatform = 'android' | 'ios' | 'web';

@Entity('push_tokens')
export class PushToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  token!: string;

  @Column({ type: 'varchar', length: 16 })
  platform!: PushPlatform;

  @Column({ type: 'varchar', length: 36 })
  @Index()
  userId!: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  @Index()
  deviceId!: string | null;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  lastSeenAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
