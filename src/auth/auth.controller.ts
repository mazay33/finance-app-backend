import { Cookie, Public, UserAgent } from '@common/decorators';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserResponse } from 'src/user/responses';
import { Request, Response } from 'express';
import { map, mergeMap } from 'rxjs';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { GoogleGuard } from './guards/google.guard';
import { Tokens } from './interfaces';

import { Provider } from '@prisma/client';
import { handleTimeoutAndErrors } from '@common/helpers';
import { YandexGuard } from './guards/yandex.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

const REFRESH_TOKEN = 'refreshtoken';
@ApiTags('Auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Пользователь успешно зарегистрирован',
    type: UserResponse,
  })
  @ApiBadRequestResponse({
    description: 'Не получается зарегистрировать пользователя',
  })
  @UseInterceptors(ClassSerializerInterceptor)
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    if (!user) {
      throw new BadRequestException(
        `Не получается зарегистрировать пользователя с данными ${JSON.stringify(dto)}`,
      );
    }
    return new UserResponse(user);
  }

  @ApiOperation({ summary: 'Вход пользователя' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Пользователь успешно вошел',
  })
  @ApiBadRequestResponse({ description: 'Не получается войти' })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res() res: Response,
    @UserAgent() agent: string,
  ) {
    const tokens = await this.authService.login(dto, agent);

    if (!tokens) {
      throw new BadRequestException(
        `Не получается войти с данными ${JSON.stringify(dto)}`,
      );
    }
    this.setRefreshTokenToCookies(tokens, res);
  }

  @ApiOperation({ summary: 'Выход пользователя' })
  @ApiCookieAuth()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Пользователь успешно вышел',
  })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Неавторизованный запрос' })
  @Get('logout')
  async logout(
    @Cookie(REFRESH_TOKEN) refreshToken: string,
    @Res() res: Response,
  ) {
    if (!refreshToken) {
      res.sendStatus(HttpStatus.OK);
      return;
    }
    await this.authService.deleteRefreshToken(refreshToken);
    res.cookie(REFRESH_TOKEN, '', {
      httpOnly: true,
      secure: true,
      expires: new Date(),
    });
    res.sendStatus(HttpStatus.OK);
  }

  @ApiOperation({ summary: 'Обновление токенов' })
  @ApiCookieAuth()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Токены успешно обновлены',
  })
  @ApiUnauthorizedResponse({ description: 'Неавторизованный запрос' })
  @Get('refresh-tokens')
  async refreshTokens(
    @Cookie(REFRESH_TOKEN) refreshToken: string,
    @Req() req: Request,
    @Res() res: Response,
    @UserAgent() agent: string,
  ) {
    if (!refreshToken) {
      throw new UnauthorizedException();
    }
    const tokens = await this.authService.refreshTokens(refreshToken, agent);
    if (!tokens) {
      throw new UnauthorizedException();
    }
    this.setRefreshTokenToCookies(tokens, res);
  }

  @ApiOperation({ summary: 'Авторизация через Google' })
  @UseGuards(GoogleGuard)
  @Get('google')
  googleAuth() {}

  @ApiOperation({ summary: 'Callback для авторизации через Google' })
  @UseGuards(GoogleGuard)
  @Get('google/callback')
  googleAuthCallback(
    @Req() req: Request extends { user: Tokens } ? Request : any,
    @Res() res: Response,
  ) {
    const token = req.user['accessToken'];
    return res.redirect(
      `${this.configService.get('CLIENT_URL')}/auth/success-google?token=${token}`,
    );
  }

  @ApiOperation({ summary: 'Успешная авторизация через Google' })
  @ApiQuery({ name: 'token', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Успешная авторизация через Google',
  })
  @Get('success-google')
  successGoogle(
    @Query('token') token: string,
    @UserAgent() agent: string,
    @Res() res: Response,
  ) {
    return this.httpService
      .get(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`,
      )
      .pipe(
        mergeMap(({ data: { email } }) =>
          this.authService.providerAuth(email, agent, Provider.GOOGLE),
        ),
        map((data) => this.setRefreshTokenToCookies(data, res)),
        handleTimeoutAndErrors(),
      );
  }

  @ApiOperation({ summary: 'Авторизация через Yandex' })
  @UseGuards(YandexGuard)
  @Get('yandex')
  yandexAuth() {}

  @ApiOperation({ summary: 'Callback для авторизации через Yandex' })
  @UseGuards(YandexGuard)
  @Get('yandex/callback')
  yandexAuthCallback(
    @Req() req: Request extends { user: Tokens } ? Request : any,
    @Res() res: Response,
  ) {
    const token: string = req.user['accessToken'];
    return res.redirect(
      `${this.configService.get('CLIENT_URL')}/auth/success-yandex?token=${token}`,
    );
  }

  @ApiOperation({ summary: 'Успешная авторизация через Yandex' })
  @ApiQuery({ name: 'token', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Успешная авторизация через Yandex',
  })
  @Get('success-yandex')
  successYandex(
    @Query('token') token: string,
    @UserAgent() agent: string,
    @Res() res: Response,
  ) {
    return this.httpService
      .get(`https://login.yandex.ru/info?format=json&oauth_token=${token}`)
      .pipe(
        mergeMap(({ data: { default_email } }) =>
          this.authService.providerAuth(default_email, agent, Provider.YANDEX),
        ),
        map((data) => this.setRefreshTokenToCookies(data, res)),
        handleTimeoutAndErrors(),
      );
  }

  private setRefreshTokenToCookies(tokens: Tokens, res: Response) {
    if (!tokens) {
      throw new UnauthorizedException();
    }
    res.cookie(REFRESH_TOKEN, tokens.refreshToken.token, {
      httpOnly:
        this.configService.get('NODE_ENV') === 'production' ? true : false,
      sameSite:
        this.configService.get('NODE_ENV') === 'production' ? 'lax' : 'none',
      expires: new Date(tokens.refreshToken.exp),
      secure: true,
      path: '/',
    });
    res.status(HttpStatus.CREATED).json({ accessToken: tokens.accessToken });
  }
}
