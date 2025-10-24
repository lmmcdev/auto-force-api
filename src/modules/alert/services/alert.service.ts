import { SqlQuerySpec } from '@azure/cosmos';
import { getAlertsContainer } from '../../../infra/cosmos';
import { Alert, AlertType, AlertCategory, AlertReasons, AlertStatus } from '../entities/alert.entity';
import { CreateAlertDto } from '../dto/create-alert.dto';
import { UpdateAlertDto } from '../dto/update-alert.dto';
import { QueryAlertDto } from '../dto/query-alert.dto';
import { invoiceService } from '../../invoice/services/invoice.service';

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

export class AlertService {
  private async getContainer() {
    return await getAlertsContainer();
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
    const container = await this.getContainer();
    await container.items.create(cleanDoc);

    // Check if alert has invoiceId and change invoice status if needed
    if (cleanDoc.invoiceId) {
      try {
        const currentStatus = await invoiceService.getStatusById(cleanDoc.invoiceId);
        if (currentStatus === 'Draft') {
          await invoiceService.changeStatusToPendingAlertReview(cleanDoc.invoiceId);
          console.log(
            `Changed invoice ${cleanDoc.invoiceId} status from Draft to PendingAlertReview due to alert creation`
          );
        }
      } catch (error) {
        console.error(`Failed to change invoice status for invoice ${cleanDoc.invoiceId}:`, error);
        // Don't throw error - alert was created successfully
      }
    }

    return cleanDoc;
  }

  async getById(id: string): Promise<Alert | null> {
    try {
      const container = await this.getContainer();
      const { resource } = await container.item(id, id).read<Alert>();
      return resource ?? null;
    } catch {
      return null;
    }
  }

  async findAll(): Promise<Alert[]> {
    const container = await this.getContainer();
    const query: SqlQuerySpec = {
      query: `SELECT * FROM c ORDER BY c.createdAt DESC`,
    };
    const { resources } = await container.items.query(query).fetchAll();
    return resources;
  }

  async find(query: QueryAlertDto = {}): Promise<{ data: Alert[]; total: number }> {
    const take = Math.max(1, Math.min(query.take ?? 50, 1000));
    const skip = Math.max(0, query.skip ?? 0);

    // Build dynamic query
    let whereClause = 'WHERE 1=1';
    const parameters: { name: string; value: string | boolean }[] = [];

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
      parameters: parameters,
    };

    const container = await this.getContainer();
    try {
      const { resources } = await container.items.query<Alert>(q).fetchAll();
      const total = resources.length;
      const data = resources.slice(skip, skip + take);

      return { data, total };
    } catch (error) {
      console.error('Cosmos DB query error:', error);
      // Fallback to simple query
      const fallbackQuery: SqlQuerySpec = {
        query: 'SELECT * FROM c ORDER BY c.createdAt DESC',
      };
      const { resources } = await container.items.query<Alert>(fallbackQuery).fetchAll();
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
      updatedAt: nowIso(),
    };

    const container = await this.getContainer();
    await container.item(id, id).replace(next);

    // Handle status changes and invoice status updates
    if (payload.status && payload.status !== current.status && next.invoiceId) {
      const statusChangedFromPending =
        current.status === 'Pending' && ['Acknowledged', 'Overridden', 'Resolved'].includes(payload.status);

      const statusChangedToPending = payload.status === 'Pending' && current.status !== 'Pending';

      if (statusChangedFromPending) {
        // Check if invoice should be changed back to Draft
        await this.checkAndChangeInvoiceStatusToDraft(next.invoiceId);
      } else if (statusChangedToPending) {
        // Change invoice status to PendingAlertReview
        try {
          await invoiceService.changeStatusToPendingAlertReview(next.invoiceId);
          console.log(
            `Changed invoice ${next.invoiceId} status to PendingAlertReview due to alert status change to Pending`
          );
        } catch (error) {
          console.error(`Failed to change invoice status for invoice ${next.invoiceId}:`, error);
          // Don't throw error - alert was updated successfully
        }
      }
    }

    return next;
  }

  async delete(id: string): Promise<void> {
    const found = await this.getById(id);
    if (!found) throw new Error('alert not found');

    const invoiceId = found.invoiceId; // Store invoiceId before deletion
    const container = await this.getContainer();
    await container.item(id, id).delete();

    // Check if invoice should be changed back to Draft
    await this.checkAndChangeInvoiceStatusToDraft(invoiceId);
  }

  // Find by type
  async findByType(type: AlertType): Promise<Alert[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.type = @type ORDER BY c.createdAt DESC',
      parameters: [{ name: '@type', value: type }],
    };
    const { resources } = await container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by category
  async findByCategory(category: AlertCategory): Promise<Alert[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.category = @category ORDER BY c.createdAt DESC',
      parameters: [{ name: '@category', value: category }],
    };
    const { resources } = await container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by vehicle ID
  async findByVehicleId(vehicleId: string): Promise<Alert[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.vehicleId = @vehicleId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@vehicleId', value: vehicleId }],
    };
    const { resources } = await container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by service type ID
  async findByServiceTypeId(serviceTypeId: string): Promise<Alert[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.serviceTypeId = @serviceTypeId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@serviceTypeId', value: serviceTypeId }],
    };
    const { resources } = await container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by status
  async findByStatus(status: AlertStatus): Promise<Alert[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.status = @status ORDER BY c.createdAt DESC',
      parameters: [{ name: '@status', value: status }],
    };
    const { resources } = await container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by service type ID, vehicle ID, and status (custom endpoint as requested)
  async findByServiceTypeAndVehicleAndStatus(
    serviceTypeId: string,
    vehicleId: string,
    status: AlertStatus
  ): Promise<Alert[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query:
        'SELECT * FROM c WHERE c.serviceTypeId = @serviceTypeId AND c.vehicleId = @vehicleId AND c.status = @status ORDER BY c.createdAt DESC',
      parameters: [
        { name: '@serviceTypeId', value: serviceTypeId },
        { name: '@vehicleId', value: vehicleId },
        { name: '@status', value: status },
      ],
    };
    const { resources } = await container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by line item ID
  async findByLineItemId(lineItemId: string): Promise<Alert[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.lineItemId = @lineItemId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@lineItemId', value: lineItemId }],
    };
    const { resources } = await container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by invoice ID
  async findByInvoiceId(invoiceId: string): Promise<Alert[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.invoiceId = @invoiceId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@invoiceId', value: invoiceId }],
    };
    const { resources } = await container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by invoice ID and status
  async getAlertsByInvoiceIdAndStatus(invoiceId: string, status: AlertStatus): Promise<Alert[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.invoiceId = @invoiceId AND c.status = @status ORDER BY c.createdAt DESC',
      parameters: [
        { name: '@invoiceId', value: invoiceId },
        { name: '@status', value: status },
      ],
    };
    const { resources } = await container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by reasons
  async findByReasons(reasons: AlertReasons): Promise<Alert[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.reasons = @reasons ORDER BY c.createdAt DESC',
      parameters: [{ name: '@reasons', value: reasons }],
    };
    const { resources } = await container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Find by valid line item ID
  async findByValidLineItem(validLineItem: string): Promise<Alert[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.validLineItem = @validLineItem ORDER BY c.createdAt DESC',
      parameters: [{ name: '@validLineItem', value: validLineItem }],
    };
    const { resources } = await container.items.query<Alert>(q).fetchAll();
    return resources;
  }

  // Bulk import
  async bulkImport(alerts: Alert[]): Promise<{ success: Alert[]; errors: { item: Alert; error: string }[] }> {
    const success: Alert[] = [];
    const errors: { item: Alert; error: string }[] = [];

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
        const container = await this.getContainer();
        await container.items.create(cleanDoc);
        success.push(cleanDoc);
      } catch (error: unknown) {
        errors.push({
          item,
          error: error instanceof Error ? error.message : 'Failed to create alert',
        });
      }
    }

    return { success, errors };
  }

  // Helper method to check if invoice should be changed back to Draft
  private async checkAndChangeInvoiceStatusToDraft(invoiceId: string | undefined): Promise<void> {
    if (!invoiceId) return;

    try {
      // Get all alerts for this invoice
      const alerts = await this.findByInvoiceId(invoiceId);

      // Check if there are any pending alerts
      const pendingAlerts = alerts.filter(alert => alert.status === 'Pending');

      // If no pending alerts remain, change invoice status back to Draft
      if (pendingAlerts.length === 0) {
        await invoiceService.changeStatusToDraft(invoiceId);
        console.log(`Changed invoice ${invoiceId} status back to Draft - no pending alerts remaining`);
      }
    } catch (error) {
      console.error(`Failed to check/change invoice status for invoice ${invoiceId}:`, error);
      // Don't throw error - alert operation should not fail due to status change issues
    }
  }

  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

export const alertService = new AlertService();
