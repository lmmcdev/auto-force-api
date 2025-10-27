import { AlertType, AlertCategory, AlertReasons, AlertStatus, AlertResolution, AlertSubcategory } from '../entities/alert.entity';

export interface CreateAlertDto {
  type: AlertType;
  category: AlertCategory;
  subcategory?: AlertSubcategory;
  vehicleId?: string;
  lineItemId?: string;
  invoiceId?: string;
  serviceTypeId?: string;
  validLineItem?: string; // ID of a line-item
  reasons: AlertReasons;
  status?: AlertStatus; // Defaults to 'Pending'
  message: string;
  resolution?: AlertResolution;
  expirationDate?: string;
}
