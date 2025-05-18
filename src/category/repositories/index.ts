import { Provider } from '@nestjs/common';
import { PrismaCategoryRepository } from './prisma-category.repository';

export * from './category-repository.interface';
export * from './prisma-category.repository';

export const CATEGORY_REPOSITORY = 'CATEGORY_REPOSITORY';

export const categoryRepositoryProviders: Provider[] = [
  {
    provide: CATEGORY_REPOSITORY,
    useClass: PrismaCategoryRepository,
  },
];
