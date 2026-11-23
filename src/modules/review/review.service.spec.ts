import { beforeEach, describe, jest, it, expect } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReviewService } from './review.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PrismaServiceMock } from '../user/mocks/prismaService.mock.js';
import { UploadAzureServiceMock } from './mocks/uploadAzureService.mock.js';
import { ReviewMock } from './mocks/reviewCreate.mock.js';
import { UploadAzureService } from '../../common/services/upload.azure.service.js';
import { LocalService } from '../local/local.service.js';
import { GlobalValidator } from '../../common/validators/global.validator.js';
import { ReviewValidator } from './validator/review.validator.js';

describe('ReviewService', () => {
  let reviewService: ReviewService;
  let prismaService: PrismaService;
  let uploadAzureService: UploadAzureService;
  let localService: { ensure_local: jest.Mock<(placeId: string) => any> };

  beforeEach(async () => {
    jest.clearAllMocks();
    localService = { ensure_local: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: PrismaServiceMock() },
        { provide: UploadAzureService, useValue: UploadAzureServiceMock() },
        { provide: LocalService, useValue: localService },
        GlobalValidator,
        ReviewValidator,
      ],
    }).compile();

    reviewService = module.get<ReviewService>(ReviewService);
    prismaService = module.get<PrismaService>(PrismaService);
    uploadAzureService = module.get<UploadAzureService>(UploadAzureService);
  });

  describe('create_review', () => {
    it('Should create review successfully.', async () => {
      const review_data = ReviewMock;
      const token = {
        email: 'user@example.com',
        cargo: 'USER',
        iat: 1234567890,
        exp: 1234567890,
        aud: 'audience',
        iss: 'issuer',
        sub: 1,
      };
      const mock_review_created = {
        descricao: review_data.descricao,
        local: review_data.local,
        qnt_likes: 0,
        qnt_dislikes: 0,
        // local_id: review_data.local_id,
        nota: review_data.nota,
        fotos: [],
        tags: review_data.tags,
        // oculto: review_data.oculto,
        // tags: review_data.tags,
      };

      jest
        .spyOn(prismaService.review, 'create')
        .mockResolvedValue(mock_review_created as any);

      jest
        .spyOn(prismaService.usuario, 'findUnique')
        .mockResolvedValue({ banido: false, bloqueado: false } as any);

      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation((callback: any) => callback(prismaService));

      jest.spyOn(prismaService.tag, 'findUnique').mockResolvedValue(null);
      jest
        .spyOn(prismaService.tag, 'create')
        .mockResolvedValue({ id: 1 } as any);

      const result = await reviewService.create_review(review_data, token);
      expect(result).toEqual({
        message: 'Sua review foi criada com sucesso.',
        data: {
          descricao: review_data.descricao,
          local: review_data.local,
          qnt_likes: 0,
          qnt_dislikes: 0,
          // local_id: review_data.local_id,
          nota: review_data.nota,
          fotos: [],
          tags: review_data.tags,
          // oculto: review_data.oculto,
          // tags: review_data.tags,
        },
      });
      expect(localService.ensure_local).toHaveBeenCalledWith(
        review_data.local_id,
      );
    });

    it('Should not create the review when the place cannot be loaded.', async () => {
      jest
        .spyOn(prismaService.usuario, 'findUnique')
        .mockResolvedValue({ banido: false, bloqueado: false } as any);
      localService.ensure_local.mockRejectedValue(
        new NotFoundException('Local não encontrado.'),
      );
      const create = jest.spyOn(prismaService.review, 'create');

      await expect(
        reviewService.create_review(ReviewMock, { sub: 1 } as any, [
          { buffer: Buffer.from(''), originalname: 'a.jpg' } as any,
        ]),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(uploadAzureService.addImageReview).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('get_recommended_reviews', () => {
    const review = (id: number) => ({
      id,
      descricao: `review ${id}`,
      fotos: [{ url: `review/${id}.jpg` }],
      autor: { nome_usuario: `autor${id}`, foto_url: null },
    });

    it('Should return the recommended reviews in rank order with the user context.', async () => {
      const findMany = jest
        .spyOn(prismaService.recomendacao, 'findMany')
        .mockResolvedValue([
          { review: review(7) },
          { review: review(3) },
        ] as any);
      jest
        .spyOn(prismaService.voto_review, 'findMany')
        .mockResolvedValue([{ id_review: 7, tipo: 'LIKE' }] as any);
      jest
        .spyOn(prismaService.review_favorita, 'findMany')
        .mockResolvedValue([{ id_review: 3 }] as any);
      jest.spyOn(prismaService.denuncia, 'findMany').mockResolvedValue([]);
      jest
        .spyOn(uploadAzureService, 'getReviewImageUrl')
        .mockImplementation((path: string) =>
          Promise.resolve(`https://signed/${path}`),
        );

      const result = await reviewService.get_recommended_reviews({
        sub: 1,
      } as any);

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id_usuario: 1,
            review: {
              oculto: false,
              deletedAt: null,
              status: { in: ['AUTORIZADA', 'ANALISE'] },
            },
          },
          orderBy: { rank: 'asc' },
        }),
      );
      expect(result.message).toBe('reviews recomendadas');
      expect(result.data.map((r: { id: number }) => r.id)).toEqual([7, 3]);
      expect(result.data[0]).toMatchObject({
        liked: true,
        disliked: false,
        favorited: false,
        reported: false,
        fotos: [{ url: 'https://signed/review/7.jpg' }],
      });
      expect(result.data[1]).toMatchObject({ liked: false, favorited: true });
    });

    it('Should return an empty list when the user has no recommendations.', async () => {
      jest.spyOn(prismaService.recomendacao, 'findMany').mockResolvedValue([]);

      const result = await reviewService.get_recommended_reviews({
        sub: 1,
      } as any);

      expect(result).toEqual({ message: 'reviews recomendadas', data: [] });
      expect(prismaService.voto_review.findMany).not.toHaveBeenCalled();
    });
  });
});
