import 'dotenv/config';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateReviewDTO } from './dtos/create-review.dto.js';
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

    let tagsArray: number[] = [];
    if (data.tags) {
      tagsArray = Array.isArray(data.tags) ? data.tags : [data.tags];
    }

    return await this.prisma.$transaction(async (rw) => {
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
            tagsArray.length > 0
              ? {
                  create: tagsArray.map((id_tag) => ({
                    id_tag: Number(id_tag),
                  })),
                }
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

      return create_response('Sua review foi criada com sucesso.', {
        ...review,
        fotos: review.fotos.map((foto) => ({
          url: `${process.env.API_STATIC}${foto.url}`,
        })),
      });
    });
  }

  async get_reviews() {
    const reviews = await this.find_reviews_with_full_content();
    return get_response('reviews disponíveis', reviews);
  }

  async get_review(id: number) {
    const review = await this.find_one_review_with_full_content(id);
    return get_response('review encontrada.', review);
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
    return message_response('Review excluída com sucesso.');
  }

  private async find_one_review_with_full_content(id: number) {
    const review = await this.prisma.review.findUnique({
      where: { id: id },
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
    if (!review) throw new NotFoundException('review não encontrada.');

    return {
      ...review,
      fotos: review.fotos.map((foto) => ({
        url: `${process.env.API_STATIC}${foto.url}`,
      })),
    };
  }

  private async find_reviews_with_full_content() {
    const reviews = await this.prisma.review.findMany({
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
    if (!reviews || reviews.length == 0)
      throw new NotFoundException('nenhuma review encontrada no momento.');

    return reviews.map((review) => ({
      ...review,
      fotos: review.fotos.map((foto) => ({
        url: `${process.env.API_STATIC}${foto.url}`,
      })),
    }));
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
