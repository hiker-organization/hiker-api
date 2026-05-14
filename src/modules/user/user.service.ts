import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDTO } from './dtos/createUser.dto.js';
import { create_response } from '../../common/helpers/create-response.helper.js';
import { FileService } from '../../common/services/file.service.js';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { HashingService } from '../../common/services/hash.service.js';
import { getRandomValues, randomUUID } from 'node:crypto';
import { PayloadDTO } from '../auth/dto/payload.dto.js';
import { get_response } from '../../common/helpers/get-response.helper.js';
import { UpdateUserDTO } from './dtos/updateUser.dto.js';
import { message_response } from '../../common/helpers/message-response.helper.js';
import { UpdatePasswordDTO } from './dtos/updatePassword.dto.js';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly hashService: HashingService,
    private readonly fileService: FileService,
  ) {}

  async create_user(data: CreateUserDTO, foto?: Express.Multer.File) {
    await this.email_empty_or_fail(data.email);

    await this.numero_is_equal_fail(data.numero_celular);

    const hash = await this.hashService.hash(data.senha);

    const nick = `@${data.nome_usuario}`;

    await this.nick_empty_or_fail(nick);

    if (foto) {
      const extName = path
        .extname(foto?.originalname)
        .toLowerCase()
        .substring(1);

      const fileName = `${randomUUID()}.${extName}`;

      const pathMaster = path.resolve(process.cwd(), 'imgs/user', fileName);
      const dirPath = path.dirname(pathMaster);

      await mkdir(dirPath, { recursive: true });
      await this.fileService.writeFile(pathMaster, foto.buffer);

      data.foto_url = fileName;
    }

    const user = await this.prisma.usuario.create({
      data: { ...data, senha: hash, nome_usuario: nick },
      select: {
        nome_usuario: true,
        nome_exibicao: true,
        email: true,
      },
    });

    return create_response(
      'usuário criado com sucesso!',
      user,
      HttpStatus.CREATED,
    );
  }

  async get_user(id: number) {
    const user = await this.get_user_with_full_data(id);
    return get_response('Perfil do usuário abaixo', user, 200);
  }

  async get_me(token: PayloadDTO) {
    const user = await this.get_user_with_full_data(token.sub);
    return get_response('Seu perfil abaixo', user, 200);
  }

  async update_user(
    data: UpdateUserDTO,
    token: PayloadDTO,
    foto?: Express.Multer.File,
  ) {
    const user = await this.find_user_or_fail(token.sub);

    data.nome_usuario = data.nome_usuario ? `@${data.nome_usuario}` : undefined;

    if (foto) {
      const extName = path
        .extname(foto?.originalname)
        .toLowerCase()
        .substring(1);

      if (user.foto_url) {
        const oldUrl = user.foto_url;
        const pathUrl = path.resolve(process.cwd(), 'imgs/user', oldUrl);
        await this.fileService.deleteFile(pathUrl);
      }

      const fileName = `${randomUUID()}.${extName}`;

      const pathMaster = path.resolve(process.cwd(), 'imgs/user', fileName);
      const dirPath = path.dirname(pathMaster);

      await mkdir(dirPath, { recursive: true });

      await this.fileService.writeFile(pathMaster, foto.buffer);

      data.foto_url = fileName;
    }

    await this.prisma.usuario.update({
      where: { id: user.id },
      data: {
        ...data,
      },
    });

    return message_response('Alterado com sucesso.', 200);
  }

  async update_password(data: UpdatePasswordDTO, token: PayloadDTO) {
    const user = await this.find_user_or_fail(token.sub);

    if (!(await this.hashService.compare(data.senha_atual, user.senha))) {
      throw new ConflictException('Senha atual incorreta.');
    }

    const hash = await this.hashService.hash(data.senha_nova);

    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { senha: hash },
    });

    return message_response('Senha alterada com sucesso.', 200);
  }

  private async find_user_or_fail(id: number) {
    const user = await this.prisma.usuario.findUnique({ where: { id: id } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }
  private async email_empty_or_fail(email: string): Promise<boolean> {
    const user = await this.prisma.usuario.findUnique({
      where: { email: email },
    });

    if (user) throw new ConflictException('Email já existente.');

    return true;
  }
  private async nick_empty_or_fail(nick: string): Promise<boolean> {
    const user = await this.prisma.usuario.findUnique({
      where: { nome_usuario: nick },
    });

    if (user) throw new ConflictException('Nome de usuário já existente.');

    return true;
  }
  private async numero_is_equal_fail(numero: string): Promise<boolean> {
    const user = await this.prisma.usuario.findFirst({
      where: { numero_celular: numero },
    });

    if (user) throw new ConflictException('numero de celular já cadastrado.');

    return true;
  }
  private async get_user_with_full_data(id: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: id },
      select: {
        foto_url: true,
        nome_exibicao: true,
        nome_usuario: true,
        reputacao: true,
        reviews: {
          where: { oculto: false },
          select: {
            id: true,
            fotos: { select: { url: true } },
            local: true,
            nota: true,
            descricao: true,
            qnt_dislikes: true,
            qnt_likes: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado.');

    return {
      ...user,
      foto_url: user.foto_url
        ? `${process.env.API_STATIC_USER}${user.foto_url}`
        : null,
      reviews: user.reviews.map((review) => ({
        ...review,
        fotos: review.fotos.map((foto) => ({
          ...foto,
          url: `${process.env.API_STATIC_REVIEWS}${foto.url}`,
        })),
      })),
    };
  }
}
