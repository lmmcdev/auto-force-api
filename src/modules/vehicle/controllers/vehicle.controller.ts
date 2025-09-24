import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { VehicleService } from "../services/vehicle.service";
import { CreateVehicleDto } from "../dto/create-vehicle.dto";
import { UpdateVehicleDto } from "../dto/update-vehicle.dto";
import { Vehicle } from "../entities/vehicle.entity";

export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    return this.vehicleService.create(createVehicleDto);
  }

  async findAll(): Promise<Vehicle[]> {
    return this.vehicleService.findAll();
  }

  async findOne(id: string): Promise<Vehicle | null> {
    return this.vehicleService.findOne(id);
  }

  async update(
    id: string,
    updateVehicleDto: UpdateVehicleDto
  ): Promise<Vehicle | null> {
    return this.vehicleService.update(id, updateVehicleDto);
  }

  async remove(id: string): Promise<void> {
    return this.vehicleService.remove(id);
  }

  async findByVin(vin: string): Promise<Vehicle | null> {
    return this.vehicleService.findByVin(vin);
  }

  async findByTagNumber(tagNumber: string): Promise<Vehicle | null> {
    return this.vehicleService.findByTagNumber(tagNumber);
  }

  async findByStatus(status: "Active" | "Inactive"): Promise<Vehicle[]> {
    return this.vehicleService.findByStatus(status);
  }

  async findByMakeAndYear(make: string, year: number): Promise<Vehicle[]> {
    return this.vehicleService.findByMakeAndYear(make, year);
  }
}
