import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { CreateAccountDto, AccountQueryDto, UpdateAccountDto } from './dto';
import { JwtPayload } from 'src/auth/interfaces';
import { CurrentUser } from '@common/decorators';
import { AccountResponseDto, PaginatedAccountResponseDto } from './responses';
import { AccountService } from './account.service';

@ApiTags('Account')
@ApiBearerAuth()
@Controller('account')
@UseInterceptors(ClassSerializerInterceptor)
export class AccountController {
  constructor(private readonly accountService: AccountService) { }

  @ApiOperation({ summary: 'Создание счёта' })
  @ApiBody({ type: CreateAccountDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: AccountResponseDto, description: 'Счёт успешно создан' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Некорректные данные' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Счёт с таким именем уже существует' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() createAccountDto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    return await this.accountService.create(createAccountDto, user.id);
  }

  @ApiOperation({ summary: 'Получить список счетов' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedAccountResponseDto, description: 'Список счетов' })
  @Get('/list')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: AccountQueryDto
  ): Promise<PaginatedAccountResponseDto> {
    return await this.accountService.findAll(user.id, query);
  }

  @ApiOperation({ summary: 'Получить счет по ID' })
  @ApiParam({ name: 'id', description: 'Идентификатор счета' })
  @ApiResponse({ status: HttpStatus.OK, type: AccountResponseDto, description: 'Данные счета' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Счёт не найден или нет доступа' })
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<AccountResponseDto> {
    return await this.accountService.findOne(id, user.id);
  }

  @ApiOperation({ summary: 'Обновить счет' })
  @ApiParam({ name: 'id', description: 'Идентификатор счета' })
  @ApiBody({ type: UpdateAccountDto })
  @ApiResponse({ status: HttpStatus.OK, type: AccountResponseDto, description: 'Счёт обновлен' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Счёт не найден или нет доступа' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Счёт с такой комбинацией данных уже существует' })
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AccountResponseDto> {
    return await this.accountService.update(id, updateAccountDto, user.id);
  }

  @ApiOperation({ summary: 'Удалить счет' })
  @ApiParam({ name: 'id', description: 'Идентификатор счета' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Счёт удален' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Счёт не найден или нет доступа' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Недостаточно прав для удаления' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return await this.accountService.delete(id, user.id);
  }
}
