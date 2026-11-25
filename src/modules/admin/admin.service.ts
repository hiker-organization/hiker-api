import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PayloadDTO } from '../auth/dto/payload.dto.js';
import { message_response } from '../../common/helpers/message-response.helper.js';
import { get_response } from '../../common/helpers/get-response.helper.js';
import { GetUsersDTO } from './utils/dto/query.dto.js';
import { BlockDTO } from './utils/dto/block.dto.js';
import { AdminValidator } from './utils/validator/admin.validator.js';
import { GetReportsDTO } from './utils/dto/reports.dto.js';
import { ModerateDTO } from './utils/dto/moderate.dto.js';
import { GetReviewDTO } from './utils/dto/reviews.dto.js';
import { GetAutoBlockedDTO } from './utils/dto/auto-blocked.dto.js';
import { SummaryDTO } from './utils/dto/summary.query.dto.js';
import { RankedDTO } from './utils/dto/ranked.query.dto.js';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private adminValidator: AdminValidator,
  ) {}

  async admin(token: PayloadDTO) {
    await this.prisma.usuario.update({
      data: { cargo: 'ADM' },
      where: { id: token.sub },
    });

    return message_response('Usuário setado com sucesso!');
  }

  async blocked_reviews(query: RankedDTO) {
    const limit = query.limit ? query.limit : 10;
    const from = query.from ? query.from : new Date('2026-01-01T00:00:00.000Z');
    const to = query.to ? query.to : new Date('2026-12-31T23:59:59.999Z');

    const top = await this.prisma.usuario.findMany({
      where: {
        deletedAt: null,
        AND: { createdAt: { gte: from, lte: to } },
        reviews: {
          some: { status: 'OFENSIVA', deletedAt: null },
        },
      },
      take: limit,
      select: {
        id: true,
        nome_exibicao: true,
        nome_usuario: true,
        email: true,
        reputacao: true,
        createdAt: true,
        banido: true,
        bloqueado: true,
        _count: {
          select: {
            reviews: {
              where: { status: 'OFENSIVA', deletedAt: null },
            },
          },
        },
      },
    });

    if (top.length === 0)
      throw new NotFoundException('Nenhum usuário encontrado.');

    const data = top.map(({ _count, ...user }) => ({
      ...user,
      blocked_reviews: _count.reviews,
    }));

    return get_response('Nenhum dado a ser exibido.', data);
  }

  async most_reported(query: RankedDTO) {
    const limit = query.limit ? query.limit : 10;
    const from = query.from ? query.from : new Date('2026-01-01T00:00:00.000Z');
    const to = query.to ? query.to : new Date('2026-12-31T23:59:59.999Z');

    return await this.prisma.$transaction(async (tx) => {
      const reported_posts = await tx.review.groupBy({
        by: ['id_usuario'],
        where: {
          deletedAt: null,
          qnt_denuncia: {
            gte: 0,
          },
          createdAt: {
            gte: from,
            lte: to,
          },
        },
        take: limit,
        _count: {
          _all: true,
        },
        orderBy: {
          _count: {
            id_usuario: 'desc',
          },
        },
      });

      const users = (
        await Promise.all(
          reported_posts.map(async (item) => {
            const usuario = await tx.usuario.findFirst({
              where: {
                id: item.id_usuario,
                deletedAt: null,
              },
              select: {
                id: true,
                nome_exibicao: true,
                nome_usuario: true,
                email: true,
                reputacao: true,
                createdAt: true,
                banido: true,
                bloqueado: true,
              },
            });

            return usuario ? { ...usuario, denuncias: item._count._all } : null;
          }),
        )
      ).filter((user) => user !== null);

      if (users.length === 0)
        throw new NotFoundException('Nenhum dado a ser exibido.');

      return get_response('Dados abaixo:', users);
    });
  }

  async user_summary(query: SummaryDTO) {
    const from = query.from ? query.from : new Date('2026-01-01T00:00:00.000Z');
    const to = query.to ? query.to : new Date('2026-12-31T23:59:59.999Z');
    return await this.prisma.$transaction(async (tx) => {
      const userCount = await tx.usuario.count({
        where: {
          deletedAt: null,
          AND: {
            createdAt: { gte: from, lte: to },
          },
        },
      });

      const usersBlocked = await tx.usuario.count({
        where: {
          bloqueado: true,
          deletedAt: null,
          AND: {
            createdAt: { gte: from, lte: to },
          },
        },
      });
      const blockPercent = (usersBlocked / userCount) * 100;

      const usersBanned = await tx.usuario.count({
        where: {
          banido: true,
          deletedAt: null,
          AND: {
            createdAt: { gte: from, lte: to },
          },
        },
      });
      const banPercent = (usersBanned / userCount) * 100;

      const commonCount = userCount - usersBanned - usersBlocked;
      const commonPercent = (commonCount / userCount) * 100;

      return {
        totalUsers: userCount,
        banned: {
          count: usersBanned,
          percentage: banPercent,
        },
        blocked: {
          count: usersBlocked,
          percentage: blockPercent,
        },
        common: {
          count: commonCount,
          percentage: commonPercent,
        },
      };
    });
  }

  async open_reviews_reports(query: RankedDTO) {
    const from = query.from ? query.from : new Date('2026-01-01T00:00:00.000Z');
    const to = query.to ? query.to : new Date('2026-12-31T23:59:59.999Z');
    const limit = query.limit ? query.limit : 10;

    return await this.prisma.$transaction(async (tx) => {
      const open_reports = await tx.denuncia.groupBy({
        by: ['id_review'],
        take: limit,
        where: {
          createdAt: { gte: from, lte: to },
          status: 'ATIVA',
          AND: {
            review: { deletedAt: null },
          },
        },
        _count: {
          _all: true,
        },
        orderBy: {
          _count: {
            id_review: 'desc',
          },
        },
      });

      const reviews = (
        await Promise.all(
          open_reports.map(async (item) => {
            const review = await tx.review.findFirst({
              where: {
                id: item.id_review,
                deletedAt: null,
              },
              select: {
                id: true,
                status: true,
                createdAt: true,
                id_usuario: true,
                descricao: true,
                qnt_denuncia: true,
                qnt_dislikes: true,
                qnt_favoritos: true,
                qnt_likes: true,
                nota: true,
                autor: { select: { id: true, nome_usuario: true } },
                lugar: {
                  select: { cidade: true, estado: true, endereco: true },
                },
              },
            });
            return review
              ? { ...review, denuncias_abertas: item._count._all }
              : null;
          }),
        )
      ).filter((review) => review !== null);

      if (!reviews) throw new NotFoundException('Nenhum dado a ser exibido.');

      return get_response('Dados abaixo:', reviews);
    });
  }

  async review_summary(query: SummaryDTO) {
    const from = query.from ? query.from : new Date('2026-01-01T00:00:00.000Z');
    const to = query.to ? query.to : new Date('2026-12-31T23:59:59.999Z');
    return await this.prisma.$transaction(async (tx) => {
      const reviewsCount = await tx.review.count({
        where: {
          deletedAt: null,
          AND: {
            createdAt: { gte: from, lte: to },
          },
        },
      });

      const blockedReviews = await tx.review.count({
        where: {
          status: 'OFENSIVA',
          deletedAt: null,
          AND: {
            createdAt: { gte: from, lte: to },
          },
        },
      });
      const blockPercent = (blockedReviews / reviewsCount) * 100;

      const reportedReviews = await tx.review.count({
        where: {
          denuncias: { some: { status: 'ATIVA' } },
          deletedAt: null,
          AND: {
            createdAt: { gte: from, lte: to },
          },
        },
      });
      const reportPercent = (reportedReviews / reviewsCount) * 100;

      const commonCount = reviewsCount - blockedReviews - reportedReviews;
      const commonPercent = (commonCount / reviewsCount) * 100;

      return {
        totalReviews: reviewsCount,
        blocked: {
          count: blockedReviews,
          percentage: blockPercent,
        },
        reported: {
          count: reportedReviews,
          percentage: reportPercent,
        },
        common: {
          count: commonCount,
          percentage: commonPercent,
        },
      };
    });
  }

  async show_users(query: GetUsersDTO) {
    return await this.adminValidator.get_users(
      query.page,
      query.limit,
      query.sortBy,
      query.order,
    );
  }

  async reports(query: GetReportsDTO) {
    return await this.adminValidator.get_reports(
      query.page,
      query.limit,
      query.sortBy,
      query.order,
      query.status,
    );
  }

  async reviews_reported(query: GetReviewDTO) {
    return await this.adminValidator.get_reviews(
      query.page,
      query.limit,
      query.sortBy,
      query.order,
    );
  }

  async reports_review(id: number, query: GetReportsDTO) {
    const review = await this.prisma.review.findUnique({ where: { id: id } });
    if (!review) throw new NotFoundException('Review não encontrada.');
    return await this.adminValidator.get_review_reports(
      id,
      query.page,
      query.limit,
      query.sortBy,
      query.order,
      query.status,
    );
  }

  async moderate(id: number, data: ModerateDTO, token: PayloadDTO) {
    const report = await this.adminValidator.verify_report(id);
    // Who decided, what and when, recorded on every report this decision closes.
    const revisao = {
      status: 'FECHADA' as const,
      decisao: data.status,
      revisado_em: new Date(),
      id_revisor: token.sub,
    };

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.denuncia.updateMany({
        where: {
          id: id,
          status: { not: 'FECHADA' },
        },
        data: revisao,
      });

      if (result.count === 0) {
        throw new ConflictException(
          'Denúncia já foi finalizada, não é possível fazer uma ação.',
        );
      }

      await tx.review.update({
        where: { id: report.id_review },
        data: { status: data.status },
      });

      // The other open reports of the blocked review are closed by the same decision.
      // The ones already closed keep their own decision.
      if (data.status === 'OFENSIVA') {
        await tx.denuncia.updateMany({
          where: { id_review: report.id_review, status: { not: 'FECHADA' } },
          data: revisao,
        });
      }

      return message_response('Denúncia finalizada.');
    });
  }

  async auto_blocked_reviews(query: GetAutoBlockedDTO) {
    return await this.adminValidator.get_auto_blocked_reviews(
      query.pendentes,
      query.page,
      query.limit,
      query.sortBy,
      query.order,
    );
  }

  // Reverts (AUTORIZADA) or confirms (OFENSIVA) a block made by the classifier.
  async review_auto_block(id: number, data: ModerateDTO, token: PayloadDTO) {
    await this.adminValidator.verify_auto_blocked(id);

    await this.prisma.$transaction([
      this.prisma.review.update({
        where: { id: id },
        data: { status: data.status },
      }),
      this.prisma.classificacao_review.update({
        where: { id_review: id },
        data: {
          revisado_em: new Date(),
          decisao_admin: data.status,
          id_revisor: token.sub,
        },
      }),
    ]);

    return message_response(
      data.status === 'AUTORIZADA'
        ? 'Bloqueio revertido, a review voltou a ser exibida.'
        : 'Bloqueio confirmado.',
    );
  }

  async show_user(nick: string) {
    const user = await this.adminValidator.get_user(nick);

    return get_response('Usuário encontrado.', user);
  }

  async block(nick: string, data: BlockDTO) {
    const user = await this.adminValidator.verify_user(nick);

    if (user.banido)
      throw new ConflictException(
        'Não é possível bloquear o usuário: ele já está banido.',
      );

    await this.prisma.usuario.update({
      data: { bloqueado: true, bloqueado_ate: data.data },
      where: { nome_usuario: user.nome_usuario },
    });

    return message_response('Usuário bloqueado com sucesso.');
  }

  async ban(nick: string) {
    return await this.prisma.$transaction(async (ban) => {
      const user = await this.adminValidator.verify_user(nick);

      await ban.usuario.update({
        where: { nome_usuario: user.nome_usuario },
        data: {
          banido: true,
          ...(user.bloqueado && {
            bloqueado: false,
            bloqueado_ate: null,
          }),
        },
      });

      await ban.token_refresh.deleteMany({
        where: { id_usuario: user.id },
      });

      return message_response('Usuário banido com sucesso.');
    });
  }

  async unblock(nick: string) {
    const user = await this.adminValidator.verify_user(nick);

    await this.prisma.usuario.update({
      data: { bloqueado: false, bloqueado_ate: null },
      where: { nome_usuario: user.nome_usuario },
    });

    return message_response('Usuário desbloqueado com sucesso.');
  }
}
