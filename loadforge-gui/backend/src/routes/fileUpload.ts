import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { FileUploadService } from '../services/FileUploadService.js';
import { ApiResponse } from '../types/index.js';
import { appConfig } from '../config/index.js';

const fileUploadService = new FileUploadService();

interface FileUploadRequest {
  Body: {
    specId?: string;
  };
}

interface FileParams {
  Params: {
    fileId: string;
  };
}

interface SpecFilesParams {
  Params: {
    specId: string;
  };
}

export async function fileUploadRoutes(fastify: FastifyInstance) {
  // POST /api/files/upload - Upload a file
  fastify.post<FileUploadRequest>('/files/upload', async (request: FastifyRequest<FileUploadRequest>, reply: FastifyReply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: 'No file provided',
        } as ApiResponse);
      }

      const file = data as MultipartFile;
      const buffer = await file.toBuffer();
      
      // Validate file
      const validation = fileUploadService.validateFile(
        buffer.length,
        file.mimetype,
        appConfig.fileUpload.maxFileSize
      );

      if (!validation.valid) {
        return reply.status(400).send({
          success: false,
          error: validation.error,
        } as ApiResponse);
      }

      // Get specId from form data if provided
      const specId = request.body?.specId;

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}_${file.filename}`;

      const fileAttachment = await fileUploadService.uploadFile(
        buffer,
        filename,
        file.filename,
        file.mimetype,
        specId
      );

      return reply.status(201).send({
        success: true,
        data: fileAttachment,
        message: 'File uploaded successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error uploading file:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file',
      } as ApiResponse);
    }
  });

  // GET /api/files/:fileId - Download a file
  fastify.get<FileParams>('/files/:fileId', async (request: FastifyRequest<FileParams>, reply: FastifyReply) => {
    try {
      const { fileId } = request.params;
      const { stream, metadata } = await fileUploadService.downloadFileStream(fileId);

      reply.header('Content-Type', metadata.mimeType);
      reply.header('Content-Disposition', `attachment; filename="${metadata.originalName}"`);
      reply.header('Content-Length', metadata.size.toString());

      return reply.send(stream);
    } catch (error) {
      console.error('Error downloading file:', error);
      return reply.status(404).send({
        success: false,
        error: error instanceof Error ? error.message : 'File not found',
      } as ApiResponse);
    }
  });

  // GET /api/files/:fileId/metadata - Get file metadata
  fastify.get<FileParams>('/files/:fileId/metadata', async (request: FastifyRequest<FileParams>, reply: FastifyReply) => {
    try {
      const { fileId } = request.params;
      const metadata = await fileUploadService.getFileMetadata(fileId);

      if (!metadata) {
        return reply.status(404).send({
          success: false,
          error: 'File not found',
        } as ApiResponse);
      }

      return reply.send({
        success: true,
        data: metadata,
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get file metadata',
      } as ApiResponse);
    }
  });

  // DELETE /api/files/:fileId - Delete a file
  fastify.delete<FileParams>('/files/:fileId', async (request: FastifyRequest<FileParams>, reply: FastifyReply) => {
    try {
      const { fileId } = request.params;
      const deleted = await fileUploadService.deleteFile(fileId);

      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: 'File not found or could not be deleted',
        } as ApiResponse);
      }

      return reply.send({
        success: true,
        message: 'File deleted successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error deleting file:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete file',
      } as ApiResponse);
    }
  });

  // GET /api/specs/:specId/files - Get files for a specific spec
  fastify.get<SpecFilesParams>('/specs/:specId/files', async (request: FastifyRequest<SpecFilesParams>, reply: FastifyReply) => {
    try {
      const { specId } = request.params;
      const files = await fileUploadService.getFilesBySpecId(specId);

      return reply.send({
        success: true,
        data: files,
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting spec files:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get spec files',
      } as ApiResponse);
    }
  });

  // DELETE /api/specs/:specId/files - Delete all files for a specific spec
  fastify.delete<SpecFilesParams>('/specs/:specId/files', async (request: FastifyRequest<SpecFilesParams>, reply: FastifyReply) => {
    try {
      const { specId } = request.params;
      const deletedCount = await fileUploadService.cleanupSpecFiles(specId);

      return reply.send({
        success: true,
        message: `${deletedCount} files deleted successfully`,
        data: { deletedCount },
      } as ApiResponse);
    } catch (error) {
      console.error('Error cleaning up spec files:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup spec files',
      } as ApiResponse);
    }
  });
} 