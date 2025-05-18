import { Test, TestingModule } from '@nestjs/testing';
import { DefaultCategoriesService } from '../services/default-categories.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_CATEGORIES } from '../default-categories.constant';

describe('DefaultCategoriesService', () => {
  let service: DefaultCategoriesService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    category: {
      count: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DefaultCategoriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DefaultCategoriesService>(DefaultCategoriesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createForUser', () => {
    const userId = 'user-id';

    it('should create default categories if user has no categories', async () => {
      mockPrismaService.category.count.mockResolvedValue(0);
      mockPrismaService.category.createMany.mockResolvedValue({ count: DEFAULT_CATEGORIES.length });

      await service.createForUser(userId);

      expect(mockPrismaService.category.count).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(mockPrismaService.category.createMany).toHaveBeenCalled();
      const createManyCall = mockPrismaService.category.createMany.mock.calls[0][0];
      expect(createManyCall).toHaveProperty('data');
      expect(createManyCall.data.length).toBe(DEFAULT_CATEGORIES.length);
      expect(createManyCall.data[0]).toHaveProperty('userId', userId);
      expect(createManyCall).toHaveProperty('skipDuplicates', true);
    });

    it('should skip creating categories if user already has categories', async () => {
      mockPrismaService.category.count.mockResolvedValue(5);

      await service.createForUser(userId);

      expect(mockPrismaService.category.count).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(mockPrismaService.category.createMany).not.toHaveBeenCalled();
    });

    it('should handle errors during category creation', async () => {
      mockPrismaService.category.count.mockResolvedValue(0);
      mockPrismaService.category.createMany.mockRejectedValue(new Error('Database error'));

      await expect(service.createForUser(userId)).rejects.toThrow('Database error');
    });
  });
});
