import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export class ResetPasswordDTO {
  @IsString()
  @IsNotEmpty()
  token!: string;

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
  senha!: string;
}