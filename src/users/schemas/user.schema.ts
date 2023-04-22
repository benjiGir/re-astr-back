import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  _id: string;

  @Prop({
    type: String,
    required: true,
  })
  username: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  firstname: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  lastname: string;

  @Prop({
    type: String,
    required: true,
  })
  password: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    unique: true,
  })
  email: string;

  @Prop({
    type: String,
    required: true,
  })
  role: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
