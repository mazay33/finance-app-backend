import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Account, AccountRole, AccountType, Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { AccountResponseDto } from './responses/account-response.dto';
import { AccountQueryDto } from './dto/account-query.dto';
import { mapToPaginationResponse } from '@common/utils';
import { PaginatedAccountResponseDto } from './responses/paginated-account-response.dto';


@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  private readonly logger = new Logger(AccountService.name);

  private mapToAccountResponse(account: Account): AccountResponseDto {
    return new AccountResponseDto(account)
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
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!account || account.members.length === 0) {
      throw new NotFoundException(`Account with id "${accountId}" not found or access denied`);
    }

    return account;
  }

  private async isUserOwner(accountId: string, userId: string): Promise<boolean> {

    const member = await this.prisma.accountMember.findFirst({
      where: {
        accountId,
        userId,
        role: AccountRole.OWNER,
      },
    });

    return !!member;
  }

  private async validateUniqueAccount(
    name: string,
    currency: string,
    type: AccountType,
    userId: string,
  ): Promise<void> {
    const existingAccount = await this.prisma.account.findFirst({
      where: {
        name,
        currency,
        type,
        members: { some: { userId } },
      },
    });
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
      this.logger.log(`Creating account for user ${userId} with data: ${JSON.stringify(createAccountDto)}`);

      const { type, balance, currency, description, isActive, name } = createAccountDto;

      return await this.prisma.$transaction(async (tx) => {
        await this.validateUniqueAccount(
          createAccountDto.name,
          createAccountDto.currency,
          createAccountDto.type,
          userId
        );


        const createdAccount = await tx.account.create({
          data: {
            balance,
            currency,
            description,
            isActive,
            name,
            type,
          },
        });

        await tx.accountMember.create({
          data: {
            accountId: createdAccount.id,
            userId,
            role: AccountRole.OWNER,
          },
        });

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

        this.logger.log(`Account created successfully`);

        return this.mapToAccountResponse(createdAccount);
      });
    } catch (error) {
      this.handleError(error, 'Failed to create account');
    }
  }



  public async findAll(userId: string, query: AccountQueryDto): Promise<PaginatedAccountResponseDto> {
    this.logger.log(`Finding all accounts for user ${userId}`);
    try {
      const where: Prisma.AccountWhereInput = {};
      const { currency, order, page = 1, limit = 10, search, sortBy, type } = query;

      if (search) {
        where.description = { contains: search, mode: 'insensitive' };
      }

      if (type) {
        where.type = type;
      }

      if (currency) {
        where.currency = currency;
      }

      const [accounts, total] = await Promise.all([
        this.prisma.account.findMany({
          where: {
            members: {
              some: {
                userId,
              },
            },
            ...where,
          },
          orderBy: sortBy ? [{ [sortBy]: order || 'desc' }] : undefined,
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.account.count({
          where: {
            members: {
              some: {
                userId,
              },
            },
            ...where,
          },
        }),
      ]);

      this.logger.debug(`Found ${accounts.length} accounts for user ${userId}`);

      return mapToPaginationResponse(
        accounts.map((account) => new AccountResponseDto(account)),
        total,
        page,
        limit,
      );
    } catch (error) {
      this.logger.error(`Failed to find all accounts: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to find all accounts',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  public async findOne(id: string, userId: string): Promise<AccountResponseDto> {
    this.logger.log(`Finding account with id ${id}`);
    try {
      await this.getAccountWithAccessCheck(id, userId);
      const account = await this.prisma.account.findUniqueOrThrow({
        where: { id },
      });
      return this.mapToAccountResponse(account);
    } catch (error) {
      this.logger.error(`Failed to find account with id ${id}: ${error.message}`);
      this.handleError(error, `Failed to find account with id ${id}`);
    }
  }

  public async update(
    id: string,
    updateAccountDto: UpdateAccountDto,
    userId: string,
  ): Promise<AccountResponseDto> {
    this.logger.log(`Updating account with id ${id}`);
    try {
      return await this.prisma.$transaction(async (prisma) => {
        await this.getAccountWithAccessCheck(id, userId);

        const { type, name, currency, ...updateData } = updateAccountDto;

        const account = await prisma.account.findUnique({ where: { id } });

        if (!account) {
          throw new NotFoundException(`Account with id ${id} not found`);
        }

        const newType = type || account.type;
        const newName = name || account.name;
        const newCurrency = currency || account.currency;

        const isUniqueCombinationChanged =
          newName !== account.name ||
          newCurrency !== account.currency ||
          newType !== account.type;

        if (isUniqueCombinationChanged) {
          const conflictingAccount = await prisma.account.findFirst({
            where: {
              name: newName,
              currency: newCurrency,
              type: newType,
              members: {
                some: {
                  userId,
                },
              },
            },
          });

          if (conflictingAccount && conflictingAccount.id !== id) {
            throw new ConflictException(
              `Account with this combination of name (${newName}), ` +
              `currency (${newCurrency}) and account type already exists`,
            );
          }
        }

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
    this.logger.log(`Deleting account with id ${id}`);
    try {
      await this.prisma.$transaction(async (prisma) => {
        await this.getAccountWithAccessCheck(id, userId);

        const isOwner = await this.isUserOwner(id, userId);
        console.log(isOwner);

        if (!isOwner) {
          throw new HttpException('You are not the owner of this account', HttpStatus.FORBIDDEN);
        }

        await prisma.account.delete({
          where: { id },
        });
      });

      this.logger.log(`Account deleted successfully`);
    } catch (error) {
      this.logger.error(`Failed to delete account: ${error.message}`);
      this.handleError(error, `Failed to delete account with id ${id}`);
    }
  }

}
