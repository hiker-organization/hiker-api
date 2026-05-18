import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateReviewDTO {
  @IsString()
  @IsOptional()
  @MaxLength(150, { message: 'limite máximo de caractéres: 150.' })
  public descricao?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  public nota?: number;

  @IsBoolean()
  @IsOptional()
  public oculto?: boolean;
}
