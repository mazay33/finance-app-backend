import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { UserService } from '../user.service';
import { CurrentUser } from '@common/decorators';
import { UserResponse } from '../responses';

@ApiTags('User Public')
@Controller('user')
export class UserPublicController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Получить текущего пользователя' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Текущий пользователь',
    type: UserResponse,
  })
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('me')
  async me(@CurrentUser() user: UserResponse) {
    const userData = await this.userService.findOne(user.id);

    return new UserResponse(userData);
  }
}
