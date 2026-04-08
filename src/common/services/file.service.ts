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
}
