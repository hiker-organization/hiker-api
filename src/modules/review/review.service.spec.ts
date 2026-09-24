import { beforeEach, describe, jest, it, expect } from '@jest/globals'
import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service.js';
import { PrismaService } from '../prisma/prisma.service.js'
import { PrismaServiceMock } from '../user/mocks/prismaService.mock.js';
import { UploadAzureServiceMock } from './mocks/uploadAzureService.mock.js';
import { ReviewMock } from './mocks/reviewCreate.mock.js';
import { UploadAzureService } from '../../common/services/upload.azure.service.js';

describe('ReviewService', () => {
    let reviewService: ReviewService;
    let prismaService: PrismaService;
    let uploadAzureService: UploadAzureService

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReviewService,
                { provide: PrismaService, useValue: PrismaServiceMock() },
                { provide: UploadAzureService, useValue: UploadAzureServiceMock() }
            ],
        }).compile();

        reviewService = module.get<ReviewService>(ReviewService);
        prismaService = module.get<PrismaService>(PrismaService);
        uploadAzureService = module.get<UploadAzureService>(UploadAzureService)
    });

    describe("create_review", () => {
        it("Should create review successfully.", async () => {
            const review_data = ReviewMock;
            const token = { email: 'user@example.com', iat: 1234567890, exp: 1234567890, aud: 'audience', iss: 'issuer', sub: 1 };
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
            .spyOn(prismaService.review, "create")
            .mockResolvedValue(mock_review_created as any)

            jest
                .spyOn(prismaService.tag, "findUnique")
                .mockResolvedValue(null)
            jest
                .spyOn(prismaService.tag, "create")
                .mockResolvedValue({ id: 1 } as any)

            const result = await reviewService.create_review(review_data, token);
            expect(result.statusCode).toEqual(201)
            expect(result).toEqual(
                {
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
                    statusCode: 201
                }
            )
        })

    })
});