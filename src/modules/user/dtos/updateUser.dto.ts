import {
  IsEmail,
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

  @IsOptional()
  @IsEmail({}, { message: 'Por favor, insira um email corretamente.' })
  public email?: string;

  @IsOptional()
  @IsMobilePhone('pt-BR', {}, { message: 'Insira corretamente seu número.' })
  public numero_celular?: string;

  @IsOptional()
  public foto_url?: string;
}
