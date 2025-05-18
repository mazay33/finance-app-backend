import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Patch,
  UseInterceptors,
  ClassSerializerInterceptor,
  HttpCode,
  HttpStatus,
  Query,
  ParseUUIDPipe,
  Inject,
} from '@nestjs/common';
import { JwtPayload } from 'src/auth/interfaces';
import { CurrentUser } from '@common/decorators';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './responses/category-response.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ICategoryService, CATEGORY_SERVICE } from './interfaces/category.interface';

@Controller('category')
@ApiBearerAuth()
@ApiTags('Category')
@UseInterceptors(ClassSerializerInterceptor)
export class CategoryController {
  constructor(
    @Inject(CATEGORY_SERVICE) private readonly categoryService: ICategoryService
  ) { }

  @Post()
  @ApiOperation({ summary: 'Создать новую категорию' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Категория успешно создана',
    type: CategoryResponseDto,
  })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.create(dto, user.id);
  }

  @Get('list')
  @ApiOperation({ summary: 'Получить список всех категорий пользователя' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список категорий успешно получен',
    type: [CategoryResponseDto],
  })
  async findAll(@CurrentUser() user: JwtPayload): Promise<{ data: CategoryResponseDto[] }> {
    const data = await this.categoryService.findAll(user.id);
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить категорию по ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Категория успешно найдена',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Категория не найдена или нет доступа',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить категорию' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Категория успешно обновлена',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Категория не найдена или нет доступа',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить категорию' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Категория успешно удалена',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Категория не найдена или нет доступа',
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.categoryService.delete(id, user.id);
  }
}
