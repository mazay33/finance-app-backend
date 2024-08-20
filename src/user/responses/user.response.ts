import { $Enums, User } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UserResponse implements User {
  @ApiProperty({ description: 'Уникальный идентификатор пользователя' })
  id: string;

  @ApiProperty({ description: 'Email пользователя' })
  email: string;

  @Exclude()
  @ApiProperty({ description: 'Пароль пользователя', writeOnly: true })
  password: string;

  @ApiProperty({
    description: 'Роли пользователя',
    enum: $Enums.Role,
    isArray: true,
  })
  roles: $Enums.Role[];

  @ApiProperty({
    description: 'Провайдер аутентификации',
    enum: $Enums.Provider,
  })
  provider: $Enums.Provider;

  @Exclude()
  @ApiProperty({ description: 'Дата создания пользователя', type: Date })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления пользователя', type: Date })
  updatedAt: Date;

  constructor(user: User) {
    Object.assign(this, user);
  }
}
