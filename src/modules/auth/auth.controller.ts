import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDTO } from './dto/login.dto.js';
import { ForgotPasswordDTO } from './dto/forgot-password.dto.js';
import { ResetPasswordDTO } from './dto/reset-password.dto.js';
import { RefreshTokenDTO } from './dto/refresh-token.dto.js';
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

  @Post('web/login')
  web_login(
    @Body() LoginDTO: LoginDTO,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login_web(LoginDTO, response);
  }

  @Post('refresh')
  refresh(@Body() refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('web/refresh')
  web_refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.refresh_web(response, request);
  }

  @Post('logout')
  logout(@Body() refreshToken: string) {
    return this.authService.logout(refreshToken);
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

  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDTO) {
    return this.authService.reset_password(resetPasswordDto);
  }
}
