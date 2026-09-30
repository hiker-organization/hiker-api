import { IsString, Length } from 'class-validator';

export class ConfirmEmailChangeDTO {
  @IsString()
  @Length(6, 6, { message: 'O código deve ter 6 dígitos.' })
  public token!: string;
}
