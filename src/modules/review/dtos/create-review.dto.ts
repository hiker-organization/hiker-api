import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateReviewDTO {
    @IsString()
    @IsNotEmpty({ message: "descrição é obrigatória." })
    @MaxLength(150, { message: "limite máximo de caractéres: 150." })
    public descricao!: string

    @IsString()
    @IsNotEmpty({ message: "local é obrigatório." })
    public local_id!: string

    @IsString()
    @IsNotEmpty({ message: "local é obrigatório." })
    public local!: string

    @Type(() => Number)
    @IsInt()
    @IsNotEmpty({ message: "nota é obrigatória." })
    public nota!: number

    @IsOptional()
    public tags?: number | number[]

    @IsOptional()
    public fotos?: string | string[]
}