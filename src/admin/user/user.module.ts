import { Module } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { AdminUserController } from './user.controller';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [CacheModule.register()],
  providers: [UserService],
  controllers: [AdminUserController]
})
export class UserModule { }
