import { jest } from '@jest/globals';
export const PrismaServiceMock = () => ({
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
  usuario: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },

  voto_review: {
    findMany: jest.fn(),
  },
  review_favorita: {
    findMany: jest.fn(),
  },
  denuncia: {
    findMany: jest.fn(),
  },
  review: {
    create: jest.fn(),
  },
  tag: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
});
