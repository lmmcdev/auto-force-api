import { Vehicle, VehicleEntity } from '../entities/vehicle.entity';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';

export class VehicleService {
  private vehicles: Map<string, Vehicle> = new Map();

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    const id = this.generateId();
    const vehicle = new VehicleEntity({
      id,
      ...createVehicleDto,
    });

    this.vehicles.set(id, vehicle);
    return vehicle;
  }

  async findAll(): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values());
  }

  async findOne(id: string): Promise<Vehicle | null> {
    return this.vehicles.get(id) || null;
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto): Promise<Vehicle | null> {
    const existingVehicle = this.vehicles.get(id);
    if (!existingVehicle) {
      return null;
    }

    const updatedVehicle = new VehicleEntity({
      ...existingVehicle,
      ...updateVehicleDto,
      id,
    });

    this.vehicles.set(id, updatedVehicle);
    return updatedVehicle;
  }

  async remove(id: string): Promise<void> {
    this.vehicles.delete(id);
  }

  async findByVin(vin: string): Promise<Vehicle | null> {
    const vehicles = Array.from(this.vehicles.values());
    return vehicles.find(vehicle => vehicle.vin === vin) || null;
  }

  async findByTagNumber(tagNumber: string): Promise<Vehicle | null> {
    const vehicles = Array.from(this.vehicles.values());
    return vehicles.find(vehicle => vehicle.tagNumber === tagNumber) || null;
  }

  async findByStatus(status: 'Active' | 'Inactive'): Promise<Vehicle[]> {
    const vehicles = Array.from(this.vehicles.values());
    return vehicles.filter(vehicle => vehicle.status === status);
  }

  async findByMakeAndYear(make: string, year: number): Promise<Vehicle[]> {
    const vehicles = Array.from(this.vehicles.values());
    return vehicles.filter(vehicle =>
      vehicle.make.toLowerCase() === make.toLowerCase() && vehicle.year === year
    );
  }

  private generateId(): string {
    return `veh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}