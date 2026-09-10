import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { AuthToken } from '../auth/guard/auth.guard.js';
import { TokenPayloadParam } from '../auth/utils/param/token-payload.param.js';
import { PayloadDTO } from '../auth/dto/payload.dto.js';
import { RolesGuard } from '../auth/guard/role.guard.js';
import { Roles } from '../auth/utils/decorators/role.decorator.js';
import { Role } from '../auth/utils/enums/role.enum.js';
import { GetUsersDTO } from './utils/dto/query.dto.js';
import { BlockDTO } from './utils/dto/block.dto.js';

@UseGuards(AuthToken)
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Post()
  set(@TokenPayloadParam() token: PayloadDTO) {
    return this.service.admin(token);
  }

  @UseGuards(AuthToken, RolesGuard)
  @Roles(Role.ADMIM)
  @Get('dashboard')
  dashboard() {
    return 'ooooooiiii';
  }

  @UseGuards(AuthToken, RolesGuard)
  @Roles(Role.ADMIM)
  @Get('users')
  show_users(@Query() query: GetUsersDTO) {
    return this.service.show_users(query);
  }

  @UseGuards(AuthToken, RolesGuard)
  @Roles(Role.ADMIM)
  @Get(':nick')
  show_user(@Param('nick') nick: string) {
    return this.service.show_user(nick);
  }

  @UseGuards(AuthToken, RolesGuard)
  @Roles(Role.ADMIM)
  @Put(':nick/block')
  block(@Param('nick') nick: string, @Body() data: BlockDTO) {
    return this.service.block(nick, data);
  }

  @UseGuards(AuthToken, RolesGuard)
  @Roles(Role.ADMIM)
  @Delete(':nick/block')
  unblock(@Param('nick') nick: string) {
    return this.service.unblock(nick);
  }
}
