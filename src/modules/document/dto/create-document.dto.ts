import { DocumentType, File } from "../entities/document.entity";

/**
 * DTO for creating a new document
 */
export interface CreateDocumentDto {
  vehicleId?: string;
  type: DocumentType;
  startDate?: string; // ISO date
  expirationDate?: string; // ISO date
  file?: File;
}
