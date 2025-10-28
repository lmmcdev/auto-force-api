/**
 * Document entity representing various vehicle documents
 */
export interface Document {
  id: string;
  vehicleId?: string;
  type: DocumentType;
  startDate?: string; // ISO date
  expirationDate?: string; // ISO date
  file?: File;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * File information for documents stored in blob storage
 */
export interface File {
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
 * Types of documents that can be stored
 */
export type DocumentType =
  | 'Truck Insurance Liability'
  | 'Lease Paperwork'
  | 'Registration'
  | 'Annual Inspection'
  | 'Inspeccion Alivi'
  | 'Custom Document';

/**
 * Entity stored in Cosmos DB
 */
export interface DocumentEntity extends Document {
  _rid?: string;
  _self?: string;
  _etag?: string;
  _attachments?: string;
  _ts?: number;
}
