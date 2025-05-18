import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from '../transaction.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountService } from '../../account/account.service';
import { CategoryService } from '../../category/category.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { TransactionType, AccountType, CategoryType } from '@prisma/client';
import Decimal from 'decimal.js';
import { Currency } from '@common/enums';
import { TRANSACTION_REPOSITORY } from '../repositories';

describe('TransactionService', () => {
  let service: TransactionService;
  let transactionRepository;

  const mockUserId = 'user-id';
  const mockTransactionId = 'transaction-id';

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

  const mockCategory = {
    id: 'category-id',
    name: 'Test Category',
    type: CategoryType.EXPENSE,
    icon: 'icon',
    color: '#FFF',
    userId: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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

  const mockTransactionWithRelations = {
    ...mockTransaction,
    account: mockAccount,
    category: mockCategory,
  };

  // Create mock repository
  const mockTransactionRepository = {
    create: jest.fn().mockResolvedValue(mockTransaction),
    findById: jest.fn().mockResolvedValue(mockTransaction),
    findByIdWithRelations: jest.fn().mockResolvedValue(mockTransactionWithRelations),
    update: jest.fn().mockResolvedValue(mockTransaction),
    delete: jest.fn().mockResolvedValue(mockTransaction),
    findAccount: jest.fn().mockResolvedValue(mockAccount),
    validateCategoryForUser: jest.fn().mockResolvedValue(true),
    updateAccountBalance: jest.fn().mockResolvedValue(mockAccount),
    findAll: jest.fn().mockResolvedValue([mockTransactionWithRelations]),
    count: jest.fn().mockResolvedValue(1),
    findByFilters: jest.fn().mockResolvedValue([mockTransactionWithRelations]),
    countByFilters: jest.fn().mockResolvedValue(1),
    findBySqlQuery: jest.fn().mockResolvedValue([]),
    executeInTransaction: jest.fn().mockImplementation(async (callback) => {
      return await callback({
        transaction: {
          create: jest.fn().mockResolvedValue(mockTransaction)
        }
      });
    })
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: TRANSACTION_REPOSITORY,
          useValue: mockTransactionRepository
        }
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    transactionRepository = module.get(TRANSACTION_REPOSITORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateTransactionDto = {
      amount: new Decimal('100'),
      type: 'CREDIT' as TransactionType,
      description: 'Test Transaction',
      date: '2023-01-01T00:00:00.000Z',
      categoryId: 'category-id',
      accountId: 'account-id',
    };

    it('should create a transaction successfully', async () => {
      // Act
      const result = await service.create(createDto, mockUserId);

      // Assert
      expect(transactionRepository.validateCategoryForUser).toHaveBeenCalledWith(createDto.categoryId, mockUserId);
      expect(transactionRepository.findAccount).toHaveBeenCalledWith(createDto.accountId, mockUserId);
      expect(transactionRepository.updateAccountBalance).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if account not found', async () => {
      // Arrange
      transactionRepository.findAccount.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.create(createDto, mockUserId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if category not found', async () => {
      // Arrange
      transactionRepository.validateCategoryForUser.mockResolvedValueOnce(false);

      // Act & Assert
      await expect(service.create(createDto, mockUserId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated transactions', async () => {
      // Arrange
      const page = 1;
      const limit = 10;

      // Mock the required repository methods
      transactionRepository.countByFilters.mockResolvedValueOnce(1);
      transactionRepository.findByFilters.mockResolvedValueOnce([mockTransactionWithRelations]);

      // Act
      const result = await service.findAll(mockUserId, { page, limit });

      // Assert
      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(mockTransactionId);
      expect(result.data[0].description).toBe('Test Transaction');
      expect(result.pagination).toHaveProperty('total', 1);
      expect(result.pagination).toHaveProperty('page', 1);
      expect(result.pagination).toHaveProperty('limit', 10);

      // Verify that repository methods were called
      expect(transactionRepository.countByFilters).toHaveBeenCalled();
      expect(transactionRepository.findByFilters).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should find a transaction by id', async () => {
      // Act
      transactionRepository.findByIdWithRelations.mockResolvedValueOnce(mockTransactionWithRelations);
      const result = await service.findOne(mockTransactionId, mockUserId);

      // Assert
      expect(transactionRepository.findByIdWithRelations).toHaveBeenCalledWith(mockTransactionId, mockUserId);
      expect(result).toEqual(mockTransactionWithRelations);
    });

    it('should throw NotFoundException if transaction not found', async () => {
      // Arrange
      transactionRepository.findByIdWithRelations.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.findOne(mockTransactionId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateTransactionDto = {
      amount: new Decimal('200'),
      description: 'Updated Transaction',
    };

    const oldTransaction = { ...mockTransaction };
    const updatedTransaction = {
      ...mockTransaction,
      amount: new Decimal('200'),
      description: 'Updated Transaction'
    };
    const updatedTransactionWithRelations = {
      ...updatedTransaction,
      account: mockAccount,
      category: mockCategory,
    };

    it('should update a transaction successfully', async () => {
      // Arrange
      transactionRepository.findById.mockResolvedValueOnce(oldTransaction);
      transactionRepository.findByIdWithRelations.mockResolvedValueOnce(updatedTransactionWithRelations);
      transactionRepository.update.mockResolvedValue(updatedTransaction);

      transactionRepository.executeInTransaction.mockImplementation(async (callback) => {
        return await callback({});
      });

      // Act
      const result = await service.update(mockTransactionId, updateDto, mockUserId);

      // Assert
      expect(transactionRepository.findById).toHaveBeenCalledWith(mockTransactionId, mockUserId);
      expect(transactionRepository.update).toHaveBeenCalledWith(mockTransactionId, expect.objectContaining({
        amount: updateDto.amount,
        description: updateDto.description,
      }));
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if transaction not found', async () => {
      // Arrange
      transactionRepository.findById.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.update(mockTransactionId, updateDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a transaction successfully', async () => {
      // Arrange
      transactionRepository.findById.mockResolvedValueOnce(mockTransaction);
      transactionRepository.findAccount.mockResolvedValueOnce(mockAccount);
      transactionRepository.delete.mockResolvedValueOnce(mockTransaction);

      transactionRepository.executeInTransaction.mockImplementation(async (callback) => {
        return await callback({});
      });

      // Act
      await service.delete(mockTransactionId, mockUserId);

      // Assert
      expect(transactionRepository.findById).toHaveBeenCalledWith(mockTransactionId, mockUserId);
      expect(transactionRepository.delete).toHaveBeenCalledWith(mockTransactionId);
    });

    it('should throw NotFoundException if transaction not found', async () => {
      // Arrange
      transactionRepository.findById.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.delete(mockTransactionId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
