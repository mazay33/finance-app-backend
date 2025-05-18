import { Test, TestingModule } from '@nestjs/testing';
import { PrismaAccountRepository } from '../repositories/account.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { Account, AccountMember, AccountRole, AccountType, Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { Currency } from '@common/enums';

// Мок для PrismaService
const mockPrismaService = {
  account: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  accountMember: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
};

// Тестовые данные
const mockAccountId = 'test-account-id';
const mockUserId = 'test-user-id';

const mockAccount: Account = {
  id: mockAccountId,
  name: 'Test Account',
  balance: new Decimal(1000),
  type: AccountType.CASH,
  description: 'Test account description',
  isActive: true,
  currency: Currency.USD,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: mockUserId,
};

const mockAccountMember: AccountMember = {
  id: 'test-member-id',
  accountId: mockAccountId,
  userId: mockUserId,
  role: AccountRole.OWNER,
  joinedAt: new Date(),
};

describe('PrismaAccountRepository', () => {
  let repository: PrismaAccountRepository;
  let prismaService: PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaAccountRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<PrismaAccountRepository>(PrismaAccountRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('should return an account when found', async () => {
      // Arrange
      mockPrismaService.account.findUnique.mockResolvedValue(mockAccount);

      // Act
      const result = await repository.findById(mockAccountId);

      // Assert
      expect(mockPrismaService.account.findUnique).toHaveBeenCalledWith({
        where: { id: mockAccountId },
      });
      expect(result).toBe(mockAccount);
    });

    it('should return null when account not found', async () => {
      // Arrange
      mockPrismaService.account.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent-id');

      // Assert
      expect(mockPrismaService.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
      expect(result).toBeNull();
    });
  });

  describe('findByIdWithMember', () => {
    it('should return account and member when both exist', async () => {
      // Arrange
      mockPrismaService.account.findUnique.mockResolvedValue(mockAccount);
      mockPrismaService.accountMember.findFirst.mockResolvedValue(mockAccountMember);

      // Act
      const result = await repository.findByIdWithMember(mockAccountId, mockUserId);

      // Assert
      expect(mockPrismaService.account.findUnique).toHaveBeenCalledWith({
        where: { id: mockAccountId },
      });
      expect(mockPrismaService.accountMember.findFirst).toHaveBeenCalledWith({
        where: { accountId: mockAccountId, userId: mockUserId },
      });
      expect(result).toEqual({ account: mockAccount, member: mockAccountMember });
    });

    it('should return null for account and member when account not found', async () => {
      // Arrange
      mockPrismaService.account.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findByIdWithMember('non-existent-id', mockUserId);

      // Assert
      expect(mockPrismaService.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
      expect(mockPrismaService.accountMember.findFirst).not.toHaveBeenCalled();
      expect(result).toEqual({ account: null, member: null });
    });
  });

  describe('create', () => {
    it('should create and return an account', async () => {
      // Arrange
      const accountData: Prisma.AccountCreateInput = {
        name: 'New Account',
        balance: new Decimal(500),
        type: AccountType.CASH,
        description: 'New account description',
        isActive: true,
        currency: Currency.USD,
      };
      mockPrismaService.account.create.mockResolvedValue({ ...mockAccount, ...accountData });

      // Act
      const result = await repository.create(accountData);

      // Assert
      expect(mockPrismaService.account.create).toHaveBeenCalledWith({ data: accountData });
      expect(result).toEqual(expect.objectContaining(accountData));
    });
  });

  describe('update', () => {
    it('should update and return an account', async () => {
      // Arrange
      const updateData: Prisma.AccountUpdateInput = {
        name: 'Updated Account',
        description: 'Updated description',
      };
      mockPrismaService.account.update.mockResolvedValue({ ...mockAccount, ...updateData });

      // Act
      const result = await repository.update(mockAccountId, updateData);

      // Assert
      expect(mockPrismaService.account.update).toHaveBeenCalledWith({
        where: { id: mockAccountId },
        data: updateData,
      });
      expect(result).toEqual(expect.objectContaining(updateData));
    });
  });

  describe('delete', () => {
    it('should delete and return the deleted account', async () => {
      // Arrange
      mockPrismaService.account.delete.mockResolvedValue(mockAccount);

      // Act
      const result = await repository.delete(mockAccountId);

      // Assert
      expect(mockPrismaService.account.delete).toHaveBeenCalledWith({
        where: { id: mockAccountId },
      });
      expect(result).toBe(mockAccount);
    });
  });

  describe('findByUserIdWithFilters', () => {
    const pagination = { skip: 0, take: 10 };
    const orderBy: Prisma.AccountOrderByWithRelationInput[] = [{ createdAt: 'desc' as Prisma.SortOrder }];
    const filters = { type: AccountType.CASH };

    it('should return accounts and total count', async () => {
      // Arrange
      const mockAccounts = [mockAccount, { ...mockAccount, id: 'acc2', name: 'Second Account' }];
      const mockTotal = mockAccounts.length;

      mockPrismaService.account.findMany.mockResolvedValue(mockAccounts);
      mockPrismaService.account.count.mockResolvedValue(mockTotal);

      // Act
      const result = await repository.findByUserIdWithFilters(mockUserId, filters, pagination, orderBy);

      // Assert
      expect(mockPrismaService.account.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          members: { some: { userId: mockUserId } },
          type: AccountType.CASH,
        }),
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      });
      expect(mockPrismaService.account.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          members: { some: { userId: mockUserId } },
          type: AccountType.CASH,
        }),
      });
      expect(result).toEqual([mockAccounts, mockTotal]);
    });
  });

  describe('findUniqueByUserAttributes', () => {
    it('should return an account when found', async () => {
      // Arrange
      mockPrismaService.account.findFirst.mockResolvedValue(mockAccount);

      // Act
      const result = await repository.findUniqueByUserAttributes(
        'Test Account',
        Currency.USD,
        AccountType.CASH,
        mockUserId
      );

      // Assert
      expect(mockPrismaService.account.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          name: 'Test Account',
          currency: Currency.USD,
          type: AccountType.CASH,
          members: { some: { userId: mockUserId } },
        }),
      });
      expect(result).toBe(mockAccount);
    });

    it('should return null when no account found', async () => {
      // Arrange
      mockPrismaService.account.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findUniqueByUserAttributes(
        'Non-existent Account',
        Currency.USD,
        AccountType.CASH,
        mockUserId
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('createAccountMember', () => {
    it('should create and return a member', async () => {
      // Arrange
      mockPrismaService.accountMember.create.mockResolvedValue(mockAccountMember);

      // Act
      const result = await repository.createAccountMember(mockAccountId, mockUserId, AccountRole.OWNER);

      // Assert
      expect(mockPrismaService.accountMember.create).toHaveBeenCalledWith({
        data: {
          accountId: mockAccountId,
          userId: mockUserId,
          role: AccountRole.OWNER,
        },
      });
      expect(result).toBe(mockAccountMember);
    });
  });
});
