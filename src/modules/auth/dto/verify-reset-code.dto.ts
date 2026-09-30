import { IsEmail, IsNotEmpty, IsNumberString, Length } from 'class-validator';

export class VerifyResetCodeDTO {
  @IsEmail({}, { message: 'Email inválido.' })
  @IsNotEmpty()
  email!: string;

  @IsNumberString({}, { message: 'O código deve conter apenas números.' })
  @Length(6, 6, { message: 'O código deve ter exatamente 6 dígitos.' })
  token!: string;
}
