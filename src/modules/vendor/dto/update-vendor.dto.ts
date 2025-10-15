import { VendorAddress, VendorContact, VendorStatus, VendorType } from '../entities/vendor.entity';
export interface UpdateVendorDTO {
  name?: string;
  status?: VendorStatus;
  type?: VendorType | null;
  contact?: VendorContact | null;
  address?: VendorAddress | null;
  notes?: string | null;
}
