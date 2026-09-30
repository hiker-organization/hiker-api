import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthToken } from '../auth/guard/auth.guard.js';
import { SearchLocalDTO } from './dtos/search-local.dto.js';
import { LocalService } from './local.service.js';

@SkipThrottle({ auth: true })
@Controller('local')
export class LocalController {
  constructor(private readonly service: LocalService) {}

  @UseGuards(AuthToken)
  @Get('search')
  search(@Query() query: SearchLocalDTO) {
    return this.service.search(query.q);
  }
}
