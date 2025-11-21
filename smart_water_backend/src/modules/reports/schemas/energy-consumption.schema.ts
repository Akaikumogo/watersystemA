import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class EnergyConsumption extends Document {
  @Prop({ required: true, type: String, ref: 'Device', index: true })
  deviceId!: string;

  @Prop({ required: true, type: String, ref: 'User', index: true })
  userId!: string;

  @Prop({ required: true, type: Date, index: true })
  timestamp!: Date;

  @Prop({ required: true, type: Number, default: 0 })
  energyUsed!: number; // kWh

  @Prop({ type: Number, default: 0 })
  waterUsed!: number; // Litres

  @Prop({ type: String, default: 'OFF' })
  motorState!: string;

  @Prop({ type: Boolean, default: false })
  timerActive!: boolean;
}

export const EnergyConsumptionSchema = SchemaFactory.createForClass(EnergyConsumption);

// Compound index for efficient queries
EnergyConsumptionSchema.index({ deviceId: 1, timestamp: -1 });
EnergyConsumptionSchema.index({ userId: 1, timestamp: -1 });
EnergyConsumptionSchema.index({ timestamp: -1 });

