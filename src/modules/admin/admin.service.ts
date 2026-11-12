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

  async user_summary() {
    return await this.prisma.$transaction(async (tx) => {
      const userCount = await tx.usuario.count({ where: { deletedAt: null } });

      const usersBlocked = await tx.usuario.count({
        where: { bloqueado: true },
      });
      const blockPercent = (usersBlocked / userCount) * 100;

      const usersBanned = await tx.usuario.count({ where: { banido: true } });
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

  async review_summary() {
    return await this.prisma.$transaction(async (tx) => {
      const reviewsCount = await tx.review.count({
        where: { deletedAt: null },
      });

      const blockedReviews = await tx.review.count({
        where: { status: 'OFENSIVA', AND: { deletedAt: null } },
      });
      const blockPercent = (blockedReviews / reviewsCount) * 100;

      const reportedReviews = await tx.review.count({
        where: { denuncias: { some: { status: 'ATIVA' } } },
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

  async moderate(id: number, data: ModerateDTO) {
    const report = await this.adminValidator.verify_report(id);
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.denuncia.updateMany({
        where: {
          id: id,
          status: { not: 'FECHADA' },
        },
        data: {
          status: 'FECHADA',
        },
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

      if (data.status === 'OFENSIVA') {
        await tx.denuncia.updateMany({
          where: { id_review: report.id_review },
          data: { status: 'FECHADA' },
        });
      }

      return message_response('Denúncia finalizada.');
    });
  }

  async close_report(id: number) {
    const report = await this.adminValidator.verify_report(id);

    if (report.status === 'FECHADA')
      throw new ConflictException('Esta denúncia já foi finalizada.');

    await this.prisma.denuncia.update({
      where: { id: id, id_review: report.id_review },
      data: { status: 'FECHADA' },
    });

    return message_response('Denuncia fechada com sucesso.');
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
        data: { banido: true },
        where: { nome_usuario: user.nome_usuario },
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
