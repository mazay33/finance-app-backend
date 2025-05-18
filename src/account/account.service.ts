import { BadRequestException, ConflictException, HttpException, HttpStatus, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Account, AccountRole, AccountType, Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { AccountResponseDto } from './responses/account-response.dto';
import { AccountQueryDto } from './dto/account-query.dto';
import { mapToPaginationResponse } from '@common/utils';
import { PaginatedAccountResponseDto } from './responses/paginated-account-response.dto';
import { AccountCategoryService } from '../account-category/account-category.service';
import { IAccountRepository, ACCOUNT_REPOSITORY } from './repositories';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository
  ) { }

  private mapToAccountResponse(account: Account): AccountResponseDto {
    return new AccountResponseDto(account);
  }

  private handleError(error: Error, defaultMessage: string): never {
    this.logger.error(`${defaultMessage}: ${error.message}`, error.stack);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new BadRequestException('Database operation failed');
    }

    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(defaultMessage);
  }

  private async getAccountWithAccessCheck(
    accountId: string,
    userId: string,
  ): Promise<Account> {
    const { account, member } = await this.accountRepository.findByIdWithMember(accountId, userId);

    if (!account || !member) {
      throw new NotFoundException(`Account with id "${accountId}" not found or access denied`);
    }

    return account;
  }

  private async isUserOwner(accountId: string, userId: string): Promise<boolean> {
    const { member } = await this.accountRepository.findByIdWithMember(accountId, userId);
    return member?.role === AccountRole.OWNER;
  }

  private async validateUniqueAccount(
    name: string,
    currency: string,
    type: AccountType,
    userId: string,
  ): Promise<void> {
    const existingAccount = await this.accountRepository.findUniqueByUserAttributes(
      name,
      currency,
      type,
      userId
    );

    if (existingAccount) {
      this.logger.debug(`Account with name ${name} already exists for user ${userId}`);
      throw new ConflictException(`Account with name ${name} already exists`);
    }
  }

  public async create(
    createAccountDto: CreateAccountDto,
    userId: string,
  ): Promise<AccountResponseDto> {
    try {
      this.logger.log(`Creating account for user ${userId}`);
      const { type, balance, currency, description, isActive, name } = createAccountDto;

      return await this.prisma.$transaction(async (tx) => {
        await this.validateUniqueAccount(name, currency, type, userId);

        // Создаем аккаунт
        const createdAccount = await tx.account.create({
          data: { balance, currency, description, isActive, name, type }
        });

        // Создаем владельца аккаунта
        await tx.accountMember.create({
          data: {
            accountId: createdAccount.id,
            userId,
            role: AccountRole.OWNER,
          },
        });

        // Добавляем все существующие категории пользователя к аккаунту
        const categories = await tx.category.findMany({ where: { userId } });
        if (categories.length > 0) {
          await tx.accountCategory.createMany({
            data: categories.map((category) => ({
              accountId: createdAccount.id,
              categoryId: category.id,
              addedById: userId,
            })),
          });
        }

        this.logger.log(`Account created successfully with ID ${createdAccount.id}`);
        return this.mapToAccountResponse(createdAccount);
      });
    } catch (error) {
      this.handleError(error, 'Failed to create account');
    }
  }

  public async findAll(userId: string, query: AccountQueryDto): Promise<PaginatedAccountResponseDto> {
    try {
      this.logger.log(`Finding accounts for user ${userId} with filters`);
      const { currency, order, page = 1, limit = 10, search, sortBy, type } = query;

      // Подготавливаем фильтры
      const filters: Prisma.AccountWhereInput = {};

      if (search) {
        filters.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (type) {
        filters.type = type;
      }

      if (currency) {
        filters.currency = currency;
      }

      // Подготавливаем сортировку
      const orderBy: Prisma.AccountOrderByWithRelationInput[] = sortBy
        ? [{ [sortBy]: order || 'desc' as Prisma.SortOrder }]
        : [{ createdAt: 'desc' as Prisma.SortOrder }];

      // Получаем данные с пагинацией
      const [accounts, total] = await this.accountRepository.findByUserIdWithFilters(
        userId,
        filters,
        { skip: (page - 1) * limit, take: limit },
        orderBy
      );

      this.logger.debug(`Found ${accounts.length} accounts for user ${userId}`);

      return mapToPaginationResponse(
        accounts.map(account => this.mapToAccountResponse(account)),
        total,
        page,
        limit
      );
    } catch (error) {
      this.logger.error(`Failed to find accounts: ${error.message}`);
      this.handleError(error, 'Failed to fetch accounts');
    }
  }

  public async findOne(id: string, userId: string): Promise<AccountResponseDto> {
    try {
      this.logger.log(`Finding account with id ${id}`);
      const account = await this.getAccountWithAccessCheck(id, userId);
      return this.mapToAccountResponse(account);
    } catch (error) {
      this.handleError(error, `Failed to find account with id ${id}`);
    }
  }

  public async update(
    id: string,
    updateAccountDto: UpdateAccountDto,
    userId: string,
  ): Promise<AccountResponseDto> {
    try {
      this.logger.log(`Updating account with id ${id}`);

      return await this.prisma.$transaction(async (prisma) => {
        // Проверяем доступ к аккаунту
        const account = await this.getAccountWithAccessCheck(id, userId);
        const { type, name, currency, ...updateData } = updateAccountDto;

        // Проверяем, изменились ли уникальные поля
        const newType = type || account.type;
        const newName = name || account.name;
        const newCurrency = currency || account.currency;

        const isUniqueCombinationChanged =
          newName !== account.name ||
          newCurrency !== account.currency ||
          newType !== account.type;

        // Проверяем уникальность новой комбинации, если она изменилась
        if (isUniqueCombinationChanged) {
          const conflictingAccount = await this.accountRepository.findUniqueByUserAttributes(
            newName,
            newCurrency,
            newType,
            userId
          );

          if (conflictingAccount && conflictingAccount.id !== id) {
            throw new ConflictException(
              `Account with this combination of name, currency and account type already exists`
            );
          }
        }

        // Обновляем аккаунт
        const updatePayload: Prisma.AccountUpdateInput = {
          ...updateData,
          ...(name && { name }),
          ...(currency && { currency }),
          ...(type && { type }),
        };

        const updatedAccount = await prisma.account.update({
          where: { id },
          data: updatePayload,
        });

        this.logger.log(`Account ${id} updated successfully`);
        return this.mapToAccountResponse(updatedAccount);
      });
    } catch (error) {
      this.handleError(error, `Failed to update account with id ${id}`);
    }
  }

  public async delete(id: string, userId: string): Promise<void> {
    try {
      this.logger.log(`Deleting account with id ${id}`);

      await this.prisma.$transaction(async (prisma) => {
        // Проверяем доступ к аккаунту
        await this.getAccountWithAccessCheck(id, userId);

        // Проверяем, что пользователь является владельцем
        const isOwner = await this.isUserOwner(id, userId);

        if (!isOwner) {
          throw new HttpException('You are not the owner of this account', HttpStatus.FORBIDDEN);
        }

        // Удаляем аккаунт (каскадное удаление для связанных записей)
        await prisma.account.delete({ where: { id } });
      });

      this.logger.log(`Account ${id} deleted successfully`);
    } catch (error) {
      this.handleError(error, `Failed to delete account with id ${id}`);
    }
  }
}
