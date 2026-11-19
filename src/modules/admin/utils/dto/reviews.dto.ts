import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { ordenation, sortReviewField } from '../enums/sorted.enum.js';

export class GetReviewDTO {
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

  @IsIn(['createdAt', 'id'], {
    message: 'Campo de ordenação inválido.',
  })
  @IsOptional()
  sortBy?: sortReviewField;

  @IsIn(['asc', 'desc'], { message: 'Campo de ordenação inválido.' })
  @IsOptional()
  order?: ordenation;
}
