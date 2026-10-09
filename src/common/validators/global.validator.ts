import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service.js';
import { PayloadDTO } from '../../modules/auth/dto/payload.dto.js';

@Injectable()
export class GlobalValidator {
  constructor(private prisma: PrismaService) {}

  async reported_reviews(reviewsId: number[], userId: number) {
    if (reviewsId.length === 0) return new Set<number>();
    const reports = await this.prisma.denuncia.findMany({
      where: {
        id_usuario: userId,
        id_review: {
          in: reviewsId,
        },
      },
      select: {
        id_review: true,
      },
    });

    const reportsIds = new Set(reports.map((report) => report.id_review));

    return reportsIds;
  }

  async favorited_reviews(reviewsId: number[], userId: number) {
    if (reviewsId.length === 0) return new Set<number>();

    const favorites = await this.prisma.review_favorita.findMany({
      where: {
        id_usuario: userId,
        id_review: {
          in: reviewsId,
        },
      },
      select: {
        id_review: true,
      },
    });

    const favoriteIds = new Set(
      favorites.map((favorite) => favorite.id_review),
    );

    return favoriteIds;
  }

  async verify_block(token: PayloadDTO) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: token.email },
    });

    if (user!.banido)
      throw new UnauthorizedException(
        'Você está banido, não poderá mais acessar nossos recursos.',
      );

    if (user!.bloqueado && user!.bloqueado_ate! > new Date())
      throw new UnauthorizedException(
        'Você está bloqueado, não poderá realizar esta ação.',
      );
  }

  async get_user_reactions_for_reviews(reviewIds: number[], userId: number) {
    const reactionMap = new Map<number, string>();

    if (reviewIds.length === 0) {
      return reactionMap;
    }

    const reactions = await this.prisma.voto_review.findMany({
      where: {
        id_usuario: userId,
        id_review: {
          in: reviewIds,
        },
      },
      select: {
        id_review: true,
        tipo: true,
      },
    });

    reactions.forEach((reaction) => {
      reactionMap.set(reaction.id_review, reaction.tipo);
    });

    return reactionMap;
  }
}
