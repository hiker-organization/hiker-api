import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseFilePipeBuilder,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UnprocessableEntityException,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthToken } from '../auth/guard/auth.guard.js';
import { TokenPayloadParam } from '../auth/utils/param/token-payload.param.js';
import { PayloadDTO } from '../auth/dto/payload.dto.js';
import { GetReviewsQueryDTO } from '../review/dtos/get-reviews-query.dto.js';
import { CreateTrilhaDTO } from './dtos/create-trilha.dto.js';
import { TrilhaService } from './trilha.service.js';

@UseGuards(AuthToken)
@SkipThrottle({ auth: true })
@Controller('trilha')
export class TrilhaController {
  constructor(private readonly service: TrilhaService) {}

  @UseInterceptors(FilesInterceptor('fotos', 5))
  @Post()
  create_trilha(
    @Body() data: CreateTrilhaDTO,
    @TokenPayloadParam() token: PayloadDTO,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /jpeg|jpg|png/,
          errorMessage: 'imagem precisa estar em jpeg ou jpg ou png.',
        })
        .addMaxSizeValidator({
          maxSize: 10 * (1024 * 1024),
          errorMessage: 'imagem excede tamanho permitido.',
        })
        .build({
          fileIsRequired: false,
          exceptionFactory: (error) => new UnprocessableEntityException(error),
        }),
    )
    fotos?: Array<Express.Multer.File>,
  ) {
    return this.service.create_trilha(data, token, fotos);
  }

  @Get('/me')
  my_trilhas(
    @Query() query: GetReviewsQueryDTO,
    @TokenPayloadParam() token: PayloadDTO,
  ) {
    return this.service.my_trilhas(query, token);
  }

  @Get('/feed')
  feed(@Query() query: GetReviewsQueryDTO) {
    return this.service.feed(query);
  }

  @Get('/:id')
  get_trilha(
    @Param('id', ParseIntPipe) id: number,
    @TokenPayloadParam() token: PayloadDTO,
  ) {
    return this.service.get_trilha(id, token);
  }

  @Patch('/:id/share')
  share_trilha(
    @Param('id', ParseIntPipe) id: number,
    @Query('compartilhada', ParseBoolPipe) compartilhada: boolean,
    @TokenPayloadParam() token: PayloadDTO,
  ) {
    return this.service.share_trilha(id, compartilhada, token);
  }

  @Delete('/:id')
  delete_trilha(
    @Param('id', ParseIntPipe) id: number,
    @TokenPayloadParam() token: PayloadDTO,
  ) {
    return this.service.delete_trilha(id, token);
  }
}
