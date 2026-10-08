import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTrilhaDTO {
  @IsString()
  @IsNotEmpty({ message: 'nome da trilha é obrigatório.' })
  @MaxLength(100, { message: 'limite máximo de caractéres: 100.' })
  public nome!: string;

  // Google place id of the park, peak... where the trail was.
  @IsString()
  @IsNotEmpty({ message: 'local é obrigatório.' })
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'local inválido.' })
  public local_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public cidade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public estado?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public distancia_m!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  public passos!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  public duracao_s!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'nota deve ser de 1 a 5.' })
  @Max(5, { message: 'nota deve ser de 1 a 5.' })
  public nota!: number;

  @IsString()
  @IsNotEmpty({ message: 'descrição é obrigatória.' })
  @MaxLength(150, { message: 'limite máximo de caractéres: 150.' })
  public descricao!: string;

  // Sent as a JSON string because the request is multipart.
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  })
  @IsArray({ message: 'rota inválida.' })
  public rota!: number[][][];

  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  public compartilhada!: boolean;

  @Type(() => Date)
  @IsDate({ message: 'data de início inválida.' })
  public iniciada_em!: Date;

  @IsOptional()
  @IsString({ each: true })
  public tags?: string | string[];

  @IsOptional()
  public fotos?: string | string[];
}
