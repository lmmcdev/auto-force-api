import { InvoiceStatus } from '../entities/invoice.entity';

export interface QueryInvoiceDto {
  q?: string; // Search term for invoice number or description
  vehicleId?: string;
  vendorId?: string;
  status?: InvoiceStatus;
  invoiceNumber?: string;
  orderStartDateFrom?: string; // ISO date string
  orderStartDateTo?: string;   // ISO date string
  uploadDateFrom?: string;     // ISO date string
  uploadDateTo?: string;       // ISO date string
  minAmount?: number;
  maxAmount?: number;
  // Deprecated: use pageSize instead
  skip?: number;
  take?: number;
  // Native Cosmos DB pagination
  pageSize?: number; // Maximum number of items to return per page (default: 50, max: 1000)
  continuationToken?: string; // Continuation token from previous response to fetch next page
}