import { SqlQuerySpec } from '@azure/cosmos';
import { getVehiclesContainer, getVendorsContainer } from '../../../infra/cosmos';
import { Vehicle, VehicleEntity } from '../entities/vehicle.entity';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';

function nowIso() {
  return new Date().toISOString();
}

export class VehicleService {

  private get container() {
    return getVehiclesContainer();
  }

  async findAll(): Promise<Vehicle[]> {
  const q: SqlQuerySpec = {
    query: `SELECT * FROM c ORDER BY c.id`
  };
  const { resources } = await this.container.items.query<Vehicle>(q).fetchAll();
  return resources;
  
}
  async create(payload: Omit<Vehicle, "id" | "createdAt" | "updatedAt">): Promise<Vehicle> {
    // Validaciones mínimas (ajusta según tu modelo real)
    console.log(payload.vin);
    console.log(payload.status);
    console.log(payload.make);
    console.log(payload.year);
    if (!payload.vin?.trim()) throw new Error("vin is required");
    if (!payload.status) throw new Error("status is required");
    if (!payload.make) throw new Error("make is required");
    if (!payload.year) throw new Error("year is required");

    // Chequeo rápido de duplicado por VIN (opcional; ideal: unique key sobre /vin)
    const dup = await this.findByVin(payload.vin);
    if (dup) throw new Error("vehicle with same VIN already exists");

    const doc: Vehicle = {
      ...payload,
      id: this.generateId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    // items.create infiere la PK (si tu PK es /id y el documento tiene id)
    await this.container.items.create(doc);
    
    return doc;
  }

  async getById(id: string): Promise<Vehicle | null> {
    try {
      const { resource } = await this.container.item(id, id).read<Vehicle>();
      return resource ?? null;
    } catch {
      return null;
    }
  }

  async update(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const current = await this.getById(id);
    if (!current) throw new Error("vehicle not found");

    // Evita cambiar id
    const { id: _ignored, createdAt: _c, ...rest } = updates;

    const next: Vehicle = {
      ...current,
      ...rest,
      updatedAt: nowIso(),
    };

    await this.container.item(id, id).replace(next);
    return next;
  }

  async delete(id: string): Promise<void> {
    const found = await this.getById(id);
    if (!found) throw new Error("vehicle not found");
    await this.container.item(id, id).delete();
  }
  
async findByVin(vin: string): Promise<Vehicle | null> {
    const q: SqlQuerySpec = {
      query: `SELECT TOP 1 * FROM c WHERE c.vin = @vin`,
      parameters: [{ name: "@vin", value: vin }],
    };
    const { resources } = await this.container.items.query<Vehicle>(q).fetchAll();
    return resources[0] ?? null;
  }

  async findByTagNumber(tagNumber: string): Promise<Vehicle | null> {
    const q: SqlQuerySpec = {
      query: `SELECT TOP 1 * FROM c WHERE c.tagNumber = @tagNumber`,
      parameters: [{ name: "@tagNumber", value: tagNumber }],
    };
    const { resources } = await this.container.items.query<Vehicle>(q).fetchAll();
    return resources[0] ?? null;
  }

  async findByStatus(status: "Active" | "Inactive"): Promise<Vehicle[]> {
    const q: SqlQuerySpec = {
      query: `
        SELECT * FROM c
        WHERE c.status = @status
        ORDER BY c.id
      `,
      parameters: [{ name: "@status", value: status }],
    };
    const { resources } = await this.container.items.query<Vehicle>(q).fetchAll();
    return resources;
  }

  async findByMakeAndYear(make: string, year: number): Promise<Vehicle[]> {
    // Usamos LOWER para hacer comparación case-insensitive en 'make'
    const q: SqlQuerySpec = {
      query: `
        SELECT * FROM c
        WHERE LOWER(c.make) = LOWER(@make)
          AND c.year = @year
        ORDER BY c.id
      `,
      parameters: [
        { name: "@make", value: make },
        { name: "@year", value: year },
      ],
    };
    const { resources } = await this.container.items.query<Vehicle>(q).fetchAll();
    return resources;
  }


  async bulkImport(vehicles: Vehicle[]): Promise<{ success: Vehicle[]; errors: { item: any; error: string }[] }> {
    const success: Vehicle[] = [];
    const errors: { item: any; error: string }[] = [];

    for (const item of vehicles) {
      try {
        // Validate required fields
        if (!item.id?.trim()) {
          errors.push({ item, error: 'id is required' });
          continue;
        }
        if (!item.vin?.trim()) {
          errors.push({ item, error: 'vin is required' });
          continue;
        }
        if (!item.status) {
          errors.push({ item, error: 'status is required' });
          continue;
        }
        if (!item.make) {
          errors.push({ item, error: 'make is required' });
          continue;
        }
        if (!item.year) {
          errors.push({ item, error: 'year is required' });
          continue;
        }

        // Check if vehicle with same ID already exists
        const existingById = await this.getById(item.id);
        if (existingById) {
          errors.push({ item, error: `vehicle with id '${item.id}' already exists` });
          continue;
        }

        // Check if vehicle with same VIN already exists
        const existingByVin = await this.findByVin(item.vin);
        if (existingByVin) {
          errors.push({ item, error: `vehicle with VIN '${item.vin}' already exists` });
          continue;
        }

        // Create the document with provided ID
        const doc: Vehicle = {
          ...item,
          id: item.id.trim(),
          vin: item.vin.trim(),
          createdAt: item.createdAt || nowIso(),
          updatedAt: item.updatedAt || nowIso(),
        };

        await this.container.items.create(doc);
        success.push(doc);
      } catch (error: any) {
        errors.push({
          item,
          error: error.message || 'Failed to create vehicle'
        });
      }
    }

    return { success, errors };
  }

  private generateId(): string {
    return `veh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

}
export const vehicleService = new VehicleService();