import { describe, it, expect } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDTO } from './createUser.dto.js';

const body = {
  nome_usuario: 'vitor',
  nome_exibicao: 'Vitor',
  email: 'vv@gmail.com',
  senha: 'euVictor@123',
  numero_celular: '14998822367',
  data_nascimento: '2000-01-01',
};

const errorsOf = async (extra: Record<string, unknown>) => {
  const dto = plainToInstance(CreateUserDTO, { ...body, ...extra });
  const errors = await validate(dto);
  return errors.map((e) => e.property);
};

describe('CreateUserDTO — privacy policy acceptance', () => {
  it('accepts true, also as the string the multipart form sends', async () => {
    expect(await errorsOf({ aceite_politica: true })).toEqual([]);
    expect(await errorsOf({ aceite_politica: 'true' })).toEqual([]);
  });

  it('rejects the sign-up without the acceptance', async () => {
    expect(await errorsOf({})).toEqual(['aceite_politica']);
    expect(await errorsOf({ aceite_politica: false })).toEqual([
      'aceite_politica',
    ]);
    expect(await errorsOf({ aceite_politica: 'false' })).toEqual([
      'aceite_politica',
    ]);
  });
});
