import { Test, TestingModule } from '@nestjs/testing';
import { TransactionController } from '../transaction.controller';
import { TransactionService } from '../transaction.service';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { TransactionType, AccountType } from '@prisma/client';
import Decimal from 'decimal.js';
import { Currency } from '@common/enums';
import { TransactionResponseDto } from '../dto/transaction-response.dto';

describe('TransactionController', () => {
  let controller: TransactionController;
  let service: jest.Mocked<TransactionService>;

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
  };

  const mockTransaction = {
    id: 'test-id',
    amount: new Decimal('100'),
    type: 'CREDIT' as TransactionType,
    description: 'Test Transaction',
    date: new Date('2023-01-01'),
    categoryId: 'category-id',
    accountId: 'account-id',
    userId: 'user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransactionResponse = {
    ...mockTransaction,
    amount: new Decimal('100'),
    account: {
      id: 'account-id',
      name: 'Test Account',
      type: 'CASH' as AccountType,
      balance: '1000',
      description: 'Test description',
      currency: 'USD' as Currency,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    category: {
      id: 'category-id',
      name: 'Test Category',
      type: 'EXPENSE',
      icon: 'icon',
      color: '#FFF',
    },
  };

  beforeEach(async () => {
    const mockTransactionService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
      ],
    }).compile();

    controller = module.get<TransactionController>(TransactionController);
    service = module.get(TransactionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

    it('should create a transaction', async () => {
      // Arrange
      service.create.mockResolvedValue(mockTransactionResponse as TransactionResponseDto);

      // Act
      const result = await controller.create({ id: 'user-id' } as any, createDto);

      // Assert
      expect(result).toBe(mockTransactionResponse);
      expect(service.create).toHaveBeenCalledWith(createDto, 'user-id');
    });
  });

  describe('findAll', () => {
    it('should return paginated transactions', async () => {
      // Arrange
      const mockPaginatedResponse = {
        data: [mockTransactionResponse],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll({ id: 'user-id' } as any, { page: 1, limit: 10 });

      // Assert
      expect(result).toBe(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith('user-id', { page: 1, limit: 10 });
    });
  });

  describe('findOne', () => {
    it('should return a transaction by id', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockTransactionResponse as TransactionResponseDto);

      // Act
      const result = await controller.findOne({ id: 'user-id' } as any, 'test-id');

      // Assert
      expect(result).toBe(mockTransactionResponse);
      expect(service.findOne).toHaveBeenCalledWith('test-id', 'user-id');
    });
  });

  describe('update', () => {
    const updateDto: UpdateTransactionDto = {
      amount: new Decimal('200'),
      description: 'Updated Transaction',
    };

    it('should update a transaction', async () => {
      // Arrange
      const updatedTransaction = {
        ...mockTransactionResponse,
        amount: new Decimal('200'),
        description: 'Updated Transaction',
      };
      service.update.mockResolvedValue(updatedTransaction as TransactionResponseDto);

      // Act
      const result = await controller.update({ id: 'user-id' } as any, 'test-id', updateDto);

      // Assert
      expect(result).toBe(updatedTransaction);
      expect(service.update).toHaveBeenCalledWith('test-id', updateDto, 'user-id');
    });
  });

  describe('delete', () => {
    it('should delete a transaction', async () => {
      // Arrange
      service.delete.mockResolvedValue(undefined);

      // Act
      const result = await controller.delete({ id: 'user-id' } as any, 'test-id');

      // Assert
      expect(result).toEqual({ message: 'Transaction deleted successfully' });
      expect(service.delete).toHaveBeenCalledWith('test-id', 'user-id');
    });
  });
});
