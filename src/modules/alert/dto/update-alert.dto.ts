import {
  AlertType,
  AlertCategory,
  AlertReasons,
  AlertStatus,
  AlertResolution,
  AlertSubcategory,
} from '../entities/alert.entity';

export interface UpdateAlertDto {
  type?: AlertType;
  category?: AlertCategory;
  subcategory?: AlertSubcategory;
  vehicleId?: string;
  lineItemId?: string;
  invoiceId?: string;
  serviceTypeId?: string;
  validLineItem?: string;
  reasons?: AlertReasons;
  status?: AlertStatus;
  message?: string;
  resolution?: AlertResolution;
  expirationDate?: string;
}
