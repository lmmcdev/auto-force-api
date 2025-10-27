import { SqlQuerySpec } from '@azure/cosmos';
import { getVehiclesContainer } from '../../../infra/cosmos';
import { Vehicle } from '../entities/vehicle.entity';
import { alertService } from '../../alert/services/alert.service';

function nowIso() {
  return new Date().toISOString();
}

export class VehicleService {
  private async getContainer() {
    return await getVehiclesContainer();
  }

  async findAll(): Promise<Vehicle[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: `SELECT * FROM c ORDER BY c.id`,
    };
    const { resources } = await container.items.query<Vehicle>(q).fetchAll();
    return resources;
  }
  async create(payload: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vehicle> {
    // Validaciones mínimas (ajusta según tu modelo real)
    console.log(payload.vin);
    console.log(payload.status);
    console.log(payload.make);
    console.log(payload.year);
    if (!payload.vin?.trim()) throw new Error('vin is required');
    if (!payload.status) throw new Error('status is required');
    if (!payload.make) throw new Error('make is required');
    if (!payload.year) throw new Error('year is required');

    // Chequeo rápido de duplicado por VIN (opcional; ideal: unique key sobre /vin)
    const dup = await this.findByVin(payload.vin);
    if (dup) throw new Error('vehicle with same VIN already exists');

    const doc: Vehicle = {
      ...payload,
      id: this.generateId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    // items.create infiere la PK (si tu PK es /id y el documento tiene id)
    const container = await this.getContainer();
    await container.items.create(doc);

    // Check expiration dates and find existing alerts
    await this.checkExpirationDatesForAlerts(doc);

    return doc;
  }

  async getById(id: string): Promise<Vehicle | null> {
    try {
      const container = await this.getContainer();
      const { resource } = await container.item(id, id).read<Vehicle>();
      return resource ?? null;
    } catch {
      return null;
    }
  }

  async update(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const current = await this.getById(id);
    if (!current) throw new Error('vehicle not found');

    // Evita cambiar id
    const { id: _ignored, createdAt: _c, ...rest } = updates;

    const next: Vehicle = {
      ...current,
      ...rest,
      updatedAt: nowIso(),
    };

    // Check if any expiration date fields have changed
    const expirationFieldsChanged =
      (updates.insuranceExpirationDate !== undefined &&
        updates.insuranceExpirationDate !== current.insuranceExpirationDate) ||
      (updates.tagExpirationDate !== undefined && updates.tagExpirationDate !== current.tagExpirationDate) ||
      (updates.annualInspectionExpirationDate !== undefined &&
        updates.annualInspectionExpirationDate !== current.annualInspectionExpirationDate) ||
      (updates.registrationExpirationDate !== undefined &&
        updates.registrationExpirationDate !== current.registrationExpirationDate);

    const container = await this.getContainer();
    await container.item(id, id).replace(next);

    // If expiration dates changed, check and create alerts
    if (expirationFieldsChanged) {
      console.log(`Expiration date(s) changed for vehicle ${id}. Checking alerts...`);
      await this.checkExpirationDatesForAlerts(next);
    }

    return next;
  }

  async delete(id: string): Promise<void> {
    const found = await this.getById(id);
    if (!found) throw new Error('vehicle not found');
    const container = await this.getContainer();
    await container.item(id, id).delete();
  }

  async findByVin(vin: string): Promise<Vehicle | null> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: `SELECT TOP 1 * FROM c WHERE c.vin = @vin`,
      parameters: [{ name: '@vin', value: vin }],
    };
    const { resources } = await container.items.query<Vehicle>(q).fetchAll();
    return resources[0] ?? null;
  }

  async findByTagNumber(tagNumber: string): Promise<Vehicle | null> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: `SELECT TOP 1 * FROM c WHERE c.tagNumber = @tagNumber`,
      parameters: [{ name: '@tagNumber', value: tagNumber }],
    };
    const { resources } = await container.items.query<Vehicle>(q).fetchAll();
    return resources[0] ?? null;
  }

  async findByStatus(status: 'Active' | 'Inactive'): Promise<Vehicle[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: `
        SELECT * FROM c
        WHERE c.status = @status
        ORDER BY c.id
      `,
      parameters: [{ name: '@status', value: status }],
    };
    const { resources } = await container.items.query<Vehicle>(q).fetchAll();
    return resources;
  }

  async findByMakeAndYear(make: string, year: number): Promise<Vehicle[]> {
    // Usamos LOWER para hacer comparación case-insensitive en 'make'
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: `
        SELECT * FROM c
        WHERE LOWER(c.make) = LOWER(@make)
          AND c.year = @year
        ORDER BY c.id
      `,
      parameters: [
        { name: '@make', value: make },
        { name: '@year', value: year },
      ],
    };
    const { resources } = await container.items.query<Vehicle>(q).fetchAll();
    return resources;
  }

  async bulkImport(vehicles: Vehicle[]): Promise<{ success: Vehicle[]; errors: { item: Vehicle; error: string }[] }> {
    const success: Vehicle[] = [];
    const errors: { item: Vehicle; error: string }[] = [];

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

        const container = await this.getContainer();
        await container.items.create(doc);
        success.push(doc);

        // Check expiration dates and find existing alerts
        await this.checkExpirationDatesForAlerts(doc);
      } catch (error) {
        errors.push({
          item,
          error: error instanceof Error ? error.message : 'Failed to create vehicle',
        });
      }
    }

    return { success, errors };
  }

  private generateId(): string {
    return `veh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper method to check and create alerts for vehicle expiration dates
   * Evaluates insuranceExpirationDate, tagExpirationDate, annualInspectionExpirationDate, registrationExpirationDate
   * Creates an alert if one doesn't exist for the given parameters
   */
  private async checkExpirationDatesForAlerts(vehicle: Vehicle): Promise<void> {
    const expirationFields = [
      { field: 'insuranceExpirationDate', subcategory: 'Insurance' },
      { field: 'tagExpirationDate', subcategory: 'Tag' },
      { field: 'annualInspectionExpirationDate', subcategory: 'Annual Inspection' },
      { field: 'registrationExpirationDate', subcategory: 'Registration' },
    ];

    for (const { field, subcategory } of expirationFields) {
      const expirationDate = vehicle[field as keyof Vehicle] as string;

      // Only check if the expiration date is not empty
      if (expirationDate && expirationDate.trim() !== '') {
        try {
          // Search for existing alert with these parameters
          const existingAlerts =
            await alertService.findByVehicleIdAndTypeAndCategoryAndReasonsAndSubcategoryAndExpirationDate(
              vehicle.id,
              'PERMIT',
              'PermitVehicle',
              'Expiration Date',
              subcategory,
              expirationDate
            );

          if (existingAlerts.length > 0) {
            console.log(
              `Found ${existingAlerts.length} existing alert(s) for vehicle ${vehicle.id}, subcategory: ${subcategory}, expiration: ${expirationDate}`
            );
          } else {
            // No existing alert found - create a new one
            console.log(
              `No existing alert found for vehicle ${vehicle.id}, subcategory: ${subcategory}, expiration: ${expirationDate}. Creating new alert...`
            );

            const newAlert = await alertService.create({
              type: 'PERMIT',
              category: 'PermitVehicle',
              subcategory: subcategory,
              vehicleId: vehicle.id,
              reasons: 'Expiration Date',
              status: 'Pending',
              message: `${subcategory} expiring on ${expirationDate} for vehicle ${vehicle.id}`,
              expirationDate: expirationDate,
            });

            console.log(
              `Created new alert ${newAlert.id} for vehicle ${vehicle.id}, subcategory: ${subcategory}, expiration: ${expirationDate}`
            );
          }
        } catch (error) {
          console.error(
            `Error checking/creating alert for vehicle ${vehicle.id}, field ${field}:`,
            error instanceof Error ? error.message : error
          );
          // Don't throw - we don't want to fail vehicle creation if alert check/creation fails
        }
      }
    }
  }
}
export const vehicleService = new VehicleService();
