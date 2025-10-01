import { LineItemType } from '../entities/line-item.entity';

export interface UpdateLineItemDto {
  serviceTypeId?: string;
  invoiceId?: string;
  vehicleId?: string;
  vendorId?: string;
  unitPrice?: number;
  quantity?: number;
  type?: LineItemType;
  mileage?: number;
  taxable?: boolean;
  warrantyMileage?: number;
  warrantyDate?: string;
  warranty?: boolean;
  description?: string;
}