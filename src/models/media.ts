import crypto from 'node:crypto';

class Media {
  fileName?: string;

  data: Buffer;

  constructor(data: Buffer, fileName?: string) {
    this.data = data;
    this.fileName = fileName;
  }

  get checksum(): string {
    return crypto.createHash('md5').update(this.data).digest('hex');
  }
}

export default Media;
