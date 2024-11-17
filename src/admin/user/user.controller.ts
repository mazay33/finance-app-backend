import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators';
import { Role, User } from '@prisma/client';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { UserResponse } from 'src/user/responses';
import { UserService } from 'src/user/user.service';

@ApiTags('Admin Users')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/user')
export class AdminUserController {
  constructor(private readonly userService: UserService) { }

  @Get('list')
  @ApiOperation({ summary: 'Получить список пользователей' })
  @ApiResponse({
    status: 200,
    description: 'Список пользователей',
    type: [UserResponse],
  })
  @UseInterceptors(ClassSerializerInterceptor)
  async getUsers() {
    const users = await this.userService.findMany();
    return users.map((user) => new UserResponse(user));
  }

  @ApiOperation({ summary: 'Получить пользователя по ID или Email' })
  @ApiParam({ name: 'idOrEmail', description: 'ID или Email пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Пользователь',
    type: UserResponse,
  })
  @UseInterceptors(ClassSerializerInterceptor)
  @Get(':idOrEmail')
  async findOneUser(
    @Param('idOrEmail') idOrEmail: string,
  ): Promise<UserResponse> {
    const user = await this.userService.findOne(idOrEmail);
    return new UserResponse(user);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOperation({ summary: 'Обновить пользователя' })
  @ApiBody({
    description: 'Данные для обновления пользователя',
  })
  @ApiResponse({
    status: 200,
    description: 'Пользователь обновлен',
    type: UserResponse,
  })
  @ApiBearerAuth()
  @Put(':id')
  async updateUser(@Body() body: Partial<User>) {
    const user = await this.userService.save(body);
    return new UserResponse(user);
  }

  @ApiOperation({ summary: 'Удалить пользователя по ID' })
  @ApiParam({ name: 'id', description: 'ID пользователя', type: String })
  @ApiResponse({
    status: 200,
    description: 'Пользователь удален',
  })
  @Delete(':id')
  async deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.delete(id);
  }
}
