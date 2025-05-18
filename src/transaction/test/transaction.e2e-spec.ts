import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionType, AccountType } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import Decimal from 'decimal.js';
import { Currency } from '@common/enums';
import { v4 as uuidv4 } from 'uuid';

describe('TransactionController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  let userId: string;
  let accessToken: string;
  let accountId: string;
  let categoryId: string;
  let transactionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create test user
    const user = await prismaService.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        password: 'hashed-password',
        roles: ['USER'],
      },
    });
    userId = user.id;

    // Create JWT token
    accessToken = jwtService.sign({ sub: userId });

    // Create test account
    const account = await prismaService.account.create({
      data: {
        name: 'Test Account',
        type: 'CASH',
        balance: new Decimal('1000'),
        description: 'Test Account Description',
        currency: 'USD',
        isActive: true,
        userId,
      },
    });
    accountId = account.id;

    // Create test category
    const category = await prismaService.category.create({
      data: {
        name: 'Test Category',
        type: 'EXPENSE',
        icon: 'icon-test',
        color: '#FF0000',
        userId,
      },
    });
    categoryId = category.id;
  }

  async function cleanupTestData() {
    // Delete test data in reverse order to avoid foreign key constraints
    if (transactionId) {
      await prismaService.transaction.delete({
        where: { id: transactionId },
      }).catch(() => { });
    }

    if (categoryId) {
      await prismaService.category.delete({
        where: { id: categoryId },
      }).catch(() => { });
    }

    if (accountId) {
      await prismaService.account.delete({
        where: { id: accountId },
      }).catch(() => { });
    }

    if (userId) {
      await prismaService.user.delete({
        where: { id: userId },
      }).catch(() => { });
    }
  }

  describe('/transactions (POST)', () => {
    it('should create a new transaction', async () => {
      const createDto = {
        amount: '100',
        type: 'CREDIT',
        description: 'Test Transaction',
        date: new Date().toISOString(),
        categoryId,
        accountId,
      };

      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.amount).toBe('100');
      expect(response.body.type).toBe('CREDIT');
      expect(response.body.description).toBe('Test Transaction');
      expect(response.body.account).toBeDefined();
      expect(response.body.category).toBeDefined();

      transactionId = response.body.id;

      // Verify account balance was updated (decreased by 100 for CREDIT transaction)
      const updatedAccount = await prismaService.account.findUnique({
        where: { id: accountId },
      });

      expect(updatedAccount.balance.toString()).toBe('900.00');
    });

    it('should return 400 for invalid transaction data', async () => {
      const invalidDto = {
        // Missing required fields
        amount: '100',
      };

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('/transactions (GET)', () => {
    it('should return paginated transactions', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBeGreaterThan(0);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter transactions by date range', async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);

      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: today.toISOString(),
        })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('/transactions/:id (GET)', () => {
    it('should return a transaction by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(transactionId);
      expect(response.body.amount).toBe('100');
      expect(response.body.type).toBe('CREDIT');
    });

    it('should return 404 for non-existent transaction', async () => {
      const nonExistentId = uuidv4();

      await request(app.getHttpServer())
        .get(`/transactions/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('/transactions/:id (PATCH)', () => {
    it('should update a transaction', async () => {
      const updateDto = {
        amount: '200',
        description: 'Updated Transaction',
      };

      const response = await request(app.getHttpServer())
        .patch(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.amount).toBe('200');
      expect(response.body.description).toBe('Updated Transaction');

      // Verify account balance was updated (decreased by 200 instead of 100)
      const updatedAccount = await prismaService.account.findUnique({
        where: { id: accountId },
      });

      expect(updatedAccount.balance.toString()).toBe('800.00');
    });
  });

  describe('/transactions/:id (DELETE)', () => {
    it('should delete a transaction and restore account balance', async () => {
      await request(app.getHttpServer())
        .delete(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify transaction was deleted
      const deletedTransaction = await prismaService.transaction.findUnique({
        where: { id: transactionId },
      });

      expect(deletedTransaction).toBeNull();

      // Verify account balance was restored
      const updatedAccount = await prismaService.account.findUnique({
        where: { id: accountId },
      });

      expect(updatedAccount.balance.toString()).toBe('1000.00');

      // Clear transactionId to prevent cleanup attempt
      transactionId = null;
    });
  });
});
