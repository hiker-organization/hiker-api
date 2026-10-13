import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateReportDTO {
  @IsString()
  @IsNotEmpty({ message: 'Por favor preencha a categoria da denúncia.' })
  public categoria!: string;

  @IsString()
  @IsOptional()
  public descricao?: string;
}
