import { jest } from '@jest/globals';
export const PrismaServiceMock = () => ({
  $transaction: jest.fn(),
  usuario: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },

  voto_review: {
    findMany: jest.fn(),
  }
});