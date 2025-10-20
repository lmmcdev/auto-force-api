import { AlertType, AlertCategory, AlertReasons, AlertStatus } from '../entities/alert.entity';

export interface QueryAlertDto {
  take?: number; // Number of records to return (pagination)
  skip?: number; // Number of records to skip (pagination)
  q?: string; // Search in message
  type?: AlertType;
  category?: AlertCategory;
  vehicleId?: string;
  lineItemId?: string;
  invoiceId?: string;
  serviceTypeId?: string;
  validLineItem?: string;
  reasons?: AlertReasons;
  status?: AlertStatus;
  createdFrom?: string; // ISO date string
  createdTo?: string; // ISO date string
  hasResolution?: boolean; // Filter by whether resolution exists
  expirationDate?: string; // ISO date string
}
