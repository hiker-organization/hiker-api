import { CreateUserDTO } from "../dtos/createUser.dto.js";

export const UserMock: CreateUserDTO = {
  nome_usuario: "vitor",
  nome_exibicao: "viiiiiiiiivi",
  data_nascimento: new Date('2026-02-03T10:00:00.000Z'),
  email: "vv@gmail.com",
  numero_celular: "(14) 99882-2367",
  senha: "euVictor@123"
};
