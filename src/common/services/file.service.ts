import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';

@Injectable()
export class FileService {
  async writeFile(
    path: string,
    data: string | NodeJS.ArrayBufferView,
  ): Promise<void> {
    return fs.writeFile(path, data);
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
        await fs.unlink(filePath);
    } catch (error) {
        console.error(`Erro ao deletar o arquivo: ${filePath}`, error);
    }
}
}
