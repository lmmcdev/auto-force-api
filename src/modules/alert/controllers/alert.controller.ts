import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { alertService } from '../services/alert.service';
import { CreateAlertDto } from '../dto/create-alert.dto';
import { UpdateAlertDto } from '../dto/update-alert.dto';
import { QueryAlertDto } from '../dto/query-alert.dto';

export class AlertController {
  constructor() {
    // This class exists to match the module pattern
  }
}

// GET /v1/alerts
export async function getAlerts(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const url = new URL(request.url);
    const queryParams: QueryAlertDto = {
      take: url.searchParams.get('take') ? parseInt(url.searchParams.get('take')!) : undefined,
      skip: url.searchParams.get('skip') ? parseInt(url.searchParams.get('skip')!) : undefined,
      q: url.searchParams.get('q') || undefined,
      type: url.searchParams.get('type') || undefined,
      category: url.searchParams.get('category') || undefined,
      vehicleId: url.searchParams.get('vehicleId') || undefined,
      lineItemId: url.searchParams.get('lineItemId') || undefined,
      invoiceId: url.searchParams.get('invoiceId') || undefined,
      serviceTypeId: url.searchParams.get('serviceTypeId') || undefined,
      validLineItem: url.searchParams.get('validLineItem') || undefined,
      reasons: url.searchParams.get('reasons') || undefined,
      status: url.searchParams.get('status') || undefined,
      createdFrom: url.searchParams.get('createdFrom') || undefined,
      createdTo: url.searchParams.get('createdTo') || undefined,
      hasResolution: url.searchParams.get('hasResolution')
        ? url.searchParams.get('hasResolution') === 'true'
        : undefined,
    };

    const { data, total } = await alertService.find(queryParams);
    return { status: 200, jsonBody: { data, total } };
  } catch (error: any) {
    context.error('Error in getAlerts:', error);
    return { status: 500, jsonBody: { error: error.message || 'Internal server error' } };
  }
}

// GET /v1/alerts/{id}
export async function getAlert(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) {
      return { status: 400, jsonBody: { error: 'Alert ID is required' } };
    }

    const alert = await alertService.getById(id);
    if (!alert) {
      return { status: 404, jsonBody: { error: 'Alert not found' } };
    }

    return { status: 200, jsonBody: alert };
  } catch (error: any) {
    context.error('Error in getAlert:', error);
    return { status: 500, jsonBody: { error: error.message || 'Internal server error' } };
  }
}

// POST /v1/alerts
export async function createAlert(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = (await request.json()) as CreateAlertDto;
    const alert = await alertService.create(body);
    return { status: 201, jsonBody: alert };
  } catch (error: any) {
    context.error('Error in createAlert:', error);
    return { status: 400, jsonBody: { error: error.message || 'Bad request' } };
  }
}

// PUT /v1/alerts/{id}
export async function updateAlert(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) {
      return { status: 400, jsonBody: { error: 'Alert ID is required' } };
    }

    const body = (await request.json()) as UpdateAlertDto;
    const alert = await alertService.update(id, body);
    return { status: 200, jsonBody: alert };
  } catch (error: any) {
    context.error('Error in updateAlert:', error);
    if (error.message === 'alert not found') {
      return { status: 404, jsonBody: { error: error.message } };
    }
    return { status: 400, jsonBody: { error: error.message || 'Bad request' } };
  }
}

// DELETE /v1/alerts/{id}
export async function deleteAlert(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) {
      return { status: 400, jsonBody: { error: 'Alert ID is required' } };
    }

    await alertService.delete(id);
    return { status: 204 };
  } catch (error: any) {
    context.error('Error in deleteAlert:', error);
    if (error.message === 'alert not found') {
      return { status: 404, jsonBody: { error: error.message } };
    }
    return { status: 500, jsonBody: { error: error.message || 'Internal server error' } };
  }
}

// GET /v1/alerts/by-type/{type}
export async function getAlertsByType(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const type = request.params.type;
    if (!type) {
      return { status: 400, jsonBody: { error: 'Type is required' } };
    }

    const alerts = await alertService.findByType(type);
    return { status: 200, jsonBody: alerts };
  } catch (error: any) {
    context.error('Error in getAlertsByType:', error);
    return { status: 500, jsonBody: { error: error.message || 'Internal server error' } };
  }
}

// GET /v1/alerts/by-category/{category}
export async function getAlertsByCategory(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const category = request.params.category;
    if (!category) {
      return { status: 400, jsonBody: { error: 'Category is required' } };
    }

    const alerts = await alertService.findByCategory(category);
    return { status: 200, jsonBody: alerts };
  } catch (error: any) {
    context.error('Error in getAlertsByCategory:', error);
    return { status: 500, jsonBody: { error: error.message || 'Internal server error' } };
  }
}

// GET /v1/alerts/by-vehicle/{vehicleId}
export async function getAlertsByVehicle(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const vehicleId = request.params.vehicleId;
    if (!vehicleId) {
      return { status: 400, jsonBody: { error: 'Vehicle ID is required' } };
    }

    const alerts = await alertService.findByVehicleId(vehicleId);
    return { status: 200, jsonBody: alerts };
  } catch (error: any) {
    context.error('Error in getAlertsByVehicle:', error);
    return { status: 500, jsonBody: { error: error.message || 'Internal server error' } };
  }
}

// GET /v1/alerts/by-service-type/{serviceTypeId}
export async function getAlertsByServiceType(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const serviceTypeId = request.params.serviceTypeId;
    if (!serviceTypeId) {
      return { status: 400, jsonBody: { error: 'Service Type ID is required' } };
    }

    const alerts = await alertService.findByServiceTypeId(serviceTypeId);
    return { status: 200, jsonBody: alerts };
  } catch (error: any) {
    context.error('Error in getAlertsByServiceType:', error);
    return { status: 500, jsonBody: { error: error.message || 'Internal server error' } };
  }
}

// GET /v1/alerts/by-status/{status}
export async function getAlertsByStatus(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const status = request.params.status;
    if (!status) {
      return { status: 400, jsonBody: { error: 'Status is required' } };
    }

    const alerts = await alertService.findByStatus(status);
    return { status: 200, jsonBody: alerts };
  } catch (error: any) {
    context.error('Error in getAlertsByStatus:', error);
    return { status: 500, jsonBody: { error: error.message || 'Internal server error' } };
  }
}

// GET /v1/alerts/by-service-type-and-vehicle-and-status/{serviceTypeId}/{vehicleId}/{status}
export async function getAlertsByServiceTypeAndVehicleAndStatus(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const serviceTypeId = request.params.serviceTypeId;
    const vehicleId = request.params.vehicleId;
    const status = request.params.status;

    if (!serviceTypeId || !vehicleId || !status) {
      return {
        status: 400,
        jsonBody: { error: 'Service Type ID, Vehicle ID, and Status are required' },
      };
    }

    const alerts = await alertService.findByServiceTypeAndVehicleAndStatus(
      serviceTypeId,
      vehicleId,
      status
    );
    return { status: 200, jsonBody: alerts };
  } catch (error: any) {
    context.error('Error in getAlertsByServiceTypeAndVehicleAndStatus:', error);
    return { status: 500, jsonBody: { error: error.message || 'Internal server error' } };
  }
}

// GET /v1/alerts/by-line-item/{lineItemId}
export async function getAlertsByLineItem(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const lineItemId = request.params.lineItemId;
    if (!lineItemId) {
      return { status: 400, jsonBody: { error: 'Line Item ID is required' } };
    }

    const alerts = await alertService.findByLineItemId(lineItemId);
    return { status: 200, jsonBody: alerts };
  } catch (error: any) {
    context.error('Error in getAlertsByLineItem:', error);
    return { status: 500, jsonBody: { error: error.message || 'Internal server error' } };
  }
}

// GET /v1/alerts/by-invoice/{invoiceId}
export async function getAlertsByInvoice(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const invoiceId = request.params.invoiceId;
    if (!invoiceId) {
      return { status: 400, jsonBody: { error: 'Invoice ID is required' } };
    }

    const alerts = await alertService.findByInvoiceId(invoiceId);
    return { status: 200, jsonBody: alerts };
  } catch (error: any) {
    context.error('Error in getAlertsByInvoice:', error);
    return { status: 500, jsonBody: { error: error.message || 'Internal server error' } };
  }
}

// GET /v1/alerts/by-reasons/{reasons}
export async function getAlertsByReasons(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const reasons = request.params.reasons;
    if (!reasons) {
      return { status: 400, jsonBody: { error: 'Reasons is required' } };
    }

    const alerts = await alertService.findByReasons(reasons);
    return { status: 200, jsonBody: alerts };
  } catch (error: any) {
    context.error('Error in getAlertsByReasons:', error);
    return { status: 500, jsonBody: { error: error.message || 'Internal server error' } };
  }
}

// GET /v1/alerts/by-valid-line-item/{validLineItem}
export async function getAlertsByValidLineItem(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const validLineItem = request.params.validLineItem;
    if (!validLineItem) {
      return { status: 400, jsonBody: { error: 'Valid Line Item ID is required' } };
    }

    const alerts = await alertService.findByValidLineItem(validLineItem);
    return { status: 200, jsonBody: alerts };
  } catch (error: any) {
    context.error('Error in getAlertsByValidLineItem:', error);
    return { status: 500, jsonBody: { error: error.message || 'Internal server error' } };
  }
}

// POST /v1/alerts/import
export async function bulkImportAlerts(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const alerts = await request.json();
    if (!Array.isArray(alerts)) {
      return { status: 400, jsonBody: { error: 'Request body must be an array of alerts' } };
    }

    const result = await alertService.bulkImport(alerts);
    return { status: 200, jsonBody: result };
  } catch (error: any) {
    context.error('Error in bulkImportAlerts:', error);
    return { status: 400, jsonBody: { error: error.message || 'Bad request' } };
  }
}

// Register routes
app.http('getAlerts', {
  methods: ['GET'],
  route: 'v1/alerts',
  handler: getAlerts,
});

app.http('getAlert', {
  methods: ['GET'],
  route: 'v1/alerts/{id}',
  handler: getAlert,
});

app.http('createAlert', {
  methods: ['POST'],
  route: 'v1/alerts',
  handler: createAlert,
});

app.http('updateAlert', {
  methods: ['PUT'],
  route: 'v1/alerts/{id}',
  handler: updateAlert,
});

app.http('deleteAlert', {
  methods: ['DELETE'],
  route: 'v1/alerts/{id}',
  handler: deleteAlert,
});

app.http('getAlertsByType', {
  methods: ['GET'],
  route: 'v1/alerts/by-type/{type}',
  handler: getAlertsByType,
});

app.http('getAlertsByCategory', {
  methods: ['GET'],
  route: 'v1/alerts/by-category/{category}',
  handler: getAlertsByCategory,
});

app.http('getAlertsByVehicle', {
  methods: ['GET'],
  route: 'v1/alerts/by-vehicle/{vehicleId}',
  handler: getAlertsByVehicle,
});

app.http('getAlertsByServiceType', {
  methods: ['GET'],
  route: 'v1/alerts/by-service-type/{serviceTypeId}',
  handler: getAlertsByServiceType,
});

app.http('getAlertsByStatus', {
  methods: ['GET'],
  route: 'v1/alerts/by-status/{status}',
  handler: getAlertsByStatus,
});

app.http('getAlertsByServiceTypeAndVehicleAndStatus', {
  methods: ['GET'],
  route: 'v1/alerts/by-service-type-and-vehicle-and-status/{serviceTypeId}/{vehicleId}/{status}',
  handler: getAlertsByServiceTypeAndVehicleAndStatus,
});

app.http('getAlertsByLineItem', {
  methods: ['GET'],
  route: 'v1/alerts/by-line-item/{lineItemId}',
  handler: getAlertsByLineItem,
});

app.http('getAlertsByInvoice', {
  methods: ['GET'],
  route: 'v1/alerts/by-invoice/{invoiceId}',
  handler: getAlertsByInvoice,
});

app.http('getAlertsByReasons', {
  methods: ['GET'],
  route: 'v1/alerts/by-reasons/{reasons}',
  handler: getAlertsByReasons,
});

app.http('getAlertsByValidLineItem', {
  methods: ['GET'],
  route: 'v1/alerts/by-valid-line-item/{validLineItem}',
  handler: getAlertsByValidLineItem,
});

app.http('bulkImportAlerts', {
  methods: ['POST'],
  route: 'v1/alerts/import',
  handler: bulkImportAlerts,
});
