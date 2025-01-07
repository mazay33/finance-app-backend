import { ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Account } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { AccountResponseDto } from './dto/account-response.dto';
import { plainToClass } from 'class-transformer';

interface IAccountService {
  create(createAccountDto: CreateAccountDto, userId: string): Promise<AccountResponseDto>;
  findAll(userId: string): Promise<AccountResponseDto[]>;
  findOne(id: string, userId: string): Promise<AccountResponseDto>;
  update(id: string, updateAccountDto: UpdateAccountDto, userId: string): Promise<AccountResponseDto>;
  delete(id: string, userId: string): Promise<void>;
  getTotalAccountsBalance(userId: string): Promise<{ balance: number }>;
}

@Injectable()
export class AccountService implements IAccountService {
  constructor(private readonly prisma: PrismaService) { }

  private readonly logger = new Logger(AccountService.name)

  private mapToAccountResponse(account: Account): AccountResponseDto {
    return plainToClass(AccountResponseDto, account);
  }

  private getAllAccounts = async (userId: string): Promise<Account[]> => {
    return await this.prisma.account.findMany({
      where: { userId },
    });
  }

  public async create(createAccountDto: CreateAccountDto, userId: string): Promise<AccountResponseDto> {
    this.logger.log(`Creating account for user ${userId} with data: ${JSON.stringify(createAccountDto)}`);
    try {

      const accountExists = await this.prisma.account.findFirst({
        where: { name: createAccountDto.name },
      });

      if (accountExists) {
        throw new ConflictException('Account with this name already exists');
      }

      const account = await this.prisma.account.create({
        data: {
          ...createAccountDto,
          userId,
        },
      });

      this.logger.log(`Account created successfully: ${JSON.stringify(account)}`);

      return this.mapToAccountResponse(account);
    } catch (error) {
      this.logger.error(`Failed to create account: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to create account',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  public async findAll(userId: string): Promise<AccountResponseDto[]> {
    this.logger.log(`Finding all accounts for user ${userId}`);
    try {
      const accounts = await this.getAllAccounts(userId);

      this.logger.log(`Found ${accounts.length} accounts for user ${userId}`);
      return accounts.map((account) => this.mapToAccountResponse(account));
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
      const account = await this.prisma.account.findUnique({
        where: { id, userId },
      });

      if (!account) {
        throw new NotFoundException(`Account with id - "${id}" not found`);
      }

      this.logger.log(`Found account with id ${id}`);
      return this.mapToAccountResponse(account);
    } catch (error) {
      this.logger.error(`Failed to find account with id ${id}: ${error.message}`);
      throw new HttpException(
        error.message || `Failed to find account with id ${id}`,
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  public async update(id: string, updateAccountDto: UpdateAccountDto, userId: string): Promise<AccountResponseDto> {
    this.logger.log(`Updating account with id ${id}`);
    try {

      if (updateAccountDto.name) {
        const accountExists = await this.prisma.account.findFirst({
          where: { name: updateAccountDto.name, userId, NOT: { id } },
        });

        if (accountExists) {
          throw new ConflictException('Account with this name already exists');
        }
      }

      const account = await this.prisma.account.update({
        where: { id, userId },
        data: updateAccountDto,
      });

      this.logger.log(`Account updated successfully: ${JSON.stringify(account)}`);
      return this.mapToAccountResponse(account);
    } catch (error) {
      this.logger.error(`Failed to update account: ${error.message}`);
      throw new HttpException(
        error.message || `Failed to update account with id ${id}`,
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  public async delete(id: string, userId: string): Promise<void> {
    this.logger.log(`Deleting account with id ${id}`);
    try {
      await this.prisma.account.delete({
        where: { id, userId },
      });
      this.logger.log(`Account deleted successfully`);
    } catch (error) {
      this.logger.error(`Failed to delete account: ${error.message}`);
      throw new HttpException(
        error.message || `Failed to delete account with id ${id}`,
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  public async getTotalAccountsBalance(userId: string): Promise<{ balance: number }> {
    this.logger.log(`Getting total accounts balance for user ${userId}`);
    try {
      const accounts = await this.getAllAccounts(userId);
      const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);
      this.logger.log(`Total accounts balance for user ${userId}: ${totalBalance}`);
      return { balance: totalBalance };
    } catch (error) {
      this.logger.error(`Failed to get total accounts balance: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to get total accounts balance',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
