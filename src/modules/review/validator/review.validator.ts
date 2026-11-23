import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PayloadDTO } from '../../auth/dto/payload.dto.js';
import { GetReviewsQueryDTO } from '../dtos/get-reviews-query.dto.js';
import { GlobalValidator } from '../../../common/validators/global.validator.js';
import { UploadAzureService } from '../../../common/services/upload.azure.service.js';
import { Prisma } from '../../../../generated/prisma/client.js';

// Reviews that can show up in a feed.
const FEED_REVIEW_WHERE = {
  oculto: false,
  deletedAt: null,
  status: { in: ['AUTORIZADA', 'ANALISE'] },
} satisfies Prisma.ReviewWhereInput;

const FEED_REVIEW_SELECT = {
  id: true,
  descricao: true,
  id_local: true,
  local: true,
  qnt_likes: true,
  qnt_favoritos: true,
  qnt_denuncia: true,
  qnt_dislikes: true,
  nota: true,
  createdAt: true,
  autor: {
    select: {
      nome_exibicao: true,
      foto_url: true,
      reputacao: true,
      nome_usuario: true,
    },
  },
  fotos: { select: { url: true } },
  tags: {
    select: {
      tag: {
        select: { descritivo: true },
      },
    },
  },
} satisfies Prisma.ReviewSelect;

@Injectable()
export class ReviewValidator {
  constructor(
    private prisma: PrismaService,
    private globalValidator: GlobalValidator,
    private readonly uploadAzureService: UploadAzureService,
  ) {}

  async review_reported(id_review: number, id_user: number) {
    const report = await this.prisma.denuncia.findUnique({
      where: {
        id_usuario_id_review: { id_review: id_review, id_usuario: id_user },
      },
    });

    if (report) throw new ConflictException('Você já denunciou esta review.');

    return;
  }

  async calc_reputation(id_user: number, tx?: any) {
    const prismaClient = tx || this.prisma;

    const reviews = await prismaClient.review.findMany({
      where: { id_usuario: id_user, status: { in: ['AUTORIZADA', 'ANALISE'] } },

      select: {
        qnt_likes: true,
        qnt_dislikes: true,
      },
    });

    const totalLikes = reviews.reduce((sum, r) => sum + r.qnt_likes, 0);
    const totalDislikes = reviews.reduce((sum, r) => sum + r.qnt_dislikes, 0);

    let reputacao =
      totalLikes > 0 ? ((totalLikes - totalDislikes) / totalLikes) * 10 : 0;

    if (reputacao < 0) reputacao = 0;

    await prismaClient.usuario.update({
      where: { id: id_user },
      data: { reputacao: reputacao },
    });
  }

  async find_one_review_with_full_content(id: number, userId: number) {
    const review = await this.prisma.review.findUnique({
      where: {
        id: id,
        oculto: false,
        deletedAt: null,
        status: { in: ['AUTORIZADA', 'ANALISE'] },
      },
      select: {
        descricao: true,
        id_local: true,
        local: true,
        qnt_likes: true,
        qnt_dislikes: true,
        qnt_denuncia: true,
        qnt_favoritos: true,
        nota: true,
        createdAt: true,
        autor: {
          select: {
            nome_exibicao: true,
            foto_url: true,
            reputacao: true,
            nome_usuario: true,
          },
        },
        fotos: { select: { url: true } },
        tags: {
          select: {
            tag: {
              select: { descritivo: true },
            },
          },
        },
      },
    });
    if (!review) throw new NotFoundException('review não encontrada.');

    const reaction = await this.prisma.voto_review.findUnique({
      where: {
        id_usuario_id_review: {
          id_usuario: userId,
          id_review: id,
        },
      },
      select: {
        tipo: true,
      },
    });

    const favorited = await this.prisma.review_favorita.findUnique({
      where: {
        id_usuario_id_review: {
          id_usuario: userId,
          id_review: id,
        },
      },
    });

    const reported = await this.prisma.denuncia.findUnique({
      where: {
        id_usuario_id_review: {
          id_usuario: userId,
          id_review: id,
        },
      },
    });

    const fotos = await Promise.all(
      review.fotos.map(async (foto) => ({
        url: await this.uploadAzureService.getReviewImageUrl(foto.url),
      })),
    );

    return {
      ...review,
      liked: reaction?.tipo === 'LIKE',
      disliked: reaction?.tipo === 'DISLIKE',
      favorited: favorited !== null,
      reported: reported !== null,
      fotos,
      autor: {
        ...review.autor,
        foto_url: review.autor.foto_url
          ? await this.uploadAzureService.getUserImageUrl(review.autor.foto_url)
          : null,
      },
    };
  }

  async find_reviews_with_full_content(
    query: GetReviewsQueryDTO,
    userId: number,
  ) {
    const limit = query.limit ?? 20;
    const reviews = await this.prisma.review.findMany({
      take: limit + 1,
      skip: query.cursor ? 1 : 0,
      ...(query.cursor && {
        cursor: { id: query.cursor },
      }),
      orderBy: {
        id: 'desc',
      },
      where: FEED_REVIEW_WHERE,
      select: FEED_REVIEW_SELECT,
    });

    if (reviews.length === 0)
      throw new NotFoundException('nenhuma review encontrada no momento.');

    const hasNextPage = reviews.length > limit;
    const data = hasNextPage ? reviews.slice(0, limit) : reviews;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data: await this.with_user_context(data, userId),
      nextCursor,
    };
  }

  // Reviews the recommendation job (hiker-recommendation) picked for the
  // user, best rank first. Reviews hidden or removed after the job ran are
  // left out. Empty when the job has nothing for the user yet.
  async find_recommended_reviews(userId: number) {
    const recomendacoes = await this.prisma.recomendacao.findMany({
      where: { id_usuario: userId, review: FEED_REVIEW_WHERE },
      orderBy: { rank: 'asc' },
      select: { review: { select: FEED_REVIEW_SELECT } },
    });

    return this.with_user_context(
      recomendacoes.map((recomendacao) => recomendacao.review),
      userId,
    );
  }

  // Adds the user's reactions, favorites and reports to each review and
  // swaps the stored photo paths for signed Azure urls.
  private async with_user_context(
    reviews: Prisma.ReviewGetPayload<{ select: typeof FEED_REVIEW_SELECT }>[],
    userId: number,
  ) {
    const ids = reviews.map((review) => review.id);
    const reactions = await this.globalValidator.get_user_reactions_for_reviews(
      ids,
      userId,
    );
    const favoriteIds = await this.globalValidator.favorited_reviews(
      ids,
      userId,
    );
    const reportsIds = await this.globalValidator.reported_reviews(ids, userId);

    return Promise.all(
      reviews.map(async (review) => ({
        ...review,
        liked: reactions.get(review.id) === 'LIKE',
        favorited: favoriteIds.has(review.id),
        reported: reportsIds.has(review.id),
        disliked: reactions.get(review.id) === 'DISLIKE',
        fotos: await Promise.all(
          review.fotos.map(async (foto) => ({
            url: await this.uploadAzureService.getReviewImageUrl(foto.url),
          })),
        ),
        autor: {
          ...review.autor,
          foto_url: review.autor.foto_url
            ? `${await this.uploadAzureService.getUserImageUrl(review.autor.foto_url)}`
            : null,
        },
      })),
    );
  }

  async find_reviews_search(
    term: string,
    query: GetReviewsQueryDTO,
    userId: number,
  ) {
    const limit = query.limit ?? 20;
    const search = term?.trim() ?? '';
    const reviews = await this.prisma.review.findMany({
      take: limit + 1,
      skip: query.cursor ? 1 : 0,
      ...(query.cursor && {
        cursor: { id: query.cursor },
      }),
      orderBy: {
        id: 'desc',
      },
      where: {
        oculto: false,
        deletedAt: null,
        status: { in: ['AUTORIZADA', 'ANALISE'] },
        OR: [
          { local: { contains: search, mode: 'insensitive' } },
          {
            tags: {
              some: {
                tag: { descritivo: { contains: search, mode: 'insensitive' } },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        descricao: true,
        id_local: true,
        local: true,
        qnt_likes: true,
        qnt_dislikes: true,
        qnt_denuncia: true,
        qnt_favoritos: true,
        nota: true,
        createdAt: true,
        autor: {
          select: {
            nome_exibicao: true,
            foto_url: true,
            reputacao: true,
            nome_usuario: true,
          },
        },
        fotos: { select: { url: true } },
        tags: {
          select: {
            tag: {
              select: { descritivo: true },
            },
          },
        },
      },
    });

    const hasNextPage = reviews.length > limit;
    const data = hasNextPage ? reviews.slice(0, limit) : reviews;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    const reactions = await this.globalValidator.get_user_reactions_for_reviews(
      data.map((review) => review.id),
      userId,
    );

    const favoriteIds = await this.globalValidator.favorited_reviews(
      data.map((review) => review.id),
      userId,
    );

    const reportsIds = await this.globalValidator.reported_reviews(
      data.map((review) => review.id),
      userId,
    );

    const data_with_fotos = await Promise.all(
      data.map(async (review) => ({
        ...review,
        liked: reactions.get(review.id) === 'LIKE',
        favorited: favoriteIds.has(review.id),
        reported: reportsIds.has(review.id),
        disliked: reactions.get(review.id) === 'DISLIKE',
        fotos: await Promise.all(
          review.fotos.map(async (foto) => ({
            url: await this.uploadAzureService.getReviewImageUrl(foto.url),
          })),
        ),
        autor: {
          ...review.autor,
          foto_url: review.autor.foto_url
            ? `${await this.uploadAzureService.getUserImageUrl(review.autor.foto_url)}`
            : null,
        },
      })),
    );

    return {
      data: data_with_fotos,
      nextCursor,
    };
  }

  async find_user_review(id: number, token: PayloadDTO) {
    const review = await this.prisma.review.findUnique({
      where: {
        id: id,
        AND: { id_usuario: token.sub },
        deletedAt: null,
        status: { in: ['AUTORIZADA', 'ANALISE'] },
      },
      select: {
        fotos: { select: { url: true } },
      },
    });
    if (!review) throw new NotFoundException('Review não encontrada');
    return review;
  }

  async review_exists(id: number) {
    const review = await this.prisma.review.findUnique({
      where: {
        id: id,
        status: { in: ['AUTORIZADA', 'ANALISE'] },
        AND: { deletedAt: null },
      },
    });
    if (!review) throw new NotFoundException('Review não encontrada.');
    return review;
  }
}
