import { Injectable } from '@nestjs/common';
import { FilesAzureService } from './file.azure.service.js';

@Injectable()
export class UploadAzureService {
    constructor(
        private readonly fileAzureService: FilesAzureService
    ) {}

    async addImageReview( imageBuffer: Buffer, fileName: string) {
        const conainerName = process.env.AZURE_STORAGE_CONTAINER_REVIEWS!;
        const extension = fileName.split('.').pop();
        const blobName = `review-${Date.now()}.${extension}`;
        await this.fileAzureService.createBlobFromStream(conainerName, blobName, imageBuffer);
        return blobName;
    }

    async getReviewImageUrl(blobName: string) {
        const conainerName = process.env.AZURE_STORAGE_CONTAINER_REVIEWS!;
        const expiryMinutes = Number(process.env.AZURE_SAS_EXPIRY_MINUTES ?? 60);
        return await this.fileAzureService.generateSasUrl(conainerName, blobName, expiryMinutes);
    }

    async addImageUser( imageBuffer: Buffer, fileName: string) {
        const conainerName = process.env.AZURE_STORAGE_CONTAINER_USERS!;
        const extension = fileName.split('.').pop();
        const blobName = `user-${Date.now()}.${extension}`;
        await this.fileAzureService.createBlobFromStream(conainerName, blobName, imageBuffer);
        return blobName;
    }

    async getUserImageUrl(blobName: string) {
        const conainerName = process.env.AZURE_STORAGE_CONTAINER_USERS!;
        const expiryMinutes = Number(process.env.AZURE_SAS_EXPIRY_MINUTES ?? 60);
        return await this.fileAzureService.generateSasUrl(conainerName, blobName, expiryMinutes);
    }

    async deleteUserImage(blobName: string) {
        const conainerName = process.env.AZURE_STORAGE_CONTAINER_USERS!;
        return await this.fileAzureService.deleteBlob(conainerName, blobName);
    }
}