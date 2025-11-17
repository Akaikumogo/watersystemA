import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DeviceStatus = 'ONLINE' | 'OFFLINE';

@Schema({ timestamps: true })
export class Device extends Document {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true, default: 'Unknown' })
  location!: string;

  @Prop({ required: true, enum: ['ONLINE', 'OFFLINE'], default: 'OFFLINE' })
  status!: DeviceStatus;

  @Prop({ type: Date, default: Date.now })
  lastUpdated!: Date;

  @Prop({ type: Number, default: 0 })
  powerUsage!: number;

  @Prop({ type: Number, default: 0 })
  waterDepth!: number;

  @Prop({ type: Number, default: 0 })
  height!: number;

  @Prop({ type: Number, default: 0 })
  totalLitres!: number;

  @Prop({ type: Number, default: 0 })
  totalElectricity!: number;

  @Prop({ type: String, default: 'OFF' })
  motorState!: string;

  @Prop({ type: Boolean, default: false })
  timerActive!: boolean;

  @Prop({ type: Number, default: 0 })
  timerDuration!: number; // Timer duration in seconds

  @Prop({ type: Date })
  timerEndTime?: Date; // When timer should end

  @Prop({ type: Boolean, default: false })
  activeMotor2!: boolean; // Which motor is active (false = motor1, true = motor2)

  @Prop({ type: Boolean, default: false })
  motorFault!: boolean; // Both motors failed

  @Prop({ type: [{ type: String, ref: 'User' }], default: [] })
  userIds!: string[];
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
