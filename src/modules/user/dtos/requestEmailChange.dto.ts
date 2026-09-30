import { IsEmail } from 'class-validator';

export class RequestEmailChangeDTO {
  @IsEmail({}, { message: 'Por favor, insira um email corretamente.' })
  public email!: string;
}
