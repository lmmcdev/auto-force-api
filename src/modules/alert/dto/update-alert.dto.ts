import { AlertType, AlertCategory, AlertReasons, AlertStatus, AlertResolution } from '../entities/alert.entity';

export interface UpdateAlertDto {
  type?: AlertType;
  category?: AlertCategory;
  vehicleId?: string;
  lineItemId?: string;
  invoiceId?: string;
  serviceTypeId?: string;
  validLineItem?: string;
  reasons?: AlertReasons;
  status?: AlertStatus;
  message?: string;
  resolution?: AlertResolution;
}