import {
  Injectable,
  NotFoundException,
  Logger,
  ConflictException,
  ForbiddenException,
  BadRequestException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountCategoryResponseDto, CategoryResponseDto } from './responses';
import { AccountRole } from '@prisma/client';
import { IAccountCategoryService } from './interfaces';

@Injectable()
export class AccountCategoryService implements IAccountCategoryService {
  private readonly logger = new Logger(AccountCategoryService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Add a category to an account
   * @param accountId - ID of the account
   * @param categoryId - ID of the category
   * @param userId - ID of the user performing the action
   * @returns The created account-category relationship
   */
  async addCategoryToAccount(
    accountId: string,
    categoryId: string,
    userId: string
  ): Promise<AccountCategoryResponseDto> {
    try {
      this.logger.log(`Adding category ${categoryId} to account ${accountId} by user ${userId}`);

      // Check if the account exists and the user has access to it
      const accountMember = await this.prisma.accountMember.findFirst({
        where: {
          accountId,
          userId,
        },
        include: {
          account: true
        }
      });

      if (!accountMember) {
        throw new ForbiddenException(`You don't have access to account with ID ${accountId}`);
      }

      // Check if the category exists and belongs to the user
      const category = await this.prisma.category.findFirst({
        where: {
          id: categoryId,
          userId,
        },
      });

      if (!category) {
        throw new NotFoundException(`Category with ID ${categoryId} not found or doesn't belong to you`);
      }

      // Check if the relationship already exists
      const exists = await this.prisma.accountCategory.findUnique({
        where: {
          accountId_categoryId: {
            accountId,
            categoryId,
          },
        },
      });

      if (exists) {
        throw new ConflictException(`Category ${categoryId} is already added to account ${accountId}`);
      }

      // Create the relationship
      const accountCategory = await this.prisma.accountCategory.create({
        data: {
          accountId,
          categoryId,
          addedById: userId,
        },
      });

      return this.mapToResponseDto(accountCategory);
    } catch (error) {
      this.handleError(error, `Failed to add category ${categoryId} to account ${accountId}`);
    }
  }

  /**
   * Remove a category from an account
   * @param accountId - ID of the account
   * @param categoryId - ID of the category
   * @param userId - ID of the user performing the action
   * @returns The removed account-category relationship
   */
  async removeCategory(
    accountId: string,
    categoryId: string,
    userId: string
  ): Promise<AccountCategoryResponseDto> {
    try {
      this.logger.log(`Removing category ${categoryId} from account ${accountId} by user ${userId}`);

      // Check if the account exists and the user has access to it
      const accountMember = await this.prisma.accountMember.findFirst({
        where: {
          accountId,
          userId,
        }
      });

      if (!accountMember) {
        throw new ForbiddenException(`You don't have access to account with ID ${accountId}`);
      }

      // Check if the relationship exists
      const accountCategory = await this.prisma.accountCategory.findUnique({
        where: {
          accountId_categoryId: {
            accountId,
            categoryId,
          },
        },
      });

      if (!accountCategory) {
        throw new NotFoundException(`Category ${categoryId} is not associated with account ${accountId}`);
      }

      // Remove the relationship
      const removed = await this.prisma.accountCategory.delete({
        where: {
          accountId_categoryId: {
            accountId,
            categoryId,
          },
        },
      });

      return this.mapToResponseDto(removed);
    } catch (error) {
      this.handleError(error, `Failed to remove category ${categoryId} from account ${accountId}`);
    }
  }

  /**
   * Get all categories associated with an account
   * @param accountId - ID of the account
   * @param userId - ID of the user performing the action
   * @returns Array of categories
   */
  async getCategoriesByAccountId(
    accountId: string,
    userId: string
  ): Promise<CategoryResponseDto[]> {
    try {
      this.logger.log(`Getting categories for account ${accountId} by user ${userId}`);

      // Check if the account exists and the user has access to it
      const accountMember = await this.prisma.accountMember.findFirst({
        where: {
          accountId,
          userId,
        }
      });

      if (!accountMember) {
        throw new ForbiddenException(`You don't have access to account with ID ${accountId}`);
      }

      // Get all categories associated with the account
      const categories = await this.prisma.category.findMany({
        where: {
          accounts: {
            some: {
              accountId,
            },
          },
        },
      });

      return categories.map(category => new CategoryResponseDto(category));
    } catch (error) {
      this.handleError(error, `Failed to get categories for account ${accountId}`);
    }
  }

  /**
   * Check if a category is available in an account
   * @param accountId - ID of the account
   * @param categoryId - ID of the category
   * @param userId - ID of the user performing the action
   * @returns Boolean indicating if the category is available
   */
  async isCategoryAvailableInAccount(
    accountId: string,
    categoryId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Check if the user has access to the account
      const accountMember = await this.prisma.accountMember.findFirst({
        where: {
          accountId,
          userId,
        }
      });

      if (!accountMember) {
        throw new ForbiddenException(`You don't have access to account with ID ${accountId}`);
      }

      // Check if the relationship exists
      const exists = await this.prisma.accountCategory.findUnique({
        where: {
          accountId_categoryId: {
            accountId,
            categoryId,
          },
        },
      });

      return !!exists;
    } catch (error) {
      this.handleError(error, `Failed to check if category ${categoryId} is available in account ${accountId}`);
    }
  }

  /**
   * Map an AccountCategory entity to a response DTO
   * @param entity - The AccountCategory entity
   * @returns AccountCategoryResponseDto
   */
  private mapToResponseDto(entity: any): AccountCategoryResponseDto {
    const dto = new AccountCategoryResponseDto();
    dto.accountId = entity.accountId;
    dto.categoryId = entity.categoryId;
    dto.addedById = entity.addedById;
    dto.addedAt = entity.addedAt;
    return dto;
  }

  /**
   * Handle errors and rethrow with appropriate message
   * @param error - The caught error
   * @param message - Custom error message
   */
  private handleError(error: any, message: string): never {
    this.logger.error(`${message}: ${error.message}`, error.stack);

    if (error instanceof NotFoundException ||
      error instanceof ForbiddenException ||
      error instanceof ConflictException ||
      error instanceof BadRequestException) {
      throw error;
    }

    throw new Error(`${message}: ${error.message}`);
  }
}
