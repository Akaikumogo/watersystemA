import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type Role = 'ADMIN' | 'USER';
export type Language = 'uz' | 'en' | 'ru';

@Schema({ timestamps: true })
export class User extends Document {
	@Prop({ required: true, unique: true, trim: true })
	username!: string;

	@Prop({ required: true })
	password!: string;

	@Prop({ required: true, enum: ['ADMIN', 'USER'], default: 'USER' })
	role!: Role;

	@Prop({ required: true, enum: ['uz', 'en', 'ru'], default: 'uz' })
	language!: Language;
}

export const UserSchema = SchemaFactory.createForClass(User);


