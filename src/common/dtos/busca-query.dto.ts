import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// Search page queries (people and places), paged by offset: ?q=trilha&limit=10&offset=20.
// Any length, since the app searches while the user types.
export class BuscaQueryDTO {
  @IsString()
  @MinLength(1, { message: 'digite algo para buscar.' })
  @MaxLength(100, { message: 'limite máximo de caractéres: 100.' })
  public q!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  public limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public offset?: number;
}
