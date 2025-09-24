export interface Vehicle {
  id: string;
  truckExternalId: string;
  companyDispatchLocation: string;
  titleHolder: string;
  tireSize: string;
  status: 'Active' | 'Inactive';
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

export class VehicleEntity implements Vehicle {
  id: string;
  truckExternalId: string;
  companyDispatchLocation: string;
  titleHolder: string;
  tireSize: string;
  status: 'Active' | 'Inactive';
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

  constructor(vehicle: Partial<Vehicle> = {}) {
    this.id = vehicle.id || '';
    this.truckExternalId = vehicle.truckExternalId || '';
    this.companyDispatchLocation = vehicle.companyDispatchLocation || '';
    this.titleHolder = vehicle.titleHolder || '';
    this.tireSize = vehicle.tireSize || '';
    this.status = vehicle.status || 'Active';
    this.vin = vehicle.vin || '';
    this.tagNumber = vehicle.tagNumber || '';
    this.lastPreventativeMaintenanceDate = vehicle.lastPreventativeMaintenanceDate || '';
    this.modivcareInspectionDate = vehicle.modivcareInspectionDate || '';
    this.aliviInspectionDate = vehicle.aliviInspectionDate || '';
    this.ride2MdInspectionDate = vehicle.ride2MdInspectionDate || '';
    this.insuranceExpirationDate = vehicle.insuranceExpirationDate || '';
    this.tagExpirationDate = vehicle.tagExpirationDate || '';
    this.annualInspectionExpirationDate = vehicle.annualInspectionExpirationDate || '';
    this.registrationExpirationDate = vehicle.registrationExpirationDate || '';
    this.make = vehicle.make || '';
    this.color = vehicle.color || '';
    this.year = vehicle.year || new Date().getFullYear();
  }
}