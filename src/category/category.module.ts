import { Module, forwardRef } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { DefaultCategoriesService } from './services/default-categories.service';
import { CATEGORY_SERVICE } from './interfaces/category.interface';
import { CacheModule } from '@nestjs/cache-manager';
import { CATEGORY_REPOSITORY, PrismaCategoryRepository } from './repositories';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    CacheModule.register(),
    forwardRef(() => UserModule),
  ],
  controllers: [CategoryController],
  providers: [
    CategoryService,
    DefaultCategoriesService,
    {
      provide: CATEGORY_REPOSITORY,
      useClass: PrismaCategoryRepository,
    },
    {
      provide: CATEGORY_SERVICE,
      useFactory: (categoryService: CategoryService) => categoryService,
      inject: [CategoryService],
    }
  ],
  exports: [CategoryService, CATEGORY_SERVICE, CATEGORY_REPOSITORY],
})
export class CategoryModule { }
