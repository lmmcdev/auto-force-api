import { SqlQuerySpec } from '@azure/cosmos';
import { getVendorsContainer } from '../../../infra/cosmos';
import { Vendor, VendorStatus, VendorType } from '../entities/vendor.entity';
import { UpdateVendorDTO } from '../dto/update-vendor.dto';
import { QueryVendorDTO } from '../dto/query-vendor.dto';

function nowIso() {
  return new Date().toISOString();
}

// Helper para remover campos undefined (Cosmos no acepta undefined, solo null)
function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  const cleaned: Record<string, unknown> | unknown[] = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    const value = obj[key];
    if (value !== undefined) {
      if (Array.isArray(cleaned)) {
        cleaned.push(typeof value === 'object' ? cleanUndefined(value) : value);
      } else {
        cleaned[key] = typeof value === 'object' ? cleanUndefined(value) : value;
      }
    }
  }
  return cleaned as T;
}

export class VendorService {
  private get container() {
    return getVendorsContainer();
  }

  async create(payload: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vendor> {
    if (!payload.name?.trim()) throw new Error('name is required');

    // chequear duplicado por nombre (si aplicaste uniqueKeyPolicy, Cosmos ya lo protege)
    const query: SqlQuerySpec = {
      query: 'SELECT TOP 1 * FROM c WHERE LOWER(c.name) = LOWER(@name)',
      parameters: [{ name: '@name', value: payload.name }],
    };
    const { resources } = await this.container.items.query<Vendor>(query).fetchAll();
    if (resources.length > 0) {
      throw new Error('vendor with same name already exists');
    }

    const doc: Vendor = {
      id: this.generateId(),
      name: payload.name.trim(),
      status: payload.status || 'Active',
      type: payload.type || null,
      contact: payload.contact ? cleanUndefined(payload.contact) : null,
      address: payload.address ? cleanUndefined(payload.address) : null,
      note: payload.note || null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    // partitionKey = id (porque definimos /id)
    const cleanDoc = cleanUndefined(doc);
    await this.container.items.create(cleanDoc);
    return cleanDoc;
  }

  async getById(id: string): Promise<Vendor | null> {
    try {
      const { resource } = await this.container.item(id, id).read<Vendor>();
      return resource ?? null;
    } catch {
      return null;
    }
  }
  async findAll(): Promise<Vendor[]> {
    const query: SqlQuerySpec = {
      query: `SELECT * FROM c ORDER BY c.id`,
    };
    const { resources } = await this.container.items.query(query).fetchAll();
    return resources;
  }

  async find(query: QueryVendorDTO = {}): Promise<{ data: Vendor[]; total: number }> {
    const take = Math.max(1, Math.min(query.take ?? 50, 1000)); // Limit between 1-1000
    const skip = Math.max(0, query.skip ?? 0);

    // Build dynamic query based on provided filters
    let whereClause = 'WHERE 1=1';
    const parameters: Array<{ name: string; value: string }> = [];

    if (query.status) {
      whereClause += ' AND c.status = @status';
      parameters.push({ name: '@status', value: query.status });
    }

    if (query.type) {
      whereClause += ' AND c.type = @type';
      parameters.push({ name: '@type', value: query.type });
    }

    if (query.q && query.q.trim()) {
      whereClause += ' AND CONTAINS(LOWER(c.name), LOWER(@q))';
      parameters.push({ name: '@q', value: query.q.trim() });
    }

    const q: SqlQuerySpec = {
      query: `SELECT * FROM c ${whereClause} ORDER BY c.name`,
      parameters: parameters,
    };

    try {
      const { resources } = await this.container.items.query<Vendor>(q).fetchAll();
      const total = resources.length;
      const data = resources.slice(skip, skip + take);

      return { data, total };
    } catch (error) {
      console.error('Cosmos DB query error:', error);
      // Fallback to simple query without filters
      const fallbackQuery: SqlQuerySpec = {
        query: 'SELECT * FROM c ORDER BY c.name',
      };
      const { resources } = await this.container.items.query<Vendor>(fallbackQuery).fetchAll();
      const total = resources.length;
      const data = resources.slice(skip, skip + take);

      return { data, total };
    }
  }

  async update(id: string, payload: UpdateVendorDTO): Promise<Vendor> {
    const current = await this.getById(id);
    if (!current) throw new Error('vendor not found');

    // Validar nombre duplicado si cambia
    if (payload.name && payload.name.trim().toLowerCase() !== current.name.toLowerCase()) {
      const dup = await this.find({ q: payload.name, take: 1 });
      if (
        dup.data.some(
          v => v.id !== id && v.name.toLowerCase() === payload.name!.trim().toLowerCase()
        )
      ) {
        throw new Error('vendor with same name already exists');
      }
    }

    const next: Vendor = {
      ...current,
      ...payload,
      name: payload.name ? payload.name.trim() : current.name,
      updatedAt: nowIso(),
    };

    await this.container.item(id, id).replace(next);
    return next;
  }

  async delete(id: string): Promise<void> {
    // Si no existe, lanzará 404 → lo tratamos como error de negocio
    const found = await this.getById(id);
    if (!found) throw new Error('vendor not found');
    await this.container.item(id, id).delete();
  }

  private generateId(): string {
    return `vend_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  // Buscar vendors por status
  async findByStatus(status: 'Active' | 'Inactive'): Promise<Vendor[]> {
    const q: SqlQuerySpec = {
      query: `
        SELECT * FROM c
        WHERE c.status = @status
        ORDER BY c.name
      `,
      parameters: [{ name: '@status', value: status }],
    };

    const { resources } = await this.container.items.query<Vendor>(q).fetchAll();
    return resources;
  }

  // Buscar vendors por status Y type
  async findByStatusAndType(status: VendorStatus, type: VendorType): Promise<Vendor[]> {
    const q: SqlQuerySpec = {
      query: `
        SELECT * FROM c
        WHERE c.status = @status AND c.type = @type
        ORDER BY c.name
      `,
      parameters: [
        { name: '@status', value: status },
        { name: '@type', value: type },
      ],
    };

    const { resources } = await this.container.items.query<Vendor>(q).fetchAll();
    return resources;
  }

  async bulkImport(
    vendors: Vendor[]
  ): Promise<{ success: Vendor[]; errors: { item: Vendor; error: string }[] }> {
    const success: Vendor[] = [];
    const errors: { item: Vendor; error: string }[] = [];

    for (const item of vendors) {
      try {
        // Validate required fields
        if (!item.id?.trim()) {
          errors.push({ item, error: 'id is required' });
          continue;
        }
        if (!item.name?.trim()) {
          errors.push({ item, error: 'name is required' });
          continue;
        }

        // Check if vendor with same ID already exists
        const existingById = await this.getById(item.id);
        if (existingById) {
          errors.push({ item, error: `vendor with id '${item.id}' already exists` });
          continue;
        }

        // Check if vendor with same name already exists
        const existingByName = await this.find({ q: item.name.trim(), take: 1 });
        if (
          existingByName.data.some(v => v.name.toLowerCase() === item.name.trim().toLowerCase())
        ) {
          errors.push({ item, error: `vendor with name '${item.name}' already exists` });
          continue;
        }

        // Create the document with provided ID
        const doc: Vendor = {
          id: item.id.trim(),
          name: item.name.trim(),
          status: item.status || 'Active',
          type: item.type || null,
          contact: item.contact ? cleanUndefined(item.contact) : null,
          address: item.address ? cleanUndefined(item.address) : null,
          note: item.note || null,
          createdAt: item.createdAt || nowIso(),
          updatedAt: item.updatedAt || nowIso(),
        };

        const cleanDoc = cleanUndefined(doc);
        await this.container.items.create(cleanDoc);
        success.push(cleanDoc);
      } catch (error) {
        errors.push({
          item,
          error: error instanceof Error ? error.message : 'Failed to create vendor',
        });
      }
    }

    return { success, errors };
  }
}
export const vendorService = new VendorService();
