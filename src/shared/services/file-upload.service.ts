import axios, { AxiosInstance } from 'axios';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import FormData = require('form-data');
import {
  FileUploadRequest,
  FileUploadResponse,
  StorageManagerApiResponse,
  StorageManagerConfig,
  StorageManagerError,
} from '../types/file-upload.types';

/**
 * Service for uploading files to the Storage Manager API
 */
export class FileUploadService {
  private readonly axiosInstance: AxiosInstance;
  private readonly config: StorageManagerConfig;

  constructor(config: StorageManagerConfig) {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'x-api-key': config.apiKey,
      },
    });
  }

  /**
   * Upload a file to the storage manager
   * @param request File upload request containing file buffer and metadata
   * @returns File upload response with file URL and metadata
   */
  async uploadFile(request: FileUploadRequest): Promise<FileUploadResponse> {
    try {
      const formData = new FormData();

      // Add file buffer with filename
      formData.append('file', request.file, {
        filename: request.fileName,
      });

      // Add container
      formData.append('container', request.container);

      // Add path
      formData.append('path', request.path);

      // Add metadata if provided
      if (request.metadata) {
        formData.append('metadata', JSON.stringify(request.metadata));
      }

      // Generate a unique request ID for tracing
      const requestId = this.generateRequestId();

      // Make the upload request
      const response = await this.axiosInstance.post<StorageManagerApiResponse>('/files/upload', formData, {
        headers: {
          ...formData.getHeaders(),
          'x-request-id': requestId,
        },
      });

      // Map the API response to our internal format
      const apiData = response.data.data;
      const normalizedResponse: FileUploadResponse = {
        id: apiData.id,
        name: apiData.blobName.split('/').pop() || apiData.blobName,
        url: apiData.url,
        size: apiData.size,
        contentType: apiData.contentType,
        lastModified: new Date().toISOString(), // API doesn't return this, use current time
        etag: apiData.etag,
        metadata: apiData.metadata,
      };

      return normalizedResponse;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const storageError: StorageManagerError = {
          message: error.response.data?.message || 'File upload failed',
          statusCode: error.response.status,
          details: error.response.data,
        };
        throw new Error(`Storage Manager Error: ${storageError.message} (Status: ${storageError.statusCode})`);
      }
      throw new Error(`Failed to upload file: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a unique request ID for tracing
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Create a file upload service instance from environment variables
 */
export function createFileUploadService(): FileUploadService {
  const apiUrl = process.env.STORAGE_MANAGER_API_URL;
  const apiKey = process.env.STORAGE_MANAGER_API_KEY;
  const defaultContainer = process.env.STORAGE_CONTAINER || 'transportation';

  if (!apiUrl) {
    throw new Error('STORAGE_MANAGER_API_URL environment variable is required');
  }

  if (!apiKey) {
    throw new Error('STORAGE_MANAGER_API_KEY environment variable is required');
  }

  const config: StorageManagerConfig = {
    apiUrl,
    apiKey,
    defaultContainer,
  };

  return new FileUploadService(config);
}

// Export singleton instance
export const fileUploadService = createFileUploadService();
