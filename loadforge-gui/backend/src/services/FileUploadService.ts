import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';
import { dbConnection } from '../config/database.js';
import { FileAttachment } from '../types/index.js';

export class FileUploadService {
  private getGridFSBucket(): GridFSBucket {
    return dbConnection.getGridFSBucket();
  }

  /**
   * Upload a file to GridFS
   */
  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    originalName: string,
    mimeType: string,
    specId?: string
  ): Promise<FileAttachment> {
    try {
      const bucket = this.getGridFSBucket();
      const uploadStream = bucket.openUploadStream(filename, {
        metadata: {
          originalName,
          mimeType,
          specId,
          uploadDate: new Date(),
        },
      });

      // Create readable stream from buffer
      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);

      // Upload the file
      const uploadPromise = new Promise<ObjectId>((resolve, reject) => {
        uploadStream.on('error', reject);
        uploadStream.on('finish', () => resolve(uploadStream.id as ObjectId));
      });

      readableStream.pipe(uploadStream);
      const fileId = await uploadPromise;

      return {
        _id: fileId.toString(),
        filename,
        originalName,
        mimeType,
        size: fileBuffer.length,
        uploadDate: new Date(),
        ...(specId && { specId }),
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<FileAttachment | null> {
    try {
      const bucket = this.getGridFSBucket();
      const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
      
      if (files.length === 0) {
        return null;
      }

      const file = files[0];
      return {
        _id: file._id.toString(),
        filename: file.filename,
        originalName: file.metadata?.originalName || file.filename,
        mimeType: file.metadata?.mimeType || 'application/octet-stream',
        size: file.length,
        uploadDate: file.uploadDate,
        specId: file.metadata?.specId,
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download file as stream
   */
  async downloadFileStream(fileId: string): Promise<{ stream: NodeJS.ReadableStream; metadata: FileAttachment }> {
    try {
      const metadata = await this.getFileMetadata(fileId);
      if (!metadata) {
        throw new Error('File not found');
      }

      const bucket = this.getGridFSBucket();
      const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

      return {
        stream: downloadStream,
        metadata,
      };
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download file as buffer
   */
  async downloadFileBuffer(fileId: string): Promise<{ buffer: Buffer; metadata: FileAttachment }> {
    try {
      const { stream, metadata } = await this.downloadFileStream(fileId);
      
      const chunks: Buffer[] = [];
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({ buffer, metadata });
        });
      });
    } catch (error) {
      console.error('Error downloading file buffer:', error);
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a file from GridFS
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const bucket = this.getGridFSBucket();
      await bucket.delete(new ObjectId(fileId));
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * List files by spec ID
   */
  async getFilesBySpecId(specId: string): Promise<FileAttachment[]> {
    try {
      const bucket = this.getGridFSBucket();
      const files = await bucket.find({ 'metadata.specId': specId }).toArray();
      
      return files.map(file => ({
        _id: file._id.toString(),
        filename: file.filename,
        originalName: file.metadata?.originalName || file.filename,
        mimeType: file.metadata?.mimeType || 'application/octet-stream',
        size: file.length,
        uploadDate: file.uploadDate,
        specId: file.metadata?.specId,
      }));
    } catch (error) {
      console.error('Error getting files by spec ID:', error);
      throw new Error(`Failed to get files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up files for a deleted spec
   */
  async cleanupSpecFiles(specId: string): Promise<number> {
    try {
      const files = await this.getFilesBySpecId(specId);
      let deletedCount = 0;

      for (const file of files) {
        if (file._id && await this.deleteFile(file._id)) {
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up spec files:', error);
      return 0;
    }
  }

  /**
   * Validate file size and type
   */
  validateFile(fileSize: number, _mimeType: string, maxSize: number = 25 * 1024 * 1024): { valid: boolean; error?: string } {
    // Check file size (default 25MB limit)
    if (fileSize > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum limit of ${Math.round(maxSize / (1024 * 1024))}MB`,
      };
    }

    // Check if file size is reasonable (not empty)
    if (fileSize === 0) {
      return {
        valid: false,
        error: 'File is empty',
      };
    }

    // For now, allow all file types
    // In the future, we might want to restrict certain types based on _mimeType
    return { valid: true };
  }
} 