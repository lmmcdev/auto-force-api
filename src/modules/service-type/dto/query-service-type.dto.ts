import { ServiceTypeStatus, ServiceTypeType } from '../entities/service-type.entity';

export interface QueryServiceTypeDto {
  q?: string; // Search term for name or description
  status?: ServiceTypeStatus;
  type?: ServiceTypeType;
  skip?: number;
  take?: number;
}