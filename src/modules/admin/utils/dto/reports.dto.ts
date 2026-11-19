import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { ordenation, sortReportsField } from '../enums/sorted.enum.js';
import { Type } from 'class-transformer';
import { Status_Denuncia } from '../../../../../generated/prisma/enums.js';

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

  @IsIn(['ATIVA', 'FECHADA'], {
    message: 'Status inválido.',
  })
  @IsOptional()
  status?: Status_Denuncia;

  @IsIn(['asc', 'desc'], { message: 'Campo de ordenação inválido.' })
  @IsOptional()
  order?: ordenation;
}
