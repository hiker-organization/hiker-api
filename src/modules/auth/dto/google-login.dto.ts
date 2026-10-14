import { IsNotEmpty, IsString } from 'class-validator';

// ID token returned to the app by the Google sign-in.
export class GoogleLoginDTO {
  @IsString()
  @IsNotEmpty({ message: 'token do Google é obrigatório.' })
  id_token!: string;
}
