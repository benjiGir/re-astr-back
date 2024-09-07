import { ApiProperty } from '@nestjs/swagger'

export class UserDto {
  constructor() {}

  @ApiProperty()
  name: string

  @ApiProperty()
  email: string
}

export class ResponseUsersDto {
  constructor() {}

  @ApiProperty({
    name: 'users',
    description: 'users list',
    isArray: true,
    type: UserDto,
  })
  users: Array<UserDto>
}
