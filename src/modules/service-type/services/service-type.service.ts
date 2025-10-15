import { SqlQuerySpec } from '@azure/cosmos';
import { getServiceTypesContainer } from '../../../infra/cosmos';
import { ServiceType, ServiceTypeStatus, ServiceTypeType } from '../entities/service-type.entity';
import { UpdateServiceTypeDto } from '../dto/update-service-type.dto';
import { QueryServiceTypeDto } from '../dto/query-service-type.dto';

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
      (cleaned as Record<string, unknown>)[key] = typeof value === 'object' ? cleanUndefined(value) : value;
    }
  }
  return cleaned as T;
}

export class ServiceTypeService {
  private get container() {
    return getServiceTypesContainer();
  }

  async create(payload: Omit<ServiceType, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceType> {
    if (!payload.name?.trim()) throw new Error('name is required');

    // chequear duplicado por nombre (si aplicaste uniqueKeyPolicy, Cosmos ya lo protege)
    const query: SqlQuerySpec = {
      query: 'SELECT TOP 1 * FROM c WHERE LOWER(c.name) = LOWER(@name)',
      parameters: [{ name: '@name', value: payload.name }],
    };
    const { resources } = await this.container.items.query<ServiceType>(query).fetchAll();
    if (resources.length > 0) {
      throw new Error('service type with same name already exists');
    }

    const doc: ServiceType = {
      id: this.generateId(),
      name: payload.name.trim(),
      description: payload.description || '',
      status: payload.status || 'Active',
      type: payload.type || 'Service',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    // partitionKey = id (porque definimos /id)
    const cleanDoc = cleanUndefined(doc);
    await this.container.items.create(cleanDoc);
    return cleanDoc;
  }

  async getById(id: string): Promise<ServiceType | null> {
    try {
      const { resource } = await this.container.item(id, id).read<ServiceType>();
      return resource ?? null;
    } catch {
      return null;
    }
  }

  async findAll(): Promise<ServiceType[]> {
    const query: SqlQuerySpec = {
      query: `SELECT * FROM c ORDER BY c.name`,
    };
    const { resources } = await this.container.items.query(query).fetchAll();
    return resources;
  }

  async find(query: QueryServiceTypeDto = {}): Promise<{ data: ServiceType[]; total: number }> {
    const take = Math.max(1, Math.min(query.take ?? 50, 1000)); // Limit between 1-1000
    const skip = Math.max(0, query.skip ?? 0);

    // Build dynamic query based on provided filters
    let whereClause = 'WHERE 1=1';
    const parameters: { name: string; value: string }[] = [];

    if (query.status) {
      whereClause += ' AND c.status = @status';
      parameters.push({ name: '@status', value: query.status });
    }

    if (query.type) {
      whereClause += ' AND c.type = @type';
      parameters.push({ name: '@type', value: query.type });
    }

    if (query.q && query.q.trim()) {
      whereClause += ' AND (CONTAINS(LOWER(c.name), LOWER(@q)) OR CONTAINS(LOWER(c.description), LOWER(@q)))';
      parameters.push({ name: '@q', value: query.q.trim() });
    }

    const q: SqlQuerySpec = {
      query: `SELECT * FROM c ${whereClause} ORDER BY c.name`,
      parameters: parameters,
    };

    try {
      const { resources } = await this.container.items.query<ServiceType>(q).fetchAll();
      const total = resources.length;
      const data = resources.slice(skip, skip + take);

      return { data, total };
    } catch (error) {
      console.error('Cosmos DB query error:', error);
      // Fallback to simple query without filters
      const fallbackQuery: SqlQuerySpec = {
        query: 'SELECT * FROM c ORDER BY c.name',
      };
      const { resources } = await this.container.items.query<ServiceType>(fallbackQuery).fetchAll();
      const total = resources.length;
      const data = resources.slice(skip, skip + take);

      return { data, total };
    }
  }

  async update(id: string, payload: UpdateServiceTypeDto): Promise<ServiceType> {
    const current = await this.getById(id);
    if (!current) throw new Error('service type not found');

    // Validar nombre duplicado si cambia
    if (payload.name && payload.name.trim().toLowerCase() !== current.name.toLowerCase()) {
      const dup = await this.find({ q: payload.name, take: 1 });
      if (dup.data.some(st => st.id !== id && st.name.toLowerCase() === payload.name!.trim().toLowerCase())) {
        throw new Error('service type with same name already exists');
      }
    }

    const next: ServiceType = {
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
    if (!found) throw new Error('service type not found');
    await this.container.item(id, id).delete();
  }

  // Buscar service types por status
  async findByStatus(status: ServiceTypeStatus): Promise<ServiceType[]> {
    const q: SqlQuerySpec = {
      query: `
        SELECT * FROM c
        WHERE c.status = @status
        ORDER BY c.name
      `,
      parameters: [{ name: '@status', value: status }],
    };

    const { resources } = await this.container.items.query<ServiceType>(q).fetchAll();
    return resources;
  }

  // Buscar service types por type
  async findByType(type: ServiceTypeType): Promise<ServiceType[]> {
    const q: SqlQuerySpec = {
      query: `
        SELECT * FROM c
        WHERE c.type = @type
        ORDER BY c.name
      `,
      parameters: [{ name: '@type', value: type }],
    };

    const { resources } = await this.container.items.query<ServiceType>(q).fetchAll();
    return resources;
  }

  // Buscar service types por status Y type
  async findByStatusAndType(status: ServiceTypeStatus, type: ServiceTypeType): Promise<ServiceType[]> {
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

    const { resources } = await this.container.items.query<ServiceType>(q).fetchAll();
    return resources;
  }

  async bulkImport(
    serviceTypes: ServiceType[]
  ): Promise<{ success: ServiceType[]; errors: { item: ServiceType; error: string }[] }> {
    const success: ServiceType[] = [];
    const errors: { item: ServiceType; error: string }[] = [];

    for (const item of serviceTypes) {
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

        // Check if item with same ID already exists
        const existing = await this.getById(item.id);
        if (existing) {
          errors.push({ item, error: `service type with id '${item.id}' already exists` });
          continue;
        }

        // Create the document with provided ID
        const doc: ServiceType = {
          id: item.id.trim(),
          name: item.name.trim(),
          description: item.description || '',
          status: item.status || 'Active',
          type: item.type || 'Service',
          createdAt: item.createdAt || nowIso(),
          updatedAt: item.updatedAt || nowIso(),
        };

        const cleanDoc = cleanUndefined(doc);
        await this.container.items.create(cleanDoc);
        success.push(cleanDoc);
      } catch (error: unknown) {
        errors.push({
          item,
          error: error instanceof Error ? error.message : 'Failed to create service type',
        });
      }
    }

    return { success, errors };
  }

  private generateId(): string {
    return `st_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

export const serviceTypeService = new ServiceTypeService();
