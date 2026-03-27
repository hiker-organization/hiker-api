import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { createUserDTO } from './dtos/createUser.dto.js';
import { create_response } from '../../common/helpers/createResponse.helper.js';
import { hashingService } from '../../common/services/hash.service.js';
import { fileService } from '../../common/services/file.service.js';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService, private readonly hashService: hashingService, private readonly fileService: fileService){}

    async create_user(data: createUserDTO, foto?: Express.Multer.File) {
        await this.email_empty_or_fail(data.email)

        await this.numero_is_equal_fail(data.numero_celular)

        const hash = await this.hashService.hash(data.senha)
        
        const nick = `@${data.nome_usuario}`

        await this.nick_empty_or_fail(nick)

        if(foto) {
            // vou usar um narrowing neste ponto.
            const extName = path.extname(foto?.originalname).toLowerCase().substring(1)

            const fileName = `${Date.now()}_${data.nome_exibicao}.${extName}` 

            const pathMaster = path.resolve(process.cwd(), 'imgs', fileName)
            const dirPath = path.dirname(pathMaster)

            await mkdir(dirPath, { recursive: true })
            await this.fileService.writeFile(pathMaster, foto.buffer)

            data.foto_url = `imgs/${fileName}`
        }

        const user = await this.prisma.usuario.create(
            {   
                data:   { ...data, senha: hash, nome_usuario: nick }, 
                select: {nome_usuario: true,nome_exibicao: true, email: true}
            }
        )

        return create_response("usuário criado com sucesso!", user)
    }
    
    private async email_empty_or_fail(email:string) : Promise<boolean> {
        const user = await this.prisma.usuario.findUnique({ where: { email: email } })

        if(user) throw new ConflictException("Email já existente.")

        return true
    }
    private async nick_empty_or_fail(nick:string) : Promise<boolean> {
        const user = await this.prisma.usuario.findUnique({ where: { nome_usuario: nick } })

        if(user) throw new ConflictException("Nome de usuário já existente.")
        
        return true
    }
    private async numero_is_equal_fail(numero:string) : Promise<boolean> {
        const user = await this.prisma.usuario.findFirst({ where: { numero_celular: numero } })

        if(user) throw new ConflictException("numero de celular já cadastrado.")
            
        return true
    }
}
