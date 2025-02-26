import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from './transaction.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';

describe('TransactionService', () => {
  let service: TransactionService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    transaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    account: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a transaction', async () => {
      const createTransactionDto: CreateTransactionDto = {
        accountId: 'accountId',
        categoryId: 'categoryId',
        amount: 100,
        type: 'CREDIT',
        date: new Date('2025-02-26T07:43:28.231Z').toISOString(),
        description: 'Test transaction',
      };

      const userId = 'userId';
      const mockCategory = { id: 'categoryId', name: 'Test Category' };
      const mockAccount = { id: 'accountId', userId, balance: 500 };
      const mockTransaction = {
        id: 'transactionId',
        ...createTransactionDto,
      };

      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.account.findUnique.mockResolvedValue(mockAccount);
      mockPrismaService.transaction.create.mockResolvedValue(mockTransaction);
      mockPrismaService.account.update.mockResolvedValue(mockAccount);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });

      const result = await service.create(createTransactionDto, userId);

      expect(result).toEqual(mockTransaction);
      expect(mockPrismaService.category.findUnique).toHaveBeenCalledWith({
        where: { id: createTransactionDto.categoryId },
      });
      expect(mockPrismaService.account.findUnique).toHaveBeenCalledWith({
        where: { id: createTransactionDto.accountId, userId },
      });
      expect(mockPrismaService.transaction.create).toHaveBeenCalledWith({
        data: {
          description: createTransactionDto.description,
          amount: createTransactionDto.amount,
          type: createTransactionDto.type,
          date: new Date(createTransactionDto.date),
          user: { connect: { id: userId } },
          category: { connect: { id: createTransactionDto.categoryId } },
          account: { connect: { id: createTransactionDto.accountId } },
        },
      });
      expect(mockPrismaService.account.update).toHaveBeenCalledWith({
        where: { id: createTransactionDto.accountId },
        data: { balance: 400 },
      });
    });

    it('should throw BadRequestException for invalid date format', async () => {
      const createTransactionDto: CreateTransactionDto = {
        accountId: 'accountId',
        categoryId: 'categoryId',
        amount: 100,
        type: 'CREDIT',
        date: 'invalid-date',
        description: 'Test transaction',
      };

      const userId = 'userId';

      await expect(service.create(createTransactionDto, userId)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if category does not exist', async () => {
      const createTransactionDto: CreateTransactionDto = {
        accountId: 'accountId',
        categoryId: 'categoryId',
        amount: 100,
        type: 'CREDIT',
        date: new Date().toISOString(),
        description: 'Test transaction',
      };

      const userId = 'userId';
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.create(createTransactionDto, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if account does not exist', async () => {
      const createTransactionDto: CreateTransactionDto = {
        accountId: 'accountId',
        categoryId: 'categoryId',
        amount: 100,
        type: 'CREDIT',
        date: new Date().toISOString(),
        description: 'Test transaction',
      };

      const userId = 'userId';
      const mockCategory = { id: 'categoryId', name: 'Test Category' };
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.account.findUnique.mockResolvedValue(null);

      await expect(service.create(createTransactionDto, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if transaction date is in the future', async () => {
      const createTransactionDto: CreateTransactionDto = {
        accountId: 'accountId',
        categoryId: 'categoryId',
        amount: 100,
        type: 'CREDIT',
        date: new Date(Date.now() + 100000).toISOString(), // Future date
        description: 'Test transaction',
      };

      const userId = 'userId';
      const mockCategory = { id: 'categoryId', name: 'Test Category' };
      const mockAccount = { id: 'accountId', userId, balance: 500 };
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.account.findUnique.mockResolvedValue(mockAccount);

      await expect(service.create(createTransactionDto, userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated transactions with default parameters', async () => {
      const userId = 'userId';
      const mockTransactions = [{
        id: '1',
        description: 'Test',
        amount: 100,
        type: 'DEBIT',
        date: new Date(),
        userId,
      }];

      mockPrismaService.transaction.findMany.mockResolvedValue(mockTransactions);
      mockPrismaService.transaction.count.mockResolvedValue(1);

      const result = await service.findAll(userId, {});

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(mockPrismaService.transaction.findMany).toHaveBeenCalledWith({
        where: { userId },
        skip: 0,
        take: 10,
      });
    });

    it('should apply filters and sorting', async () => {
      const userId = 'userId';
      const query: TransactionQueryDto = {
        search: 'test',
        type: 'DEBIT',
        page: 2,
        limit: 20,
        sortBy: 'amount',
        order: 'asc',
      };

      await service.findAll(userId, query);

      expect(mockPrismaService.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          description: { contains: 'test', mode: 'insensitive' },
          type: 'DEBIT',
        },
        orderBy: { amount: 'asc' },
        skip: 20,
        take: 20,
      });
    });
  });

  it('should return transaction by id', async () => {
    const transaction = {
      id: '1',
      description: 'Test',
      amount: 100,
      type: 'DEBIT',
      date: new Date(),
      userId: 'userId',
      account: { id: 'acc1', name: 'Account' },
      category: { id: 'cat1', name: 'Category' },
    };

    mockPrismaService.transaction.findUnique.mockResolvedValue(transaction);

    const result = await service.findOne('1', 'userId');

    const { userId: _, ...expectedTransaction } = transaction;
    expect(result).toEqual(expectedTransaction);
    expect(mockPrismaService.transaction.findUnique).toHaveBeenCalledWith({
      where: { id: '1', userId: 'userId' },
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });
  });
  describe('update', () => {
    const mockExistingTransaction = {
      id: '1',
      amount: 100,
      type: 'DEBIT',
      accountId: 'acc1',
      account: { id: 'acc1', balance: 500 },
      categoryId: 'cat1',
      date: new Date(),
    };

    beforeEach(() => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(mockExistingTransaction);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });
    });

    it('should update transaction details without balance change', async () => {
      const updateDto: UpdateTransactionDto = {
        description: 'Updated',
      };

      const updatedTransaction = { ...mockExistingTransaction, ...updateDto };
      mockPrismaService.transaction.update.mockResolvedValue(updatedTransaction);

      const result = await service.update('1', updateDto, 'userId');

      expect(result.description).toBe('Updated');
      expect(mockPrismaService.account.update).not.toHaveBeenCalled();
    });

    it('should update amount and adjust balance', async () => {
      const updateDto: UpdateTransactionDto = { amount: 200 };

      await service.update('1', updateDto, 'userId');

      expect(mockPrismaService.account.update).toHaveBeenCalledWith({
        where: { id: 'acc1' },
        data: { balance: 500 + (200 - 100) }, // DEBIT: 100 -> 200 difference
      });
    });

    it('should handle account change correctly', async () => {
      const newAccount = { id: 'acc2', balance: 1000 };
      const updateDto: UpdateTransactionDto = { accountId: 'acc2' };

      mockPrismaService.account.findUnique.mockResolvedValueOnce(newAccount);

      await service.update('1', updateDto, 'userId');

      // Should revert old account and update new
      expect(mockPrismaService.account.update).toHaveBeenCalledWith({
        where: { id: 'acc1' },
        data: { balance: 500 - 100 }, // Remove original DEBIT impact
      });
      expect(mockPrismaService.account.update).toHaveBeenCalledWith({
        where: { id: 'acc2' },
        data: { balance: 1000 + 100 }, // Apply original DEBIT impact
      });
    });

    it('should validate transaction type', async () => {
      await expect(service.update('1', { type: 'INVALID' } as unknown as { type: TransactionType }, 'userId'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    const mockTransaction = {
      id: '1',
      type: 'DEBIT',
      amount: 100,
      accountId: 'acc1', // Add explicit accountId
      account: { id: 'acc1', balance: 600 }, // Maintain nested relation
    };

    beforeEach(() => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });
    });

    it('should restore balance for CREDIT transaction', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...mockTransaction,
        type: 'CREDIT',
      });

      await service.delete('1', 'userId');

      expect(mockPrismaService.account.update).toHaveBeenCalledWith({
        where: { id: 'acc1' },
        data: { balance: 600 + 100 }, // Add back CREDIT amount
      });
    });

    it('should restore balance for CREDIT transaction', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...mockTransaction,
        type: 'CREDIT',
      });

      await service.delete('1', 'userId');

      expect(mockPrismaService.account.update).toHaveBeenCalledWith({
        where: { id: 'acc1' },
        data: { balance: 600 + 100 }, // Add back CREDIT amount
      });
    });

    it('should throw NotFoundException if transaction not found', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(service.delete('invalid', 'userId'))
        .rejects.toThrow(NotFoundException);
    });
  });

});
