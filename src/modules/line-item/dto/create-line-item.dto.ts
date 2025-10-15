import { LineItemType } from '../entities/line-item.entity';

export interface CreateLineItemDto {
  serviceTypeId: string; // Required - must exist
  invoiceId: string; // Required - must exist
  vehicleId?: string; // Optional - will be auto-populated from invoice
  vendorId?: string; // Optional - will be auto-populated from invoice
  unitPrice: number;
  quantity: number;
  type?: LineItemType; // Defaults to 'Parts'
  mileage?: number; // Defaults to 0
  taxable?: boolean; // Defaults to false
  warrantyMileage?: number; // Optional
  warrantyDate?: string; // Optional ISO date string
  warranty?: boolean; // Defaults to false
  description?: string; // Defaults to empty string
}
