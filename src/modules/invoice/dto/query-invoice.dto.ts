import { InvoiceStatus } from '../entities/invoice.entity';

export interface QueryInvoiceDto {
  q?: string; // Search term for invoice number or description
  vehicleId?: string;
  vendorId?: string;
  status?: InvoiceStatus;
  invoiceNumber?: string;
  orderStartDateFrom?: string; // ISO date string
  orderStartDateTo?: string; // ISO date string
  uploadDateFrom?: string; // ISO date string
  uploadDateTo?: string; // ISO date string
  minAmount?: number;
  maxAmount?: number;
  skip?: number;
  take?: number;
}
