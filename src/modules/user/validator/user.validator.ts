import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { GlobalValidator } from '../../../common/validators/global.validator.js';
import { UploadAzureService } from '../../../common/services/upload.azure.service.js';

@Injectable()
export class UserValidator {
  constructor(
    private prisma: PrismaService,
    private globalValidator: GlobalValidator,
    private readonly uploadAzureService: UploadAzureService,
  ) {}

  async find_user_or_fail(id: number) {
    const user = await this.prisma.usuario.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  async email_empty_or_fail(email: string): Promise<boolean> {
    const user = await this.prisma.usuario.findFirst({
      where: { email: email, deletedAt: null },
    });

    if (user) throw new ConflictException('Email já existente.');

    return true;
  }

  async nick_empty_or_fail(nick: string): Promise<boolean> {
    const user = await this.prisma.usuario.findFirst({
      where: { nome_usuario: nick, deletedAt: null },
    });

    if (user) throw new ConflictException('Nome de usuário já existente.');

    return true;
  }

  async numero_is_equal_fail(numero: string): Promise<boolean> {
    const user = await this.prisma.usuario.findFirst({
      where: { numero_celular: numero, deletedAt: null },
    });

    if (user) throw new ConflictException('numero de celular já cadastrado.');

    return true;
  }

  async get_user_with_full_data(id: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: id, deletedAt: null },
      select: {
        foto_url: true,
        nome_exibicao: true,
        nome_usuario: true,
        email: true,
        data_nascimento: true,
        numero_celular: true,
        reputacao: true,
        reviews: {
          where: { deletedAt: null },
          select: {
            id: true,
            oculto: true,
            fotos: { select: { url: true } },
            id_local: true,
            local: true,
            nota: true,
            descricao: true,
            tags: { select: { tag: { select: { descritivo: true } } } },
            qnt_dislikes: true,
            qnt_likes: true,
            qnt_denuncia: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const reviews = await Promise.all(
      user.reviews.map(async (review) => ({
        ...review,
        fotos: await Promise.all(
          review.fotos.map(async (foto) => ({
            url: await this.uploadAzureService.getReviewImageUrl(foto.url),
          })),
        ),
      })),
    );

    return {
      ...user,
      foto_url: user.foto_url
        ? await this.uploadAzureService.getUserImageUrl(user.foto_url)
        : null,
      reviews,
    };
  }

  async get_user_with_nick(nick: string, viewerId: number) {
    const user = await this.prisma.usuario.findFirst({
      where: { nome_usuario: nick, deletedAt: null },
      select: {
        foto_url: true,
        nome_exibicao: true,
        nome_usuario: true,
        reputacao: true,
        reviews: {
          where: { oculto: false, deletedAt: null },
          select: {
            id: true,
            fotos: { select: { url: true } },
            id_local: true,
            local: true,
            nota: true,
            descricao: true,
            tags: { select: { tag: { select: { descritivo: true } } } },
            qnt_dislikes: true,
            qnt_likes: true,
            qnt_denuncia: true,
            qnt_favoritos: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const reactionMap =
      await this.globalValidator.get_user_reactions_for_reviews(
        user.reviews.map((review) => review.id),
        viewerId,
      );

    const favoriteIds = await this.globalValidator.favorited_reviews(
      user.reviews.map((review) => review.id),
      viewerId,
    );

    const reportsIds = await this.globalValidator.reported_reviews(
      user.reviews.map((review) => review.id),
      viewerId,
    );

    const reviews = await Promise.all(
      user.reviews.map(async (review) => ({
        ...review,
        liked: reactionMap.get(review.id) === 'LIKE',
        disliked: reactionMap.get(review.id) === 'DISLIKE',
        reported: reportsIds.has(review.id),
        favorited: favoriteIds.has(review.id),
        fotos: await Promise.all(
          review.fotos.map(async (foto) => ({
            url: await this.uploadAzureService.getReviewImageUrl(foto.url),
          })),
        ),
      })),
    );

    return {
      ...user,
      foto_url: user.foto_url
        ? await this.uploadAzureService.getUserImageUrl(user.foto_url)
        : null,
      reviews,
    };
  }
}
