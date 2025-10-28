/**
 * Request payload for uploading a file to storage manager API
 */
export interface FileUploadRequest {
  file: Buffer;
  fileName: string;
  container: string;
  path: string;
  metadata?: Record<string, unknown>;
}

/**
 * Response data structure from storage manager API
 */
export interface StorageManagerApiData {
  id: string;
  container: string;
  blobName: string;
  url: string;
  etag: string;
  size: number;
  contentType: string;
  metadata?: Record<string, unknown>;
}

/**
 * Full response from storage manager API after successful upload
 */
export interface StorageManagerApiResponse {
  data: StorageManagerApiData;
  requestId: string;
}

/**
 * Normalized file upload response for internal use
 */
export interface FileUploadResponse {
  id: string;
  name: string;
  url: string;
  size: number;
  contentType: string;
  lastModified: string;
  etag?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for storage manager API client
 */
export interface StorageManagerConfig {
  apiUrl: string;
  apiKey: string;
  defaultContainer: string;
}

/**
 * Error response from storage manager API
 */
export interface StorageManagerError {
  message: string;
  statusCode: number;
  details?: unknown;
}
