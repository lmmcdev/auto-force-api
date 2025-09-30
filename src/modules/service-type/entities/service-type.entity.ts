export type ServiceTypeStatus = 'Active' | 'Inactive';
export type ServiceTypeType = 'Service' | 'Sales';

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  status: ServiceTypeStatus;
  type: ServiceTypeType;
  createdAt?: string;
  updatedAt?: string;
}

export class ServiceTypeEntity implements ServiceType {
  id: string;
  name: string;
  description: string;
  status: ServiceTypeStatus;
  type: ServiceTypeType;
  createdAt?: string;
  updatedAt?: string;

  constructor(serviceType: Partial<ServiceType> = {}) {
    this.id = serviceType.id || '';
    this.name = serviceType.name || '';
    this.description = serviceType.description || '';
    this.status = serviceType.status || 'Active';
    this.type = serviceType.type || 'Service';
    this.createdAt = serviceType.createdAt;
    this.updatedAt = serviceType.updatedAt;
  }
}