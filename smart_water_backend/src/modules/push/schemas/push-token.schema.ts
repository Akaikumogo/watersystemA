import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PushPlatform = 'android' | 'ios' | 'web';

@Schema({ timestamps: true })
export class PushToken extends Document {
  @Prop({ required: true, trim: true, unique: true, index: true })
  token!: string;

  @Prop({ required: true, enum: ['android', 'ios', 'web'] })
  platform!: PushPlatform;

  @Prop({ required: true, index: true })
  userId!: string;

  // Optional: if the app wants to register token "for a specific device"
  @Prop({ index: true })
  deviceId?: string;

  @Prop({ type: Boolean, default: true })
  enabled!: boolean;

  @Prop({ type: Date, default: Date.now })
  lastSeenAt!: Date;
}

export const PushTokenSchema = SchemaFactory.createForClass(PushToken);

PushTokenSchema.index({ token: 1 }, { unique: true });
PushTokenSchema.index({ userId: 1, enabled: 1 });
PushTokenSchema.index({ deviceId: 1, enabled: 1 });


