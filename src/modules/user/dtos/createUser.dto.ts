import { Transform } from 'class-transformer';
import {
  Equals,
  IsEmail,
  IsMobilePhone,
  IsDate,
  IsOptional,
  IsString,
  IsStrongPassword,
  MaxLength,
  MinLength,
  NotContains,
  Matches,
} from 'class-validator';

export class CreateUserDTO {
  @IsString({ message: 'Não insira numeros aqui.' })
  @MaxLength(20, { message: 'Limite de 20 caractétes.' })
  @NotContains(' ', { message: 'Espaços não são permitidos.' })
  @Matches(/^[a-zA-Z0-9_.]+$/, {
    message: "Caractéres especiais permitidos: ' _ ' ou ' . '",
  })
  @MinLength(3)
  public nome_usuario!: string;

  @IsString({ message: 'Não insira numeros aqui.' })
  @MaxLength(30, { message: 'Limite de 30 caractétes.' })
  public nome_exibicao!: string;

  @IsEmail({}, { message: 'Por favor, insira um email corretamente.' })
  public email!: string;

  @IsStrongPassword(
    {
      minLength: 8,
      minSymbols: 1,
      minUppercase: 1,
      minLowercase: 1,
      minNumbers: 1,
    },
    {
      message:
        'A senha precisa conter: no minimo 8 caractéres, 1 simbolo (@,#,%,etc.) e 1 letra maiúscula, 1 letra minúscula, e 1 numero.',
    },
  )
  public senha!: string;

  @IsMobilePhone('pt-BR', {}, { message: 'Insira corretamente seu número.' })
  public numero_celular!: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('data inválida');
      }
      return date;
    }
    return value;
  })
  @IsDate({ message: 'Data inválida' })
  public data_nascimento!: Date;

  @IsOptional()
  public foto_url?: string;

  // The sign-up is a multipart form, so the value can come as the string "true".
  @Transform(({ value }) => value === true || value === 'true')
  @Equals(true, {
    message: 'Aceite a Política de Privacidade para criar sua conta.',
  })
  public aceite_politica!: boolean;
}
