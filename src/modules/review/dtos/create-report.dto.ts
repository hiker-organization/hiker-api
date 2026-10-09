import { IsNotEmpty, IsString } from 'class-validator';

export class CreateReportDTO {
  @IsString()
  @IsNotEmpty({ message: 'Por favor preencha a categoria da denúncia.' })
  public categoria!: string;

  @IsString()
  @IsNotEmpty({ message: 'Por favor deixe uma descrição para a denúncia.' })
  public descricao!: string;
}
