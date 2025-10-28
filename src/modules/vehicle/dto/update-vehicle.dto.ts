import { File } from '../entities/vehicle.entity';

export interface UpdateVehicleDto {
  truckExternalId?: string;
  companyDispatchLocation?: string;
  titleHolder?: string;
  tireSize?: string;
  status?: 'Active' | 'Inactive';
  vin?: string;
  tagNumber?: string;
  lastPreventativeMaintenanceDate?: string;
  modivcareInspectionDate?: string;
  aliviInspectionDate?: string;
  ride2MdInspectionDate?: string;
  insuranceExpirationDate?: string;
  insuranceFile?: File;
  tagExpirationDate?: string;
  tagFile?: File;
  annualInspectionExpirationDate?: string;
  annualInspectionFile?: File;
  registrationExpirationDate?: string;
  registrationFile?: File;
  leasePaperworkFile?: File;
  inspeccionAliviFile?: File;
  customDocumentFile?: File;
  make?: string;
  color?: string;
  year?: number;
}
