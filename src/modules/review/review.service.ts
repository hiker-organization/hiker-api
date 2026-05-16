import 'dotenv/config';
import {
  HttpStatus,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateReviewDTO } from './dtos/create-review.dto.js';
import { GetReviewsQueryDTO } from './dtos/get-reviews-query.dto.js';
import { PayloadDTO } from '../auth/dto/payload.dto.js';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { FileService } from '../../common/services/file.service.js';
import { create_response } from '../../common/helpers/create-response.helper.js';
import { get_response } from '../../common/helpers/get-response.helper.js';
import { message_response } from '../../common/helpers/message-response.helper.js';

@Injectable()
export class ReviewService {
  constructor(
    private prisma: PrismaService,
    private readonly fileService: FileService,
  ) {}

  async create_review(
    data: CreateReviewDTO,
    token: PayloadDTO,
    fotos?: Array<Express.Multer.File>,
  ) {
    const fotosUrls: string[] = [];

    if (fotos && fotos.length > 0) {
      await Promise.all(
        fotos.map(async (foto) => {
          const extName = path
            .extname(foto?.originalname)
            .toLowerCase()
            .substring(1);
          const fileName = `${randomUUID()}.${extName}`;
          const pathMaster = path.resolve(
            process.cwd(),
            'imgs/reviews',
            fileName,
          );
          const dirPath = path.dirname(pathMaster);

          await mkdir(dirPath, { recursive: true });
          await this.fileService.writeFile(pathMaster, foto.buffer);

          fotosUrls.push(fileName);
        }),
      );
    }

    let tagsArray: string[] = [];
    if (data.tags) {
      const raw = Array.isArray(data.tags) ? data.tags : [data.tags];
      tagsArray = raw.map((t) => t.trim().toLowerCase()).filter(Boolean);
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

      return create_response(
        'Sua review foi criada com sucesso.',
        {
          ...review,
          fotos: review.fotos.map((foto) => ({
            url: `${process.env.API_STATIC_REVIEWS}${foto.url}`,
          })),
        },
        HttpStatus.CREATED,
      );
    });
  }

  async get_reviews(query: GetReviewsQueryDTO) {
    const { data, nextCursor } =
      await this.find_reviews_with_full_content(query);
    return {
      ...get_response('reviews disponíveis', data, HttpStatus.OK),
      nextCursor,
    };
  }

  async get_review(id: number) {
    const review = await this.find_one_review_with_full_content(id);
    return get_response('review encontrada.', review, HttpStatus.OK);
  }

  async delete_review(id: number, token: PayloadDTO) {
    const fotosUrls: string[] = [];
    const review = await this.find_user_review(id, token);
    review.fotos.forEach((foto) => {
      fotosUrls.push(foto.url);
    });
    await this.prisma.review.delete({
      where: { id: id },
    });
    await this.remove_photos(fotosUrls);
    return message_response('Review excluída com sucesso.', HttpStatus.OK);
  }

  async like_review(id: number, token: PayloadDTO) {
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

      await this.calc_reputation(review.id_usuario, lk);

      return message_response('ação realizada com sucesso.', 200);
    });
  }

  async dislike_review(id: number, token: PayloadDTO) {
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

      await this.calc_reputation(review.id_usuario, dlk);

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

  private async calc_reputation(id_user: number, tx?: any) {
    const prismaClient = tx || this.prisma;

    const reviews = await prismaClient.review.findMany({
      where: { id_usuario: id_user },
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

  private async find_one_review_with_full_content(id: number) {
    const review = await this.prisma.review.findUnique({
      where: { id: id, oculto: false },
      select: {
        descricao: true,
        local: true,
        qnt_likes: true,
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
      },
    });
    if (!review) throw new NotFoundException('review não encontrada.');

    return {
      ...review,
      fotos: review.fotos.map((foto) => ({
        url: `${process.env.API_STATIC_REVIEWS}${foto.url}`,
      })),
      autor: {
        ...review.autor,
        foto_url: review.autor.foto_url
          ? `${process.env.API_STATIC_USER}${review.autor.foto_url}`
          : null,
      },
    };
  }

  private async find_reviews_with_full_content(query: GetReviewsQueryDTO) {
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
      where: { oculto: false },
      select: {
        id: true,
        descricao: true,
        local: true,
        qnt_likes: true,
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
      },
    });

    if (reviews.length === 0)
      throw new NotFoundException('nenhuma review encontrada no momento.');

    const hasNextPage = reviews.length > limit;
    const data = hasNextPage ? reviews.slice(0, limit) : reviews;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data: data.map((review) => ({
        ...review,
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

  private async find_user_review(id: number, token: PayloadDTO) {
    const review = await this.prisma.review.findUnique({
      where: { id: id, AND: { id_usuario: token.sub } },
      select: {
        fotos: { select: { url: true } },
      },
    });
    if (!review) throw new NotFoundException('Review não encontrada');
    return review;
  }

  private async remove_photos(fotosUrls: string[]) {
    await Promise.all(
      fotosUrls.map((foto) => {
        const pathMaster = path.resolve(process.cwd(), 'imgs/reviews', foto);
        return this.fileService.deleteFile(pathMaster);
      }),
    );
  }
}
