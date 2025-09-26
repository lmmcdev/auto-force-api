import { Vendor, VendorEntity, VendorStatus, VendorType } from "../entities/vendor.entity";
import { CreateVendorDTO } from "../dto/create-vendor.dto";
import { UpdateVendorDTO } from "../dto/update-vendor.dto";

export class VendorService {
   private vendor : Map<string , Vendor>;

   async create( createVendorDTO : CreateVendorDTO): Promise<Vendor>{
    const id = this.generateId();
    const vendor = new VendorEntity({
        id,
        ...createVendorDTO,
    });
    this.vendor.set(id,vendor);
    return vendor;
   }

   private generateId(): string {
    return `veh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

    async findAll(): Promise<Vendor[]> {
      return Array.from(this.vendor.values());
    }
  
    async findOne(id: string): Promise<Vendor | null> {
      return this.vendor.get(id) || null;
    }

    async update(id: string, updateVendorDTO: UpdateVendorDTO): Promise<Vendor | null> {
        const existingVendor = this.vendor.get(id);
        if (!existingVendor) {
          return null;
        }
    
        const updatedVendor = new VendorEntity({
          ...existingVendor,
          ...updateVendorDTO,
          id,
        });
    
        this.vendor.set(id, updatedVendor);
        return updatedVendor;
      }

      async remove(id: string): Promise<void> {
        this.vendor.delete(id);
      }

      async findByStatus(status: 'Active'|'Inactive'): Promise<Vendor[]>{
        const vendor = Array.from(this.vendor.values());
        return vendor.filter(vendor => vendor.status == status);
      }

      async findByStatusAndType(status: VendorStatus, type:VendorType): Promise<Vendor[]>{
        const vendor = Array.from(this.vendor.values());
        return vendor.filter(vendor => vendor.status== status && vendor.type)
      }



}
