import {
  Body,
  Controller,
  ParseFilePipeBuilder,
  Post,
  UnprocessableEntityException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service.js';
import { createUserDTO } from './dtos/createUser.dto.js';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('user')
export class UserController {
  constructor(private readonly service: UserService) {}

  @Post()
  @UseInterceptors(FileInterceptor('foto'))
  create_user(
    @Body() data: createUserDTO,
    @UploadedFile(
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
    foto?: Express.Multer.File,
  ) {
    return this.service.create_user(data, foto);
  }
}
