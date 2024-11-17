import { Controller, Get } from '@nestjs/common';
import { CategoryService } from './category.service';
import { Public } from '@common/decorators';

@Controller('category')

export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get('/list')
  @Public()
  async getAll() {
    return await this.categoryService.getAll();
  }
}
