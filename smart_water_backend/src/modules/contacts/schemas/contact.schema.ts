import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Contact extends Document {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true, lowercase: true })
  email!: string;

  @Prop({ required: true, trim: true })
  message!: string;

  @Prop({ type: Boolean, default: false })
  read!: boolean;

  @Prop({ type: Date })
  readAt?: Date;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);

