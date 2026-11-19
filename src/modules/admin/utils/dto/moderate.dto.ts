import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { Status_Review } from '../../../../../generated/prisma/enums.js';

export class ModerateDTO {
  @IsNotEmpty({ message: 'Campo status é obrigatório.' })
  @IsIn([Status_Review.OFENSIVA, Status_Review.AUTORIZADA], {
    message: 'valor passado é inválido.',
  })
  @IsString()
  public status!: Status_Review;
}
