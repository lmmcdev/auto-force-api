import { SqlQuerySpec } from '@azure/cosmos';
import { getLineItemsContainer, getInvoicesContainer, getServiceTypesContainer } from '../../../infra/cosmos';
import { LineItem, LineItemType } from '../entities/line-item.entity';
import { CreateLineItemDto } from '../dto/create-line-item.dto';
import { UpdateLineItemDto } from '../dto/update-line-item.dto';
import { QueryLineItemDto } from '../dto/query-line-item.dto';

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

export class LineItemService {

  private get container() {
    return getLineItemsContainer();
  }

  private get invoicesContainer() {
    return getInvoicesContainer();
  }

  private get serviceTypesContainer() {
    return getServiceTypesContainer();
  }

  async create(payload: Omit<LineItem, "id" | "totalPrice" | "createdAt" | "updatedAt">): Promise<LineItem> {
    // Validate required fields
    if (!payload.serviceTypeId?.trim()) throw new Error('serviceTypeId is required');
    if (!payload.invoiceId?.trim()) throw new Error('invoiceId is required');
    if (payload.unitPrice === undefined || payload.unitPrice < 0) {
      throw new Error('unitPrice is required and must be >= 0');
    }
    if (payload.quantity === undefined || payload.quantity <= 0) {
      throw new Error('quantity is required and must be > 0');
    }

    // Validate that service-type exists
    try {
      const serviceType = await this.serviceTypesContainer.item(payload.serviceTypeId, payload.serviceTypeId).read();
      if (!serviceType.resource) {
        throw new Error(`Service type with id '${payload.serviceTypeId}' not found`);
      }
    } catch (error) {
      throw new Error(`Service type with id '${payload.serviceTypeId}' not found`);
    }

    // Validate that invoice exists
    try {
      const invoice = await this.invoicesContainer.item(payload.invoiceId, payload.invoiceId).read();
      if (!invoice.resource) {
        throw new Error(`Invoice with id '${payload.invoiceId}' not found`);
      }
    } catch (error) {
      throw new Error(`Invoice with id '${payload.invoiceId}' not found`);
    }

    // Calculate total price
    const unitPrice = Number(payload.unitPrice.toFixed(2));
    const quantity = Number(payload.quantity.toFixed(2));
    const totalPrice = Number((unitPrice * quantity).toFixed(2));

    const doc: LineItem = {
      id: this.generateId(),
      serviceTypeId: payload.serviceTypeId.trim(),
      invoiceId: payload.invoiceId.trim(),
      unitPrice: unitPrice,
      quantity: quantity,
      totalPrice: totalPrice,
      type: payload.type || 'Parts',
      mileage: Math.floor(payload.mileage || 0), // Ensure integer
      taxable: payload.taxable ?? false,
      warrantyMileage: payload.warrantyMileage ? Math.floor(payload.warrantyMileage) : undefined,
      warrantyDate: payload.warrantyDate || undefined,
      warranty: payload.warranty ?? false,
      description: payload.description || '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    const cleanDoc = cleanUndefined(doc);
    await this.container.items.create(cleanDoc);
    return cleanDoc;
  }

  async getById(id: string): Promise<LineItem | null> {
    try {
      const { resource } = await this.container.item(id, id).read<LineItem>();
      return resource ?? null;
    } catch {
      return null;
    }
  }

  async findAll(): Promise<LineItem[]> {
    const query: SqlQuerySpec = {
      query: `SELECT * FROM c ORDER BY c.createdAt DESC`
    };
    const { resources } = await this.container.items.query(query).fetchAll();
    return resources;
  }

  async find(query: QueryLineItemDto = {}): Promise<{ data: LineItem[]; total: number }> {
    const take = Math.max(1, Math.min(query.take ?? 50, 1000));
    const skip = Math.max(0, query.skip ?? 0);

    // Build dynamic query
    let whereClause = 'WHERE 1=1';
    const parameters: any[] = [];

    if (query.serviceTypeId) {
      whereClause += ' AND c.serviceTypeId = @serviceTypeId';
      parameters.push({ name: '@serviceTypeId', value: query.serviceTypeId });
    }

    if (query.invoiceId) {
      whereClause += ' AND c.invoiceId = @invoiceId';
      parameters.push({ name: '@invoiceId', value: query.invoiceId });
    }

    if (query.type) {
      whereClause += ' AND c.type = @type';
      parameters.push({ name: '@type', value: query.type });
    }

    if (query.taxable !== undefined) {
      whereClause += ' AND c.taxable = @taxable';
      parameters.push({ name: '@taxable', value: query.taxable });
    }

    if (query.warranty !== undefined) {
      whereClause += ' AND c.warranty = @warranty';
      parameters.push({ name: '@warranty', value: query.warranty });
    }

    if (query.q && query.q.trim()) {
      whereClause += ' AND CONTAINS(LOWER(c.description), LOWER(@q))';
      parameters.push({ name: '@q', value: query.q.trim() });
    }

    if (query.minUnitPrice !== undefined) {
      whereClause += ' AND c.unitPrice >= @minUnitPrice';
      parameters.push({ name: '@minUnitPrice', value: query.minUnitPrice });
    }

    if (query.maxUnitPrice !== undefined) {
      whereClause += ' AND c.unitPrice <= @maxUnitPrice';
      parameters.push({ name: '@maxUnitPrice', value: query.maxUnitPrice });
    }

    if (query.minQuantity !== undefined) {
      whereClause += ' AND c.quantity >= @minQuantity';
      parameters.push({ name: '@minQuantity', value: query.minQuantity });
    }

    if (query.maxQuantity !== undefined) {
      whereClause += ' AND c.quantity <= @maxQuantity';
      parameters.push({ name: '@maxQuantity', value: query.maxQuantity });
    }

    if (query.minTotalPrice !== undefined) {
      whereClause += ' AND c.totalPrice >= @minTotalPrice';
      parameters.push({ name: '@minTotalPrice', value: query.minTotalPrice });
    }

    if (query.maxTotalPrice !== undefined) {
      whereClause += ' AND c.totalPrice <= @maxTotalPrice';
      parameters.push({ name: '@maxTotalPrice', value: query.maxTotalPrice });
    }

    if (query.minMileage !== undefined) {
      whereClause += ' AND c.mileage >= @minMileage';
      parameters.push({ name: '@minMileage', value: query.minMileage });
    }

    if (query.maxMileage !== undefined) {
      whereClause += ' AND c.mileage <= @maxMileage';
      parameters.push({ name: '@maxMileage', value: query.maxMileage });
    }

    const q: SqlQuerySpec = {
      query: `SELECT * FROM c ${whereClause} ORDER BY c.createdAt DESC`,
      parameters: parameters
    };

    try {
      const { resources } = await this.container.items.query<LineItem>(q).fetchAll();
      const total = resources.length;
      const data = resources.slice(skip, skip + take);

      return { data, total };
    } catch (error) {
      console.error('Cosmos DB query error:', error);
      // Fallback to simple query
      const fallbackQuery: SqlQuerySpec = {
        query: 'SELECT * FROM c ORDER BY c.createdAt DESC'
      };
      const { resources } = await this.container.items.query<LineItem>(fallbackQuery).fetchAll();
      const total = resources.length;
      const data = resources.slice(skip, skip + take);

      return { data, total };
    }
  }

  async update(id: string, payload: UpdateLineItemDto): Promise<LineItem> {
    const current = await this.getById(id);
    if (!current) throw new Error('line item not found');

    // Validate service-type exists if changing serviceTypeId
    if (payload.serviceTypeId && payload.serviceTypeId !== current.serviceTypeId) {
      try {
        const serviceType = await this.serviceTypesContainer.item(payload.serviceTypeId, payload.serviceTypeId).read();
        if (!serviceType.resource) {
          throw new Error(`Service type with id '${payload.serviceTypeId}' not found`);
        }
      } catch (error) {
        throw new Error(`Service type with id '${payload.serviceTypeId}' not found`);
      }
    }

    // Validate invoice exists if changing invoiceId
    if (payload.invoiceId && payload.invoiceId !== current.invoiceId) {
      try {
        const invoice = await this.invoicesContainer.item(payload.invoiceId, payload.invoiceId).read();
        if (!invoice.resource) {
          throw new Error(`Invoice with id '${payload.invoiceId}' not found`);
        }
      } catch (error) {
        throw new Error(`Invoice with id '${payload.invoiceId}' not found`);
      }
    }

    // Calculate new total price if unit price or quantity changed
    const unitPrice = payload.unitPrice !== undefined ? Number(payload.unitPrice.toFixed(2)) : current.unitPrice;
    const quantity = payload.quantity !== undefined ? Number(payload.quantity.toFixed(2)) : current.quantity;
    const totalPrice = Number((unitPrice * quantity).toFixed(2));

    const next: LineItem = {
      ...current,
      ...payload,
      unitPrice: unitPrice,
      quantity: quantity,
      totalPrice: totalPrice,
      mileage: payload.mileage !== undefined ? Math.floor(payload.mileage) : current.mileage,
      warrantyMileage: payload.warrantyMileage !== undefined ? Math.floor(payload.warrantyMileage) : current.warrantyMileage,
      updatedAt: nowIso()
    };

    await this.container.item(id, id).replace(next);
    return next;
  }

  async delete(id: string): Promise<void> {
    const found = await this.getById(id);
    if (!found) throw new Error('line item not found');
    await this.container.item(id, id).delete();
  }

  // Find by invoice ID
  async findByInvoiceId(invoiceId: string): Promise<LineItem[]> {
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.invoiceId = @invoiceId ORDER BY c.createdAt ASC',
      parameters: [{ name: '@invoiceId', value: invoiceId }]
    };
    const { resources } = await this.container.items.query<LineItem>(q).fetchAll();
    return resources;
  }

  // Find by service type ID
  async findByServiceTypeId(serviceTypeId: string): Promise<LineItem[]> {
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.serviceTypeId = @serviceTypeId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@serviceTypeId', value: serviceTypeId }]
    };
    const { resources } = await this.container.items.query<LineItem>(q).fetchAll();
    return resources;
  }

  // Find by type (Parts or Labor)
  async findByType(type: LineItemType): Promise<LineItem[]> {
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.type = @type ORDER BY c.createdAt DESC',
      parameters: [{ name: '@type', value: type }]
    };
    const { resources } = await this.container.items.query<LineItem>(q).fetchAll();
    return resources;
  }

  // Find taxable items
  async findTaxable(taxable: boolean): Promise<LineItem[]> {
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.taxable = @taxable ORDER BY c.createdAt DESC',
      parameters: [{ name: '@taxable', value: taxable }]
    };
    const { resources } = await this.container.items.query<LineItem>(q).fetchAll();
    return resources;
  }

  // Find warranty items
  async findWithWarranty(warranty: boolean): Promise<LineItem[]> {
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.warranty = @warranty ORDER BY c.createdAt DESC',
      parameters: [{ name: '@warranty', value: warranty }]
    };
    const { resources } = await this.container.items.query<LineItem>(q).fetchAll();
    return resources;
  }

  // Bulk import
  async bulkImport(lineItems: LineItem[]): Promise<{ success: LineItem[]; errors: { item: any; error: string }[] }> {
    const success: LineItem[] = [];
    const errors: { item: any; error: string }[] = [];

    for (const item of lineItems) {
      try {
        // Validate required fields
        if (!item.id?.trim()) {
          errors.push({ item, error: 'id is required' });
          continue;
        }
        if (!item.serviceTypeId?.trim()) {
          errors.push({ item, error: 'serviceTypeId is required' });
          continue;
        }
        if (!item.invoiceId?.trim()) {
          errors.push({ item, error: 'invoiceId is required' });
          continue;
        }
        if (item.unitPrice === undefined || item.unitPrice < 0) {
          errors.push({ item, error: 'unitPrice is required and must be >= 0' });
          continue;
        }
        if (item.quantity === undefined || item.quantity <= 0) {
          errors.push({ item, error: 'quantity is required and must be > 0' });
          continue;
        }

        // Check if line item with same ID already exists
        const existingById = await this.getById(item.id);
        if (existingById) {
          errors.push({ item, error: `line item with id '${item.id}' already exists` });
          continue;
        }

        // Calculate total price
        const unitPrice = Number(item.unitPrice.toFixed(2));
        const quantity = Number(item.quantity.toFixed(2));
        const totalPrice = Number((unitPrice * quantity).toFixed(2));

        // Create the document with provided ID
        const doc: LineItem = {
          ...item,
          id: item.id.trim(),
          serviceTypeId: item.serviceTypeId.trim(),
          invoiceId: item.invoiceId.trim(),
          unitPrice: unitPrice,
          quantity: quantity,
          totalPrice: totalPrice,
          mileage: Math.floor(item.mileage || 0),
          warrantyMileage: item.warrantyMileage ? Math.floor(item.warrantyMileage) : undefined,
          description: item.description || '',
          createdAt: item.createdAt || nowIso(),
          updatedAt: item.updatedAt || nowIso(),
        };

        const cleanDoc = cleanUndefined(doc);
        await this.container.items.create(cleanDoc);
        success.push(cleanDoc);
      } catch (error: any) {
        errors.push({
          item,
          error: error.message || 'Failed to create line item'
        });
      }
    }

    return { success, errors };
  }

  private generateId(): string {
    return `li_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

export const lineItemService = new LineItemService();