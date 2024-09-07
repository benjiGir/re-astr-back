import { ApiProperty } from '@nestjs/swagger'
import { IsEnum } from 'class-validator'
import { UserRole } from '../constants/user.contstant'

export class ParamsGetUsersDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  userRole: UserRole
}
