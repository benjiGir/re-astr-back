import type { UserRole } from '@database/schema/users.schema'
import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty } from 'class-validator'

export class AssignRoleDto {
  @ApiProperty({
    description: 'User role to assign',
    enum: ['master', 'archivist', 'contributor', 'user'],
    example: 'contributor',
  })
  @IsEnum(['master', 'archivist', 'contributor', 'user'])
  @IsNotEmpty()
  role!: UserRole
}
