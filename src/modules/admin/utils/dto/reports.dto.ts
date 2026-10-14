import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { ordenation, sortReportsField } from '../enums/sorted.enum.js';
import { Type } from 'class-transformer';

export class GetReportsDTO {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsIn(['categoria', 'createdAt', 'id_review', 'id'], {
    message: 'Campo de ordenação inválido.',
  })
  @IsOptional()
  sortBy?: sortReportsField;

  @IsIn(['asc', 'desc'], { message: 'Campo de ordenação inválido.' })
  @IsOptional()
  order?: ordenation;
}
