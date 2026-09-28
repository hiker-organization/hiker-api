import { IsString, MaxLength, MinLength } from 'class-validator';

export class SearchLocalDTO {
  @IsString()
  @MinLength(3, { message: 'digite pelo menos 3 caractéres para buscar.' })
  @MaxLength(100, { message: 'limite máximo de caractéres: 100.' })
  public q!: string;
}
