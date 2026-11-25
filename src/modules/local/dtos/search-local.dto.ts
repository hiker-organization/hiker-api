import { Type } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SearchLocalDTO {
  @IsString()
  @MinLength(3, { message: 'digite pelo menos 3 caractéres para buscar.' })
  @MaxLength(100, { message: 'limite máximo de caractéres: 100.' })
  public q!: string;

  // Where the user is, so the places nearby come first. Only used with both.
  @IsOptional()
  @Type(() => Number)
  @IsLatitude({ message: 'latitude inválida.' })
  public lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude({ message: 'longitude inválida.' })
  public lng?: number;
}
