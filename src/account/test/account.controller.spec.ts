import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from '../account.controller';
import { AccountService } from '../account.service';
import { AccountResponseDto } from '../responses/account-response.dto';
import { Account, AccountRole, AccountType } from '@prisma/client';
import { CreateAccountDto } from '../dto/create-account.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';
import { AccountQueryDto } from '../dto/account-query.dto';
import { PaginatedAccountResponseDto } from '../responses/paginated-account-response.dto';
import Decimal from 'decimal.js';
import { JwtPayload } from 'src/auth/interfaces';
import { Currency } from '@common/enums';

// Мок для AccountService
const mockAccountService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// Мок для аутентифицированного пользователя
const mockUser: JwtPayload = {
  id: 'test-user-id',
  email: 'user@example.com',
  roles: ['USER'],
};

// Мок для данных аккаунта
const mockAccountData: AccountResponseDto = {
  id: 'test-account-id',
  name: 'Test Account',
  balance: new Decimal(1000),
  type: AccountType.CASH,
  description: 'Test account description',
  isActive: true,
  currency: Currency.USD,
  createdAt: new Date(),
  updatedAt: new Date(),
} as AccountResponseDto;

describe('AccountController', () => {
  let controller: AccountController;
  let service: AccountService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        {
          provide: AccountService,
          useValue: mockAccountService,
        },
      ],
    }).compile();

    controller = module.get<AccountController>(AccountController);
    service = module.get<AccountService>(AccountService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

    it('should create a new account', async () => {
      // Arrange
      mockAccountService.create.mockResolvedValue(mockAccountData);

      // Act
      const result = await controller.create(mockUser, createAccountDto);

      // Assert
      expect(service.create).toHaveBeenCalledWith(createAccountDto, mockUser.id);
      expect(result).toBe(mockAccountData);
    });
  });

  describe('findAll', () => {
    const query: AccountQueryDto = {
      page: 1,
      limit: 10,
    };

    const paginatedResponse: PaginatedAccountResponseDto = {
      data: [mockAccountData],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
      },
    };

    it('should return paginated accounts', async () => {
      // Arrange
      mockAccountService.findAll.mockResolvedValue(paginatedResponse);

      // Act
      const result = await controller.findAll(mockUser, query);

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(mockUser.id, query);
      expect(result).toBe(paginatedResponse);
    });
  });

  describe('findOne', () => {
    const accountId = 'test-account-id';

    it('should return an account by id', async () => {
      // Arrange
      mockAccountService.findOne.mockResolvedValue(mockAccountData);

      // Act
      const result = await controller.findOne(accountId, mockUser);

      // Assert
      expect(service.findOne).toHaveBeenCalledWith(accountId, mockUser.id);
      expect(result).toBe(mockAccountData);
    });
  });

  describe('update', () => {
    const accountId = 'test-account-id';
    const updateAccountDto: UpdateAccountDto = {
      name: 'Updated Account',
      description: 'Updated description',
    };

    it('should update an account', async () => {
      // Arrange
      const updatedAccount = { ...mockAccountData, ...updateAccountDto };
      mockAccountService.update.mockResolvedValue(updatedAccount);

      // Act
      const result = await controller.update(accountId, updateAccountDto, mockUser);

      // Assert
      expect(service.update).toHaveBeenCalledWith(accountId, updateAccountDto, mockUser.id);
      expect(result).toBe(updatedAccount);
    });
  });

  describe('delete', () => {
    const accountId = 'test-account-id';

    it('should delete an account', async () => {
      // Arrange
      mockAccountService.delete.mockResolvedValue(undefined);

      // Act
      await controller.delete(accountId, mockUser);

      // Assert
      expect(service.delete).toHaveBeenCalledWith(accountId, mockUser.id);
    });
  });
});
