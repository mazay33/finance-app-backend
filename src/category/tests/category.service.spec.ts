import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from '../category.service';
import { DefaultCategoriesService } from '../services/default-categories.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { CategoryType, Prisma } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

describe('CategoryService', () => {
  let service: CategoryService;
  let prismaService: PrismaService;
  let cacheManager: any;
  let defaultCategoriesService: DefaultCategoriesService;

  const mockPrismaService = {
    category: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createMany: jest.fn(),
    },
    transaction: {
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('3600'),
  };

  const mockDefaultCategoriesService = {
    createForUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DefaultCategoriesService,
          useValue: mockDefaultCategoriesService,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheManager = module.get(CACHE_MANAGER);
    defaultCategoriesService = module.get<DefaultCategoriesService>(DefaultCategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const userId = 'user-id';
    const createDto: CreateCategoryDto = {
      name: 'Test Category',
      type: CategoryType.EXPENSE,
      icon: 'test-icon',
    };
    const createdCategory = {
      id: 'category-id',
      name: 'Test Category',
      type: CategoryType.EXPENSE,
      icon: 'test-icon',
      userId,
      color: '#FF5733',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a category successfully', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(null);
      mockPrismaService.category.create.mockResolvedValue(createdCategory);

      const result = await service.create(createDto, userId);

      expect(mockPrismaService.category.findFirst).toHaveBeenCalledWith({
        where: { name: createDto.name, type: createDto.type, userId },
      });
      expect(mockPrismaService.category.create).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toEqual(createdCategory.id);
    });

    it('should throw ConflictException if category already exists', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(createdCategory);

      await expect(service.create(createDto, userId)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    const userId = 'user-id';
    const categories = [
      {
        id: 'category-id-1',
        name: 'Category 1',
        type: CategoryType.EXPENSE,
        icon: 'icon-1',
        userId,
        color: '#FF5733',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'category-id-2',
        name: 'Category 2',
        type: CategoryType.INCOME,
        icon: 'icon-2',
        userId,
        color: '#33FF57',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return all categories from cache if available', async () => {
      mockCacheManager.get.mockResolvedValue(categories);

      const result = await service.findAll(userId);

      expect(mockCacheManager.get).toHaveBeenCalledWith(`category:list:${userId}`);
      expect(mockPrismaService.category.findMany).not.toHaveBeenCalled();
      expect(result).toEqual(categories);
    });

    it('should fetch categories from database and cache them if not in cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.category.findMany.mockResolvedValue(categories);

      const result = await service.findAll(userId);

      expect(mockCacheManager.get).toHaveBeenCalledWith(`category:list:${userId}`);
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });
      expect(mockCacheManager.set).toHaveBeenCalled();
      expect(result).toEqual(expect.arrayContaining(categories.map(expect.objectContaining({ id: expect.any(String) }))));
    });
  });

  describe('findOne', () => {
    const userId = 'user-id';
    const categoryId = 'category-id';
    const category = {
      id: categoryId,
      name: 'Test Category',
      type: CategoryType.EXPENSE,
      icon: 'test-icon',
      userId,
      color: '#FF5733',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return category from cache if available', async () => {
      mockCacheManager.get.mockResolvedValue(category);

      const result = await service.findOne(categoryId, userId);

      expect(mockCacheManager.get).toHaveBeenCalledWith(`category:${categoryId}:${userId}`);
      expect(mockPrismaService.category.findFirst).not.toHaveBeenCalled();
      expect(result).toEqual(category);
    });

    it('should fetch category from database and cache it if not in cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.category.findFirst.mockResolvedValue(category);

      const result = await service.findOne(categoryId, userId);

      expect(mockCacheManager.get).toHaveBeenCalledWith(`category:${categoryId}:${userId}`);
      expect(mockPrismaService.category.findFirst).toHaveBeenCalledWith({
        where: { id: categoryId, userId },
      });
      expect(mockCacheManager.set).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ id: categoryId }));
    });

    it('should throw NotFoundException if category not found', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.category.findFirst.mockResolvedValue(null);

      await expect(service.findOne(categoryId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createDefaultCategories', () => {
    const userId = 'user-id';

    it('should call defaultCategoriesService.createForUser', async () => {
      mockDefaultCategoriesService.createForUser.mockResolvedValue(undefined);

      await service.createDefaultCategories(userId);

      expect(mockDefaultCategoriesService.createForUser).toHaveBeenCalledWith(userId);
    });
  });
});
