import { InvoiceStatus } from '../entities/invoice.entity';

export interface UpdateInvoiceDto {
  vehicleId?: string;
  vendorId?: string;
  invoiceNumber?: string;
  orderStartDate?: string;
  uploadDate?: string;
  invoiceAmount?: number;
  status?: InvoiceStatus;
  tax?: number;
  description?: string;
}
