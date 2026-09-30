import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
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
import { RequestEmailChangeDTO } from './dtos/requestEmailChange.dto.js';
import { ConfirmEmailChangeDTO } from './dtos/confirmEmailChange.dto.js';
import { SkipThrottle } from '@nestjs/throttler';
import { GetReviewsQueryDTO } from '../review/dtos/get-reviews-query.dto.js';

@SkipThrottle({ auth: true })
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
          fileType: /jpeg|jpg|png/,
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
          fileType: /jpeg|jpg|png/,
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
  @Get('/me/favorites')
  favorites_reviews(
    @TokenPayloadParam() token: PayloadDTO,
    @Query() query: GetReviewsQueryDTO,
  ) {
    return this.service.favorites(token, query);
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
  @Post('change-email')
  request_email_change(
    @Body() data: RequestEmailChangeDTO,
    @TokenPayloadParam() token: PayloadDTO,
  ) {
    return this.service.request_email_change(data, token);
  }

  @UseGuards(AuthToken)
  @Post('change-email/confirm')
  confirm_email_change(
    @Body() data: ConfirmEmailChangeDTO,
    @TokenPayloadParam() token: PayloadDTO,
  ) {
    return this.service.confirm_email_change(data, token);
  }

  @UseGuards(AuthToken)
  @Get(':nick')
  get_user(
    @Param('nick') nick: string,
    @TokenPayloadParam() token: PayloadDTO,
  ) {
    return this.service.get_user(nick, token);
  }
}
