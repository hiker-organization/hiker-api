import { PayloadDTO } from '../../auth/dto/payload.dto.js';

export const PayloadMock: PayloadDTO = {
  sub: 1,
  email: 'vv',
  cargo: 'USER',
  iat: 2918931323,
  exp: 212121122,
  aud: 'localhost:30k',
  iss: 'localhost:30k',
};
