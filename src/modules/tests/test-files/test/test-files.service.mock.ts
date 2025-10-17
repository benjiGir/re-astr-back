import type { TestFile } from '@database/schema/test-files.schema'

export const mockTestFile: TestFile = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  testId: 'test-123',
  fileType: 'screenshot',
  originalFilename: 'test-screenshot.png',
  storedFilename: '1704067200000-abc12345.png',
  bucketName: 'test-archives',
  objectKey: 'tests/2024/01/1704067200000-abc12345.png',
  fileSize: 1024000,
  mimeType: 'image/png',
  checksum: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
  metadata: {
    resolution: '1920x1080',
  },
  uploadedBy: 'user-123',
  uploadedAt: new Date('2024-01-01'),
  expiresAt: null,
}

export const mockReportFile: TestFile = {
  id: '223e4567-e89b-12d3-a456-426614174000',
  testId: 'test-123',
  fileType: 'report',
  originalFilename: 'test-report.pdf',
  storedFilename: '1704153600000-def45678.pdf',
  bucketName: 'test-archives',
  objectKey: 'tests/2024/01/1704153600000-def45678.pdf',
  fileSize: 2048000,
  mimeType: 'application/pdf',
  checksum: 'b2c3d4e5f67890123456789012345678901abcdef2345678901abcdef234567',
  metadata: {
    pages: 10,
  },
  uploadedBy: 'user-456',
  uploadedAt: new Date('2024-01-02'),
  expiresAt: null,
}

export const mockDocumentationFile: TestFile = {
  id: '323e4567-e89b-12d3-a456-426614174000',
  testId: 'test-456',
  fileType: 'documentation',
  originalFilename: 'documentation.docx',
  storedFilename: '1704240000000-ghi78901.docx',
  bucketName: 'test-archives',
  objectKey: 'tests/2024/01/1704240000000-ghi78901.docx',
  fileSize: 512000,
  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  checksum: 'c3d4e5f678901234567890123456789012abcdef3456789012abcdef345678',
  metadata: {},
  uploadedBy: 'user-123',
  uploadedAt: new Date('2024-01-03'),
  expiresAt: new Date('2024-12-31'),
}

export const mockTestFiles: TestFile[] = [mockTestFile, mockReportFile, mockDocumentationFile]
