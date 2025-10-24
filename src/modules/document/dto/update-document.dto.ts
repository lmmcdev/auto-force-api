import { DocumentType, File } from "../entities/document.entity";

/**
 * DTO for updating an existing document
 */
export interface UpdateDocumentDto {
  vehicleId?: string;
  type?: DocumentType;
  startDate?: string; // ISO date
  expirationDate?: string; // ISO date
  file?: File;
}
