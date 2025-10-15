export type VendorStatus = 'Active' | 'Inactive';
export type VendorType = 'ServiceProvider' | 'PartsSupplier' | 'Insurance' | 'Other';

export interface VendorContact {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface VendorAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface Vendor {
  id: string;
  name: string;
  status: VendorStatus;
  type?: VendorType | null;
  contact?: VendorContact | null;
  address?: VendorAddress | null;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export class VendorEntity implements Vendor {
  id: string;
  name: string;
  status: VendorStatus;
  type?: VendorType | null;
  contact?: VendorContact | null;
  address?: VendorAddress | null;
  note?: string | null;

  constructor(vendor: Partial<Vendor> = {}) {
    this.id = vendor.id || '';
    this.name = vendor.name || '';
    this.status = vendor.status || 'Active';
    this.type = vendor.type || 'Other';
    this.contact = vendor.contact;
    this.address = vendor.address;
    this.note = vendor.note || '';
  }
}
