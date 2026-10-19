import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';

@Injectable()
export class AdminValidator {
  constructor(private prisma: PrismaService) {}

  async verify_user(nick: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { nome_usuario: nick },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado.');

    return user;
  }

  async verify_report(id: number) {
    const report = await this.prisma.denuncia.findUnique({
      where: { id: id },
    });

    if (!report)
      throw new NotFoundException('A denúncia em questão não existe.');

    return report;
  }

  async get_users(page = 1, limit = 10, sortBy = 'id', order = 'asc') {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.usuario.findMany({
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
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
          bloqueado_ate: true,
          banido: true,
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

  async get_reports(
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    order = 'desc',
  ) {
    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      this.prisma.denuncia.findMany({
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        select: {
          id: true,
          categoria: true,
          descricao: true,
          createdAt: true,
          id_review: true,
          id_usuario: true,
          autor: { select: { nome_usuario: true } },
          review: {
            select: {
              descricao: true,
              createdAt: true,
              autor: { select: { nome_usuario: true, id: true } },
            },
          },
        },
      }),
      this.prisma.denuncia.count(),
    ]);

    const meta = {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    };

    if (!reports) throw new NotFoundException('Nenhuma denúncia encontrada.');

    return {
      data: reports,
      meta,
      statusCode: 200,
    };
  }

  async get_user(nick: string) {
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
        banido: true,
        numero_celular: true,
        bloqueado: true,
        bloqueado_ate: true,
        reputacao: true,
      },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado.');

    return user;
  }
}
