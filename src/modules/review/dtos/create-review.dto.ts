import { Type, Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export class CreateReviewDTO {
  @IsString()
  @IsNotEmpty({ message: 'descrição é obrigatória.' })
  @MaxLength(150, { message: 'limite máximo de caractéres: 150.' })
  public descricao!: string;

  @IsString()
  @IsNotEmpty({ message: 'local é obrigatório.' })
  public local_id!: string;

  @IsString()
  @IsNotEmpty({ message: 'local é obrigatório.' })
  public local!: string;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'nota é obrigatória.' })
  public nota!: number;

  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  @IsNotEmpty({ message: 'informe a visibilidade da sua review.' })
  public oculto!: boolean;

  @IsOptional()
  @IsString({ each: true })
  public tags?: string | string[];

  @IsOptional()
  public fotos?: string | string[];
}
