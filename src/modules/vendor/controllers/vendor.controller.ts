import{
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from "@azure/functions";
import { Vendor, VendorEntity, VendorStatus, VendorType } from "../entities/vendor.entity";
import { CreateVendorDTO } from "../dto/create-vendor.dto";
import { UpdateVendorDTO } from "../dto/update-vendor.dto";
import { vendorService, VendorService } from "../services/vendor.service";
import { QueryVendorDTO } from "../dto/query-vendor.dto";

const vendorsRoute = "v1/vendors"
export class VendorController{
   
   // POST /vendors
  async postOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const body = (await request.json()) as Omit<Vendor, "id" | "createdAt" | "updatedAt">;
      const created = await vendorService.create(body);
      return { status: 201, jsonBody: { message: "Created", data: created } };
    } catch (err: any) {
      context.error("vendor.postOne error", err);
      return this.toError(err);
    }
  }

  // POST /vendors/import
  async importList(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const body = (await request.json()) as Vendor[];

      if (!Array.isArray(body)) {
        return { status: 400, jsonBody: { message: "Request body must be an array of vendors" } };
      }

      if (body.length === 0) {
        return { status: 400, jsonBody: { message: "Array cannot be empty" } };
      }

      const result = await vendorService.bulkImport(body);

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
      context.error("vendor.importList error", err);
      return this.toError(err);
    }
  }

  // GET /vendors/{id}
  async getOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const id = request.params.id;
      if (!id) return { status: 400, jsonBody: { message: "Missing id" } };

      const found = await vendorService.getById(id);
      if (!found) return { status: 404, jsonBody: { message: "Not found" } };

      return { status: 200, jsonBody: { data: found } };
    } catch (err: any) {
      context.error("vendor.getOne error", err);
      return this.toError(err);
    }
  }

  // GET /vendors?q=&status=&type=&skip=&take=
  async getMany(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const url = new URL(request.url);

      const query: QueryVendorDTO = {
        q: url.searchParams.get("q") ?? undefined,
        status: (url.searchParams.get("status") as VendorStatus) ?? undefined,
        type: (url.searchParams.get("type") as VendorType) ?? undefined,
        skip: url.searchParams.get("skip") ? Number(url.searchParams.get("skip")) : undefined,
        take: url.searchParams.get("take") ? Number(url.searchParams.get("take")) : undefined,
      };

      const { data, total } = await vendorService.find(query);
      //const data =await vendorService.findAll()
      return { status: 200, jsonBody: { data, total } };
    } catch (err: any) {
      context.error("vendor.getMany error", err);
      return this.toError(err);
    }
  }

  // PUT /vendors/{id}
  async putOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const id = request.params.id;
      if (!id) return { status: 400, jsonBody: { message: "Missing id" } };

      const body = (await request.json()) as UpdateVendorDTO;
      const updated = await vendorService.update(id, body);
      return { status: 200, jsonBody: { message: "OK", data: updated } };
    } catch (err: any) {
      context.error("vendor.putOne error", err);
      return this.toError(err);
    }
  }

  // DELETE /vendors/{id}
  async deleteOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const id = request.params.id;
      if (!id) return { status: 400, jsonBody: { message: "Missing id" } };

      await vendorService.delete(id);
      return { status: 204 };
    } catch (err: any) {
      context.error("vendor.deleteOne error", err);
      return this.toError(err);
    }
  }

  // GET /vendors/by-status/{status}
  async getByStatus(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const status = request.params.status as VendorStatus;
      if (!status || !["Active", "Inactive"].includes(status)) {
        return { status: 400, jsonBody: { message: "Invalid status. Must be 'Active' or 'Inactive'" } };
      }

      const vendors = await vendorService.findByStatus(status);
      return { status: 200, jsonBody: { data: vendors } };
    } catch (err: any) {
      context.error("vendor.getByStatus error", err);
      return this.toError(err);
    }
  }

  // GET /vendors/by-status-type/{status}/{type}
  async getByStatusAndType(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const status = request.params.status as VendorStatus;
      const type = request.params.type as VendorType;

      if (!status || !["Active", "Inactive"].includes(status)) {
        return { status: 400, jsonBody: { message: "Invalid status. Must be 'Active' or 'Inactive'" } };
      }

      if (!type) {
        return { status: 400, jsonBody: { message: "Type parameter is required" } };
      }

      const vendors = await vendorService.findByStatusAndType(status, type);
      return { status: 200, jsonBody: { data: vendors } };
    } catch (err: any) {
      context.error("vendor.getByStatusAndType error", err);
      return this.toError(err);
    }
  }

  // Mapeo de errores a HTTP
  private toError(err: any): HttpResponseInit {
    const msg = String(err?.message ?? "Internal error");
    const status =
      /not found/i.test(msg) ? 404 :
      /already exists/i.test(msg) ? 409 :
      /required|invalid/i.test(msg) ? 400 :
      500;

    return { status, jsonBody: { message: msg } };
  }  
    
}

export const vendorController = new VendorController();
  
app.http("PostVendor", {
  methods: ["POST"],
  route: vendorsRoute,
  authLevel: "function",
  handler: (req, ctx) => vendorController.postOne(req, ctx),
});

app.http("ImportVendors", {
  methods: ["POST"],
  route: `${vendorsRoute}/import`,
  authLevel: "function",
  handler: (req, ctx) => vendorController.importList(req, ctx),
});

app.http("GetVendor", {
  methods: ["GET"],
  route: `${vendorsRoute}/{id}`,
  authLevel: "function",
  handler: (req, ctx) => vendorController.getOne(req, ctx),
});

app.http("ListVendors", {
  methods: ["GET"],
  route: vendorsRoute,
  authLevel: "function",
  handler: (req, ctx) => vendorController.getMany(req, ctx),
});

app.http("PutVendor", {
  methods: ["PUT"],
  route: `${vendorsRoute}/{id}`,
  authLevel: "function",
  handler: (req, ctx) => vendorController.putOne(req, ctx),
});

app.http("DeleteVendor", {
  methods: ["DELETE"],
  route: `${vendorsRoute}/{id}`,
  authLevel: "function",
  handler: (req, ctx) => vendorController.deleteOne(req, ctx),
});

app.http("GetVendorsByStatus", {
  methods: ["GET"],
  route: `${vendorsRoute}/by-status/{status}`,
  authLevel: "function",
  handler: (req, ctx) => vendorController.getByStatus(req, ctx),
});

app.http("GetVendorsByStatusAndType", {
  methods: ["GET"],
  route: `${vendorsRoute}/by-status-type/{status}/{type}`,
  authLevel: "function",
  handler: (req, ctx) => vendorController.getByStatusAndType(req, ctx),
});
