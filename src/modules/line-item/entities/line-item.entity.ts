export type LineItemType = 'Parts' | 'Labor';

export interface LineItem {
  id: string;
  serviceTypeId: string; // Associated with a service-type (required)
  invoiceId: string; // Associated with an invoice (required)
  vehicleId: string; // Associated with a vehicle (inherited from invoice)
  vendorId: string; // Associated with a vendor (inherited from invoice)
  unitPrice: number; // Number with two decimal places
  unitLabor: number; // Number with two decimal places
  quantity: number; // Number with two decimal places
  totalPrice: number; // Calculated: quantity * (unitPrice + unitLabor)
  type: LineItemType; // Parts or Labor
  mileage: number; // Integer number
  taxable: boolean; // true or false
  warrantyMileage?: number; // Optional warranty mileage
  warrantyDate?: string; // Optional warranty date (ISO string)
  warranty: boolean; // true or false
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export class LineItemEntity implements LineItem {
  id: string;
  serviceTypeId: string;
  invoiceId: string;
  vehicleId: string;
  vendorId: string;
  unitPrice: number;
  unitLabor: number;
  quantity: number;
  totalPrice: number;
  type: LineItemType;
  mileage: number;
  taxable: boolean;
  warrantyMileage?: number;
  warrantyDate?: string;
  warranty: boolean;
  description: string;
  createdAt?: string;
  updatedAt?: string;

  constructor(lineItem: Partial<LineItem> = {}) {
    this.id = lineItem.id || '';
    this.serviceTypeId = lineItem.serviceTypeId || '';
    this.invoiceId = lineItem.invoiceId || '';
    this.vehicleId = lineItem.vehicleId || '';
    this.vendorId = lineItem.vendorId || '';
    this.unitPrice = lineItem.unitPrice || 0;
    this.unitLabor = lineItem.unitLabor || 0;
    this.quantity = lineItem.quantity || 0;
    this.totalPrice = lineItem.totalPrice || this.calculateTotalPrice(this.unitPrice, this.unitLabor, this.quantity);
    this.type = lineItem.type || 'Parts';
    this.mileage = Math.floor(lineItem.mileage || 0); // Ensure integer
    this.taxable = lineItem.taxable ?? false;
    this.warrantyMileage = lineItem.warrantyMileage ? Math.floor(lineItem.warrantyMileage) : undefined;
    this.warrantyDate = lineItem.warrantyDate;
    this.warranty = lineItem.warranty ?? false;
    this.description = lineItem.description || '';
    this.createdAt = lineItem.createdAt;
    this.updatedAt = lineItem.updatedAt;
  }

  // Helper method to calculate total price
  private calculateTotalPrice(unitPrice: number, unitLabor: number, quantity: number): number {
    return Number(((unitPrice + unitLabor) * quantity).toFixed(2));
  }

  // Helper method to recalculate total price when unit price, unit labor, or quantity changes
  recalculateTotalPrice(): void {
    this.totalPrice = this.calculateTotalPrice(this.unitPrice, this.unitLabor, this.quantity);
  }

  // Static helper to format numbers to 2 decimal places
  static formatPrice(price: number): number {
    return Number(price.toFixed(2));
  }

  // Static helper to ensure mileage is integer
  static formatMileage(mileage: number): number {
    return Math.floor(mileage);
  }
}
