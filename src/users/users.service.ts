import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  public async create(user: User): Promise<User> {
    const { email } = user;
    const userExists = await this.findByEmail(email);

    if (userExists) {
      throw new Error('User already exists');
    }

    const createdUser = new this.userModel(user);
    createdUser.password = await this.hashPassword(createdUser.password);
    return createdUser.save();
  }

  public async findAll(): Promise<User[]> {
    return this.userModel.find();
  }

  public async findByEmail(email: string): Promise<User> {
    return this.userModel.findOne({
      email,
    });
  }

  public async findById(id: string): Promise<User> {
    return this.userModel.findById(id);
  }

  public async findOne(username: string): Promise<User> {
    return this.userModel.findOne({
      username,
    });
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}
