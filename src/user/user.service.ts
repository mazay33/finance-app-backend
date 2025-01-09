import { convertToSecondsUtil } from '@common/utils';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { genSaltSync, hashSync } from 'bcrypt';
import { Cache } from 'cache-manager';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) { }

  async findMany(): Promise<User[]> {
    return this.prismaService.user.findMany();
  }

  async findOne(idOrEmail: string, isReset = false): Promise<User | null> {

    if (isReset) {
      await this.cacheManager.del(idOrEmail);
    }

    const cachedUser = await this.cacheManager.get<User>(idOrEmail);
    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.prismaService.user.findFirst({
      where: {
        OR: [{ id: idOrEmail }, { email: idOrEmail }],
      },
    });

    if (!user) {
      return null;
    }

    await this.cacheManager.set(
      idOrEmail,
      user,
      convertToSecondsUtil(this.configService.get('JWT_EXP')),
    );

    return user;
  }

  async save(user: Partial<User>): Promise<User> {
    const { email, password, provider, roles } = user;

    const hashedPassword = password ? this.hashPassword(password) : undefined;

    const savedUser = await this.prismaService.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        provider: provider ?? undefined,
        roles: roles ?? undefined,
      },
      create: {
        email,
        password: hashedPassword,
        provider,
        roles: ['USER'],
      },
    });

    await Promise.all([
      this.cacheManager.set(savedUser.id, savedUser),
      this.cacheManager.set(savedUser.email, savedUser),
    ]);

    return savedUser;
  }

  async delete(id: string): Promise<{ id: string }> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with id - "${id}" not found`);
    }

    await this.cacheManager.del(id);
    return this.prismaService.user.delete({
      where: { id },
      select: { id: true },
    });
  }

  private hashPassword(password: string): string {
    return hashSync(password, genSaltSync(10));
  }
}
