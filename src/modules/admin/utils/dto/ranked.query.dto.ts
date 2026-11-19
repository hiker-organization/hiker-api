import { Transform, Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, Max, Min } from 'class-validator';

export class RankedDTO {
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) throw new Error('Data inválida.');
      return date;
    }
    return value;
  })
  @IsDate({ message: 'Selecione uma data válida.' })
  @IsOptional()
  from?: Date;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) throw new Error('Data inválida.');
      return date;
    }
    return value;
  })
  @IsDate({ message: 'Selecione uma data válida.' })
  @IsOptional()
  to?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Liminte mínimo permitido: 1' })
  @Max(10, { message: 'Limite máximo permitido: 10' })
  limit?: number;
}
