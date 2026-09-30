import { Transform } from 'class-transformer';
import {
  IsDate,
  IsMobilePhone,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  NotContains,
} from 'class-validator';

export class UpdateUserDTO {
  @IsOptional()
  @IsString({ message: 'Não insira numeros aqui.' })
  @MaxLength(20, { message: 'Limite de 20 caractétes.' })
  @NotContains(' ', { message: 'Espaços não são permitidos.' })
  @Matches(/^[a-zA-Z0-9_.]+$/, {
    message: "Caractéres especiais permitidos: ' _ ' ou ' . '",
  })
  @MinLength(3)
  public nome_usuario?: string;

  @IsOptional()
  @IsString({ message: 'Não insira numeros aqui.' })
  @MaxLength(30, { message: 'Limite de 30 caractétes.' })
  public nome_exibicao?: string;

  // E-mail is changed through /user/change-email, which requires a verification code (RN17.6).

  @IsOptional()
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
  public data_nascimento?: Date;

  @IsOptional()
  @IsMobilePhone('pt-BR', {}, { message: 'Insira corretamente seu número.' })
  public numero_celular?: string;

  @IsOptional()
  public foto_url?: string;
}
