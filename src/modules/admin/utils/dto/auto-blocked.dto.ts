import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { GetReviewDTO } from './reviews.dto.js';

export class GetAutoBlockedDTO extends GetReviewDTO {
  // true (default): only the blocks no admin has reviewed yet.
  // false: only the reviewed ones, reverted or confirmed, with the admin who reviewed.
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean({ message: 'Campo pendentes deve ser true ou false.' })
  @IsOptional()
  pendentes?: boolean;
}
