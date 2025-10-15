import {
  Vendor,
  VendorAddress,
  VendorContact,
  VendorStatus,
  VendorType,
} from '../entities/vendor.entity';

export interface CreateVendorDTO {
  name: string;
  status: VendorStatus; // 'Active' | 'Inactive'
  type?: VendorType | null;
  contact?: VendorContact | null;
  address?: VendorAddress | null;
  notes?: string | null;
}
