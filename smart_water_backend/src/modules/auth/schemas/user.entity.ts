import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  AfterLoad
} from 'typeorm';

export type Role = 'ADMIN' | 'USER';
export type Language = 'uz' | 'en' | 'ru';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @AfterLoad()
  mapLegacyId() {
    (this as unknown as { _id?: string })._id = this.id;
  }

  @Column({ unique: true })
  username!: string;

  @Column()
  password!: string;

  @Column({ type: 'varchar', length: 16, default: 'USER' })
  role!: Role;

  @Column({ type: 'varchar', length: 8, default: 'uz' })
  language!: Language;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
