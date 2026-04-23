import { IsNotEmpty, IsEmail, IsString } from 'class-validator';

export class LoginDTO {
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
