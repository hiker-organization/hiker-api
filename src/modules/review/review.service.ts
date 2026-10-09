import 'dotenv/config';
import {
  HttpStatus,
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LocalService } from '../local/local.service.js';
import { CreateReviewDTO } from './dtos/create-review.dto.js';
import { GetReviewsQueryDTO } from './dtos/get-reviews-query.dto.js';
import { PayloadDTO } from '../auth/dto/payload.dto.js';
import { UploadAzureService } from '../../common/services/upload.azure.service.js';
import { create_response } from '../../common/helpers/create-response.helper.js';
import { get_response } from '../../common/helpers/get-response.helper.js';
import { message_response } from '../../common/helpers/message-response.helper.js';
import { CreateReportDTO } from './dtos/create-report.dto.js';
import { GlobalValidator } from '../../common/validators/global.validator.js';
import { ReviewValidator } from './validator/review.validator.js';

@Injectable()
export class ReviewService {
  constructor(
    private prisma: PrismaService,
    private readonly uploadAzureService: UploadAzureService,
    private readonly localService: LocalService,
    private globalValidator: GlobalValidator,
    private reviewValidator: ReviewValidator,
  ) {}

  async create_review(
    data: CreateReviewDTO,
    token: PayloadDTO,
    fotos?: Array<Express.Multer.File>,
  ) {
    const fotosUrls: string[] = [];

    await this.globalValidator.verify_block(token);
    // Before the photos are uploaded, so a place that can't be loaded uploads nothing.
    await this.localService.ensure_local(data.local_id);

    if (fotos && fotos.length > 0) {
      await Promise.all(
        fotos.map(async (foto) => {
          const url = await this.uploadAzureService.addImageReview(
            foto.buffer,
            foto.originalname,
          );

          fotosUrls.push(url);
        }),
      );
    }

    let tagsArray: string[] = [];
    if (data.tags) {
      const raw = Array.isArray(data.tags) ? data.tags : [data.tags];

      raw.forEach((tags) => {
        const tag = tags.split(',');

        tagsArray.push(...tag);
      });

      tagsArray = tagsArray.map((t) => t.trim().toLowerCase()).filter(Boolean);
    }

    return await this.prisma.$transaction(async (rw) => {
      const tagIds = await Promise.all(
        tagsArray.map(async (descritivo) => {
          let tag = await rw.tag.findUnique({ where: { descritivo } });
          if (!tag) {
            try {
              tag = await rw.tag.create({ data: { descritivo } });
            } catch {
              tag = await rw.tag.findUnique({ where: { descritivo } });
            }
          }
          return tag!.id;
        }),
      );

      const review = await rw.review.create({
        data: {
          id_local: data.local_id,
          local: data.local,
          descricao: data.descricao,
          oculto: data.oculto,
          nota: data.nota,
          id_usuario: token.sub,
          fotos:
            fotosUrls.length > 0
              ? {
                  create: fotosUrls.map((url) => ({ url })),
                }
              : undefined,
          tags:
            tagIds.length > 0
              ? { create: tagIds.map((id_tag) => ({ id_tag })) }
              : undefined,
        },
        select: {
          descricao: true,
          id_local: true,
          local: true,
          qnt_likes: true,
          qnt_dislikes: true,
          nota: true,
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

      const fotos = await Promise.all(
        review.fotos.map(async (foto) => ({
          url: await this.uploadAzureService.getReviewImageUrl(foto.url),
        })),
      );

      return create_response(
        'Sua review foi criada com sucesso.',
        {
          ...review,
          fotos,
        },
        HttpStatus.CREATED,
      );
    });
  }

  async favorite(id: number, token: PayloadDTO) {
    return await this.prisma.$transaction(async (fav) => {
      const review = await fav.review.findUnique({ where: { id: id } });
      if (!review) throw new NotFoundException('Esta review não existe mais.');

      const verify = await fav.review_favorita.findUnique({
        where: {
          id_usuario_id_review: { id_review: id, id_usuario: token.sub },
        },
      });

      if (verify)
        throw new UnprocessableEntityException(
          'Ação indisponível, já favoritada.',
        );

      await fav.review_favorita.create({
        data: {
          id_review: id,
          id_usuario: token.sub,
        },
      });

      await fav.review.update({
        where: { id: id },
        data: { qnt_favoritos: { increment: 1 } },
      });

      return message_response('Favoritada com sucesso.', 201);
    });
  }

  async unfavorite(id: number, token: PayloadDTO) {
    return await this.prisma.$transaction(async (fav) => {
      const review = await fav.review.findUnique({ where: { id: id } });
      if (!review) throw new NotFoundException('Esta review não existe mais.');

      const verify = await fav.review_favorita.findUnique({
        where: {
          id_usuario_id_review: { id_review: id, id_usuario: token.sub },
        },
      });

      if (!verify)
        throw new UnprocessableEntityException(
          'Ação indisponível, nada a remover.',
        );

      await fav.review_favorita.delete({
        where: {
          id_usuario_id_review: { id_review: id, id_usuario: token.sub },
        },
      });

      await fav.review.update({
        where: { id: id },
        data: { qnt_favoritos: { decrement: 1 } },
      });

      return message_response('Removida com sucesso.', 200);
    });
  }

  async report(id: number, token: PayloadDTO, data: CreateReportDTO) {
    await this.globalValidator.verify_block(token);
    await this.reviewValidator.review_exists(id);
    await this.reviewValidator.review_reported(id, token.sub);
    return await this.prisma.$transaction(async (report) => {
      await report.denuncia.create({
        data: {
          categoria: data.categoria,
          descricao: data.descricao,
          id_usuario: token.sub,
          id_review: id,
        },
      });

      await report.review.update({
        where: { id: id },
        data: { qnt_denuncia: { increment: 1 } },
      });

      return message_response(
        'Denúncia realizada com sucesso, nossos administradores irão analisar.',
        201,
      );
    });
  }

  async get_reviews(query: GetReviewsQueryDTO, token: PayloadDTO) {
    const { data, nextCursor } =
      await this.reviewValidator.find_reviews_with_full_content(
        query,
        token.sub,
      );
    return {
      ...get_response('reviews disponíveis', data, HttpStatus.OK),
      nextCursor,
    };
  }

  async get_local_reviews(
    id: string,
    query: GetReviewsQueryDTO,
    token: PayloadDTO,
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
      where: { oculto: false, deletedAt: null, id_local: id },
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

    if (reviews.length === 0)
      throw new NotFoundException('nenhuma review encontrada no momento.');

    const hasNextPage = reviews.length > limit;
    const data = hasNextPage ? reviews.slice(0, limit) : reviews;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    const reactions = await this.globalValidator.get_user_reactions_for_reviews(
      data.map((review) => review.id),
      token.sub,
    );

    const favoriteIds = await this.globalValidator.favorited_reviews(
      data.map((review) => review.id),
      token.sub,
    );

    const reportsIds = await this.globalValidator.reported_reviews(
      data.map((review) => review.id),
      token.sub,
    );

    return {
      message: 'Reviews disponíveis',
      data: data.map((review) => ({
        ...review,
        liked: reactions.get(review.id) === 'LIKE',
        disliked: reactions.get(review.id) === 'DISLIKE',
        favorited: favoriteIds.has(review.id),
        reported: reportsIds.has(review.id),
        fotos: review.fotos.map((foto) => ({
          url: `${process.env.API_STATIC_REVIEWS}${foto.url}`,
        })),
        autor: {
          ...review.autor,
          foto_url: review.autor.foto_url
            ? `${process.env.API_STATIC_USER}${review.autor.foto_url}`
            : null,
        },
      })),
      nextCursor,
    };
  }

  async get_review(id: number, token: PayloadDTO) {
    const review = await this.reviewValidator.find_one_review_with_full_content(
      id,
      token.sub,
    );
    return get_response('review encontrada.', review, HttpStatus.OK);
  }

  async search_reviews(
    term: string,
    query: GetReviewsQueryDTO,
    token: PayloadDTO,
  ) {
    const { data, nextCursor } = await this.reviewValidator.find_reviews_search(
      term,
      query,
      token.sub,
    );
    return {
      ...get_response('reviews disponíveis', data, HttpStatus.OK),
      nextCursor,
    };
  }

  async delete_review(id: number, token: PayloadDTO) {
    await this.reviewValidator.find_user_review(id, token);
    await this.prisma.review.update({
      where: { id: id },
      data: { deletedAt: new Date() },
    });
    return message_response('Review excluída com sucesso.', HttpStatus.OK);
  }

  async like_review(id: number, token: PayloadDTO) {
    await this.globalValidator.verify_block(token);

    return await this.prisma.$transaction(async (lk) => {
      const review = await lk.review.findUnique({
        where: { id: id },
        select: { id_usuario: true },
      });

      if (!review) throw new NotFoundException('Review não encontrada.');

      const old_interaction = await lk.voto_review.findUnique({
        where: {
          id_usuario_id_review: { id_review: id, id_usuario: token.sub },
        },
      });

      if (!old_interaction) {
        await lk.voto_review.create({
          data: { tipo: 'LIKE', id_review: id, id_usuario: token.sub },
        });

        await lk.review.update({
          where: { id: id },
          data: { qnt_likes: { increment: 1 } },
        });
      }

      if (old_interaction?.tipo == 'LIKE') {
        return message_response('Você já curtiu esta publicação.', 400);
      }

      if (old_interaction?.tipo == 'DISLIKE') {
        await lk.voto_review.update({
          where: {
            id_usuario_id_review: { id_review: id, id_usuario: token.sub },
          },
          data: { tipo: 'LIKE' },
        });

        await lk.review.update({
          where: { id: id },
          data: { qnt_dislikes: { decrement: 1 }, qnt_likes: { increment: 1 } },
        });
      }

      await this.reviewValidator.calc_reputation(review.id_usuario, lk);

      return message_response('ação realizada com sucesso.', 200);
    });
  }

  async dislike_review(id: number, token: PayloadDTO) {
    await this.globalValidator.verify_block(token);

    return await this.prisma.$transaction(async (dlk) => {
      const review = await dlk.review.findUnique({
        where: { id: id },
        select: { id_usuario: true },
      });

      if (!review) throw new NotFoundException('Review não encontrada.');

      const old_interaction = await dlk.voto_review.findUnique({
        where: {
          id_usuario_id_review: { id_review: id, id_usuario: token.sub },
        },
      });

      if (!old_interaction) {
        await dlk.voto_review.create({
          data: { tipo: 'DISLIKE', id_review: id, id_usuario: token.sub },
        });

        await dlk.review.update({
          where: { id: id },
          data: { qnt_dislikes: { increment: 1 } },
        });
      }

      if (old_interaction?.tipo == 'DISLIKE') {
        return message_response('você já não curtiu a publicação.', 400);
      }

      if (old_interaction?.tipo == 'LIKE') {
        await dlk.voto_review.update({
          where: {
            id_usuario_id_review: { id_review: id, id_usuario: token.sub },
          },
          data: { tipo: 'DISLIKE' },
        });

        await dlk.review.update({
          where: { id: id },
          data: { qnt_likes: { decrement: 1 }, qnt_dislikes: { increment: 1 } },
        });
      }

      await this.reviewValidator.calc_reputation(review.id_usuario, dlk);

      return message_response('ação realizada com sucesso.', 200);
    });
  }

  async change_review_visibility(
    id: number,
    oculto: boolean,
    token: PayloadDTO,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: id },
    });

    if (!review) throw new NotFoundException('Review não encontrada.');

    if (review.id_usuario !== token.sub)
      throw new ForbiddenException(
        'Você não tem permissão para alterar a visibilidade desta review.',
      );

    await this.prisma.review.update({
      where: { id: id },
      data: { oculto: oculto },
    });

    return message_response(
      'Visibilidade da review alterada com sucesso.',
      HttpStatus.OK,
    );
  }
}
