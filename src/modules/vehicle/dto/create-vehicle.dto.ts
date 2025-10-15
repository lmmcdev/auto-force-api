export interface CreateVehicleDto {
  truckExternalId: string;
  companyDispatchLocation: string;
  titleHolder: string;
  tireSize: string;
  status?: 'Active' | 'Inactive';
  vin: string;
  tagNumber: string;
  lastPreventativeMaintenanceDate: string;
  modivcareInspectionDate: string;
  aliviInspectionDate: string;
  ride2MdInspectionDate: string;
  insuranceExpirationDate: string;
  tagExpirationDate: string;
  annualInspectionExpirationDate: string;
  registrationExpirationDate: string;
  make: string;
  color: string;
  year: number;
}
