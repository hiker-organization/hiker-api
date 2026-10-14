import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LocalService } from '../local/local.service.js';
import { UploadAzureService } from '../../common/services/upload.azure.service.js';
import { PayloadDTO } from '../auth/dto/payload.dto.js';
import { GetReviewsQueryDTO } from '../review/dtos/get-reviews-query.dto.js';
import { create_response } from '../../common/helpers/create-response.helper.js';
import { get_response } from '../../common/helpers/get-response.helper.js';
import { message_response } from '../../common/helpers/message-response.helper.js';
import { CreateTrilhaDTO } from './dtos/create-trilha.dto.js';
import { GlobalValidator } from '../../common/validators/global.validator.js';
import { TrilhaValidator } from './utils/validator/trilha.validator.js';
import {
  autor_select,
  FEED_ROUTE_POINTS,
  summary_select,
} from './utils/constants/trilha.constants.js';
import { Rota } from './utils/types/trilha.types.js';

@Injectable()
export class TrilhaService {
  constructor(
    private prisma: PrismaService,
    private readonly uploadAzureService: UploadAzureService,
    private readonly localService: LocalService,
    private globalValidator: GlobalValidator,
    private trilhaValidator: TrilhaValidator,
  ) {}

  async create_trilha(
    data: CreateTrilhaDTO,
    token: PayloadDTO,
    fotos?: Array<Express.Multer.File>,
  ) {
    await this.globalValidator.verify_block(token);
    this.trilhaValidator.validate_rota(data.rota);
    // Before the photos are uploaded, so a place that can't be loaded uploads nothing.
    await this.localService.ensure_local(data.local_id);

    const fotosUrls = await Promise.all(
      (fotos ?? []).map((foto) =>
        this.uploadAzureService.addImageReview(foto.buffer, foto.originalname),
      ),
    );

    const tagsArray = this.trilhaValidator.parse_tags(data.tags);

    const trilha = await this.prisma.$transaction(async (tx) => {
      const tagIds = await Promise.all(
        tagsArray.map(async (descritivo) => {
          let tag = await tx.tag.findUnique({ where: { descritivo } });
          if (!tag) {
            try {
              tag = await tx.tag.create({ data: { descritivo } });
            } catch {
              tag = await tx.tag.findUnique({ where: { descritivo } });
            }
          }
          return tag!.id;
        }),
      );

      return tx.trilha.create({
        data: {
          id_usuario: token.sub,
          id_local: data.local_id,
          nome: data.nome,
          cidade: data.cidade,
          estado: data.estado,
          distancia_m: data.distancia_m,
          passos: data.passos,
          duracao_s: data.duracao_s,
          nota: data.nota,
          descricao: data.descricao,
          rota: data.rota,
          compartilhada: data.compartilhada,
          iniciada_em: data.iniciada_em,
          fotos:
            fotosUrls.length > 0
              ? { create: fotosUrls.map((url) => ({ url })) }
              : undefined,
          tags:
            tagIds.length > 0
              ? { create: tagIds.map((id_tag) => ({ id_tag })) }
              : undefined,
        },
        select: { id: true },
      });
    });

    return create_response(
      'Sua trilha foi registrada com sucesso.',
      await this.trilhaValidator.find_full_trilha(trilha.id),
      HttpStatus.CREATED,
    );
  }

  // RF27: list of the user's own trails, without the route.
  async my_trilhas(query: GetReviewsQueryDTO, token: PayloadDTO) {
    const limit = query.limit ?? 20;
    const trilhas = await this.prisma.trilha.findMany({
      take: limit + 1,
      skip: query.cursor ? 1 : 0,
      ...(query.cursor && { cursor: { id: query.cursor } }),
      where: { id_usuario: token.sub, deletedAt: null },
      orderBy: { id: 'desc' },
      select: summary_select,
    });

    const hasNextPage = trilhas.length > limit;
    const data = hasNextPage ? trilhas.slice(0, limit) : trilhas;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      ...get_response('Suas trilhas', data, HttpStatus.OK),
      nextCursor,
    };
  }

  // Trails on another user's profile: only the shared ones, like hidden reviews.
  async user_trilhas(nick: string, query: GetReviewsQueryDTO) {
    const user = await this.prisma.usuario.findFirst({
      where: { nome_usuario: nick, deletedAt: null },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const limit = query.limit ?? 20;
    const trilhas = await this.prisma.trilha.findMany({
      take: limit + 1,
      skip: query.cursor ? 1 : 0,
      ...(query.cursor && { cursor: { id: query.cursor } }),
      where: { id_usuario: user.id, compartilhada: true, deletedAt: null },
      orderBy: { id: 'desc' },
      select: summary_select,
    });

    const hasNextPage = trilhas.length > limit;
    const data = hasNextPage ? trilhas.slice(0, limit) : trilhas;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      ...get_response('Trilhas do usuário', data, HttpStatus.OK),
      nextCursor,
    };
  }

  // RF29: shared trails from every user, with a reduced route for the card preview.
  async feed(query: GetReviewsQueryDTO) {
    const limit = query.limit ?? 20;
    const trilhas = await this.prisma.trilha.findMany({
      take: limit + 1,
      skip: query.cursor ? 1 : 0,
      ...(query.cursor && { cursor: { id: query.cursor } }),
      where: {
        compartilhada: true,
        deletedAt: null,
        autor: { deletedAt: null, banido: false },
      },
      orderBy: { id: 'desc' },
      select: { ...summary_select, rota: true, autor: autor_select },
    });

    const hasNextPage = trilhas.length > limit;
    const data = hasNextPage ? trilhas.slice(0, limit) : trilhas;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    const result = await Promise.all(
      data.map(async (trilha) => ({
        ...trilha,
        rota: this.trilhaValidator.downsample(
          trilha.rota as Rota,
          FEED_ROUTE_POINTS,
        ),
        autor: await this.trilhaValidator.with_user_photo(trilha.autor),
      })),
    );

    return {
      ...get_response('Trilhas compartilhadas', result, HttpStatus.OK),
      nextCursor,
    };
  }

  // RF28: the owner always sees the trail; other users only when it is shared.
  async get_trilha(id: number, token: PayloadDTO) {
    const trilha = await this.trilhaValidator.find_full_trilha(id);
    const isOwner = trilha.id_usuario === token.sub;

    if (!isOwner && !trilha.compartilhada)
      throw new NotFoundException('Trilha não encontrada.');

    // The owner id is internal; the app only needs to know if the viewer owns the trail.
    return get_response(
      'Trilha encontrada',
      { ...trilha, id_usuario: undefined, dono: isOwner },
      200,
    );
  }

  async share_trilha(id: number, compartilhada: boolean, token: PayloadDTO) {
    await this.trilhaValidator.find_own_trilha_or_fail(id, token);

    await this.prisma.trilha.update({
      where: { id },
      data: { compartilhada },
    });

    return message_response(
      compartilhada
        ? 'Trilha compartilhada no feed.'
        : 'Trilha removida do feed.',
      HttpStatus.OK,
    );
  }

  // RN30.2: logical deletion.
  async delete_trilha(id: number, token: PayloadDTO) {
    await this.trilhaValidator.find_own_trilha_or_fail(id, token);

    await this.prisma.trilha.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return message_response('Trilha excluída com sucesso.', HttpStatus.OK);
  }
}
