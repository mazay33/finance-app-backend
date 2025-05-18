import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from '../account.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCOUNT_REPOSITORY } from '../repositories';
import { Account, AccountMember, AccountRole, AccountType, Prisma } from '@prisma/client';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateAccountDto } from '../dto/create-account.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';
import Decimal from 'decimal.js';
import { AccountQueryDto } from '../dto/account-query.dto';
import { Currency } from '@common/enums';

// Моки для тестов
const mockPrismaService = {
  $transaction: jest.fn((callback) => callback(mockPrismaService)),
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
  category: {
    findMany: jest.fn(),
  },
  accountCategory: {
    createMany: jest.fn(),
  },
};

const mockAccountRepository = {
  findById: jest.fn(),
  findByIdWithMember: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByUserIdWithFilters: jest.fn(),
  findUniqueByUserAttributes: jest.fn(),
  createAccountMember: jest.fn(),
  isUserOwner: jest.fn(),
};

const mockAccountId = 'test-account-id';
const mockUserId = 'test-user-id';

const mockAccount: Account = {
  id: mockAccountId,
  name: 'Test Account',
  balance: new Decimal(1000),
  type: AccountType.CASH,
  description: 'Test account description',
  isActive: true,
  currency: 'USD',
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

describe('AccountService', () => {
  let service: AccountService;
  let prismaService: PrismaService;
  let accountRepository: typeof mockAccountRepository;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ACCOUNT_REPOSITORY,
          useValue: mockAccountRepository,
        },
      ],
    }).compile();

    service = module.get<AccountService>(AccountService);
    prismaService = module.get<PrismaService>(PrismaService);
    accountRepository = module.get(ACCOUNT_REPOSITORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createAccountDto: CreateAccountDto = {
      name: 'New Account',
      balance: new Decimal(500),
      type: AccountType.CASH,
      description: 'New account description',
      isActive: true,
      currency: Currency.USD,
    };

    const categories = [
      { id: 'cat1', name: 'Food' },
      { id: 'cat2', name: 'Entertainment' },
    ];

    it('should create a new account successfully', async () => {
      // Arrange
      mockAccountRepository.findUniqueByUserAttributes.mockResolvedValue(null);
      mockPrismaService.account.create.mockResolvedValue({ ...mockAccount, name: createAccountDto.name });
      mockPrismaService.accountMember.create.mockResolvedValue(mockAccountMember);
      mockPrismaService.category.findMany.mockResolvedValue(categories);

      // Act
      const result = await service.create(createAccountDto, mockUserId);

      // Assert
      expect(mockAccountRepository.findUniqueByUserAttributes).toHaveBeenCalledWith(
        createAccountDto.name,
        createAccountDto.currency,
        createAccountDto.type,
        mockUserId
      );
      expect(mockPrismaService.account.create).toHaveBeenCalledWith({
        data: {
          name: createAccountDto.name,
          balance: createAccountDto.balance,
          type: createAccountDto.type,
          description: createAccountDto.description,
          isActive: createAccountDto.isActive,
          currency: createAccountDto.currency,
        },
      });
      expect(mockPrismaService.accountMember.create).toHaveBeenCalled();
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId }
      });
      expect(mockPrismaService.accountCategory.createMany).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.name).toBe(createAccountDto.name);
    });

    it('should throw ConflictException when account with the same name exists', async () => {
      // Arrange
      mockAccountRepository.findUniqueByUserAttributes.mockResolvedValue(mockAccount);

      // Act & Assert
      await expect(service.create(createAccountDto, mockUserId)).rejects.toThrow(ConflictException);
      expect(mockAccountRepository.findUniqueByUserAttributes).toHaveBeenCalled();
      expect(mockPrismaService.account.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const mockQuery: AccountQueryDto = {
      search: 'test',
      page: 1,
      limit: 10,
    };

    const mockAccounts = [mockAccount, { ...mockAccount, id: 'acc2', name: 'Second Account' }];
    const mockTotal = mockAccounts.length;

    it('should return paginated accounts', async () => {
      // Arrange
      mockAccountRepository.findByUserIdWithFilters.mockResolvedValue([mockAccounts, mockTotal]);

      // Act
      const result = await service.findAll(mockUserId, mockQuery);

      // Assert
      expect(mockAccountRepository.findByUserIdWithFilters).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.data).toHaveLength(mockAccounts.length);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(mockTotal);
    });
  });

  describe('findOne', () => {
    it('should return an account by id', async () => {
      // Arrange
      mockAccountRepository.findByIdWithMember.mockResolvedValue({
        account: mockAccount,
        member: mockAccountMember,
      });

      // Act
      const result = await service.findOne(mockAccountId, mockUserId);

      // Assert
      expect(mockAccountRepository.findByIdWithMember).toHaveBeenCalledWith(mockAccountId, mockUserId);
      expect(result).toBeDefined();
      expect(result.id).toBe(mockAccountId);
    });

    it('should throw NotFoundException when account not found', async () => {
      // Arrange
      mockAccountRepository.findByIdWithMember.mockResolvedValue({
        account: null,
        member: null,
      });

      // Act & Assert
      await expect(service.findOne(mockAccountId, mockUserId)).rejects.toThrow(NotFoundException);
      expect(mockAccountRepository.findByIdWithMember).toHaveBeenCalledWith(mockAccountId, mockUserId);
    });
  });

  describe('update', () => {
    const updateAccountDto: UpdateAccountDto = {
      name: 'Updated Account',
      description: 'Updated description',
    };

    it('should update an account successfully', async () => {
      // Arrange
      mockAccountRepository.findByIdWithMember.mockResolvedValue({
        account: mockAccount,
        member: mockAccountMember,
      });
      mockAccountRepository.findUniqueByUserAttributes.mockResolvedValue(null);
      mockPrismaService.account.update.mockResolvedValue({
        ...mockAccount,
        ...updateAccountDto,
      });

      // Act
      const result = await service.update(mockAccountId, updateAccountDto, mockUserId);

      // Assert
      expect(mockAccountRepository.findByIdWithMember).toHaveBeenCalledWith(mockAccountId, mockUserId);
      expect(mockPrismaService.account.update).toHaveBeenCalledWith({
        where: { id: mockAccountId },
        data: expect.any(Object),
      });
      expect(result).toBeDefined();
      expect(result.name).toBe(updateAccountDto.name);
    });

    it('should throw NotFoundException when account not found', async () => {
      // Arrange
      mockAccountRepository.findByIdWithMember.mockResolvedValue({
        account: null,
        member: null,
      });

      // Act & Assert
      await expect(service.update(mockAccountId, updateAccountDto, mockUserId)).rejects.toThrow(NotFoundException);
      expect(mockAccountRepository.findByIdWithMember).toHaveBeenCalledWith(mockAccountId, mockUserId);
    });

    it('should throw ConflictException when new name conflicts with existing account', async () => {
      // Arrange
      mockAccountRepository.findByIdWithMember.mockResolvedValue({
        account: mockAccount,
        member: mockAccountMember,
      });
      mockAccountRepository.findUniqueByUserAttributes.mockResolvedValue({
        ...mockAccount,
        id: 'different-id',
      });

      // Act & Assert
      await expect(service.update(mockAccountId, updateAccountDto, mockUserId)).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete an account successfully', async () => {
      // Arrange
      mockAccountRepository.findByIdWithMember.mockResolvedValue({
        account: mockAccount,
        member: mockAccountMember,
      });
      mockAccountRepository.isUserOwner.mockResolvedValue(true);
      mockPrismaService.account.delete.mockResolvedValue(mockAccount);

      // Act
      await service.delete(mockAccountId, mockUserId);

      // Assert
      expect(mockAccountRepository.findByIdWithMember).toHaveBeenCalledWith(mockAccountId, mockUserId);
      expect(mockPrismaService.account.delete).toHaveBeenCalledWith({
        where: { id: mockAccountId },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      // Arrange
      mockAccountRepository.findByIdWithMember.mockResolvedValue({
        account: null,
        member: null,
      });

      // Act & Assert
      await expect(service.delete(mockAccountId, mockUserId)).rejects.toThrow(NotFoundException);
      expect(mockAccountRepository.findByIdWithMember).toHaveBeenCalledWith(mockAccountId, mockUserId);
    });
  });
});