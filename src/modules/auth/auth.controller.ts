import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { GoogleLoginDTO } from './dto/google-login.dto.js';
import { GoogleRegisterDTO } from './dto/google-register.dto.js';
import { AuthToken } from './guard/auth.guard.js';
import { TokenPayloadParam } from './utils/param/token-payload.param.js';
import { PayloadDTO } from './dto/payload.dto.js';
import { AuthService } from './auth.service.js';
import { LoginDTO } from './dto/login.dto.js';
import { ForgotPasswordDTO } from './dto/forgot-password.dto.js';
import { ResetPasswordDTO } from './dto/reset-password.dto.js';
import { RefreshTokenDTO } from './dto/refresh-token.dto.js';
import { VerifyResetCodeDTO } from './dto/verify-reset-code.dto.js';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response, Request } from 'express';

@SkipThrottle({ global: true })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDTO) {
    return this.authService.login(loginDto);
  }

  @Post('google')
  login_google(@Body() data: GoogleLoginDTO) {
    return this.authService.login_google(data);
  }

  @Post('google/register')
  register_google(@Body() data: GoogleRegisterDTO) {
    return this.authService.register_google(data);
  }

  @UseGuards(AuthToken)
  @Post('google/link')
  link_google(
    @Body() data: GoogleLoginDTO,
    @TokenPayloadParam() token: PayloadDTO,
  ) {
    return this.authService.link_google(data, token);
  }

  @Post('web/login')
  web_login(
    @Body() LoginDTO: LoginDTO,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login_web(LoginDTO, response);
  }

  @Post('refresh')
  refresh(@Body() refreshTokenDto: RefreshTokenDTO) {
    return this.authService.refresh(refreshTokenDto.refresh_token);
  }

  @Post('web/refresh')
  web_refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.refresh_web(response, request);
  }

  @Post('logout')
  logout(@Body() refreshTokenDto: RefreshTokenDTO) {
    return this.authService.logout(refreshTokenDto.refresh_token);
  }

  @Post('web/logout')
  web_logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.logout_web(response, request);
  }

  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDTO) {
    return this.authService.forgot_password(forgotPasswordDto);
  }

  @Post('verify-reset-code')
  verifyResetCode(@Body() verifyResetCodeDto: VerifyResetCodeDTO) {
    return this.authService.verify_reset_code(verifyResetCodeDto);
  }

  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDTO) {
    return this.authService.reset_password(resetPasswordDto);
  }
}
