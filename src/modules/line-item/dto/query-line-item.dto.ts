import { LineItemType } from '../entities/line-item.entity';

export interface QueryLineItemDto {
  q?: string;              // Search term for description
  serviceTypeId?: string;
  invoiceId?: string;
  type?: LineItemType;
  taxable?: boolean;
  warranty?: boolean;
  minUnitPrice?: number;
  maxUnitPrice?: number;
  minQuantity?: number;
  maxQuantity?: number;
  minTotalPrice?: number;
  maxTotalPrice?: number;
  minMileage?: number;
  maxMileage?: number;
  skip?: number;
  take?: number;
}