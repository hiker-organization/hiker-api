import { beforeEach, describe, jest, it, expect } from '@jest/globals'
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { HashingService } from '../../common/services/hash.service.js'
import { FileService } from '../../common/services/file.service.js'
import { PrismaServiceMock } from './mocks/prismaService.mock.js';
import { HashServiceMock } from './mocks/hashService.mock.js';
import { FileServiceMock } from './mocks/fileService.mock.js';
import { UserMock } from './mocks/userCreate.mock.js';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PayloadDTO } from '../auth/dto/payload.dto.js';
import { PayloadMock } from './mocks/tokenPayload.mock.js';
import { user_fdMock } from './mocks/userGet.mock.js';

describe("userService", () => {
    let userService: UserService
    let prismaService: PrismaService
    let hashService: HashingService
    let fileService: FileService

    beforeEach(async () => {
        jest.clearAllMocks()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: PrismaService, useValue: PrismaServiceMock() },
                { provide: HashingService, useValue: HashServiceMock() },
                { provide: FileService, useValue: FileServiceMock() },
            ],
        }).compile()

        userService = module.get<UserService>(UserService)
        prismaService = module.get<PrismaService>(PrismaService)
        hashService = module.get<HashingService>(HashingService)
        fileService = module.get<FileService>(FileService)
    })

    describe("create", () => {
        describe("create user", () => {
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

    describe("get", () => {
        describe("get me", () => {
            it("should not 'get me' because token is not yours", async () => {
                const token_payload: PayloadDTO = PayloadMock

                jest
                .spyOn(prismaService.usuario, "findUnique")
                .mockResolvedValueOnce(null)

                await expect(userService.get_me(token_payload)).rejects.toThrow(
                    NotFoundException
                )
            })

            it("Should 'get me' success", async () => {
                const token_payload: PayloadDTO = PayloadMock
                const user_full_data = user_fdMock
                
                jest
                .spyOn(prismaService.usuario, "findUnique")
                .mockResolvedValueOnce(user_full_data as any)

                const result = await userService.get_me(token_payload)

                expect(result.statusCode).toEqual(200)
            })
        })

        describe("get user", () => {
            // it("Should get user success", async () => {
            //     const token_payload: PayloadDTO = PayloadMock
            //     const user = user_fdMock

            //     jest
            //     .spyOn(prismaService.usuario, "findFirst")
            //     .mockResolvedValueOnce(user as any)

            //     const result = await userService.get_user("vivi", token_payload)

            //     expect(result.statusCode).toEqual(200)
            // })

            it("Should user not found", async () => {
                jest
                .spyOn(prismaService.usuario, "findFirst")
                .mockResolvedValueOnce(null)

                await expect(userService.get_user("vivi", PayloadMock)).rejects.toThrow(
                    NotFoundException
                )
            })
        })
    })
})