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

@Injectable()
export class ReviewService {
    constructor(private prisma: PrismaService, private readonly fileService: FileService) {}

    async create_review(data: CreateReviewDTO, token: PayloadDTO, fotos?: Array<Express.Multer.File>) {
        const fotosUrls: string[] = [];

        if (fotos && fotos.length > 0) {
            await Promise.all(
                fotos.map(async (foto) => {
                    const extName = path
                            .extname(foto?.originalname)
                            .toLowerCase()
                            .substring(1);
                    const fileName = `${randomUUID()}.${extName}`;
                    const pathMaster = path.resolve(process.cwd(), 'imgs', fileName);
                    const dirPath = path.dirname(pathMaster);

                    await mkdir(dirPath, { recursive: true });
                    await this.fileService.writeFile(pathMaster, foto.buffer);
                    
                    fotosUrls.push(fileName);
                })
            )
        }

        let tagsArray: number[] = []
        if (data.tags) {
            tagsArray = Array.isArray(data.tags) ? data.tags : [data.tags]
        }

        return await this.prisma.$transaction(async (rw) => {
            const review = await rw.review.create({
                data: {
                    id_local: data.local_id,
                    local: data.local,
                    descricao: data.descricao,
                    nota: data.nota,
                    id_usuario: token.sub,
                    fotos: fotosUrls.length > 0 ? {
                        create: fotosUrls.map(url => ({ url }))
                    } : undefined,
                    tags: tagsArray.length > 0 ? {
                        create: tagsArray.map(id_tag => ({ id_tag: Number(id_tag) }))
                    } : undefined
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
                                select: { descritivo: true } 
                            } 
                        } 
                     }
                }
            })

            return create_response("Sua review foi criada com sucesso.", review)
        })
    }

    async get_review(id: number) {
        const review = await this.find_one_review_with_full_content(id)
        return get_response("review encontrada.", review)
    }

    private async find_one_review_with_full_content(id: number) {
        const review = await this.prisma.review.findUnique(
            { 
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
                                select: { descritivo: true } 
                            } 
                        } 
                    }
                }
            }
        )
        if(!review) throw new NotFoundException("review não encontrada.")
        return review
    }
}
