import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { UserService } from './user.service';

@Module({
  imports: [CacheModule.register()],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule { }
