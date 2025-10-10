import { InvoiceStatus } from '../entities/invoice.entity';

export interface CreateInvoiceDto {
  vehicleId?: string;
  vendorId: string;
  invoiceNumber: string;
  orderStartDate: string;
  uploadDate: string;
  invoiceAmount: number;
  status?: InvoiceStatus;
  tax?: number;
  description?: string;
}
