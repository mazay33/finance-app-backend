import { AccountCategoryResponseDto } from '../responses/account-category-response.dto';
import { CategoryResponseDto } from '../responses/category-response.dto';

/**
 * Interface for the AccountCategory service
 * Defines the contract for account-category operations
 */
export interface IAccountCategoryService {
  /**
   * Add a category to an account
   * @param accountId - ID of the account
   * @param categoryId - ID of the category
   * @param userId - ID of the user performing the action
   */
  addCategoryToAccount(
    accountId: string,
    categoryId: string,
    userId: string
  ): Promise<AccountCategoryResponseDto>;

  /**
   * Remove a category from an account
   * @param accountId - ID of the account
   * @param categoryId - ID of the category
   * @param userId - ID of the user performing the action
   */
  removeCategory(
    accountId: string,
    categoryId: string,
    userId: string
  ): Promise<AccountCategoryResponseDto>;

  /**
   * Get all categories associated with an account
   * @param accountId - ID of the account
   * @param userId - ID of the user performing the action
   */
  getCategoriesByAccountId(
    accountId: string,
    userId: string
  ): Promise<CategoryResponseDto[]>;

  /**
   * Check if a category is available in an account
   * @param accountId - ID of the account
   * @param categoryId - ID of the category
   * @param userId - ID of the user performing the action
   */
  isCategoryAvailableInAccount(
    accountId: string,
    categoryId: string,
    userId: string
  ): Promise<boolean>;
}
