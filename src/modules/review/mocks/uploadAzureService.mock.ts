import { jest } from '@jest/globals';
export const UploadAzureServiceMock = () => ({
  addImageReview: jest.fn(),
  getReviewImageUrl: jest.fn(),
  addImageUser: jest.fn(),
  getUserImageUrl: jest.fn(),
  deleteUserImage: jest.fn(),
});
