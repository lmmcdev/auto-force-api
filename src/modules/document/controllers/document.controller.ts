import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Document, DocumentType } from '../entities/document.entity';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { documentService } from '../services/document.service';
import { QueryDocumentDto } from '../dto/query-document.dto';

const documentsRoute = 'v1/documents';

export class DocumentController {
  // POST /documents
  async postOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const body = (await request.json()) as CreateDocumentDto;
      const created = await documentService.create(body);
      return { status: 201, jsonBody: { message: 'Created', data: created } };
    } catch (err: any) {
      context.error('document.postOne error', err);
      return this.toError(err);
    }
  }

  // POST /documents/import
  async importList(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const body = (await request.json()) as Document[];

      if (!Array.isArray(body)) {
        return {
          status: 400,
          jsonBody: { message: 'Request body must be an array of documents' },
        };
      }

      if (body.length === 0) {
        return { status: 400, jsonBody: { message: 'Array cannot be empty' } };
      }

      const result = await documentService.bulkImport(body);

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
    } catch (err: any) {
      context.error('document.importList error', err);
      return this.toError(err);
    }
  }

  // GET /documents/{id}
  async getOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const id = request.params.id;
      if (!id) return { status: 400, jsonBody: { message: 'Missing id' } };

      const found = await documentService.getById(id);
      if (!found) return { status: 404, jsonBody: { message: 'Not found' } };

      return { status: 200, jsonBody: { data: found } };
    } catch (err: any) {
      context.error('document.getOne error', err);
      return this.toError(err);
    }
  }

  // GET /documents?q=&vehicleId=&type=&expired=&expiringSoon=&skip=&take=
  async getMany(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const url = new URL(request.url);

      const query: QueryDocumentDto = {
        q: url.searchParams.get('q') ?? undefined,
        vehicleId: url.searchParams.get('vehicleId') ?? undefined,
        type: (url.searchParams.get('type') as DocumentType) ?? undefined,
        startDateFrom: url.searchParams.get('startDateFrom') ?? undefined,
        startDateTo: url.searchParams.get('startDateTo') ?? undefined,
        expirationDateFrom: url.searchParams.get('expirationDateFrom') ?? undefined,
        expirationDateTo: url.searchParams.get('expirationDateTo') ?? undefined,
        expired:
          url.searchParams.get('expired') === 'true'
            ? true
            : url.searchParams.get('expired') === 'false'
              ? false
              : undefined,
        expiringSoon: url.searchParams.get('expiringSoon') ? Number(url.searchParams.get('expiringSoon')) : undefined,
        skip: url.searchParams.get('skip') ? Number(url.searchParams.get('skip')) : undefined,
        take: url.searchParams.get('take') ? Number(url.searchParams.get('take')) : undefined,
      };

      const { data, total } = await documentService.find(query);
      return { status: 200, jsonBody: { data, total } };
    } catch (err: any) {
      context.error('document.getMany error', err);
      return this.toError(err);
    }
  }

  // PUT /documents/{id}
  async putOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const id = request.params.id;
      if (!id) return { status: 400, jsonBody: { message: 'Missing id' } };

      const body = (await request.json()) as UpdateDocumentDto;
      const updated = await documentService.update(id, body);
      return { status: 200, jsonBody: { message: 'OK', data: updated } };
    } catch (err: any) {
      context.error('document.putOne error', err);
      return this.toError(err);
    }
  }

  // DELETE /documents/{id}
  async deleteOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const id = request.params.id;
      if (!id) return { status: 400, jsonBody: { message: 'Missing id' } };

      await documentService.delete(id);
      return { status: 204 };
    } catch (err: any) {
      context.error('document.deleteOne error', err);
      return this.toError(err);
    }
  }

  // GET /documents/by-vehicle/{vehicleId}
  async getByVehicleId(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const vehicleId = request.params.vehicleId;
      if (!vehicleId)
        return {
          status: 400,
          jsonBody: { message: 'Vehicle ID parameter is required' },
        };

      const documents = await documentService.findByVehicleId(vehicleId);
      return { status: 200, jsonBody: { data: documents } };
    } catch (err: any) {
      context.error('document.getByVehicleId error', err);
      return this.toError(err);
    }
  }

  // GET /documents/by-type/{type}
  async getByType(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const type = request.params.type as DocumentType;
      const validTypes: DocumentType[] = [
        'Truck Insurance Liability',
        'Lease Paperwork',
        'Registration',
        'Annual Inspection',
        'Inspeccion Alivi',
        'Custom Document',
      ];

      if (!type || !validTypes.includes(type)) {
        return {
          status: 400,
          jsonBody: {
            message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
          },
        };
      }

      const documents = await documentService.findByType(type);
      return { status: 200, jsonBody: { data: documents } };
    } catch (err: any) {
      context.error('document.getByType error', err);
      return this.toError(err);
    }
  }

  // GET /documents/expired
  async getExpired(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const documents = await documentService.findExpired();
      return { status: 200, jsonBody: { data: documents } };
    } catch (err: any) {
      context.error('document.getExpired error', err);
      return this.toError(err);
    }
  }

  // GET /documents/expiring-soon/{days}
  async getExpiringSoon(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const days = request.params.days;
      if (!days || isNaN(Number(days))) {
        return {
          status: 400,
          jsonBody: {
            message: 'Days parameter is required and must be a valid number',
          },
        };
      }

      const daysNum = Number(days);
      const documents = await documentService.findExpiringSoon(daysNum);
      return { status: 200, jsonBody: { data: documents } };
    } catch (err: any) {
      context.error('document.getExpiringSoon error', err);
      return this.toError(err);
    }
  }

  // Mapeo de errores a HTTP
  private toError(err: any): HttpResponseInit {
    const msg = String(err?.message ?? 'Internal error');
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

export const documentController = new DocumentController();

// Basic CRUD endpoints
app.http('PostDocument', {
  methods: ['POST'],
  route: documentsRoute,
  authLevel: 'function',
  handler: (req, ctx) => documentController.postOne(req, ctx),
});

app.http('ImportDocuments', {
  methods: ['POST'],
  route: `${documentsRoute}/import`,
  authLevel: 'function',
  handler: (req, ctx) => documentController.importList(req, ctx),
});

app.http('GetDocument', {
  methods: ['GET'],
  route: `${documentsRoute}/{id}`,
  authLevel: 'function',
  handler: (req, ctx) => documentController.getOne(req, ctx),
});

app.http('ListDocuments', {
  methods: ['GET'],
  route: documentsRoute,
  authLevel: 'function',
  handler: (req, ctx) => documentController.getMany(req, ctx),
});

app.http('PutDocument', {
  methods: ['PUT'],
  route: `${documentsRoute}/{id}`,
  authLevel: 'function',
  handler: (req, ctx) => documentController.putOne(req, ctx),
});

app.http('DeleteDocument', {
  methods: ['DELETE'],
  route: `${documentsRoute}/{id}`,
  authLevel: 'function',
  handler: (req, ctx) => documentController.deleteOne(req, ctx),
});

// Additional filter endpoints
app.http('GetDocumentsByVehicle', {
  methods: ['GET'],
  route: `${documentsRoute}/by-vehicle/{vehicleId}`,
  authLevel: 'function',
  handler: (req, ctx) => documentController.getByVehicleId(req, ctx),
});

app.http('GetDocumentsByType', {
  methods: ['GET'],
  route: `${documentsRoute}/by-type/{type}`,
  authLevel: 'function',
  handler: (req, ctx) => documentController.getByType(req, ctx),
});

app.http('GetExpiredDocuments', {
  methods: ['GET'],
  route: `${documentsRoute}/expired`,
  authLevel: 'function',
  handler: (req, ctx) => documentController.getExpired(req, ctx),
});

app.http('GetDocumentsExpiringSoon', {
  methods: ['GET'],
  route: `${documentsRoute}/expiring-soon/{days}`,
  authLevel: 'function',
  handler: (req, ctx) => documentController.getExpiringSoon(req, ctx),
});
