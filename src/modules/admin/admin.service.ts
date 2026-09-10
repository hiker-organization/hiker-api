import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PayloadDTO } from '../auth/dto/payload.dto.js';
import { message_response } from '../../common/helpers/message-response.helper.js';
import { get_response } from '../../common/helpers/get-response.helper.js';
import { GetUsersDTO } from './utils/dto/query.dto.js';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async admin(token: PayloadDTO) {
    await this.prisma.usuario.update({
      data: { cargo: 'ADM' },
      where: { id: token.sub },
    });

    return message_response('Usuário setado com sucesso!', 200);
  }

  async show_users(query: GetUsersDTO) {
    return await this.get_users(query.page, query.limit);
  }

  async show_user(nick: string) {
    const user = await this.get_user(nick);

    return get_response('Usuário encontrado.', user, 200);
  }

  async block(nick: string) {
    const user = await this.verify_user(nick);

    await this.prisma.usuario.update({
      data: { bloqueado: true },
      where: { nome_usuario: user.nome_usuario },
    });

    return message_response('Usuário bloqueado com sucesso.', 200);
  }

  async unblock(nick: string) {
    const user = await this.verify_user(nick);

    await this.prisma.usuario.update({
      data: { bloqueado: false },
      where: { nome_usuario: user.nome_usuario },
    });

    return message_response('Usuário desbloqueado com sucesso.', 200);
  }

  private async verify_user(nick: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { nome_usuario: nick },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado.');

    return user;
  }

  private async get_users(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.usuario.findMany({
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        select: {
          id: true,
          nome_usuario: true,
          nome_exibicao: true,
          email: true,
          data_nascimento: true,
          foto_url: true,
          cargo: true,
          numero_celular: true,
          bloqueado: true,
          reputacao: true,
        },
      }),
      this.prisma.usuario.count(),
    ]);

    const meta = {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    };

    if (!users) throw new NotFoundException('Nenhum usuário encontrado.');

    return {
      data: users,
      meta,
      statusCode: 200,
    };
  }

  private async get_user(nick: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { nome_usuario: nick },
      select: {
        id: true,
        nome_usuario: true,
        nome_exibicao: true,
        email: true,
        data_nascimento: true,
        foto_url: true,
        cargo: true,
        numero_celular: true,
        bloqueado: true,
        reputacao: true,
      },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado.');

    return user;
  }
}
