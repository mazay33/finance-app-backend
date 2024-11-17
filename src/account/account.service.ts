// account.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAccountDto: CreateAccountDto) {
    return this.prisma.account.create({
      data: createAccountDto,
    });
  }

  async findAll(userId: string) {
    return this.prisma.account.findMany({
      where: { userId },
    });
  }

  async findOne(id: number, userId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    return account;
  }

  async update(id: number, userId: string, updateAccountDto: UpdateAccountDto) {
    const account = await this.findOne(id, userId);

    return this.prisma.account.update({
      where: { id: account.id },
      data: updateAccountDto,
    });
  }

  async remove(id: number, userId: string) {
    const account = await this.findOne(id, userId);

    return this.prisma.account.delete({
      where: { id: account.id },
    });
  }

  async getTotalBalance(userId: string): Promise<number> {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: { balance: true },
    });

    return accounts.reduce((total, account) => total + account.balance, 0);
  }
}
