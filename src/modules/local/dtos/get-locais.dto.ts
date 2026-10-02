import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, Matches } from 'class-validator';

// Google place ids, comma separated: ?ids=ChIJ...,ChIJ...
export class GetLocaisDTO {
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @ArrayMinSize(1, { message: 'informe ao menos um local.' })
  @ArrayMaxSize(50, { message: 'no máximo 50 locais por vez.' })
  @Matches(/^[A-Za-z0-9_-]+$/, { each: true, message: 'local inválido.' })
  public ids!: string[];
}
