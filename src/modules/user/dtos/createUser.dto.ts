import { Transform } from "class-transformer"
import { IsEmail, IsMobilePhone, IsDate, IsOptional, IsString, IsStrongPassword, MaxLength, MinLength } from "class-validator"

export class createUserDTO {
    @IsString({ message: "não insira numeros aqui." })
    @MaxLength(20, {message: "limite de 20 caractétes."})
    @MinLength(3)
    public nome!: string

    @IsString({ message: "não insira numeros aqui." })
    @MaxLength(20, {message: "limite de 20 caractétes."})
    public nome_exibicao!: string

    @IsEmail({}, {message: "por favor, insira um email corretamente."})
    public email!: string

    @IsStrongPassword(
        {minLength: 8, minSymbols: 1, minUppercase: 1, minLowercase: 1, minNumbers: 1}, 
        {message: "a senha precisa conter: no minimo 8 caractéres, 1 simbolo (@,#,%,etc.) e 1 letra maiúscula, 1 letra minúscula, e 1 numero."}
    )
    public senha!: string

    @IsMobilePhone("pt-BR")
    public numero_celular!: string

    @Transform(({ value }) => {
        if (typeof value === 'string') {
            const date = new Date(value)
            if (isNaN(date.getTime())) {
                throw new Error("data inválida")
            }
            return date
        }
        return value
    })
    @IsDate({ message: "data inválida" })
    public data_nascimento!: Date
    
    @IsOptional()
    public foto_url?: string
}