import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LocalService } from '../local/local.service.js';
import { UploadAzureService } from '../../common/services/upload.azure.service.js';
import { PayloadDTO } from '../auth/dto/payload.dto.js';
import { GetReviewsQueryDTO } from '../review/dtos/get-reviews-query.dto.js';
import { create_response } from '../../common/helpers/create-response.helper.js';
import { get_response } from '../../common/helpers/get-response.helper.js';
import { message_response } from '../../common/helpers/message-response.helper.js';
import { CreateTrilhaDTO } from './dtos/create-trilha.dto.js';

type Rota = number[][][];

const MAX_ROUTE_POINTS = 20000;
// Feed cards only draw a small preview of the route.
const FEED_ROUTE_POINTS = 150;

const autor_select = {
  select: {
    nome_exibicao: true,
    nome_usuario: true,
    foto_url: true,
    reputacao: true,
  },
};

const summary_select = {
  id: true,
  nome: true,
  cidade: true,
  estado: true,
  distancia_m: true,
  passos: true,
  duracao_s: true,
  nota: true,
  compartilhada: true,
  iniciada_em: true,
  createdAt: true,
};

@Injectable()
export class TrilhaService {
  constructor(
    private prisma: PrismaService,
    private readonly uploadAzureService: UploadAzureService,
    private readonly localService: LocalService,
  ) {}

  async create_trilha(
    data: CreateTrilhaDTO,
    token: PayloadDTO,
    fotos?: Array<Express.Multer.File>,
  ) {
    await this.verify_block(token);
    this.validate_rota(data.rota);
    // Before the photos are uploaded, so a place that can't be loaded uploads nothing.
    await this.localService.ensure_local(data.local_id);

    const fotosUrls = await Promise.all(
      (fotos ?? []).map((foto) =>
        this.uploadAzureService.addImageReview(foto.buffer, foto.originalname),
      ),
    );

    const tagsArray = this.parse_tags(data.tags);

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
      await this.find_full_trilha(trilha.id),
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
        rota: this.downsample(trilha.rota as Rota, FEED_ROUTE_POINTS),
        autor: await this.with_user_photo(trilha.autor),
      })),
    );

    return {
      ...get_response('Trilhas compartilhadas', result, HttpStatus.OK),
      nextCursor,
    };
  }

  // RF28: the owner always sees the trail; other users only when it is shared.
  async get_trilha(id: number, token: PayloadDTO) {
    const trilha = await this.find_full_trilha(id);
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
    await this.find_own_trilha_or_fail(id, token);

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
    await this.find_own_trilha_or_fail(id, token);

    await this.prisma.trilha.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return message_response('Trilha excluída com sucesso.', HttpStatus.OK);
  }

  private async find_full_trilha(id: number) {
    const trilha = await this.prisma.trilha.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...summary_select,
        id_usuario: true,
        descricao: true,
        rota: true,
        autor: autor_select,
        fotos: { select: { url: true } },
        tags: { select: { tag: { select: { descritivo: true } } } },
      },
    });

    if (!trilha) throw new NotFoundException('Trilha não encontrada.');

    return {
      ...trilha,
      autor: await this.with_user_photo(trilha.autor),
      fotos: await Promise.all(
        trilha.fotos.map(async (foto) => ({
          url: await this.uploadAzureService.getReviewImageUrl(foto.url),
        })),
      ),
    };
  }

  private async find_own_trilha_or_fail(id: number, token: PayloadDTO) {
    const trilha = await this.prisma.trilha.findFirst({
      where: { id, deletedAt: null },
      select: { id_usuario: true },
    });

    if (!trilha) throw new NotFoundException('Trilha não encontrada.');

    if (trilha.id_usuario !== token.sub)
      throw new ForbiddenException(
        'Você não tem permissão para alterar esta trilha.',
      );
  }

  private async with_user_photo<T extends { foto_url: string | null }>(
    autor: T,
  ) {
    return {
      ...autor,
      foto_url: autor.foto_url
        ? await this.uploadAzureService.getUserImageUrl(autor.foto_url)
        : null,
    };
  }

  private validate_rota(rota: unknown) {
    const isPoint = (point: unknown) =>
      Array.isArray(point) &&
      point.length === 2 &&
      typeof point[0] === 'number' &&
      typeof point[1] === 'number' &&
      Math.abs(point[0]) <= 90 &&
      Math.abs(point[1]) <= 180;

    const valid =
      Array.isArray(rota) &&
      rota.every((segment) => Array.isArray(segment) && segment.every(isPoint));

    if (!valid) throw new BadRequestException('rota inválida.');

    const total = (rota as Rota).reduce((sum, s) => sum + s.length, 0);
    if (total > MAX_ROUTE_POINTS)
      throw new BadRequestException('rota excede o limite de pontos.');
  }

  // Keeps every n-th point of each segment, always including its last point.
  private downsample(rota: Rota, maxPoints: number): Rota {
    const total = rota.reduce((sum, segment) => sum + segment.length, 0);
    if (total <= maxPoints) return rota;

    const step = Math.ceil(total / maxPoints);
    return rota.map((segment) =>
      segment.filter(
        (_, index) => index % step === 0 || index === segment.length - 1,
      ),
    );
  }

  private parse_tags(tags?: string | string[]) {
    if (!tags) return [];
    const raw = Array.isArray(tags) ? tags : [tags];
    return [
      ...new Set(
        raw
          .flatMap((tag) => tag.split(','))
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
  }

  private async verify_block(token: PayloadDTO) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: token.sub },
    });

    if (!user || user.banido)
      throw new UnauthorizedException(
        'Você está banido, não poderá mais acessar nossos recursos.',
      );

    if (user.bloqueado && user.bloqueado_ate! > new Date())
      throw new UnauthorizedException(
        'Você está bloqueado, não poderá realizar esta ação.',
      );
  }
}
