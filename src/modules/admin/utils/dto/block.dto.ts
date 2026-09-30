import { Transform } from 'class-transformer';
import { IsDate } from 'class-validator';

export class BlockDTO {
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('data inválida');
      }
      return date;
    }
    return value;
  })
  @IsDate({ message: 'Insira uma data válida.' })
  data!: Date;
}
