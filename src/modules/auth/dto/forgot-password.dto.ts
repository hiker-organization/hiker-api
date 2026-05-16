import { IsEmail } from 'class-validator';

export class ForgotPasswordDTO {
  @IsEmail({}, { message: 'Por favor, insira um email corretamente.' })
  email!: string;
}
