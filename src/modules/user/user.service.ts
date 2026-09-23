import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDTO } from './dtos/createUser.dto.js';
import { create_response } from '../../common/helpers/create-response.helper.js';
import { UploadAzureService } from '../../common/services/upload.azure.service.js';
import { HashingService } from '../../common/services/hash.service.js';
import { getRandomValues } from 'node:crypto';
import { PayloadDTO } from '../auth/dto/payload.dto.js';
import { get_response } from '../../common/helpers/get-response.helper.js';
import { UpdateUserDTO } from './dtos/updateUser.dto.js';
import { message_response } from '../../common/helpers/message-response.helper.js';
import { UpdatePasswordDTO } from './dtos/updatePassword.dto.js';
import { GetReviewsQueryDTO } from '../review/dtos/get-reviews-query.dto.js';
import { Review } from '../../../generated/prisma/client.js';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly hashService: HashingService,
    private readonly uploadAzureService: UploadAzureService,
  ) {}

  async create_user(data: CreateUserDTO, foto?: Express.Multer.File) {
    await this.email_empty_or_fail(data.email);

    await this.numero_is_equal_fail(data.numero_celular);

    const hash = await this.hashService.hash(data.senha);

    const nick = `@${data.nome_usuario}`;

    await this.nick_empty_or_fail(nick);

    if (foto) {
      data.foto_url = await this.uploadAzureService.addImageUser(
        foto.buffer,
        foto.originalname,
      );
    }

    const user = await this.prisma.usuario.create({
      data: { ...data, senha: hash, nome_usuario: nick },
      select: {
        nome_usuario: true,
        nome_exibicao: true,
        email: true,
      },
    });

    return create_response(
      'usuário criado com sucesso!',
      user,
      HttpStatus.CREATED,
    );
  }

  async delete_user(token: PayloadDTO) {
    const user = await this.find_user_or_fail(token.sub);

    const suffix = `_deleted_${user.id}`;

    await this.prisma.usuario.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        email: suffix,
        nome_exibicao: `Usuário desativado`,
        nome_usuario: suffix,
        numero_celular: suffix,
        data_nascimento: suffix,
      },
    });

    return message_response('Conta desativada com sucesso.', 200);
  }

  async get_user(nick: string, token: PayloadDTO) {
    const user = await this.get_user_with_nick(nick, token.sub);
    return get_response('Perfil do usuário abaixo', user, 200);
  }

  async get_me(token: PayloadDTO) {
    const user = await this.get_user_with_full_data(token.sub);
    return get_response('Seu perfil abaixo', user, 200);
  }

  async favorites(token: PayloadDTO, query: GetReviewsQueryDTO) {
    const limit = query.limit ?? 20;
    const reviews = await this.prisma.review_favorita.findMany({
      take: limit + 1,
      skip: query.cursor ? 1 : 0,
      ...(query.cursor && {
        cursor: { id: query.cursor },
      }),
      where: { review: { deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      select: {
        review: {
          select: {
            id: true,
            id_local: true,
            local: true,
            descricao: true,
            nota: true,
            createdAt: true,
            qnt_likes: true,
            qnt_dislikes: true,
            qnt_favoritos: true,
            fotos: { select: { url: true } },
            oculto: true,
            autor: {
              select: {
                nome_exibicao: true,
                foto_url: true,
                reputacao: true,
                nome_usuario: true,
              },
            },
            tags: { select: { tag: { select: { descritivo: true } } } },
          },
        },
      },
    });

    if (reviews.length === 0)
      throw new NotFoundException('Nehuma review favoritada para mostrar.');

    const hasNextPage = reviews.length > limit;
    const data = hasNextPage ? reviews.slice(0, limit) : reviews;
    const nextCursor = hasNextPage ? data[data.length - 1].review.id : null;

    const favoriteIds = await this.favorited_reviews(
      reviews.map((review) => review.review.id),
      token.sub,
    );
    const reactions = await this.get_user_reactions_for_reviews(
      data.map((review) => review.review.id),
      token.sub,
    );

    return {
      data: data.map((review) => ({
        ...review,
        liked: reactions.get(review.review.id) === 'LIKE',
        disliked: reactions.get(review.review.id) === 'DISLIKE',
        favorited: favoriteIds.has(review.review.id),
        fotos: review.review.fotos.map((foto) => ({
          url: `${process.env.API_STATIC_REVIEWS}${foto.url}`,
        })),
        autor: {
          ...review.review.autor,
          foto_url: review.review.autor.foto_url
            ? `${process.env.API_STATIC_USER}${review.review.autor.foto_url}`
            : null,
        },
      })),
      nextCursor,
    };
  }

  async update_user(
    data: UpdateUserDTO,
    token: PayloadDTO,
    foto?: Express.Multer.File,
  ) {
    const user = await this.find_user_or_fail(token.sub);

    data.nome_usuario = data.nome_usuario ? `@${data.nome_usuario}` : undefined;

    if (foto) {
      data.foto_url = await this.uploadAzureService.addImageUser(
        foto.buffer,
        foto.originalname,
      );

      if (user.foto_url) {
        await this.uploadAzureService.deleteUserImage(user.foto_url);
      }
    }

    const updatedUser = await this.prisma.usuario.update({
      where: { id: user.id },
      data: {
        ...data,
      },
      select: {
        nome_exibicao: true,
        foto_url: true,
      },
    });

    return create_response('Alterado com sucesso.', {
      ...updatedUser,
      foto_url: updatedUser.foto_url
        ? await this.uploadAzureService.getUserImageUrl(updatedUser.foto_url)
        : null,
    }, 200);
  }

  async update_password(data: UpdatePasswordDTO, token: PayloadDTO) {
    const user = await this.find_user_or_fail(token.sub);

    if (!(await this.hashService.compare(data.senha_atual, user.senha))) {
      throw new ConflictException('Senha atual incorreta.');
    }

    const hash = await this.hashService.hash(data.senha_nova);

    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { senha: hash },
    });

    return message_response('Senha alterada com sucesso.', 200);
  }

  private async find_user_or_fail(id: number) {
    const user = await this.prisma.usuario.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }
  private async email_empty_or_fail(email: string): Promise<boolean> {
    const user = await this.prisma.usuario.findFirst({
      where: { email: email, deletedAt: null },
    });

    if (user) throw new ConflictException('Email já existente.');

    return true;
  }
  private async nick_empty_or_fail(nick: string): Promise<boolean> {
    const user = await this.prisma.usuario.findFirst({
      where: { nome_usuario: nick, deletedAt: null },
    });

    if (user) throw new ConflictException('Nome de usuário já existente.');

    return true;
  }
  private async numero_is_equal_fail(numero: string): Promise<boolean> {
    const user = await this.prisma.usuario.findFirst({
      where: { numero_celular: numero, deletedAt: null },
    });

    if (user) throw new ConflictException('numero de celular já cadastrado.');

    return true;
  }
  private async get_user_with_full_data(id: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: id, deletedAt: null },
      select: {
        foto_url: true,
        nome_exibicao: true,
        nome_usuario: true,
        reputacao: true,
        reviews: {
          where: { deletedAt: null },
          select: {
            id: true,
            oculto: true,
            fotos: { select: { url: true } },
            local: true,
            nota: true,
            descricao: true,
            tags: { select: { tag: { select: { descritivo: true } } } },
            qnt_dislikes: true,
            qnt_likes: true,
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
  private async get_user_with_nick(nick: string, viewerId: number) {
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
            local: true,
            nota: true,
            descricao: true,
            tags: { select: { tag: { select: { descritivo: true } } } },
            qnt_dislikes: true,
            qnt_likes: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const reactionMap = await this.get_user_reactions_for_reviews(
      user.reviews.map((review) => review.id),
      viewerId,
    );

    const favoriteIds = await this.favorited_reviews(
      user.reviews.map((review) => review.id),
      viewerId,
    );

    const reviews = await Promise.all(
      user.reviews.map(async (review) => ({
        ...review,
        liked: reactionMap.get(review.id) === 'LIKE',
        disliked: reactionMap.get(review.id) === 'DISLIKE',
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
  private async get_user_reactions_for_reviews(
    reviewIds: number[],
    userId: number,
  ) {
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
  private async favorited_reviews(reviewsId: number[], userId: number) {
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
}
