import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ServiceType, ServiceTypeStatus, ServiceTypeType } from '../entities/service-type.entity';
import { UpdateServiceTypeDto } from '../dto/update-service-type.dto';
import { serviceTypeService } from '../services/service-type.service';
import { QueryServiceTypeDto } from '../dto/query-service-type.dto';

const serviceTypesRoute = 'v1/service-types';

export class ServiceTypeController {
  // POST /service-types
  async postOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const body = (await request.json()) as Omit<ServiceType, 'id' | 'createdAt' | 'updatedAt'>;
      const created = await serviceTypeService.create(body);
      return { status: 201, jsonBody: { message: 'Created', data: created } };
    } catch (err: unknown) {
      context.error('serviceType.postOne error', err);
      return this.toError(err);
    }
  }

  // POST /service-types/import
  async importList(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const body = (await request.json()) as ServiceType[];

      if (!Array.isArray(body)) {
        return {
          status: 400,
          jsonBody: { message: 'Request body must be an array of service types' },
        };
      }

      if (body.length === 0) {
        return { status: 400, jsonBody: { message: 'Array cannot be empty' } };
      }

      const result = await serviceTypeService.bulkImport(body);

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

      // Return 207 (Multi-Status) if there were some errors, 201 if all succeeded
      const status = result.errors.length > 0 ? 207 : 201;

      return { status, jsonBody: response };
    } catch (err: unknown) {
      context.error('serviceType.importList error', err);
      return this.toError(err);
    }
  }

  // GET /service-types/{id}
  async getOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const id = request.params.id;
      if (!id) return { status: 400, jsonBody: { message: 'Missing id' } };

      const found = await serviceTypeService.getById(id);
      if (!found) return { status: 404, jsonBody: { message: 'Not found' } };

      return { status: 200, jsonBody: { data: found } };
    } catch (err: unknown) {
      context.error('serviceType.getOne error', err);
      return this.toError(err);
    }
  }

  // GET /service-types?q=&status=&type=&skip=&take=
  async getMany(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const url = new URL(request.url);

      const query: QueryServiceTypeDto = {
        q: url.searchParams.get('q') ?? undefined,
        status: (url.searchParams.get('status') as ServiceTypeStatus) ?? undefined,
        type: (url.searchParams.get('type') as ServiceTypeType) ?? undefined,
        skip: url.searchParams.get('skip') ? Number(url.searchParams.get('skip')) : undefined,
        take: url.searchParams.get('take') ? Number(url.searchParams.get('take')) : undefined,
      };

      const { data, total } = await serviceTypeService.find(query);
      return { status: 200, jsonBody: { data, total } };
    } catch (err: unknown) {
      context.error('serviceType.getMany error', err);
      return this.toError(err);
    }
  }

  // PUT /service-types/{id}
  async putOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const id = request.params.id;
      if (!id) return { status: 400, jsonBody: { message: 'Missing id' } };

      const body = (await request.json()) as UpdateServiceTypeDto;
      const updated = await serviceTypeService.update(id, body);
      return { status: 200, jsonBody: { message: 'OK', data: updated } };
    } catch (err: unknown) {
      context.error('serviceType.putOne error', err);
      return this.toError(err);
    }
  }

  // DELETE /service-types/{id}
  async deleteOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const id = request.params.id;
      if (!id) return { status: 400, jsonBody: { message: 'Missing id' } };

      await serviceTypeService.delete(id);
      return { status: 204 };
    } catch (err: unknown) {
      context.error('serviceType.deleteOne error', err);
      return this.toError(err);
    }
  }

  // GET /service-types/by-status/{status}
  async getByStatus(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const status = request.params.status as ServiceTypeStatus;
      if (!status || !['Active', 'Inactive'].includes(status)) {
        return {
          status: 400,
          jsonBody: { message: "Invalid status. Must be 'Active' or 'Inactive'" },
        };
      }

      const serviceTypes = await serviceTypeService.findByStatus(status);
      return { status: 200, jsonBody: { data: serviceTypes } };
    } catch (err: unknown) {
      context.error('serviceType.getByStatus error', err);
      return this.toError(err);
    }
  }

  // GET /service-types/by-type/{type}
  async getByType(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const type = request.params.type as ServiceTypeType;
      if (!type || !['Service', 'Sales'].includes(type)) {
        return { status: 400, jsonBody: { message: "Invalid type. Must be 'Service' or 'Sales'" } };
      }

      const serviceTypes = await serviceTypeService.findByType(type);
      return { status: 200, jsonBody: { data: serviceTypes } };
    } catch (err: unknown) {
      context.error('serviceType.getByType error', err);
      return this.toError(err);
    }
  }

  // GET /service-types/by-status-type/{status}/{type}
  async getByStatusAndType(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const status = request.params.status as ServiceTypeStatus;
      const type = request.params.type as ServiceTypeType;

      if (!status || !['Active', 'Inactive'].includes(status)) {
        return {
          status: 400,
          jsonBody: { message: "Invalid status. Must be 'Active' or 'Inactive'" },
        };
      }

      if (!type || !['Service', 'Sales'].includes(type)) {
        return { status: 400, jsonBody: { message: "Invalid type. Must be 'Service' or 'Sales'" } };
      }

      const serviceTypes = await serviceTypeService.findByStatusAndType(status, type);
      return { status: 200, jsonBody: { data: serviceTypes } };
    } catch (err: unknown) {
      context.error('serviceType.getByStatusAndType error', err);
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

export const serviceTypeController = new ServiceTypeController();

// Basic CRUD endpoints
app.http('PostServiceType', {
  methods: ['POST'],
  route: serviceTypesRoute,
  authLevel: 'function',
  handler: (req, ctx) => serviceTypeController.postOne(req, ctx),
});

app.http('ImportServiceTypes', {
  methods: ['POST'],
  route: `${serviceTypesRoute}/import`,
  authLevel: 'function',
  handler: (req, ctx) => serviceTypeController.importList(req, ctx),
});

app.http('GetServiceType', {
  methods: ['GET'],
  route: `${serviceTypesRoute}/{id}`,
  authLevel: 'function',
  handler: (req, ctx) => serviceTypeController.getOne(req, ctx),
});

app.http('ListServiceTypes', {
  methods: ['GET'],
  route: serviceTypesRoute,
  authLevel: 'function',
  handler: (req, ctx) => serviceTypeController.getMany(req, ctx),
});

app.http('PutServiceType', {
  methods: ['PUT'],
  route: `${serviceTypesRoute}/{id}`,
  authLevel: 'function',
  handler: (req, ctx) => serviceTypeController.putOne(req, ctx),
});

app.http('DeleteServiceType', {
  methods: ['DELETE'],
  route: `${serviceTypesRoute}/{id}`,
  authLevel: 'function',
  handler: (req, ctx) => serviceTypeController.deleteOne(req, ctx),
});

// Additional filter endpoints
app.http('GetServiceTypesByStatus', {
  methods: ['GET'],
  route: `${serviceTypesRoute}/by-status/{status}`,
  authLevel: 'function',
  handler: (req, ctx) => serviceTypeController.getByStatus(req, ctx),
});

app.http('GetServiceTypesByType', {
  methods: ['GET'],
  route: `${serviceTypesRoute}/by-type/{type}`,
  authLevel: 'function',
  handler: (req, ctx) => serviceTypeController.getByType(req, ctx),
});

app.http('GetServiceTypesByStatusAndType', {
  methods: ['GET'],
  route: `${serviceTypesRoute}/by-status-type/{status}/{type}`,
  authLevel: 'function',
  handler: (req, ctx) => serviceTypeController.getByStatusAndType(req, ctx),
});
