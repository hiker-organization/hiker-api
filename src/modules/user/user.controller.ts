import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  UnprocessableEntityException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service.js';
import { CreateUserDTO } from './dtos/createUser.dto.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { TokenPayloadParam } from '../auth/utils/param/token-payload.param.js';
import { PayloadDTO } from '../auth/dto/payload.dto.js';
import { AuthToken } from '../auth/guard/auth.guard.js';
import { UpdateUserDTO } from './dtos/updateUser.dto.js';
import { UpdatePasswordDTO } from './dtos/updatePassword.dto.js';

@Controller('user')
export class UserController {
  constructor(private readonly service: UserService) {}

  @Post()
  @UseInterceptors(FileInterceptor('foto'))
  create_user(
    @Body() data: CreateUserDTO,
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

  @UseGuards(AuthToken)
  @Patch('change-data')
  @UseInterceptors(FileInterceptor('foto'))
  update_user(
    @Body() data: UpdateUserDTO,
    @TokenPayloadParam()
    token: PayloadDTO,
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
    return this.service.update_user(data, token, foto);
  }

  @UseGuards(AuthToken)
  @Get('/me')
  get_me(@TokenPayloadParam() token: PayloadDTO) {
    return this.service.get_me(token);
  }

  @UseGuards(AuthToken)
  @Delete('delete-account')
  delete_user(@TokenPayloadParam() token: PayloadDTO) {
    return this.service.delete_user(token);
  }

  @UseGuards(AuthToken)
  @Patch('change-password')
  update_password(
    @Body() data: UpdatePasswordDTO,
    @TokenPayloadParam() token: PayloadDTO,
  ) {
    return this.service.update_password(data, token);
  }

  @UseGuards(AuthToken)
  @Get(':nick')
  get_user(@Param('nick') nick: string, @TokenPayloadParam() token: PayloadDTO) {
    return this.service.get_user(nick, token);
  }
}
