import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  AfterLoad
} from 'typeorm';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @AfterLoad()
  mapLegacyId() {
    (this as unknown as { _id?: string })._id = this.id;
  }

  @Column()
  name!: string;

  @Column()
  email!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ default: false })
  read!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
