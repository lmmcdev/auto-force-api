import { SqlQuerySpec } from '@azure/cosmos';
import { getAlertsContainer } from '../../../infra/cosmos';
import { Alert, AlertType, AlertCategory, AlertReasons, AlertStatus } from '../entities/alert.entity';
import { CreateAlertDto } from '../dto/create-alert.dto';
import { UpdateAlertDto } from '../dto/update-alert.dto';
import { QueryAlertDto } from '../dto/query-alert.dto';

function nowIso() { return new Date().toISOString(); }

// Helper para remover campos undefined (Cosmos no acepta undefined, solo null)
function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  const cleaned: any = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    const value = obj[key];
    if (value !== undefined) {
      cleaned[key] = typeof value === 'object' ? cleanUndefined(value) : value;
    }
  }
  return cleaned;
}

export class AlertService {

  private get container() {
    return getAlertsContainer();
  }

  async create(payload: CreateAlertDto): Promise<Alert> {
    // Validate required fields
    if (!payload.type?.trim()) throw new Error('type is required');
    if (!payload.category?.trim()) throw new Error('category is required');
    if (!payload.reasons?.trim()) throw new Error('reasons is required');
    if (!payload.message?.trim()) throw new Error('message is required');

    const doc: Alert = {
      id: this.generateId(),
      type: payload.type.trim(),
      category: payload.category.trim(),
      vehicleId: payload.vehicleId?.trim(),
      lineItemId: payload.lineItemId?.trim(),
      invoiceId: payload.invoiceId?.trim(),
      serviceTypeId: payload.serviceTypeId?.trim(),
      validLineItem: payload.validLineItem?.trim(),
      reasons: payload.reasons.trim(),
      status: payload.status || 'Pending',
      message: payload.message.trim(),
      resolution: payload.resolution,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    const cleanDoc = cleanUndefined(doc);
    await this.container.items.create(cleanDoc);
    return cleanDoc;
  }

  async getById(id: string): Promise<Alert | null> {
    try {
      const { resource } = await this.container.item(id, id).read<Alert>();
      return resource ?? null;
    } catch {
      return null;
    }
  }

  async findAll(): Promise<Alert[]> {
    const query: SqlQuerySpec = {
      query: `SELECT * FROM c ORDER BY c.createdAt DESC`
    };
    const { resources } = await this.container.items.query(query).fetchAll();
    return resources;
  }

  async find(query: QueryAlertDto = {}): Promise<{ data: Alert[]; total: number }> {
    const take = Math.max(1, Math.min(query.take ?? 50, 1000));
    const skip = Math.max(0, query.skip ?? 0);

    // Build dynamic query
    let whereClause = 'WHERE 1=1';
    const parameters: any[] = [];

    if (query.type) {
      whereClause += ' AND c.type = @type';
      parameters.push({ name: '@type', value: query.type });
    }

    if (query.category) {
      whereClause += ' AND c.category = @category';
      parameters.push({ name: '@category', value: query.category });
    }

    if (query.vehicleId) {
      whereClause += ' AND c.vehicleId = @vehicleId';
      parameters.push({ name: '@vehicleId', value: query.vehicleId });
    }

    if (query.lineItemId) {
      whereClause += ' AND c.lineItemId = @lineItemId';
      parameters.push({ name: '@lineItemId', value: query.lineItemId });
    }

    if (query.invoiceId) {
      whereClause += ' AND c.invoiceId = @invoiceId';
      parameters.push({ name: '@invoiceId', value: query.invoiceId });
    }

    if (query.serviceTypeId) {
      whereClause += ' AND c.serviceTypeId = @serviceTypeId';
      parameters.push({ name: '@serviceTypeId', value: query.serviceTypeId });
    }

    if (query.validLineItem) {
      whereClause += ' AND c.validLineItem = @validLineItem';
      parameters.push({ name: '@validLineItem', value: query.validLineItem });
    }

    if (query.reasons) {
      whereClause += ' AND c.reasons = @reasons';
      parameters.push({ name: '@reasons', value: query.reasons });
    }

    if (query.status) {
      whereClause += ' AND c.status = @status';
      parameters.push({ name: '@status', value: query.status });
    }

    if (query.q && query.q.trim()) {
      whereClause += ' AND CONTAINS(LOWER(c.message), LOWER(@q))';
      parameters.push({ name: '@q', value: query.q.trim() });
    }

    if (query.createdFrom) {
      whereClause += ' AND c.createdAt >= @createdFrom';
      parameters.push({ name: '@createdFrom', value: query.createdFrom });
    }

    if (query.createdTo) {
      whereClause += ' AND c.createdAt <= @createdTo';
      parameters.push({ name: '@createdTo', value: query.createdTo });
    }

    if (query.hasResolution !== undefined) {
      if (query.hasResolution) {
        whereClause += ' AND IS_DEFINED(c.resolution)';
      } else {
        whereClause += ' AND NOT IS_DEFINED(c.resolution)';
      }
    }

    const q: SqlQuerySpec = {
      query: `SELECT * FROM c ${whereClause} ORDER BY c.createdAt DESC`,
      parameters: parameters
    };

    try {
      const { resources } = await this.container.items.query<Alert>(q).fetchAll();
      const total = resources.length;
      const data = resources.slice(skip, skip + take);

      return { data, total };
    } catch (error) {
      console.error('Cosmos DB query error:', error);
      // Fallback to simple query
      const fallbackQuery: SqlQuerySpec = {
        query: 'SELECT * FROM c ORDER BY c.createdAt DESC'
      };
      const { resources } = await this.container.items.query<Alert>(fallbackQuery).fetchAll();
      const total = resources.length;
      const data = resources.slice(skip, skip + take);

      return { data, total };
    }
  }

  async update(id: string, payload: UpdateAlertDto): Promise<Alert> {
    const current = await this.getById(id);
    if (!current) throw new Error('alert not found');

    const next: Alert = {
      ...current,
      ...payload,
      updatedAt: nowIso()
    };

    await this.container.item(id, id).replace(next);
    return next;
  }

  async delete(id: string): Promise<void> {
    const found = await this.getById(id);
    if (!found) throw new Error('alert not found');
    await this.container.item(id, id).delete();
  }

  // Find by type
  async findByType(type: AlertType): Promise<Alert[]> {
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.type = @type ORDER BY c.createdAt DESC',
      parameters: [{ name: '@type', value: type }]
    };
    const { resources } = await this.container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by category
  async findByCategory(category: AlertCategory): Promise<Alert[]> {
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.category = @category ORDER BY c.createdAt DESC',
      parameters: [{ name: '@category', value: category }]
    };
    const { resources } = await this.container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by vehicle ID
  async findByVehicleId(vehicleId: string): Promise<Alert[]> {
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.vehicleId = @vehicleId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@vehicleId', value: vehicleId }]
    };
    const { resources } = await this.container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by service type ID
  async findByServiceTypeId(serviceTypeId: string): Promise<Alert[]> {
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.serviceTypeId = @serviceTypeId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@serviceTypeId', value: serviceTypeId }]
    };
    const { resources } = await this.container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by status
  async findByStatus(status: AlertStatus): Promise<Alert[]> {
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.status = @status ORDER BY c.createdAt DESC',
      parameters: [{ name: '@status', value: status }]
    };
    const { resources } = await this.container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by service type ID, vehicle ID, and status (custom endpoint as requested)
  async findByServiceTypeAndVehicleAndStatus(serviceTypeId: string, vehicleId: string, status: AlertStatus): Promise<Alert[]> {
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.serviceTypeId = @serviceTypeId AND c.vehicleId = @vehicleId AND c.status = @status ORDER BY c.createdAt DESC',
      parameters: [
        { name: '@serviceTypeId', value: serviceTypeId },
        { name: '@vehicleId', value: vehicleId },
        { name: '@status', value: status }
      ]
    };
    const { resources } = await this.container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by line item ID
  async findByLineItemId(lineItemId: string): Promise<Alert[]> {
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.lineItemId = @lineItemId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@lineItemId', value: lineItemId }]
    };
    const { resources } = await this.container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by invoice ID
  async findByInvoiceId(invoiceId: string): Promise<Alert[]> {
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.invoiceId = @invoiceId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@invoiceId', value: invoiceId }]
    };
    const { resources } = await this.container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by reasons
  async findByReasons(reasons: AlertReasons): Promise<Alert[]> {
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.reasons = @reasons ORDER BY c.createdAt DESC',
      parameters: [{ name: '@reasons', value: reasons }]
    };
    const { resources } = await this.container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by valid line item ID
  async findByValidLineItem(validLineItem: string): Promise<Alert[]> {
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.validLineItem = @validLineItem ORDER BY c.createdAt DESC',
      parameters: [{ name: '@validLineItem', value: validLineItem }]
    };
    const { resources } = await this.container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Bulk import
  async bulkImport(alerts: Alert[]): Promise<{ success: Alert[]; errors: { item: any; error: string }[] }> {
    const success: Alert[] = [];
    const errors: { item: any; error: string }[] = [];

    for (const item of alerts) {
      try {
        // Validate required fields
        if (!item.id?.trim()) {
          errors.push({ item, error: 'id is required' });
          continue;
        }
        if (!item.type?.trim()) {
          errors.push({ item, error: 'type is required' });
          continue;
        }
        if (!item.category?.trim()) {
          errors.push({ item, error: 'category is required' });
          continue;
        }
        if (!item.reasons?.trim()) {
          errors.push({ item, error: 'reasons is required' });
          continue;
        }
        if (!item.message?.trim()) {
          errors.push({ item, error: 'message is required' });
          continue;
        }

        // Check if alert with same ID already exists
        const existingById = await this.getById(item.id);
        if (existingById) {
          errors.push({ item, error: `alert with id '${item.id}' already exists` });
          continue;
        }

        // Create the document with provided ID
        const doc: Alert = {
          ...item,
          id: item.id.trim(),
          type: item.type.trim(),
          category: item.category.trim(),
          vehicleId: item.vehicleId?.trim(),
          lineItemId: item.lineItemId?.trim(),
          invoiceId: item.invoiceId?.trim(),
          serviceTypeId: item.serviceTypeId?.trim(),
          validLineItem: item.validLineItem?.trim(),
          reasons: item.reasons.trim(),
          status: item.status || 'Pending',
          message: item.message.trim(),
          createdAt: item.createdAt || nowIso(),
          updatedAt: item.updatedAt || nowIso(),
        };

        const cleanDoc = cleanUndefined(doc);
        await this.container.items.create(cleanDoc);
        success.push(cleanDoc);
      } catch (error: any) {
        errors.push({
          item,
          error: error.message || 'Failed to create alert'
        });
      }
    }

    return { success, errors };
  }

  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

export const alertService = new AlertService();