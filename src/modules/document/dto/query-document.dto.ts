import { DocumentType } from "../entities/document.entity";

/**
 * DTO for querying documents
 */
export interface QueryDocumentDto {
  q?: string; // General search
  vehicleId?: string;
  type?: DocumentType;
  startDateFrom?: string; // ISO date
  startDateTo?: string; // ISO date
  expirationDateFrom?: string; // ISO date
  expirationDateTo?: string; // ISO date
  expired?: boolean; // Filter by expired documents
  expiringSoon?: number; // Days until expiration (e.g., 30 for documents expiring in next 30 days)
  skip?: number;
  take?: number;
}
