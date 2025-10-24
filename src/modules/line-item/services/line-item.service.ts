import { SqlQuerySpec } from '@azure/cosmos';
import { getLineItemsContainer, getInvoicesContainer, getServiceTypesContainer } from '../../../infra/cosmos';
import { LineItem, LineItemType } from '../entities/line-item.entity';
import { UpdateLineItemDto } from '../dto/update-line-item.dto';
import { QueryLineItemDto } from '../dto/query-line-item.dto';
import { invoiceService } from '../../invoice/services/invoice.service';
import { alertService } from '../../alert/services/alert.service';

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

export class LineItemService {
  private async getContainer() {
    return await getLineItemsContainer();
  }

  private async getInvoicesContainer() {
    return await getInvoicesContainer();
  }

  private async getServiceTypesContainer() {
    return await getServiceTypesContainer();
  }

  async create(payload: Omit<LineItem, 'id' | 'totalPrice' | 'createdAt' | 'updatedAt'>): Promise<LineItem> {
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
      const serviceTypesContainer = await this.getServiceTypesContainer();
      const serviceType = await serviceTypesContainer.item(payload.serviceTypeId, payload.serviceTypeId).read();
      if (!serviceType.resource) {
        throw new Error(`Service type with id '${payload.serviceTypeId}' not found`);
      }
    } catch {
      throw new Error(`Service type with id '${payload.serviceTypeId}' not found`);
    }

    // Validate that invoice exists and get vehicleId/vendorId
    let invoiceData;
    try {
      const invoicesContainer = await this.getInvoicesContainer();
      const invoice = await invoicesContainer.item(payload.invoiceId, payload.invoiceId).read();
      if (!invoice.resource) {
        throw new Error(`Invoice with id '${payload.invoiceId}' not found`);
      }
      invoiceData = invoice.resource;
    } catch {
      throw new Error(`Invoice with id '${payload.invoiceId}' not found`);
    }

    // Validate invoice status
    await this.validateInvoiceStatus(payload.invoiceId);

    // Calculate total price
    const unitPrice = Number(payload.unitPrice.toFixed(2));
    const quantity = Number(payload.quantity.toFixed(2));
    const totalPrice = Number((unitPrice * quantity).toFixed(2));

    const doc: LineItem = {
      id: this.generateId(),
      serviceTypeId: payload.serviceTypeId.trim(),
      invoiceId: payload.invoiceId.trim(),
      vehicleId: invoiceData.vehicleId || '', // Auto-populate from invoice
      vendorId: invoiceData.vendorId || '', // Auto-populate from invoice
      unitPrice: unitPrice,
      quantity: quantity,
      totalPrice: totalPrice,
      type: payload.type || 'Labor',
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
    const container = await this.getContainer();
    await container.items.create(cleanDoc);

    // Update the invoice amount automatically
    try {
      await invoiceService.updateInvoiceAmount(payload.invoiceId);
    } catch (error) {
      console.error(`Failed to update invoice amount for invoice ${payload.invoiceId}:`, error);
      // Don't throw error - line item was created successfully
    }

    // Check warranty date and create alert if needed
    try {
      await this.checkWarrantyDate(doc.vehicleId, doc.id, doc.serviceTypeId, doc.invoiceId);
    } catch (error) {
      console.error(`Failed to check warranty date for line item ${doc.id}:`, error);
      // Don't throw error - line item was created successfully
    }

    // Check warranty mileage and create alert if needed
    try {
      await this.checkWarrantyMileage(doc.vehicleId, doc.id, doc.serviceTypeId, doc.mileage, doc.invoiceId);
    } catch (error) {
      console.error(`Failed to check warranty mileage for line item ${doc.id}:`, error);
      // Don't throw error - line item was created successfully
    }

    // Check for lower prices and create alert if needed
    try {
      await this.checkLowerPrice(doc.serviceTypeId, doc.type, doc.unitPrice, doc.id, doc.vehicleId);
    } catch (error) {
      console.error(`Failed to check lower price for line item ${doc.id}:`, error);
      // Don't throw error - line item was created successfully
    }

    // Check for same service and create alert if needed
    try {
      await this.checkSameService(doc.serviceTypeId, doc.type, doc.id, doc.vehicleId);
    } catch (error) {
      console.error(`Failed to check same service for line item ${doc.id}:`, error);
      // Don't throw error - line item was created successfully
    }

    return cleanDoc;
  }

  async getById(id: string): Promise<LineItem | null> {
    try {
      const container = await this.getContainer();
      const { resource } = await container.item(id, id).read<LineItem>();
      return resource ?? null;
    } catch {
      return null;
    }
  }

  async findAll(): Promise<LineItem[]> {
    const container = await this.getContainer();
    const query: SqlQuerySpec = {
      query: `SELECT * FROM c ORDER BY c.createdAt DESC`,
    };
    const { resources } = await container.items.query(query).fetchAll();
    return resources;
  }

  async find(query: QueryLineItemDto = {}): Promise<{ data: LineItem[]; total: number }> {
    const take = Math.max(1, Math.min(query.take ?? 50, 1000));
    const skip = Math.max(0, query.skip ?? 0);

    // Build dynamic query
    let whereClause = 'WHERE 1=1';
    const parameters: { name: string; value: string | number | boolean }[] = [];

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
      parameters: parameters,
    };

    const container = await this.getContainer();
    try {
      const { resources } = await container.items.query<LineItem>(q).fetchAll();
      const total = resources.length;
      const data = resources.slice(skip, skip + take);

      return { data, total };
    } catch (error) {
      console.error('Cosmos DB query error:', error);
      // Fallback to simple query
      const fallbackQuery: SqlQuerySpec = {
        query: 'SELECT * FROM c ORDER BY c.createdAt DESC',
      };
      const { resources } = await container.items.query<LineItem>(fallbackQuery).fetchAll();
      const total = resources.length;
      const data = resources.slice(skip, skip + take);

      return { data, total };
    }
  }

  async update(id: string, payload: UpdateLineItemDto): Promise<LineItem> {
    const current = await this.getById(id);
    if (!current) throw new Error('line item not found');

    // Validate current invoice status
    await this.validateInvoiceStatus(current.invoiceId);

    // Delete all alerts associated with this line item before updating
    await this.deleteAlertsForLineItem(id);

    // Validate service-type exists if changing serviceTypeId
    if (payload.serviceTypeId && payload.serviceTypeId !== current.serviceTypeId) {
      try {
        const serviceTypesContainer = await this.getServiceTypesContainer();
        const serviceType = await serviceTypesContainer.item(payload.serviceTypeId, payload.serviceTypeId).read();
        if (!serviceType.resource) {
          throw new Error(`Service type with id '${payload.serviceTypeId}' not found`);
        }
      } catch {
        throw new Error(`Service type with id '${payload.serviceTypeId}' not found`);
      }
    }

    // Validate invoice exists if changing invoiceId and get vehicleId/vendorId
    let newInvoiceData;
    if (payload.invoiceId && payload.invoiceId !== current.invoiceId) {
      try {
        const invoicesContainer = await this.getInvoicesContainer();
        const invoice = await invoicesContainer.item(payload.invoiceId, payload.invoiceId).read();
        if (!invoice.resource) {
          throw new Error(`Invoice with id '${payload.invoiceId}' not found`);
        }
        newInvoiceData = invoice.resource;
      } catch {
        throw new Error(`Invoice with id '${payload.invoiceId}' not found`);
      }

      // Validate new invoice status
      await this.validateInvoiceStatus(payload.invoiceId);
    }

    // Calculate new total price if unit price or quantity changed
    const unitPrice = payload.unitPrice !== undefined ? Number(payload.unitPrice.toFixed(2)) : current.unitPrice;
    const quantity = payload.quantity !== undefined ? Number(payload.quantity.toFixed(2)) : current.quantity;
    const totalPrice = Number((unitPrice * quantity).toFixed(2));

    // Check if total price changed, invoice ID changed, or taxable status changed
    const totalPriceChanged = totalPrice !== current.totalPrice;
    const invoiceIdChanged = payload.invoiceId && payload.invoiceId !== current.invoiceId;
    const taxableChanged = payload.taxable !== undefined && payload.taxable !== current.taxable;
    const oldInvoiceId = current.invoiceId;
    const newInvoiceId = payload.invoiceId || current.invoiceId;

    const next: LineItem = {
      ...current,
      ...payload,
      unitPrice: unitPrice,
      quantity: quantity,
      totalPrice: totalPrice,
      // Auto-populate vehicleId and vendorId from new invoice if invoiceId changed
      vehicleId: newInvoiceData
        ? newInvoiceData.vehicleId
        : payload.vehicleId !== undefined
          ? payload.vehicleId
          : current.vehicleId,
      vendorId: newInvoiceData
        ? newInvoiceData.vendorId
        : payload.vendorId !== undefined
          ? payload.vendorId
          : current.vendorId,
      mileage: payload.mileage !== undefined ? Math.floor(payload.mileage) : current.mileage,
      warrantyMileage:
        payload.warrantyMileage !== undefined ? Math.floor(payload.warrantyMileage) : current.warrantyMileage,
      updatedAt: nowIso(),
    };

    const container = await this.getContainer();
    await container.item(id, id).replace(next);

    // Update invoice amounts if necessary
    if (totalPriceChanged || invoiceIdChanged || taxableChanged) {
      try {
        // Update the new/current invoice amount
        await invoiceService.updateInvoiceAmount(newInvoiceId);

        // If invoice ID changed, also update the old invoice amount
        if (invoiceIdChanged && oldInvoiceId !== newInvoiceId) {
          await invoiceService.updateInvoiceAmount(oldInvoiceId);
        }
      } catch (error) {
        console.error(`Failed to update invoice amounts:`, error);
        // Don't throw error - line item was updated successfully
      }
    }

    // Check warranty date and create alert if needed
    try {
      await this.checkWarrantyDate(next.vehicleId, next.id, next.serviceTypeId, next.invoiceId);
    } catch (error) {
      console.error(`Failed to check warranty date for line item ${next.id} after update:`, error);
      // Don't throw error - line item was updated successfully
    }

    // Check warranty mileage and create alert if needed
    try {
      await this.checkWarrantyMileage(next.vehicleId, next.id, next.serviceTypeId, next.mileage, next.invoiceId);
    } catch (error) {
      console.error(`Failed to check warranty mileage for line item ${next.id} after update:`, error);
      // Don't throw error - line item was updated successfully
    }

    // Check for lower prices and create alert if needed
    try {
      await this.checkLowerPrice(next.serviceTypeId, next.type, next.unitPrice, next.id, next.vehicleId);
    } catch (error) {
      console.error(`Failed to check lower price for line item ${next.id} after update:`, error);
      // Don't throw error - line item was updated successfully
    }

    // Check for same service and create alert if needed
    try {
      await this.checkSameService(next.serviceTypeId, next.type, next.id, next.vehicleId);
    } catch (error) {
      console.error(`Failed to check same service for line item ${next.id}:`, error);
      // Don't throw error - line item was created successfully
    }

    return next;
  }

  async delete(id: string): Promise<void> {
    const found = await this.getById(id);
    if (!found) throw new Error('line item not found');

    // Validate invoice status
    await this.validateInvoiceStatus(found.invoiceId);

    // Delete all alerts associated with this line item before deleting
    await this.deleteAlertsForLineItem(id);

    const invoiceId = found.invoiceId;
    const container = await this.getContainer();
    await container.item(id, id).delete();

    // Update the invoice amount after deleting the line item
    try {
      await invoiceService.updateInvoiceAmount(invoiceId);
    } catch (error) {
      console.error(`Failed to update invoice amount for invoice ${invoiceId}:`, error);
      // Don't throw error - line item was deleted successfully
    }
  }

  // Find by invoice ID
  async findByInvoiceId(invoiceId: string): Promise<LineItem[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.invoiceId = @invoiceId ORDER BY c.createdAt ASC',
      parameters: [{ name: '@invoiceId', value: invoiceId }],
    };
    const { resources } = await container.items.query<LineItem>(q).fetchAll();
    return resources;
  }

  // Find by service type ID
  async findByServiceTypeId(serviceTypeId: string): Promise<LineItem[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.serviceTypeId = @serviceTypeId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@serviceTypeId', value: serviceTypeId }],
    };
    const { resources } = await container.items.query<LineItem>(q).fetchAll();
    return resources;
  }

  // Find by type (Parts or Labor)
  async findByType(type: LineItemType): Promise<LineItem[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.type = @type ORDER BY c.createdAt DESC',
      parameters: [{ name: '@type', value: type }],
    };
    const { resources } = await container.items.query<LineItem>(q).fetchAll();
    return resources;
  }

  // Find taxable items
  async findTaxable(taxable: boolean): Promise<LineItem[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.taxable = @taxable ORDER BY c.createdAt DESC',
      parameters: [{ name: '@taxable', value: taxable }],
    };
    const { resources } = await container.items.query<LineItem>(q).fetchAll();
    return resources;
  }

  // Find warranty items
  async findWithWarranty(warranty: boolean): Promise<LineItem[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.warranty = @warranty ORDER BY c.createdAt DESC',
      parameters: [{ name: '@warranty', value: warranty }],
    };
    const { resources } = await container.items.query<LineItem>(q).fetchAll();
    return resources;
  }

  // Find by serviceTypeId, type, and unitPrice with descending unitPrice order
  async findByServiceTypeIdAndTypeAndUnitPrice(
    serviceTypeId: string,
    type: LineItemType,
    unitPrice: number
  ): Promise<LineItem[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query:
        'SELECT * FROM c WHERE c.serviceTypeId = @serviceTypeId AND c.type = @type AND c.unitPrice = @unitPrice ORDER BY c.unitPrice DESC',
      parameters: [
        { name: '@serviceTypeId', value: serviceTypeId },
        { name: '@type', value: type },
        { name: '@unitPrice', value: unitPrice },
      ],
    };
    const { resources } = await container.items.query<LineItem>(q).fetchAll();
    return resources;
  }

  // Find line items with lower prices for same serviceTypeId and type
  async findLowerPricesByServiceTypeAndTypeAndVehicleId(
    serviceTypeId: string,
    type: LineItemType,
    unitPrice: number,
    vehicleId: string
  ): Promise<LineItem[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query:
        'SELECT * FROM c WHERE c.serviceTypeId = @serviceTypeId AND c.type = @type AND c.unitPrice < @unitPrice AND c.vehicleId = @vehicleId ORDER BY c.unitPrice ASC',
      parameters: [
        { name: '@serviceTypeId', value: serviceTypeId },
        { name: '@type', value: type },
        { name: '@unitPrice', value: unitPrice },
        { name: '@vehicleId', value: vehicleId },
      ],
    };
    const { resources } = await container.items.query<LineItem>(q).fetchAll();
    return resources;
  }

  // Find line items with same serviceTypeId and type an VehicleID
  async findByServiceTypeAndTypeAndVehicleId(
    serviceTypeId: string,
    type: LineItemType,
    vehicleId: string
  ): Promise<LineItem[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query:
        'SELECT * FROM c WHERE c.serviceTypeId = @serviceTypeId AND c.type = @type AND c.vehicleId = @vehicleId ORDER BY c.unitPrice ASC',
      parameters: [
        { name: '@serviceTypeId', value: serviceTypeId },
        { name: '@type', value: type },
        { name: '@vehicleId', value: vehicleId },
      ],
    };
    const { resources } = await container.items.query<LineItem>(q).fetchAll();
    return resources;
  }

  // Find line items with same serviceTypeId and type an VehicleID
  async findByServiceTypeAndTypeAndVehicleIdWithWarrantyTrue(
    serviceTypeId: string,
    type: LineItemType,
    vehicleId: string
  ): Promise<LineItem[]> {
    const container = await this.getContainer();
    const q: SqlQuerySpec = {
      query:
        'SELECT * FROM c WHERE c.serviceTypeId = @serviceTypeId AND c.type = @type AND c.vehicleId = @vehicleId AND c.warranty = true ORDER BY c.unitPrice ASC',
      parameters: [
        { name: '@serviceTypeId', value: serviceTypeId },
        { name: '@type', value: type },
        { name: '@vehicleId', value: vehicleId },
      ],
    };
    const { resources } = await container.items.query<LineItem>(q).fetchAll();
    return resources;
  }

  // Check for lower prices and create alert if found
  async checkLowerPrice(
    serviceTypeId: string,
    type: LineItemType,
    unitPrice: number,
    lineItemId: string,
    vehicleId: string
  ): Promise<void> {
    try {
      // Find line items with lower prices for same serviceTypeId and type
      const lowerPriceItems = await this.findLowerPricesByServiceTypeAndTypeAndVehicleId(
        serviceTypeId,
        type,
        unitPrice,
        vehicleId
      );

      // Exclude the current line item
      const filteredItems = lowerPriceItems.filter(item => item.id !== lineItemId);

      // If lower price items exist, create an alert
      if (filteredItems.length > 0) {
        // Get the current line item to extract vehicleId and invoiceId
        const currentLineItem = await this.getById(lineItemId);
        if (!currentLineItem) {
          console.error(`Line item with id ${lineItemId} not found`);
          return;
        }

        // Get the first (lowest price) item as validLineItem
        const validLineItem = filteredItems[0];

        // Create alert
        const alertData = {
          type: 'HIGHER_PRICE',
          category: 'ServiceType',
          vehicleId: currentLineItem.vehicleId,
          lineItemId: lineItemId,
          validLineItem: validLineItem.id,
          invoiceId: currentLineItem.invoiceId,
          serviceTypeId: serviceTypeId,
          reasons: 'LOWER_PRICE_FOUND',
          status: 'Pending',
          message:
            'A previous line item for this service type was charged at a lower unit price. Please review for potential overpricing.',
        };

        await alertService.create(alertData);
        console.log(
          `Alert created for line item ${lineItemId} - lower price found: ${validLineItem.unitPrice} vs ${unitPrice}`
        );
      }
    } catch (error) {
      console.error(`Failed to check lower price for line item ${lineItemId}:`, error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  // Check for lower prices and create alert if found
  async checkSameService(
    serviceTypeId: string,
    type: LineItemType,
    lineItemId: string,
    vehicleId: string
  ): Promise<void> {
    try {
      // Find line items with same serviceTypeId and type
      const sameServiceItems = await this.findByServiceTypeAndTypeAndVehicleId(serviceTypeId, type, vehicleId);

      // Exclude the current line item
      const filteredItems = sameServiceItems.filter(item => item.id !== lineItemId);

      // If same service items exist, create an alert
      if (filteredItems.length > 0) {
        // Get the current line item to extract vehicleId and invoiceId
        const currentLineItem = await this.getById(lineItemId);
        if (!currentLineItem) {
          console.error(`Line item with id ${lineItemId} not found`);
          return;
        }

        // Get the first (lowest price) item as validLineItem
        const validLineItem = filteredItems[0];

        // Create alert
        const alertData = {
          type: 'SAME_SERVICE',
          category: 'ServiceType',
          vehicleId: currentLineItem.vehicleId,
          lineItemId: lineItemId,
          validLineItem: validLineItem.id,
          invoiceId: currentLineItem.invoiceId,
          serviceTypeId: serviceTypeId,
          reasons: 'SAME_SERVICE_FOUND',
          status: 'Pending',
          message:
            'A previous line item for this service type was a same service. Please review for potential overpricing.',
        };

        await alertService.create(alertData);
        console.log(`Alert created for line item ${lineItemId} - same service found: ${validLineItem.serviceTypeId}`);
      }
    } catch (error) {
      console.error(`Failed to check same service for line item ${lineItemId}:`, error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  // Bulk import
  async bulkImport(
    lineItems: LineItem[]
  ): Promise<{ success: LineItem[]; errors: { item: LineItem; error: string }[] }> {
    const success: LineItem[] = [];
    const errors: { item: LineItem; error: string }[] = [];

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

        // Get invoice data to auto-populate vehicleId and vendorId
        let invoiceData;
        try {
          const invoicesContainer = await this.getInvoicesContainer();
          const invoice = await invoicesContainer.item(item.invoiceId, item.invoiceId).read();
          if (!invoice.resource) {
            errors.push({ item, error: `Invoice with id '${item.invoiceId}' not found` });
            continue;
          }
          invoiceData = invoice.resource;
        } catch {
          errors.push({ item, error: `Invoice with id '${item.invoiceId}' not found` });
          continue;
        }

        // Validate invoice status
        try {
          await this.validateInvoiceStatus(item.invoiceId);
        } catch (error: unknown) {
          errors.push({
            item,
            error: error instanceof Error ? error.message : 'Invalid invoice status',
          });
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
          //vhicleId: invoiceData.vehicleId || '', // Auto-populate from invoice
          //vendorId: invoiceData.vendorId || '',   // Auto-populate from invoice
          vehicleId: item.vehicleId || invoiceData.vehicleId,
          vendorId: item.vendorId || invoiceData.vendorId,
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
        const container = await this.getContainer();
        await container.items.create(cleanDoc);
        success.push(cleanDoc);

        /*

        // Check warranty date and create alert if needed
        try {
          await this.checkWarrantyDate(cleanDoc.vehicleId, cleanDoc.id, cleanDoc.serviceTypeId, cleanDoc.invoiceId);
        } catch (error) {
          console.error(`Failed to check warranty date for line item ${cleanDoc.id} during bulk import:`, error);
          // Don't add to errors - line item was imported successfully
        }

        // Check warranty mileage and create alert if needed
        try {
          await this.checkWarrantyMileage(cleanDoc.vehicleId, cleanDoc.id, cleanDoc.serviceTypeId, cleanDoc.mileage, cleanDoc.invoiceId);
        } catch (error) {
          console.error(`Failed to check warranty mileage for line item ${cleanDoc.id} during bulk import:`, error);
          // Don't add to errors - line item was imported successfully
        }

        // Check for lower prices and create alert if needed
        try {
          await this.checkLowerPrice(cleanDoc.serviceTypeId, cleanDoc.type, cleanDoc.unitPrice, cleanDoc.id, cleanDoc.vehicleId);
        } catch (error) {
          console.error(`Failed to check lower price for line item ${cleanDoc.id} during bulk import:`, error);
          // Don't add to errors - line item was imported successfully
        }
          
         // Check for same service and create alert if needed
        try {
          await this.checkSameService(cleanDoc.serviceTypeId, cleanDoc.type, cleanDoc.id, cleanDoc.vehicleId);
        } catch (error) {
          console.error(`Failed to check same service for line item ${cleanDoc.id}:`, error);
          // Don't throw error - line item was created successfully
        }
      */
      } catch (error: unknown) {
        errors.push({
          item,
          error: error instanceof Error ? error.message : 'Failed to create line item',
        });
      }
    }

    // Update invoice amounts for all affected invoices
    if (success.length > 0) {
      // Get unique invoice IDs from successfully imported line items
      const uniqueInvoiceIds = [...new Set(success.map(item => item.invoiceId))];

      // Update each invoice amount
      for (const invoiceId of uniqueInvoiceIds) {
        try {
          await invoiceService.updateInvoiceAmount(invoiceId);
        } catch (error) {
          console.error(`Failed to update invoice amount for invoice ${invoiceId} during bulk import:`, error);
          // Don't add to errors - line items were imported successfully
        }
      }
    }

    return { success, errors };
  }

  // Check warranty date and create alert if overlapping warranty exists
  async checkWarrantyDate(
    vehicleId: string,
    lineItemId: string,
    serviceTypeId: string,
    invoiceId: string
  ): Promise<void> {
    try {
      // Get order start date from invoice
      const orderStartDate = await invoiceService.getOrderStartDate(invoiceId);
      if (!orderStartDate) {
        console.warn(`Cannot get order start date for invoice ${invoiceId}`);
        return;
      }

      // Search for line items with overlapping warranty
      const container = await this.getContainer();
      const warrantyQuery: SqlQuerySpec = {
        query: `SELECT * FROM c WHERE c.id != @lineItemId
                AND c.vehicleId = @vehicleId
                AND c.serviceTypeId = @serviceTypeId
                AND c.warrantyDate >= @orderStartDate
                AND c.warranty = true
                ORDER BY c.warrantyDate DESC`,
        parameters: [
          { name: '@lineItemId', value: lineItemId },
          { name: '@vehicleId', value: vehicleId },
          { name: '@serviceTypeId', value: serviceTypeId },
          { name: '@orderStartDate', value: orderStartDate },
        ],
      };

      const { resources: overlappingWarranties } = await container.items.query(warrantyQuery).fetchAll();

      // If overlapping warranties exist, create an alert
      if (overlappingWarranties.length > 0) {
        // Get the last (most recent) line item from results
        const lastLineItem = overlappingWarranties[0]; // Already ordered DESC

        // Create alert
        await alertService.create({
          type: 'WARRANTY',
          category: 'ServiceType',
          vehicleId: vehicleId,
          lineItemId: lineItemId,
          validLineItem: lastLineItem.id,
          invoiceId: invoiceId,
          serviceTypeId: serviceTypeId,
          reasons: 'DATE_VALID',
          status: 'Pending',
          message: 'Existing service type has a valid warranty that overlaps with invoice start date.',
        });

        console.log(`Created warranty overlap alert for line item ${lineItemId}`);
      }
    } catch (error) {
      console.error(`Failed to check warranty date for line item ${lineItemId}:`, error);
      // Don't throw error - line item creation should not fail due to alert creation issues
    }
  }

  // Check warranty mileage and create alert if overlapping warranty exists
  async checkWarrantyMileage(
    vehicleId: string,
    lineItemId: string,
    serviceTypeId: string,
    mileage: number,
    invoiceId: string
  ): Promise<void> {
    try {
      // Search for line items with overlapping warranty mileage
      const container = await this.getContainer();
      const warrantyMileageQuery: SqlQuerySpec = {
        query: `SELECT * FROM c WHERE c.id != @lineItemId
                AND c.vehicleId = @vehicleId
                AND c.serviceTypeId = @serviceTypeId
                AND (c.mileage + c.warrantyMileage) >= @mileage
                AND c.warrantyMileage > 0
                AND c.warranty = true
                ORDER BY c.mileage DESC`,
        parameters: [
          { name: '@lineItemId', value: lineItemId },
          { name: '@vehicleId', value: vehicleId },
          { name: '@serviceTypeId', value: serviceTypeId },
          { name: '@mileage', value: mileage },
        ],
      };

      const { resources: overlappingWarranties } = await container.items.query(warrantyMileageQuery).fetchAll();

      // If overlapping warranties exist, create an alert
      if (overlappingWarranties.length > 0) {
        // Get the last (most recent) line item from results
        const lastLineItem = overlappingWarranties[0]; // Already ordered DESC by mileage

        // Create alert
        await alertService.create({
          type: 'WARRANTY',
          category: 'ServiceType',
          vehicleId: vehicleId,
          lineItemId: lineItemId,
          validLineItem: lastLineItem.id,
          invoiceId: invoiceId,
          serviceTypeId: serviceTypeId,
          reasons: 'MILEAGE_VALID',
          status: 'Pending',
          message: 'Existing service type has a valid warranty that overlaps with current mileage.',
        });

        console.log(`Created warranty mileage overlap alert for line item ${lineItemId}`);
      }
    } catch (error) {
      console.error(`Failed to check warranty mileage for line item ${lineItemId}:`, error);
      // Don't throw error - line item creation should not fail due to alert creation issues
    }
  }

  // Helper method to delete all alerts associated with a line item
  private async deleteAlertsForLineItem(lineItemId: string): Promise<void> {
    try {
      // Find all alerts with the given lineItemId
      const alerts = await alertService.findByLineItemId(lineItemId);

      // Delete each alert
      for (const alert of alerts) {
        try {
          await alertService.delete(alert.id);
          console.log(`Deleted alert ${alert.id} for line item ${lineItemId}`);
        } catch (error) {
          console.error(`Failed to delete alert ${alert.id} for line item ${lineItemId}:`, error);
          // Continue deleting other alerts even if one fails
        }
      }

      if (alerts.length > 0) {
        console.log(`Deleted ${alerts.length} alerts for line item ${lineItemId}`);
      }
    } catch (error) {
      console.error(`Failed to delete alerts for line item ${lineItemId}:`, error);
      // Don't throw error - line item operation should not fail due to alert deletion issues
    }
  }

  // Helper method to validate invoice status for line item operations
  private async validateInvoiceStatus(invoiceId: string): Promise<void> {
    const invoicesContainer = await this.getInvoicesContainer();
    const invoice = await invoicesContainer.item(invoiceId, invoiceId).read();
    if (!invoice.resource) {
      throw new Error(`Invoice with id '${invoiceId}' not found`);
    }

    const allowedStatuses = ['Draft', 'PendingAlertReview'];
    if (!allowedStatuses.includes(invoice.resource.status)) {
      throw new Error(
        `Cannot modify line items for invoice with status '${invoice.resource.status}'. Allowed statuses: ${allowedStatuses.join(', ')}`
      );
    }
  }

  private generateId(): string {
    return `li_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

export const lineItemService = new LineItemService();
