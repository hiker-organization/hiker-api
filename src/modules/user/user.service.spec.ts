import { beforeEach, describe, jest, it, expect } from '@jest/globals'
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { HashingService } from '../../common/services/hash.service.js'
import { UploadAzureService } from '../../common/services/upload.azure.service.js'
import { PrismaServiceMock } from './mocks/prismaService.mock.js';
import { HashServiceMock } from './mocks/hashService.mock.js';
import { UploadAzureServiceMock } from '../review/mocks/uploadAzureService.mock.js';
import { UserMock } from './mocks/userCreate.mock.js';
import { ConflictException } from '@nestjs/common';

describe("userService", () => {
    let userService: UserService
    let prismaService: PrismaService
    let hashService: HashingService
    let uploadAzureService: UploadAzureService

    beforeEach(async () => {
        jest.clearAllMocks()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: PrismaService, useValue: PrismaServiceMock() },
                { provide: HashingService, useValue: HashServiceMock() },
                { provide: UploadAzureService, useValue: UploadAzureServiceMock() },
            ],
        }).compile()

        userService = module.get<UserService>(UserService)
        prismaService = module.get<PrismaService>(PrismaService)
        hashService = module.get<HashingService>(HashingService)
        uploadAzureService = module.get<UploadAzureService>(UploadAzureService)
    })

    describe("create", () => {
        it("Should create user successfully.", async () => {
            const user_data = UserMock
            const hashed_password = 'senha_hasheada_123';
            const mock_user_created = {
                nome_usuario: user_data.nome_usuario,
                nome_exibicao: user_data.nome_exibicao,
                email: user_data.email
            }

            jest 
            .spyOn(prismaService.usuario, "findFirst")
            .mockResolvedValue(null)

            jest
            .spyOn(hashService, "hash")
            .mockResolvedValue(hashed_password)

            jest
            .spyOn(prismaService.usuario, "create")
            .mockResolvedValue(mock_user_created as any)

            const result = await userService.create_user(user_data)

            expect(result.statusCode).toEqual(201)
            expect(result).toEqual(
                {
                    message: "usuário criado com sucesso!",
                    data: {
                        nome_usuario: user_data.nome_usuario,
                        nome_exibicao: user_data.nome_exibicao,
                        email: user_data.email
                    },
                    statusCode: 201
                }
            )
        })

        it("Should not create user because nickname exists", async () => {
            const hashed_password = "senha_hasheada_123"
            const user_data = UserMock

            jest
            .spyOn(hashService, "hash")
            .mockResolvedValue(hashed_password)

            jest
            .spyOn(prismaService.usuario, "findFirst")
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(user_data as any)

            await expect(userService.create_user(user_data)).rejects.toThrow(
                ConflictException
            )

            expect(prismaService.usuario.findFirst).toHaveBeenCalledWith({
                where: { nome_usuario: `@${user_data.nome_usuario}`, deletedAt: null },
            })
        })

        it("Should not create user because email exists", async () => {
            const user_data = UserMock
            
            jest
            .spyOn(prismaService.usuario, "findFirst")
            .mockResolvedValueOnce(user_data as any)
            
            await expect(userService.create_user(user_data)).rejects.toThrow(
                ConflictException
            )

            expect(prismaService.usuario.findFirst).toHaveBeenLastCalledWith({
                where: { email: user_data.email, deletedAt: null }
            })
        })

        it("Should not create user because number exits", async () => {
            const user_data = UserMock

            jest
            .spyOn(prismaService.usuario, "findFirst")
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(user_data as any)

            await expect(userService.create_user(user_data)).rejects.toThrow(
                ConflictException
            )

            expect(prismaService.usuario.findFirst).toHaveBeenCalledWith({
                where: { numero_celular: "(14) 99882-2367", deletedAt: null }
            })
        })
    })
})