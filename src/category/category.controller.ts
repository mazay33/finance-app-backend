import { Controller, Get } from '@nestjs/common';
import { CategoryService } from './category.service';
import { Public } from '@common/decorators';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  @Get('/list')
  @Public()
  async findMany() {
    return await this.categoryService.findMany();
  }
}
