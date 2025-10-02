import { SqlQuerySpec } from '@azure/cosmos';
import { getInvoicesContainer, getVehiclesContainer, getVendorsContainer, getLineItemsContainer } from '../../../infra/cosmos';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import { QueryInvoiceDto } from '../dto/query-invoice.dto';

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

export class InvoiceService {

  private get container() {
    return getInvoicesContainer();
  }

  private get vehiclesContainer() {
    return getVehiclesContainer();
  }

  private get vendorsContainer() {
    return getVendorsContainer();
  }

  private get lineItemsContainer() {
    return getLineItemsContainer();
  }

  async create(payload: Omit<Invoice, "id" | "createdAt" | "updatedAt">): Promise<Invoice> {
    // Validate required fields
    if (!payload.vehicleId?.trim()) throw new Error('vehicleId is required');
    if (!payload.vendorId?.trim()) throw new Error('vendorId is required');
    if (!payload.invoiceNumber?.trim()) throw new Error('invoiceNumber is required');
    if (!payload.orderStartDate?.trim()) throw new Error('orderStartDate is required');
    if (!payload.uploadDate?.trim()) throw new Error('uploadDate is required');
    if (payload.invoiceAmount === undefined || payload.invoiceAmount < 0) {
      throw new Error('invoiceAmount is required and must be >= 0');
    }

    // Validate that vehicle exists
    const vehicle = await this.vehiclesContainer.item(payload.vehicleId, payload.vehicleId).read();
    if (!vehicle.resource) {
      throw new Error(`Vehicle with id '${payload.vehicleId}' not found`);
    }

    // Validate that vendor exists
    const vendor = await this.vendorsContainer.item(payload.vendorId, payload.vendorId).read();
    if (!vendor.resource) {
      throw new Error(`Vendor with id '${payload.vendorId}' not found`);
    }

    // Check for duplicate invoice number
    const query: SqlQuerySpec = {
      query: 'SELECT TOP 1 * FROM c WHERE c.invoiceNumber = @invoiceNumber',
      parameters: [{ name: '@invoiceNumber', value: payload.invoiceNumber }]
    };
    const { resources } = await this.container.items.query<Invoice>(query).fetchAll();
    if (resources.length > 0) {
      throw new Error('invoice with same invoice number already exists');
    }

    const doc: Invoice = {
      id: this.generateId(),
      vehicleId: payload.vehicleId.trim(),
      vendorId: payload.vendorId.trim(),
      invoiceNumber: payload.invoiceNumber.trim(),
      orderStartDate: payload.orderStartDate,
      uploadDate: payload.uploadDate,
      invoiceAmount: Number(payload.invoiceAmount.toFixed(2)),
      subTotal: Number(payload.subTotal.toFixed(2)),
      status: payload.status || 'Draft',
      tax: Number((payload.tax || 0).toFixed(2)),
      description: payload.description || '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    const cleanDoc = cleanUndefined(doc);
    await this.container.items.create(cleanDoc);
    return cleanDoc;
  }

  async getById(id: string): Promise<Invoice | null> {
    try {
      const { resource } = await this.container.item(id, id).read<Invoice>();
      return resource ?? null;
    } catch {
      return null;
    }
  }

  async findAll(): Promise<Invoice[]> {
    const query: SqlQuerySpec = {
      query: `SELECT * FROM c ORDER BY c.uploadDate DESC`
    };
    const { resources } = await this.container.items.query(query).fetchAll();
    return resources;
  }

  async find(query: QueryInvoiceDto = {}): Promise<{ data: Invoice[]; total: number }> {
    const take = Math.max(1, Math.min(query.take ?? 50, 1000));
    const skip = Math.max(0, query.skip ?? 0);

    // Build dynamic query
    let whereClause = 'WHERE 1=1';
    const parameters: any[] = [];

    if (query.vehicleId) {
      whereClause += ' AND c.vehicleId = @vehicleId';
      parameters.push({ name: '@vehicleId', value: query.vehicleId });
    }

    if (query.vendorId) {
      whereClause += ' AND c.vendorId = @vendorId';
      parameters.push({ name: '@vendorId', value: query.vendorId });
    }

    if (query.status) {
      whereClause += ' AND c.status = @status';
      parameters.push({ name: '@status', value: query.status });
    }

    if (query.invoiceNumber) {
      whereClause += ' AND c.invoiceNumber = @invoiceNumber';
      parameters.push({ name: '@invoiceNumber', value: query.invoiceNumber });
    }

    if (query.q && query.q.trim()) {
      whereClause += ' AND (CONTAINS(LOWER(c.invoiceNumber), LOWER(@q)) OR CONTAINS(LOWER(c.description), LOWER(@q)))';
      parameters.push({ name: '@q', value: query.q.trim() });
    }

    if (query.orderStartDateFrom) {
      whereClause += ' AND c.orderStartDate >= @orderStartDateFrom';
      parameters.push({ name: '@orderStartDateFrom', value: query.orderStartDateFrom });
    }

    if (query.orderStartDateTo) {
      whereClause += ' AND c.orderStartDate <= @orderStartDateTo';
      parameters.push({ name: '@orderStartDateTo', value: query.orderStartDateTo });
    }

    if (query.uploadDateFrom) {
      whereClause += ' AND c.uploadDate >= @uploadDateFrom';
      parameters.push({ name: '@uploadDateFrom', value: query.uploadDateFrom });
    }

    if (query.uploadDateTo) {
      whereClause += ' AND c.uploadDate <= @uploadDateTo';
      parameters.push({ name: '@uploadDateTo', value: query.uploadDateTo });
    }

    if (query.minAmount !== undefined) {
      whereClause += ' AND c.invoiceAmount >= @minAmount';
      parameters.push({ name: '@minAmount', value: query.minAmount });
    }

    if (query.maxAmount !== undefined) {
      whereClause += ' AND c.invoiceAmount <= @maxAmount';
      parameters.push({ name: '@maxAmount', value: query.maxAmount });
    }

    const q: SqlQuerySpec = {
      query: `SELECT * FROM c ${whereClause} ORDER BY c.uploadDate DESC`,
      parameters: parameters
    };

    try {
      const { resources } = await this.container.items.query<Invoice>(q).fetchAll();
      const total = resources.length;
      const data = resources.slice(skip, skip + take);

      return { data, total };
    } catch (error) {
      console.error('Cosmos DB query error:', error);
      // Fallback to simple query
      const fallbackQuery: SqlQuerySpec = {
        query: 'SELECT * FROM c ORDER BY c.uploadDate DESC'
      };
      const { resources } = await this.container.items.query<Invoice>(fallbackQuery).fetchAll();
      const total = resources.length;
      const data = resources.slice(skip, skip + take);

      return { data, total };
    }
  }

  async update(id: string, payload: UpdateInvoiceDto): Promise<Invoice> {
    const current = await this.getById(id);
    if (!current) throw new Error('invoice not found');

    // Validate vehicle exists if changing vehicleId
    if (payload.vehicleId && payload.vehicleId !== current.vehicleId) {
      const vehicle = await this.vehiclesContainer.item(payload.vehicleId, payload.vehicleId).read();
      if (!vehicle.resource) {
        throw new Error(`Vehicle with id '${payload.vehicleId}' not found`);
      }
    }

    // Validate vendor exists if changing vendorId
    if (payload.vendorId && payload.vendorId !== current.vendorId) {
      const vendor = await this.vendorsContainer.item(payload.vendorId, payload.vendorId).read();
      if (!vendor.resource) {
        throw new Error(`Vendor with id '${payload.vendorId}' not found`);
      }
    }

    // Validate invoice number uniqueness if changing
    if (payload.invoiceNumber && payload.invoiceNumber.trim() !== current.invoiceNumber) {
      const existing = await this.findByInvoiceNumber(payload.invoiceNumber);
      if (existing && existing.id !== id) {
        throw new Error('invoice with same invoice number already exists');
      }
    }

    // Check if vehicleId or vendorId is changing
    const vehicleIdChanged = payload.vehicleId && payload.vehicleId !== current.vehicleId;
    const vendorIdChanged = payload.vendorId && payload.vendorId !== current.vendorId;

    const next: Invoice = {
      ...current,
      ...payload,
      invoiceAmount: payload.invoiceAmount !== undefined ? Number(payload.invoiceAmount.toFixed(2)) : current.invoiceAmount,
      tax: payload.tax !== undefined ? Number(payload.tax.toFixed(2)) : current.tax,
      updatedAt: nowIso()
    };

    await this.container.item(id, id).replace(next);

    // Update line items' vehicleId and vendorId if they changed
    if (vehicleIdChanged || vendorIdChanged) {
      try {
        await this.updateLineItemsFields(
          id,
          vehicleIdChanged ? next.vehicleId : undefined,
          vendorIdChanged ? next.vendorId : undefined
        );
      } catch (error) {
        console.error(`Failed to update line items fields for invoice ${id}:`, error);
        // Don't throw error - invoice was updated successfully
      }
    }

    return next;
  }

  async delete(id: string): Promise<void> {
    const found = await this.getById(id);
    if (!found) throw new Error('invoice not found');
    await this.container.item(id, id).delete();
  }

  // Find by invoice number
  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    const q: SqlQuerySpec = {
      query: 'SELECT TOP 1 * FROM c WHERE c.invoiceNumber = @invoiceNumber',
      parameters: [{ name: '@invoiceNumber', value: invoiceNumber }]
    };
    const { resources } = await this.container.items.query<Invoice>(q).fetchAll();
    return resources[0] ?? null;
  }

  // Find by vehicle ID
  async findByVehicleId(vehicleId: string): Promise<Invoice[]> {
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.vehicleId = @vehicleId ORDER BY c.uploadDate DESC',
      parameters: [{ name: '@vehicleId', value: vehicleId }]
    };
    const { resources } = await this.container.items.query<Invoice>(q).fetchAll();
    return resources;
  }

  // Find by vendor ID
  async findByVendorId(vendorId: string): Promise<Invoice[]> {
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.vendorId = @vendorId ORDER BY c.uploadDate DESC',
      parameters: [{ name: '@vendorId', value: vendorId }]
    };
    const { resources } = await this.container.items.query<Invoice>(q).fetchAll();
    return resources;
  }

  // Find by status
  async findByStatus(status: InvoiceStatus): Promise<Invoice[]> {
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.status = @status ORDER BY c.uploadDate DESC',
      parameters: [{ name: '@status', value: status }]
    };
    const { resources } = await this.container.items.query<Invoice>(q).fetchAll();
    return resources;
  }

  // Bulk import
  async bulkImport(invoices: Invoice[]): Promise<{ success: Invoice[]; errors: { item: any; error: string }[] }> {
    const success: Invoice[] = [];
    const errors: { item: any; error: string }[] = [];

    for (const item of invoices) {
      try {
        // Validate required fields
        if (!item.id?.trim()) {
          errors.push({ item, error: 'id is required' });
          continue;
        }
        if (!item.vehicleId?.trim()) {
          errors.push({ item, error: 'vehicleId is required' });
          continue;
        }
        if (!item.vendorId?.trim()) {
          errors.push({ item, error: 'vendorId is required' });
          continue;
        }
        if (!item.invoiceNumber?.trim()) {
          errors.push({ item, error: 'invoiceNumber is required' });
          continue;
        }

        // Check if invoice with same ID already exists
        const existingById = await this.getById(item.id);
        if (existingById) {
          errors.push({ item, error: `invoice with id '${item.id}' already exists` });
          continue;
        }

        // Check if invoice with same invoice number already exists
        const existingByNumber = await this.findByInvoiceNumber(item.invoiceNumber);
        if (existingByNumber) {
          errors.push({ item, error: `invoice with invoice number '${item.invoiceNumber}' already exists` });
          continue;
        }

        // Create the document with provided ID
        const doc: Invoice = {
          ...item,
          id: item.id.trim(),
          vehicleId: item.vehicleId.trim(),
          vendorId: item.vendorId.trim(),
          invoiceNumber: item.invoiceNumber.trim(),
          invoiceAmount: Number((item.invoiceAmount || 0).toFixed(2)),
          tax: Number((item.tax || 0).toFixed(2)),
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
          error: error.message || 'Failed to create invoice'
        });
      }
    }

    return { success, errors };
  }

  // Update all line items' vehicleId and vendorId fields when invoice changes
  async updateLineItemsFields(id: string, vehicleId?: string, vendorId?: string): Promise<void> {
    // Get all line items for this invoice
    const lineItemsQuery: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.invoiceId = @invoiceId',
      parameters: [{ name: '@invoiceId', value: id }]
    };

    const { resources: lineItems } = await this.lineItemsContainer.items.query(lineItemsQuery).fetchAll();

    // Update each line item if vehicleId or vendorId was provided
    for (const lineItem of lineItems) {
      let needsUpdate = false;
      const updatedLineItem = { ...lineItem };

      if (vehicleId !== undefined && lineItem.vehicleId !== vehicleId) {
        updatedLineItem.vehicleId = vehicleId;
        needsUpdate = true;
      }

      if (vendorId !== undefined && lineItem.vendorId !== vendorId) {
        updatedLineItem.vendorId = vendorId;
        needsUpdate = true;
      }

      if (needsUpdate) {
        updatedLineItem.updatedAt = nowIso();
        await this.lineItemsContainer.item(lineItem.id, lineItem.id).replace(updatedLineItem);
      }
    }
  }

  // Update invoice amount by calculating sum of all line items' total prices
  async updateInvoiceAmount(id: string): Promise<Invoice> {
    // Validate that invoice exists
    const invoice = await this.getById(id);
    if (!invoice) {
      throw new Error(`Invoice with id '${id}' not found`);
    }

    // Get all line items for this invoice
    const lineItemsQuery: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.invoiceId = @invoiceId',
      parameters: [{ name: '@invoiceId', value: id }]
    };

    const { resources: lineItems } = await this.lineItemsContainer.items.query(lineItemsQuery).fetchAll();

    // Calculate subTotal from all line items
    const subTotal = lineItems.reduce((sum, lineItem) => {
      return sum + (lineItem.totalPrice || 0);
    }, 0);

    // Calculate tax from taxable line items only
    const taxableTotal = lineItems.reduce((sum, lineItem) => {
      if (lineItem.taxable === true) {
        return sum + (lineItem.totalPrice || 0);
      }
      return sum;
    }, 0);

    // Assuming a default tax rate - you might want to make this configurable
    // For now, using the existing tax rate or calculating as a percentage
    // If you have a specific tax rate, replace this calculation
    const taxRate = 0.07; // 7% tax rate - adjust as needed
    const calculatedTax = taxableTotal * taxRate;

    // Format amounts to 2 decimal places
    const formattedSubTotal = Number(subTotal.toFixed(2));
    const formattedTax = Number(calculatedTax.toFixed(2));
    const formattedInvoiceAmount = Number((formattedSubTotal + formattedTax).toFixed(2));

    // Update the invoice with calculated amounts
    const updatedInvoice: Invoice = {
      ...invoice,
      invoiceAmount: formattedInvoiceAmount, // subTotal + tax
      tax: formattedTax,                    // calculated tax from taxable items
      subTotal : formattedSubTotal,
      updatedAt: nowIso()
    };

    // Save the updated invoice
    await this.container.item(id, id).replace(updatedInvoice);

    return updatedInvoice;
  }

  // Get order start date by invoice ID
  async getOrderStartDate(id: string): Promise<string | null> {
    const invoice = await this.getById(id);
    if (!invoice) {
      return null;
    }
    return invoice.orderStartDate;
  }

  private generateId(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

export const invoiceService = new InvoiceService();