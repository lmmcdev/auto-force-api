export type InvoiceStatus = 'Draft' | 'PendingAlertReview' | 'Approved' | 'Rejected' | 'Paid' | 'Cancelled';

export interface Invoice {
  id: string;
  vehicleId: string; // Associated with a vehicle
  vendorId: string; // Associated with a vendor
  invoiceNumber: string;
  orderStartDate: string; // ISO date string
  uploadDate: string; // ISO date string
  invoiceAmount: number; // Number with two decimal places
  subTotal: number;
  status: InvoiceStatus;
  tax: number; // Number with two decimal places
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export class InvoiceEntity implements Invoice {
  id: string;
  vehicleId: string;
  vendorId: string;
  invoiceNumber: string;
  orderStartDate: string;
  uploadDate: string;
  invoiceAmount: number;
  subTotal: number;
  status: InvoiceStatus;
  tax: number;
  description: string;
  createdAt?: string;
  updatedAt?: string;

  constructor(invoice: Partial<Invoice> = {}) {
    this.id = invoice.id || '';
    this.vehicleId = invoice.vehicleId || '';
    this.vendorId = invoice.vendorId || '';
    this.invoiceNumber = invoice.invoiceNumber || '';
    this.orderStartDate = invoice.orderStartDate || '';
    this.uploadDate = invoice.uploadDate || '';
    this.invoiceAmount = invoice.invoiceAmount || 0;
    this.subTotal = invoice.subTotal || 0;
    this.status = invoice.status || 'Draft';
    this.tax = invoice.tax || 0;
    this.description = invoice.description || '';
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
