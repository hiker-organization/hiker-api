import { IsString, IsStrongPassword } from 'class-validator';

export class UpdatePasswordDTO {
    @IsStrongPassword(
        {
        minLength: 8,
        minSymbols: 1,
        minUppercase: 1,
        minLowercase: 1,
        minNumbers: 1,
        },
        {
        message:
            'A senha precisa conter: no minimo 8 caractéres, 1 simbolo (@,#,%,etc.) e 1 letra maiúscula, 1 letra minúscula, e 1 numero.',
        },
    )
    public senha_nova!: string;

    @IsString()
    public senha_atual!: string;
}