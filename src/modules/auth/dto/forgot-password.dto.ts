import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Por favor, insira um email corretamente.' })
  email!: string;
}