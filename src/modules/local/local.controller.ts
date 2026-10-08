import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthToken } from '../auth/guard/auth.guard.js';
import { SearchLocalDTO } from './dtos/search-local.dto.js';
import { GetLocaisDTO } from './dtos/get-locais.dto.js';
import { LocalService } from './local.service.js';

const PLACE_ID = /^[A-Za-z0-9_-]+$/;

@SkipThrottle({ auth: true })
@Controller('local')
export class LocalController {
  constructor(private readonly service: LocalService) {}

  @UseGuards(AuthToken)
  @Get('search')
  search(@Query() query: SearchLocalDTO) {
    return this.service.search(query.q);
  }

  // Search page: only places that already have reviews.
  @UseGuards(AuthToken)
  @Get('buscar')
  buscar(@Query() query: SearchLocalDTO) {
    return this.service.buscar(query.q);
  }

  // Location of several places at once, for the review cards.
  @UseGuards(AuthToken)
  @Get()
  get_locais(@Query() query: GetLocaisDTO) {
    return this.service.get_locais(query.ids);
  }

  // RF7: place page with rating, number of reviews and labels.
  @UseGuards(AuthToken)
  @Get(':placeId')
  get_local(@Param('placeId') placeId: string) {
    if (!PLACE_ID.test(placeId))
      throw new BadRequestException('local inválido.');
    return this.service.get_local(placeId);
  }
}
