import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpException,
  HttpStatus,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { JwtPayload } from 'src/auth/interfaces';
import { CurrentUser } from '@common/decorators';
import { AccountResponseDto } from './dto/account-response.dto';

@ApiTags('Account')
@ApiBearerAuth()
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) { }

  @ApiOperation({ summary: 'Get total balance of all accounts of the user' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved total accounts balance.',
    schema: {
      example: { balance: 1000 },
    },
  })
  @ApiResponse({ status: 500, description: 'Failed to get total accounts balance.' })
  @Get('/total-balance')
  async getTotalAccountsBalance(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ balance: number }> {
    try {
      return await this.accountService.getTotalAccountsBalance(user.id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get total accounts balance',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Create a new account' })
  @ApiBody({ type: CreateAccountDto })
  @ApiResponse({
    status: 201,
    description: 'Account has been successfully created.',
    type: AccountResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Failed to create account.' })
  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() createAccountDto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    try {
      return await this.accountService.create(createAccountDto, user.id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create account',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @ApiOperation({ summary: 'Get a list of all user accounts' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved list of user accounts.',
    isArray: true,
    type: AccountResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Failed to get the list of accounts.' })
  @Get('/list')
  async findAll(@CurrentUser() user: JwtPayload): Promise<AccountResponseDto[]> {
    try {
      return await this.accountService.findAll(user.id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to find all accounts',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Find an account by ID' })
  @ApiParam({ name: 'id', description: 'Account ID', example: '6f6def79-55d2-4fc6-a508-c34fb2f2133e' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved account.',
    type: AccountResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Account with the specified ID not found.' })
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<AccountResponseDto> {
    try {
      return await this.accountService.findOne(id, user.id);
    } catch (error) {
      throw new HttpException(
        error.message || `Failed to find account with id ${id}`,
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  @ApiOperation({ summary: 'Update an existing account' })
  @ApiParam({ name: 'id', description: 'Account ID', example: 'abcdef12-3456-7890-abcd-ef1234567890' })
  @ApiBody({ type: UpdateAccountDto })
  @ApiResponse({
    status: 200,
    description: 'Account has been successfully updated.',
    type: AccountResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Failed to update account.' })
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AccountResponseDto> {
    try {
      return await this.accountService.update(id, updateAccountDto, user.id);
    } catch (error) {
      throw new HttpException(
        error.message || `Failed to update account with id ${id}`,
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @ApiOperation({ summary: 'Delete an account by ID' })
  @ApiParam({ name: 'id', description: 'Account ID', example: 'abcdef12-3456-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'Successfully deleted account.' })
  @ApiResponse({ status: 400, description: 'Failed to delete account.' })
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    try {
      return await this.accountService.delete(id, user.id);
    } catch (error) {
      throw new HttpException(
        error.message || `Failed to delete account with id ${id}`,
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
