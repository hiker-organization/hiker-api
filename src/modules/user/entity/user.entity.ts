import { Role } from '../../../../generated/prisma/enums.js';

export class userEntity {
  public id!: number;
  public nome_usuario!: string;
  public nome_exibicao!: string;
  public email!: string;
  public senha!: string;
  public numero_celular!: string;
  public data_nascimento!: Date;
  public foto_url?: string;
  public reputacao!: number;
  public cargo?: Role;
}
