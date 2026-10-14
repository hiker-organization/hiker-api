import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  autor_select,
  MAX_ROUTE_POINTS,
  summary_select,
} from '../constants/trilha.constants.js';
import { UploadAzureService } from '../../../../common/services/upload.azure.service.js';
import { Rota } from '../types/trilha.types.js';
import { PayloadDTO } from '../../../auth/dto/payload.dto.js';

@Injectable()
export class TrilhaValidator {
  constructor(
    private prisma: PrismaService,
    private readonly uploadAzureService: UploadAzureService,
  ) {}
  async find_full_trilha(id: number) {
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

  async find_own_trilha_or_fail(id: number, token: PayloadDTO) {
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

  async with_user_photo<T extends { foto_url: string | null }>(autor: T) {
    return {
      ...autor,
      foto_url: autor.foto_url
        ? await this.uploadAzureService.getUserImageUrl(autor.foto_url)
        : null,
    };
  }

  public validate_rota(rota: unknown) {
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
  public downsample(rota: Rota, maxPoints: number): Rota {
    const total = rota.reduce((sum, segment) => sum + segment.length, 0);
    if (total <= maxPoints) return rota;

    const step = Math.ceil(total / maxPoints);
    return rota.map((segment) =>
      segment.filter(
        (_, index) => index % step === 0 || index === segment.length - 1,
      ),
    );
  }

  public parse_tags(tags?: string | string[]) {
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
}
