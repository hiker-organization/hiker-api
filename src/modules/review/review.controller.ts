import { Body, Controller, Delete, Get, Param, ParseFilePipeBuilder, ParseIntPipe, Patch, Post, UnprocessableEntityException, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { ReviewService } from './review.service.js';
import { AuthToken } from '../auth/guard/auth.guard.js';
import { TokenPayloadParam } from '../auth/utils/param/token-payload.param.js';
import { PayloadDTO } from '../auth/dto/payload.dto.js';
import { CreateReviewDTO } from './dtos/create-review.dto.js';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UpdateReviewDTO } from './dtos/update-review.dto.js';

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
        ) fotos?: Array<Express.Multer.File>
    ) {
        return this.service.create_review(data, token, fotos)
    }

    @Get()
    get_reviews() {
        return this.service.get_reviews()
    }

    @Get("/:id")
    get_review(@Param("id", ParseIntPipe) id: number) {
        return this.service.get_review(id)
    }

    @UseGuards(AuthToken)
    @UseInterceptors(FilesInterceptor('fotos', 5))
    @Patch("/:id")
    update_review(
        @Param("id", ParseIntPipe) id: number, 
        @Body() data: UpdateReviewDTO, 
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
        ) fotos?: Array<Express.Multer.File>
    ) {
        return this.service.update_review(id, data, token, fotos)
    } 

    @UseGuards(AuthToken)
    @Delete("/:id")
    delete_review(@Param("id", ParseIntPipe) id: number, @TokenPayloadParam() token: PayloadDTO) {
        return this.service.delete_review(id, token)
    }
}
