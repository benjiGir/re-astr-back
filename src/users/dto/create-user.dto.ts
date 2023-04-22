import { IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  _id: string;

  @IsString()
  username: string;

  @IsString()
  firstname: string;

  @IsString()
  lastname: string;

  @IsString()
  password: string;

  @IsString()
  email: string;

  @IsString()
  role: string;
}
