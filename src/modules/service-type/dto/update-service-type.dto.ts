import { ServiceTypeStatus, ServiceTypeType } from '../entities/service-type.entity';

export interface UpdateServiceTypeDto {
  name?: string;
  description?: string;
  status?: ServiceTypeStatus;
  type?: ServiceTypeType;
}
