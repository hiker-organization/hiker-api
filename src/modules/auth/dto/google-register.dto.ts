import { PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { CreateUserDTO } from '../../user/dtos/createUser.dto.js';

// First Google sign-in: the fields Google doesn't give, with the same rules as the
// normal sign-up. Email, Google account and photo come from the signup_token.
export class GoogleRegisterDTO extends PickType(CreateUserDTO, [
  'nome_usuario',
  'nome_exibicao',
  'senha',
  'numero_celular',
  'data_nascimento',
] as const) {
  @IsString()
  @IsNotEmpty({ message: 'cadastro com Google expirado, entre novamente.' })
  signup_token!: string;
}
