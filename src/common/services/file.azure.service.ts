import { Injectable } from '@nestjs/common';
import { BlobSASPermissions, BlobServiceClient } from '@azure/storage-blob';

@Injectable()
export class FilesAzureService {
    private blobServiceClient: BlobServiceClient;

    constructor() {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connectionString) {
            throw new Error('Storage error occurred');
        }
        this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    }

    async getContainerClient(containerName: string) {
        return this.blobServiceClient.getContainerClient(containerName);
    }

    public async createBlobFromStream(
        containerName: string,
        blobName: string,
        buffer: Buffer,
    ) : Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                const containerClient = await this.getContainerClient(containerName);
                const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                await blockBlobClient.uploadData(buffer, {
                    blobHTTPHeaders: { blobContentType: 'image/jpeg' },
                });
                resolve(blockBlobClient.url);
            } catch (error) {
                reject(error);
            }
        });
    }

    public async generateSasUrl(
        containerName: string,
        blobName: string,
        expiryMinutes: number,
    ): Promise<string> {
        const containerClient = await this.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        return blockBlobClient.generateSasUrl({
            permissions: BlobSASPermissions.parse('r'),
            expiresOn: new Date(Date.now() + expiryMinutes * 60 * 1000),
        });
    }
}