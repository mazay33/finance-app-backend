// account.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { JwtPayload } from 'src/auth/interfaces';
import { CurrentUser } from '@common/decorators';

@ApiTags('accounts')
@ApiBearerAuth()
@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({
    status: 201,
    description: 'The account has been successfully created.',
  })
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() createAccountDto: CreateAccountDto,
  ) {
    return this.accountService.create({ ...createAccountDto, userId: user.id });
  }

  @ApiOperation({ summary: 'Get all accounts for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Return all accounts for the current user.',
  })
  @Get('/list')
  findAll(@CurrentUser() user: JwtPayload) {
    return this.accountService.findAll(user.id);
  }

  @ApiOperation({
    summary: 'Get the total balance of all accounts for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Return the total balance of all user accounts.',
  })
  @Get('balance')
  getTotalBalance(@CurrentUser() user: JwtPayload) {
    return this.accountService.getTotalBalance(user.id);
  }

  @ApiOperation({ summary: 'Get a specific account by ID' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the account',
    example: '1',
  })
  @ApiResponse({ status: 200, description: 'Return the requested account.' })
  @ApiResponse({ status: 404, description: 'Account not found.' })
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.accountService.findOne(+id, user.id);
  }

  @ApiOperation({ summary: 'Update a specific account' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the account',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'The account has been successfully updated.',
  })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    return this.accountService.update(+id, user.id, updateAccountDto);
  }

  @ApiOperation({ summary: 'Delete a specific account' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the account',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'The account has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Account not found.' })
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.accountService.remove(+id, user.id);
  }
}
