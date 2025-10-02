import { AlertType, AlertCategory, AlertReasons, AlertStatus, AlertResolution } from '../entities/alert.entity';

export interface CreateAlertDto {
  type: AlertType;
  category: AlertCategory;
  vehicleId?: string;
  lineItemId?: string;
  invoiceId?: string;
  serviceTypeId?: string;
  validLineItem?: string;  // ID of a line-item
  reasons: AlertReasons;
  status?: AlertStatus;    // Defaults to 'Pending'
  message: string;
  resolution?: AlertResolution;
}