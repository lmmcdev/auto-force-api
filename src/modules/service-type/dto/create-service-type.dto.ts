import { ServiceTypeStatus, ServiceTypeType } from '../entities/service-type.entity';

export interface CreateServiceTypeDto {
  name: string;
  description: string;
  status?: ServiceTypeStatus;
  type?: ServiceTypeType;
}
