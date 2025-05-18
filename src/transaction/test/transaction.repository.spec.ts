import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaTransactionRepository, ITransactionRepository } from '../repositories';
import { TransactionType, AccountType, CategoryType } from '@prisma/client';
import Decimal from 'decimal.js';
import { Currency } from '@common/enums';

describe('TransactionRepository', () => {
  let repository: PrismaTransactionRepository;
  let prismaService: PrismaService;

  const mockUserId = 'user-id';
  const mockTransactionId = 'transaction-id';

  const mockTransaction = {
    id: mockTransactionId,
    amount: new Decimal('100'),
    type: 'CREDIT' as TransactionType,
    description: 'Test Transaction',
    date: new Date('2023-01-01'),
    categoryId: 'category-id',
    accountId: 'account-id',
    userId: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAccount = {
    id: 'account-id',
    name: 'Test Account',
    type: 'CASH' as AccountType,
    balance: new Decimal('1000'),
    description: 'Test description',
    currency: 'USD' as Currency,
    isActive: true,
    userId: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Create a mock category with required fields
  const mockCategory = {
    id: 'category-id',
    name: 'Test Category',
    type: CategoryType.EXPENSE,
    icon: 'icon',
    color: '#FFFFFF',
    userId: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      transaction: {
        create: jest.fn().mockReturnValue({
          mockResolvedValue: jest.fn()
        }),
        findFirst: jest.fn().mockReturnValue({
          mockResolvedValue: jest.fn()
        }),
        findUnique: jest.fn().mockReturnValue({
          mockResolvedValue: jest.fn()
        }),
        findMany: jest.fn().mockReturnValue({
          mockResolvedValue: jest.fn()
        }),
        update: jest.fn().mockReturnValue({
          mockResolvedValue: jest.fn()
        }),
        delete: jest.fn().mockReturnValue({
          mockResolvedValue: jest.fn()
        }),
        count: jest.fn().mockReturnValue({
          mockResolvedValue: jest.fn()
        }),
      },
      account: {
        findFirst: jest.fn().mockReturnValue({
          mockResolvedValue: jest.fn()
        }),
        findUnique: jest.fn().mockReturnValue({
          mockResolvedValue: jest.fn()
        }),
        update: jest.fn().mockReturnValue({
          mockResolvedValue: jest.fn()
        }),
      },
      category: {
        findFirst: jest.fn().mockReturnValue({
          mockResolvedValue: jest.fn()
        }),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaTransactionRepository,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    repository = module.get<PrismaTransactionRepository>(PrismaTransactionRepository);
    prismaService = module.get(PrismaService);

    // Setup mock implementations after getting the service
    jest.spyOn(prismaService.transaction, 'create').mockResolvedValue(mockTransaction);
    jest.spyOn(prismaService.transaction, 'findFirst').mockResolvedValue(mockTransaction);
    jest.spyOn(prismaService.transaction, 'update').mockResolvedValue(mockTransaction);
    jest.spyOn(prismaService.transaction, 'delete').mockResolvedValue(mockTransaction);
    jest.spyOn(prismaService.account, 'findFirst').mockResolvedValue(mockAccount);
    jest.spyOn(prismaService.account, 'update').mockResolvedValue(mockAccount);
    jest.spyOn(prismaService.category, 'findFirst').mockResolvedValue(mockCategory);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a transaction', async () => {
      // Arrange
      jest.spyOn(prismaService.transaction, 'create').mockResolvedValue(mockTransaction);

      // Act
      const result = await repository.create({
        amount: new Decimal('100'),
        type: 'CREDIT',
        description: 'Test Transaction',
        date: new Date('2023-01-01'),
        categoryId: 'category-id',
        accountId: 'account-id',
        userId: mockUserId,
      });

      // Assert
      expect(result).toEqual(mockTransaction);
      expect(prismaService.transaction.create).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find a transaction by id', async () => {
      // Arrange
      jest.spyOn(prismaService.transaction, 'findFirst').mockResolvedValue(mockTransaction);

      // Act
      const result = await repository.findById(mockTransactionId, mockUserId);

      // Assert
      expect(result).toEqual(mockTransaction);
      expect(prismaService.transaction.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockTransactionId,
          userId: mockUserId,
        },
      });
    });

    it('should return null when transaction not found', async () => {
      // Arrange
      jest.spyOn(prismaService.transaction, 'findFirst').mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent-id', mockUserId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByIdWithRelations', () => {
    it('should find a transaction with relations', async () => {
      // Arrange
      const transactionWithRelations = {
        ...mockTransaction,
        account: mockAccount,
        category: mockCategory,
      };
      jest.spyOn(prismaService.transaction, 'findFirst').mockResolvedValue(transactionWithRelations);

      // Act
      const result = await repository.findByIdWithRelations(mockTransactionId, mockUserId);

      // Assert
      expect(result).toEqual(transactionWithRelations);
      expect(prismaService.transaction.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockTransactionId,
          userId: mockUserId,
        },
        include: {
          account: { select: { name: true, type: true, currency: true } },
          category: { select: { name: true } },
        },
      });
    });
  });

  describe('update', () => {
    it('should update a transaction', async () => {
      // Arrange
      const updatedTransaction = {
        ...mockTransaction,
        amount: new Decimal('200'),
        description: 'Updated Transaction',
      };
      jest.spyOn(prismaService.transaction, 'update').mockResolvedValue(updatedTransaction);

      // Act
      const result = await repository.update(mockTransactionId, {
        amount: new Decimal('200'),
        description: 'Updated Transaction',
      });

      // Assert
      expect(result).toEqual(updatedTransaction);
      expect(prismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: mockTransactionId },
        data: {
          amount: new Decimal('200'),
          description: 'Updated Transaction',
        },
        include: {
          account: { select: { name: true, type: true, currency: true } },
          category: { select: { name: true } },
        },
      });
    });
  });

  describe('delete', () => {
    it('should delete a transaction', async () => {
      // Arrange
      jest.spyOn(prismaService.transaction, 'delete').mockResolvedValue(mockTransaction);

      // Act
      const result = await repository.delete(mockTransactionId);

      // Assert
      expect(result).toEqual(mockTransaction);
      expect(prismaService.transaction.delete).toHaveBeenCalledWith({
        where: { id: mockTransactionId },
      });
    });
  });

  describe('validateUserAccessToAccount', () => {
    it('should return true when user has access to account', async () => {
      // Arrange
      jest.spyOn(prismaService.account, 'findFirst').mockResolvedValue(mockAccount);

      // Act
      const result = await repository.validateUserAccessToAccount('account-id', mockUserId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user does not have access to account', async () => {
      // Arrange
      jest.spyOn(prismaService.account, 'findFirst').mockResolvedValue(null);

      // Act
      const result = await repository.validateUserAccessToAccount('account-id', 'wrong-user');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('validateCategoryForUser', () => {
    it('should return true when category belongs to user', async () => {
      // Arrange
      jest.spyOn(prismaService.category, 'findFirst').mockResolvedValue(mockCategory);

      // Act
      const result = await repository.validateCategoryForUser('category-id', mockUserId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when category does not belong to user', async () => {
      // Arrange
      jest.spyOn(prismaService.category, 'findFirst').mockResolvedValue(null);

      // Act
      const result = await repository.validateCategoryForUser('category-id', 'wrong-user');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('findAccount', () => {
    it('should find an account', async () => {
      // Arrange
      jest.spyOn(prismaService.account, 'findFirst').mockResolvedValue(mockAccount);

      // Act
      const result = await repository.findAccount('account-id', mockUserId);

      // Assert
      expect(result).toEqual(mockAccount);
    });

    it('should return null when account not found', async () => {
      // Arrange
      jest.spyOn(prismaService.account, 'findFirst').mockResolvedValue(null);

      // Act
      const result = await repository.findAccount('non-existent-id', mockUserId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateAccountBalance', () => {
    it('should update account balance', async () => {
      // Arrange
      const updatedAccount = { ...mockAccount, balance: new Decimal('1100') };
      jest.spyOn(prismaService.account, 'update').mockResolvedValue(updatedAccount);

      // Act
      const result = await repository.updateAccountBalance('account-id', new Decimal('1100'));

      // Assert
      expect(result).toEqual(updatedAccount);
      expect(prismaService.account.update).toHaveBeenCalledWith({
        where: { id: 'account-id' },
        data: { balance: new Decimal('1100') }
      });
    });

    it('should use provided prisma client when available', async () => {
      // Arrange
      const mockPrismaClient = { account: { update: jest.fn() } };
      const updatedAccount = { ...mockAccount, balance: new Decimal('1200') };
      mockPrismaClient.account.update = jest.fn().mockResolvedValue(updatedAccount);

      // Act
      const result = await repository.updateAccountBalance('account-id', new Decimal('1200'), mockPrismaClient);

      // Assert
      expect(result).toEqual(updatedAccount);
      expect(mockPrismaClient.account.update).toHaveBeenCalledWith({
        where: { id: 'account-id' },
        data: { balance: new Decimal('1200') }
      });
    });
  });
});
