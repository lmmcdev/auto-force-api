export type InvoiceStatus = 'Draft' | 'PendingAlertReview' | 'Approved' | 'Rejected' | 'Paid' | 'Cancelled';

export interface File {
  id: string;
  name: string;
  url: string;
  size: number;
  contentType: string;
  lastModified: string;
  etag?: string;
  metadata?: Record<string, unknown>;
}

export interface VehicleSnapshot {
  id: string;
  truckExternalId: string;
  vin: string;
  tagNumber: string;
  make: string;
  color: string;
  year: number;
  status: 'Active' | 'Inactive';
}

export interface VendorSnapshot {
  id: string;
  name: string;
  status: 'Active' | 'Inactive';
  type?: 'ServiceProvider' | 'PartsSupplier' | 'Insurance' | 'Other' | null;
}

export interface Invoice {
  id: string;
  vehicleId?: string; // Associated with a vehicle (optional)
  vendorId: string; // Associated with a vendor
  vehicle?: VehicleSnapshot; // Snapshot of vehicle data at time of invoice creation
  vendor?: VendorSnapshot; // Snapshot of vendor data at time of invoice creation
  invoiceNumber: string;
  orderStartDate: string; // ISO date string
  uploadDate: string; // ISO date string
  invoiceAmount: number; // Number with two decimal places
  subTotal: number;
  status: InvoiceStatus;
  tax: number; // Number with two decimal places
  description: string;
  file?: File; // Optional file attachment
  createdAt?: string;
  updatedAt?: string;
}

export class InvoiceEntity implements Invoice {
  id: string;
  vehicleId?: string;
  vendorId: string;
  vehicle?: VehicleSnapshot;
  vendor?: VendorSnapshot;
  invoiceNumber: string;
  orderStartDate: string;
  uploadDate: string;
  invoiceAmount: number;
  subTotal: number;
  status: InvoiceStatus;
  tax: number;
  description: string;
  file?: File;
  createdAt?: string;
  updatedAt?: string;

  constructor(invoice: Partial<Invoice> = {}) {
    this.id = invoice.id || '';
    this.vehicleId = invoice.vehicleId;
    this.vendorId = invoice.vendorId || '';
    this.vehicle = invoice.vehicle;
    this.vendor = invoice.vendor;
    this.invoiceNumber = invoice.invoiceNumber || '';
    this.orderStartDate = invoice.orderStartDate || '';
    this.uploadDate = invoice.uploadDate || '';
    this.invoiceAmount = invoice.invoiceAmount || 0;
    this.subTotal = invoice.subTotal || 0;
    this.status = invoice.status || 'Draft';
    this.tax = invoice.tax || 0;
    this.description = invoice.description || '';
    this.file = invoice.file;
    this.createdAt = invoice.createdAt;
    this.updatedAt = invoice.updatedAt;
  }

  // Helper method to calculate total amount including tax
  getTotalAmount(): number {
    return Number((this.invoiceAmount + this.tax).toFixed(2));
  }

  // Helper method to format amounts to 2 decimal places
  static formatAmount(amount: number): number {
    return Number(amount.toFixed(2));
  }
}
