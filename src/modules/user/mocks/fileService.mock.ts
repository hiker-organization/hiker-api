import { jest } from '@jest/globals';
export const FileServiceMock = () => ({
  writeFile: jest.fn(),
});
