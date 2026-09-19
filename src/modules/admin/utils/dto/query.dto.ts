import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { ordenation, sortField } from '../enums/sorted.enum.js';

export class GetUsersDTO {
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

  @IsIn(["id", "nome_exibicao", "email"], {message: "Campo de ordenação inválido."})
  @IsOptional()
  sortBy?: sortField

  @IsIn(["asc", "desc"], {message: "Campo de ordenação inválido."})
  @IsOptional()
  order?: ordenation
}
