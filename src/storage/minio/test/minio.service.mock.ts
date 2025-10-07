import { Readable } from 'stream';
import type { UploadResult, FileMetadata } from '../minio.service';

export const mockUploadResult: UploadResult = {
  fileName: 'test-file.png',
  etag: 'abc123def456',
  size: 1024,
  bucket: 'test-bucket',
};

export const mockFileMetadata: FileMetadata = {
  size: 1024,
  lastModified: new Date('2024-01-01'),
  etag: 'abc123def456',
  contentType: 'image/png',
};

export const mockFileStream = (): Readable => {
  const stream = new Readable();
  stream.push('mock-file-content');
  stream.push(null);
  return stream;
};

export const mockFileBuffer = Buffer.from('mock-file-content');

export const mockFileList = ['file1.png', 'file2.pdf', 'folder/file3.txt'];

export const mockPresignedUrl = 'https://minio.example.com/test-bucket/test-file.png?X-Amz-Expires=3600';