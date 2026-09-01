import { jest } from '@jest/globals';
const prismaServiceMock = {
  usuario: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  review: {
    create: jest.fn(),
  },
  tag: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

export const PrismaServiceMock = () => ({
  ...prismaServiceMock,
  $transaction: jest.fn(async (callback: (prisma: any) => unknown) =>
    callback(prismaServiceMock),
  ),
});
