import { ConflictException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PayloadDTO } from '../auth/dto/payload.dto.js';
import { message_response } from '../../common/helpers/message-response.helper.js';
import { get_response } from '../../common/helpers/get-response.helper.js';
import { GetUsersDTO } from './utils/dto/query.dto.js';
import { BlockDTO } from './utils/dto/block.dto.js';
import { AdminValidator } from './utils/validator/admin.validator.js';
import { GetReportsDTO } from './utils/dto/reports.dto.js';
import { ModerateDTO } from './utils/dto/moderate.dto.js';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private adminValidator: AdminValidator,
  ) {}

  async admin(token: PayloadDTO) {
    await this.prisma.usuario.update({
      data: { cargo: 'ADM' },
      where: { id: token.sub },
    });

    return message_response('Usuário setado com sucesso!', 200);
  }

  async show_users(query: GetUsersDTO) {
    return await this.adminValidator.get_users(
      query.page,
      query.limit,
      query.sortBy,
      query.order,
    );
  }

  async reports(query: GetReportsDTO) {
    return await this.adminValidator.get_reports(
      query.page,
      query.limit,
      query.sortBy,
      query.order,
      query.status,
    );
  }

  async moderate(id: number, data: ModerateDTO) {
    const report = await this.adminValidator.verify_report(id);
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.denuncia.updateMany({
        where: {
          id: id,
          status: { not: 'FECHADA' },
        },
        data: {
          status: 'FECHADA',
        },
      });

      if (result.count === 0) {
        throw new ConflictException(
          'Denúncia já foi finalizada, não é possível fazer uma ação.',
        );
      }

      await tx.review.update({
        where: { id: report.id_review },
        data: { status: data.status },
      });

      await tx.denuncia.updateMany({
        where: { id_review: report.id_review },
        data: { status: 'FECHADA' },
      });

      return message_response('Denúncia finalizada.', HttpStatus.OK);
    });
  }

  async close_report(id: number) {
    const report = await this.adminValidator.verify_report(id);

    if (report.status === 'FECHADA')
      throw new ConflictException('Esta denúncia já foi finalizada.');

    await this.prisma.denuncia.update({
      where: { id: id, id_review: report.id_review },
      data: { status: 'FECHADA' },
    });

    return message_response('Denuncia fechada com sucesso.', HttpStatus.OK);
  }

  async show_user(nick: string) {
    const user = await this.adminValidator.get_user(nick);

    return get_response('Usuário encontrado.', user, 200);
  }

  async block(nick: string, data: BlockDTO) {
    const user = await this.adminValidator.verify_user(nick);

    await this.prisma.usuario.update({
      data: { bloqueado: true, bloqueado_ate: data.data },
      where: { nome_usuario: user.nome_usuario },
    });

    return message_response('Usuário bloqueado com sucesso.', 200);
  }

  async ban(nick: string) {
    const user = await this.adminValidator.verify_user(nick);

    await this.prisma.usuario.update({
      data: { banido: true },
      where: { nome_usuario: user.nome_usuario },
    });

    return message_response('Usuário banido com sucesso.', 200);
  }

  async unblock(nick: string) {
    const user = await this.adminValidator.verify_user(nick);

    await this.prisma.usuario.update({
      data: { bloqueado: false, bloqueado_ate: null },
      where: { nome_usuario: user.nome_usuario },
    });

    return message_response('Usuário desbloqueado com sucesso.', 200);
  }
}
