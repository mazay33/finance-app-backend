import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { UserService } from './user.service';
import { UserPublicController } from './controllers/user.public.controller';
import { UserAdminController } from './controllers/user.admin.controller';

@Module({
  imports: [CacheModule.register()],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserPublicController, UserAdminController],
})
export class UserModule {}
