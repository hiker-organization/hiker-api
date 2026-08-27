import { jest } from '@jest/globals';
export const PrismaServiceMock = () => ({
  usuario: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
});