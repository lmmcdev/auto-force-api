import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import { invoiceService } from '../services/invoice.service';
import { QueryInvoiceDto } from '../dto/query-invoice.dto';

const invoicesRoute = 'v1/invoices';

export class InvoiceController {
  // POST /invoices
  async postOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const body = (await request.json()) as Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>;
      const created = await invoiceService.create(body);
      return { status: 201, jsonBody: { message: 'Created', data: created } };
    } catch (err: unknown) {
      context.error('invoice.postOne error', err);
      return this.toError(err);
    }
  }

  // POST /invoices/import
  async importList(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const body = (await request.json()) as Invoice[];

      if (!Array.isArray(body)) {
        return { status: 400, jsonBody: { message: 'Request body must be an array of invoices' } };
      }

      if (body.length === 0) {
        return { status: 400, jsonBody: { message: 'Array cannot be empty' } };
      }

      const result = await invoiceService.bulkImport(body);

      const response = {
        message: 'Import completed',
        summary: {
          total: body.length,
          success: result.success.length,
          errors: result.errors.length,
        },
        data: result.success,
        errors: result.errors,
      };

      const status = result.errors.length > 0 ? 207 : 201;

      return { status, jsonBody: response };
    } catch (err: unknown) {
      context.error('invoice.importList error', err);
      return this.toError(err);
    }
  }

  // GET /invoices/{id}
  async getOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const id = request.params.id;
      if (!id) return { status: 400, jsonBody: { message: 'Missing id' } };

      const found = await invoiceService.getById(id);
      if (!found) return { status: 404, jsonBody: { message: 'Not found' } };

      return { status: 200, jsonBody: { data: found } };
    } catch (err: unknown) {
      context.error('invoice.getOne error', err);
      return this.toError(err);
    }
  }

  // GET /invoices?q=&vehicleId=&vendorId=&status=&skip=&take=
  async getMany(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const url = new URL(request.url);

      const query: QueryInvoiceDto = {
        q: url.searchParams.get('q') ?? undefined,
        vehicleId: url.searchParams.get('vehicleId') ?? undefined,
        vendorId: url.searchParams.get('vendorId') ?? undefined,
        status: (url.searchParams.get('status') as InvoiceStatus) ?? undefined,
        invoiceNumber: url.searchParams.get('invoiceNumber') ?? undefined,
        orderStartDateFrom: url.searchParams.get('orderStartDateFrom') ?? undefined,
        orderStartDateTo: url.searchParams.get('orderStartDateTo') ?? undefined,
        uploadDateFrom: url.searchParams.get('uploadDateFrom') ?? undefined,
        uploadDateTo: url.searchParams.get('uploadDateTo') ?? undefined,
        minAmount: url.searchParams.get('minAmount') ? Number(url.searchParams.get('minAmount')) : undefined,
        maxAmount: url.searchParams.get('maxAmount') ? Number(url.searchParams.get('maxAmount')) : undefined,
        skip: url.searchParams.get('skip') ? Number(url.searchParams.get('skip')) : undefined,
        take: url.searchParams.get('take') ? Number(url.searchParams.get('take')) : undefined,
      };

      const { data, total } = await invoiceService.find(query);
      return { status: 200, jsonBody: { data, total } };
    } catch (err: unknown) {
      context.error('invoice.getMany error', err);
      return this.toError(err);
    }
  }

  // PUT /invoices/{id}
  async putOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const id = request.params.id;
      if (!id) return { status: 400, jsonBody: { message: 'Missing id' } };

      const body = (await request.json()) as UpdateInvoiceDto;
      const updated = await invoiceService.update(id, body);
      return { status: 200, jsonBody: { message: 'OK', data: updated } };
    } catch (err: unknown) {
      context.error('invoice.putOne error', err);
      return this.toError(err);
    }
  }

  // DELETE /invoices/{id}
  async deleteOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const id = request.params.id;
      if (!id) return { status: 400, jsonBody: { message: 'Missing id' } };

      await invoiceService.delete(id);
      return { status: 204 };
    } catch (err: unknown) {
      context.error('invoice.deleteOne error', err);
      return this.toError(err);
    }
  }

  // GET /invoices/by-invoice-number/{invoiceNumber}
  async getByInvoiceNumber(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const invoiceNumber = request.params.invoiceNumber;
      if (!invoiceNumber) return { status: 400, jsonBody: { message: 'Invoice number parameter is required' } };

      const invoice = await invoiceService.findByInvoiceNumber(invoiceNumber);
      if (!invoice) return { status: 404, jsonBody: { message: 'Invoice not found' } };

      return { status: 200, jsonBody: { data: invoice } };
    } catch (err: unknown) {
      context.error('invoice.getByInvoiceNumber error', err);
      return this.toError(err);
    }
  }

  // GET /invoices/by-vehicle/{vehicleId}
  async getByVehicleId(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const vehicleId = request.params.vehicleId;
      if (!vehicleId) return { status: 400, jsonBody: { message: 'Vehicle ID parameter is required' } };

      const invoices = await invoiceService.findByVehicleId(vehicleId);
      return { status: 200, jsonBody: { data: invoices } };
    } catch (err: unknown) {
      context.error('invoice.getByVehicleId error', err);
      return this.toError(err);
    }
  }

  // GET /invoices/by-vendor/{vendorId}
  async getByVendorId(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const vendorId = request.params.vendorId;
      if (!vendorId) return { status: 400, jsonBody: { message: 'Vendor ID parameter is required' } };

      const invoices = await invoiceService.findByVendorId(vendorId);
      return { status: 200, jsonBody: { data: invoices } };
    } catch (err: unknown) {
      context.error('invoice.getByVendorId error', err);
      return this.toError(err);
    }
  }

  // GET /invoices/by-status/{status}
  async getByStatus(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const status = request.params.status as InvoiceStatus;
      if (!status || !['Pending', 'Approved', 'Rejected', 'Paid', 'Cancelled'].includes(status)) {
        return {
          status: 400,
          jsonBody: {
            message: "Invalid status. Must be 'Pending', 'Approved', 'Rejected', 'Paid', or 'Cancelled'",
          },
        };
      }

      const invoices = await invoiceService.findByStatus(status);
      return { status: 200, jsonBody: { data: invoices } };
    } catch (err: unknown) {
      context.error('invoice.getByStatus error', err);
      return this.toError(err);
    }
  }

  // Mapeo de errores a HTTP
  private toError(err: unknown): HttpResponseInit {
    const msg = err instanceof Error ? err.message : String(err ?? 'Internal error');
    const status = /not found/i.test(msg)
      ? 404
      : /already exists/i.test(msg)
        ? 409
        : /required|invalid/i.test(msg)
          ? 400
          : 500;

    return { status, jsonBody: { message: msg } };
  }
}

export const invoiceController = new InvoiceController();

// Basic CRUD endpoints
app.http('PostInvoice', {
  methods: ['POST'],
  route: invoicesRoute,
  authLevel: 'function',
  handler: (req, ctx) => invoiceController.postOne(req, ctx),
});

app.http('ImportInvoices', {
  methods: ['POST'],
  route: `${invoicesRoute}/import`,
  authLevel: 'function',
  handler: (req, ctx) => invoiceController.importList(req, ctx),
});

app.http('GetInvoice', {
  methods: ['GET'],
  route: `${invoicesRoute}/{id}`,
  authLevel: 'function',
  handler: (req, ctx) => invoiceController.getOne(req, ctx),
});

app.http('ListInvoices', {
  methods: ['GET'],
  route: invoicesRoute,
  authLevel: 'function',
  handler: (req, ctx) => invoiceController.getMany(req, ctx),
});

app.http('PutInvoice', {
  methods: ['PUT'],
  route: `${invoicesRoute}/{id}`,
  authLevel: 'function',
  handler: (req, ctx) => invoiceController.putOne(req, ctx),
});

app.http('DeleteInvoice', {
  methods: ['DELETE'],
  route: `${invoicesRoute}/{id}`,
  authLevel: 'function',
  handler: (req, ctx) => invoiceController.deleteOne(req, ctx),
});

// Additional filter endpoints
app.http('GetInvoiceByNumber', {
  methods: ['GET'],
  route: `${invoicesRoute}/by-invoice-number/{invoiceNumber}`,
  authLevel: 'function',
  handler: (req, ctx) => invoiceController.getByInvoiceNumber(req, ctx),
});

app.http('GetInvoicesByVehicle', {
  methods: ['GET'],
  route: `${invoicesRoute}/by-vehicle/{vehicleId}`,
  authLevel: 'function',
  handler: (req, ctx) => invoiceController.getByVehicleId(req, ctx),
});

app.http('GetInvoicesByVendor', {
  methods: ['GET'],
  route: `${invoicesRoute}/by-vendor/{vendorId}`,
  authLevel: 'function',
  handler: (req, ctx) => invoiceController.getByVendorId(req, ctx),
});

app.http('GetInvoicesByStatus', {
  methods: ['GET'],
  route: `${invoicesRoute}/by-status/{status}`,
  authLevel: 'function',
  handler: (req, ctx) => invoiceController.getByStatus(req, ctx),
});
