import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { vehicleService, VehicleService } from "../services/vehicle.service";
import { vinDecoderService } from "../services/vin-decoder.service";
import { CreateVehicleDto } from "../dto/create-vehicle.dto";
import { UpdateVehicleDto } from "../dto/update-vehicle.dto";
import { Vehicle } from "../entities/vehicle.entity";

const vehiclesRoute = "v1/vehicles";
export class VehicleController {
  

  // Crear vehículo
  async postOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const body = (await request.json()) as Omit<Vehicle, "id" | "createdAt" | "updatedAt">;
      const created = await vehicleService.create(body);
      return { status: 201, jsonBody: { message: "Created", data: created } };
    } catch (err: any) {
      context.error("postOne vehicle error", err);
      return this.toError(err);
    }
  }

  // POST /vehicles/import
  async importList(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const body = (await request.json()) as Vehicle[];

      if (!Array.isArray(body)) {
        return { status: 400, jsonBody: { message: "Request body must be an array of vehicles" } };
      }

      if (body.length === 0) {
        return { status: 400, jsonBody: { message: "Array cannot be empty" } };
      }

      const result = await vehicleService.bulkImport(body);

      const response = {
        message: "Import completed",
        summary: {
          total: body.length,
          success: result.success.length,
          errors: result.errors.length
        },
        data: result.success,
        errors: result.errors
      };

      // Return 207 (Multi-Status) if there were some errors, 201 if all succeeded
      const status = result.errors.length > 0 ? 207 : 201;

      return { status, jsonBody: response };
    } catch (err: any) {
      context.error("vehicle.importList error", err);
      return this.toError(err);
    }
  }

  // Obtener por ID
  async getOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const id = request.params.id;
      if (!id) return { status: 400, jsonBody: { message: "Missing id" } };

      const vehicle = await vehicleService.getById(id);
      if (!vehicle) return { status: 404, jsonBody: { message: "Not found" } };

      return { status: 200, jsonBody: { data: vehicle } };
    } catch (err: any) {
      context.error("getOne vehicle error", err);
      return this.toError(err);
    }
  }

  // Listar y filtrar
  async getMany(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const url = new URL(request.url);
    const vin = url.searchParams.get("vin") ?? undefined;
    const tagNumber = url.searchParams.get("tagNumber") ?? undefined;
    const status = url.searchParams.get("status") as "Active" | "Inactive" | undefined;
    const make = url.searchParams.get("make") ?? undefined;
    const year = url.searchParams.get("year") ? Number(url.searchParams.get("year")) : undefined;

    let data: Vehicle[] = [];

    if (vin) {
      const v = await vehicleService.findByVin(vin);
      data = v ? [v] : [];
    } else if (tagNumber) {
      const v = await vehicleService.findByTagNumber(tagNumber);
      data = v ? [v] : [];
    } else if (status && make && year !== undefined) {
      const list = await vehicleService.findByMakeAndYear(make, year);
      data = list.filter(v => v.status === status);
    } else if (status) {
      data = await vehicleService.findByStatus(status);
    } else if (make && year !== undefined) {
      data = await vehicleService.findByMakeAndYear(make, year);
    } else {
      // 👈 Fallback cuando no hay filtros: trae todo
      data = await vehicleService.findAll();
    }

    return { status: 200, jsonBody: { data, total: data.length } };
  } catch (err: any) {
    context.error("getMany vehicle error", err);
    return this.toError(err);
  }
}

  // Actualizar
  async putOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const id = request.params.id;
      if (!id) return { status: 400, jsonBody: { message: "Missing id" } };

      const body = (await request.json()) as Partial<Vehicle>;
      const updated = await vehicleService.update(id, body);
      return { status: 200, jsonBody: { message: "OK", data: updated } };
    } catch (err: any) {
      context.error("putOne vehicle error", err);
      return this.toError(err);
    }
  }

  // Eliminar
  async deleteOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const id = request.params.id;
      if (!id) return { status: 400, jsonBody: { message: "Missing id" } };

      await vehicleService.delete(id);
      return { status: 204 };
    } catch (err: any) {
      context.error("deleteOne vehicle error", err);
      return this.toError(err);
    }
  }

  // GET /vehicles/by-vin/{vin}
  async getByVin(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const vin = request.params.vin;
      if (!vin) return { status: 400, jsonBody: { message: "VIN parameter is required" } };

      const vehicle = await vehicleService.findByVin(vin);
      if (!vehicle) return { status: 404, jsonBody: { message: "Vehicle not found" } };

      return { status: 200, jsonBody: { data: vehicle } };
    } catch (err: any) {
      context.error("vehicle.getByVin error", err);
      return this.toError(err);
    }
  }

  // GET /vehicles/by-tag/{tagNumber}
  async getByTagNumber(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const tagNumber = request.params.tagNumber;
      if (!tagNumber) return { status: 400, jsonBody: { message: "Tag number parameter is required" } };

      const vehicle = await vehicleService.findByTagNumber(tagNumber);
      if (!vehicle) return { status: 404, jsonBody: { message: "Vehicle not found" } };

      return { status: 200, jsonBody: { data: vehicle } };
    } catch (err: any) {
      context.error("vehicle.getByTagNumber error", err);
      return this.toError(err);
    }
  }

  // GET /vehicles/by-status/{status}
  async getByStatus(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const status = request.params.status as "Active" | "Inactive";
      if (!status || !["Active", "Inactive"].includes(status)) {
        return { status: 400, jsonBody: { message: "Invalid status. Must be 'Active' or 'Inactive'" } };
      }

      const vehicles = await vehicleService.findByStatus(status);
      return { status: 200, jsonBody: { data: vehicles } };
    } catch (err: any) {
      context.error("vehicle.getByStatus error", err);
      return this.toError(err);
    }
  }

  // GET /vehicles/by-make-year/{make}/{year}
  async getByMakeAndYear(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const make = request.params.make;
      const yearParam = request.params.year;

      if (!make) return { status: 400, jsonBody: { message: "Make parameter is required" } };
      if (!yearParam) return { status: 400, jsonBody: { message: "Year parameter is required" } };

      const year = parseInt(yearParam, 10);
      if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 2) {
        return { status: 400, jsonBody: { message: "Invalid year parameter" } };
      }

      const vehicles = await vehicleService.findByMakeAndYear(make, year);
      return { status: 200, jsonBody: { data: vehicles } };
    } catch (err: any) {
      context.error("vehicle.getByMakeAndYear error", err);
      return this.toError(err);
    }
  }

  // GET /vehicles/decode-vin/{vin}
  async decodeVin(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const vin = request.params.vin;
      if (!vin) return { status: 400, jsonBody: { message: "VIN parameter is required" } };

      const decodedData = await vinDecoderService.decodeVin(vin);
      return { status: 200, jsonBody: { data: decodedData } };
    } catch (err: any) {
      context.error("vehicle.decodeVin error", err);
      return this.toError(err);
    }
  }

  // GET /vehicles/count?vin=&tagNumber=&status=&make=&year=
  async getCount(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const url = new URL(request.url);

      const filters = {
        vin: url.searchParams.get("vin") ?? undefined,
        tagNumber: url.searchParams.get("tagNumber") ?? undefined,
        status: (url.searchParams.get("status") as "Active" | "Inactive") ?? undefined,
        make: url.searchParams.get("make") ?? undefined,
        year: url.searchParams.get("year") ? Number(url.searchParams.get("year")) : undefined,
      };

      const count = await vehicleService.count(filters);
      return { status: 200, jsonBody: { count } };
    } catch (err: any) {
      context.error("vehicle.getCount error", err);
      return this.toError(err);
    }
  }

  private toError(err: any): HttpResponseInit {
    const msg = String(err?.message ?? "Internal error");
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

  export const vehicleController = new VehicleController();

// Vehicles
app.http("PostVehicle", {
  methods: ["POST"],
  route: vehiclesRoute,
  authLevel: "function",
  handler: (req, ctx) => vehicleController.postOne(req, ctx),
});

app.http("ImportVehicles", {
  methods: ["POST"],
  route: `${vehiclesRoute}/import`,
  authLevel: "function",
  handler: (req, ctx) => vehicleController.importList(req, ctx),
});

app.http("GetVehiclesCount", {
  methods: ["GET"],
  route: "v1/count/vehicles",
  authLevel: "function",
  handler: (req, ctx) => vehicleController.getCount(req, ctx),
});

app.http("GetVehicle", {
  methods: ["GET"],
  route: `${vehiclesRoute}/{id}`,
  authLevel: "function",
  handler: (req, ctx) => vehicleController.getOne(req, ctx),
});

app.http("ListVehicles", {
  methods: ["GET"],
  route: vehiclesRoute,
  authLevel: "function",
  handler: (req, ctx) => vehicleController.getMany(req, ctx),
});

app.http("PutVehicle", {
  methods: ["PUT"],
  route: `${vehiclesRoute}/{id}`,
  authLevel: "function",
  handler: (req, ctx) => vehicleController.putOne(req, ctx),
});

app.http("DeleteVehicle", {
  methods: ["DELETE"],
  route: `${vehiclesRoute}/{id}`,
  authLevel: "function",
  handler: (req, ctx) => vehicleController.deleteOne(req, ctx),
});

app.http("GetVehicleByVin", {
  methods: ["GET"],
  route: `${vehiclesRoute}/by-vin/{vin}`,
  authLevel: "function",
  handler: (req, ctx) => vehicleController.getByVin(req, ctx),
});

app.http("GetVehicleByTagNumber", {
  methods: ["GET"],
  route: `${vehiclesRoute}/by-tag/{tagNumber}`,
  authLevel: "function",
  handler: (req, ctx) => vehicleController.getByTagNumber(req, ctx),
});

app.http("GetVehiclesByStatus", {
  methods: ["GET"],
  route: `${vehiclesRoute}/by-status/{status}`,
  authLevel: "function",
  handler: (req, ctx) => vehicleController.getByStatus(req, ctx),
});

app.http("GetVehiclesByMakeAndYear", {
  methods: ["GET"],
  route: `${vehiclesRoute}/by-make-year/{make}/{year}`,
  authLevel: "function",
  handler: (req, ctx) => vehicleController.getByMakeAndYear(req, ctx),
});

app.http("DecodeVin", {
  methods: ["GET"],
  route: `${vehiclesRoute}/decode-vin/{vin}`,
  authLevel: "function",
  handler: (req, ctx) => vehicleController.decodeVin(req, ctx),
});
