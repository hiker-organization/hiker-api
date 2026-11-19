import { Transform } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class SummaryDTO {
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
}
