import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateReviewDTO {
  @IsString()
  @IsOptional({ message: 'descrição é obrigatória.' })
  @MaxLength(150, { message: 'limite máximo de caractéres: 150.' })
  public descricao!: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional({ message: 'nota é obrigatória.' })
  public nota!: number;

  @IsBoolean()
  @IsOptional()
  public oculto?: boolean;
}
