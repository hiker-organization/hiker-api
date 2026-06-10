import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  ParseBoolPipe,
  Post,
  UnprocessableEntityException,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Query,
  Patch,
} from '@nestjs/common';
import { ReviewService } from './review.service.js';
import { AuthToken } from '../auth/guard/auth.guard.js';
import { TokenPayloadParam } from '../auth/utils/param/token-payload.param.js';
import { PayloadDTO } from '../auth/dto/payload.dto.js';
import { CreateReviewDTO } from './dtos/create-review.dto.js';
import { GetReviewsQueryDTO } from './dtos/get-reviews-query.dto.js';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('review')
export class ReviewController {
  constructor(private readonly service: ReviewService) {}

  @UseGuards(AuthToken)
  @UseInterceptors(FilesInterceptor('fotos', 5))
  @Post()
  create_review(
    @Body() data: CreateReviewDTO,
    @TokenPayloadParam() token: PayloadDTO,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /jpeg|jpg|png/g,
          errorMessage: 'imagem precisa estar em jpeg ou jpg ou png.',
        })
        .addMaxSizeValidator({
          maxSize: 1 * (1024 * 1024),
          errorMessage: 'imagem excede tamanho permitido.',
        })
        .build({
          fileIsRequired: false,
          exceptionFactory: (error) => new UnprocessableEntityException(error),
        }),
    )
    fotos?: Array<Express.Multer.File>,
  ) {
    return this.service.create_review(data, token, fotos);
  }

  @UseGuards(AuthToken)
  @Get()
  get_reviews(
    @Query() query: GetReviewsQueryDTO,
    @TokenPayloadParam() token: PayloadDTO,
  ) {
    return this.service.get_reviews(query, token);
  }

  @UseGuards(AuthToken)
  @Get('/search/:term')
  search_reviews(
    @Param('term') term: string,
    @Query() query: GetReviewsQueryDTO,
    @TokenPayloadParam() token: PayloadDTO,
  ) {
    return this.service.search_reviews(term, query, token);
  }

  @UseGuards(AuthToken)
  @Get('/:id')
  get_review(
    @Param('id', ParseIntPipe) id: number,
    @TokenPayloadParam() token: PayloadDTO,
  ) {
    return this.service.get_review(id, token);
  }

  @UseGuards(AuthToken)
  @Delete('/:id')
  delete_review(
    @Param('id', ParseIntPipe) id: number,
    @TokenPayloadParam() token: PayloadDTO,
  ) {
    return this.service.delete_review(id, token);
  }

  @UseGuards(AuthToken)
  @Post('/:id/like')
  like_review(
    @Param('id', ParseIntPipe) id: number,
    @TokenPayloadParam() token: PayloadDTO,
  ) {
    return this.service.like_review(id, token);
  }

  @UseGuards(AuthToken)
  @Post('/:id/dislike')
  dislike_review(
    @Param('id', ParseIntPipe) id: number,
    @TokenPayloadParam() token: PayloadDTO,
  ) {
    return this.service.dislike_review(id, token);
  }

  @UseGuards(AuthToken)
  @Patch('/:id/visibility')
  change_review_visibility(
    @Param('id', ParseIntPipe) id: number,
    @Query('oculto', ParseBoolPipe) oculto: boolean,
    @TokenPayloadParam() token: PayloadDTO,
  ) {
    return this.service.change_review_visibility(id, oculto, token);
  }
}
