export type AlertType = 'WARRANTY' | 'LICENSE' | 'PERMIT' | 'HIGHER_PRICE' | 'CERTIFICATION' | 'SAME_SERVICE' | string;

export type AlertCategory = 'ServiceType' | 'DriverLicense' | string;

export type AlertReasons = 'DATE_VALID' | 'MILEAGE_VALID' | 'Expiration Date' | 'LOWER_PRICE_FOUND' | 'SAME_SERVICE_FOUND' | string;

export type AlertStatus = 'Pending' | 'Acknowledged' | 'Overridden' | 'Resolved' | string;

export type ResolutionAction = 'omit' | 'approve' | 'renew' | 'upload';

export interface AlertResolution {
  action: ResolutionAction;
  byUserId: string;
  byUserEmail?: string;
  at: string;
  note?: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  vehicleId?: string;
  lineItemId?: string;
  invoiceId?: string;
  serviceTypeId?: string;
  validLineItem?: string; // ID of a line-item
  reasons: AlertReasons;
  status: AlertStatus;
  message: string;
  createdAt: string;
  updatedAt: string;
  resolution?: AlertResolution;
}

export class AlertEntity implements Alert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  vehicleId?: string;
  lineItemId?: string;
  invoiceId?: string;
  serviceTypeId?: string;
  validLineItem?: string;
  reasons: AlertReasons;
  status: AlertStatus;
  message: string;
  createdAt: string;
  updatedAt: string;
  resolution?: AlertResolution;

  constructor(alert: Partial<Alert> = {}) {
    this.id = alert.id || '';
    this.type = alert.type || 'WARRANTY';
    this.category = alert.category || 'ServiceType';
    this.vehicleId = alert.vehicleId;
    this.lineItemId = alert.lineItemId;
    this.invoiceId = alert.invoiceId;
    this.serviceTypeId = alert.serviceTypeId;
    this.validLineItem = alert.validLineItem;
    this.reasons = alert.reasons || 'DATE_VALID';
    this.status = alert.status || 'Pending';
    this.message = alert.message || '';
    this.createdAt = alert.createdAt || '';
    this.updatedAt = alert.updatedAt || '';
    this.resolution = alert.resolution;
  }
}
