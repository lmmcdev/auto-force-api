import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { LineItem, LineItemType } from "../entities/line-item.entity";
import { CreateLineItemDto } from "../dto/create-line-item.dto";
import { UpdateLineItemDto } from "../dto/update-line-item.dto";
import { lineItemService } from "../services/line-item.service";
import { QueryLineItemDto } from "../dto/query-line-item.dto";

const lineItemsRoute = "v1/line-items";

export class LineItemController {

  // POST /line-items
  async postOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const body = (await request.json()) as Omit<LineItem, "id" | "totalPrice" | "createdAt" | "updatedAt">;
      const created = await lineItemService.create(body);
      return { status: 201, jsonBody: { message: "Created", data: created } };
    } catch (err: any) {
      context.error("lineItem.postOne error", err);
      return this.toError(err);
    }
  }

  // POST /line-items/import
  async importList(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const body = (await request.json()) as LineItem[];

      if (!Array.isArray(body)) {
        return { status: 400, jsonBody: { message: "Request body must be an array of line items" } };
      }

      if (body.length === 0) {
        return { status: 400, jsonBody: { message: "Array cannot be empty" } };
      }

      const result = await lineItemService.bulkImport(body);

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

      const status = result.errors.length > 0 ? 207 : 201;

      return { status, jsonBody: response };
    } catch (err: any) {
      context.error("lineItem.importList error", err);
      return this.toError(err);
    }
  }

  // GET /line-items/{id}
  async getOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const id = request.params.id;
      if (!id) return { status: 400, jsonBody: { message: "Missing id" } };

      const found = await lineItemService.getById(id);
      if (!found) return { status: 404, jsonBody: { message: "Not found" } };

      return { status: 200, jsonBody: { data: found } };
    } catch (err: any) {
      context.error("lineItem.getOne error", err);
      return this.toError(err);
    }
  }

  // GET /line-items?q=&serviceTypeId=&invoiceId=&type=&taxable=&warranty=&skip=&take=
  async getMany(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const url = new URL(request.url);

      const query: QueryLineItemDto = {
        q: url.searchParams.get("q") ?? undefined,
        serviceTypeId: url.searchParams.get("serviceTypeId") ?? undefined,
        invoiceId: url.searchParams.get("invoiceId") ?? undefined,
        type: (url.searchParams.get("type") as LineItemType) ?? undefined,
        taxable: url.searchParams.get("taxable") === "true" ? true : url.searchParams.get("taxable") === "false" ? false : undefined,
        warranty: url.searchParams.get("warranty") === "true" ? true : url.searchParams.get("warranty") === "false" ? false : undefined,
        minUnitPrice: url.searchParams.get("minUnitPrice") ? Number(url.searchParams.get("minUnitPrice")) : undefined,
        maxUnitPrice: url.searchParams.get("maxUnitPrice") ? Number(url.searchParams.get("maxUnitPrice")) : undefined,
        minQuantity: url.searchParams.get("minQuantity") ? Number(url.searchParams.get("minQuantity")) : undefined,
        maxQuantity: url.searchParams.get("maxQuantity") ? Number(url.searchParams.get("maxQuantity")) : undefined,
        minTotalPrice: url.searchParams.get("minTotalPrice") ? Number(url.searchParams.get("minTotalPrice")) : undefined,
        maxTotalPrice: url.searchParams.get("maxTotalPrice") ? Number(url.searchParams.get("maxTotalPrice")) : undefined,
        minMileage: url.searchParams.get("minMileage") ? Number(url.searchParams.get("minMileage")) : undefined,
        maxMileage: url.searchParams.get("maxMileage") ? Number(url.searchParams.get("maxMileage")) : undefined,
        skip: url.searchParams.get("skip") ? Number(url.searchParams.get("skip")) : undefined,
        take: url.searchParams.get("take") ? Number(url.searchParams.get("take")) : undefined,
      };

      const { data, total } = await lineItemService.find(query);
      return { status: 200, jsonBody: { data, total } };
    } catch (err: any) {
      context.error("lineItem.getMany error", err);
      return this.toError(err);
    }
  }

  // PUT /line-items/{id}
  async putOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const id = request.params.id;
      if (!id) return { status: 400, jsonBody: { message: "Missing id" } };

      const body = (await request.json()) as UpdateLineItemDto;
      const updated = await lineItemService.update(id, body);
      return { status: 200, jsonBody: { message: "OK", data: updated } };
    } catch (err: any) {
      context.error("lineItem.putOne error", err);
      return this.toError(err);
    }
  }

  // DELETE /line-items/{id}
  async deleteOne(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const id = request.params.id;
      if (!id) return { status: 400, jsonBody: { message: "Missing id" } };

      await lineItemService.delete(id);
      return { status: 204 };
    } catch (err: any) {
      context.error("lineItem.deleteOne error", err);
      return this.toError(err);
    }
  }

  // GET /line-items/by-invoice/{invoiceId}
  async getByInvoiceId(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const invoiceId = request.params.invoiceId;
      if (!invoiceId) return { status: 400, jsonBody: { message: "Invoice ID parameter is required" } };

      const lineItems = await lineItemService.findByInvoiceId(invoiceId);
      return { status: 200, jsonBody: { data: lineItems } };
    } catch (err: any) {
      context.error("lineItem.getByInvoiceId error", err);
      return this.toError(err);
    }
  }

  // GET /line-items/by-service-type/{serviceTypeId}
  async getByServiceTypeId(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const serviceTypeId = request.params.serviceTypeId;
      if (!serviceTypeId) return { status: 400, jsonBody: { message: "Service type ID parameter is required" } };

      const lineItems = await lineItemService.findByServiceTypeId(serviceTypeId);
      return { status: 200, jsonBody: { data: lineItems } };
    } catch (err: any) {
      context.error("lineItem.getByServiceTypeId error", err);
      return this.toError(err);
    }
  }

  // GET /line-items/by-type/{type}
  async getByType(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const type = request.params.type as LineItemType;
      if (!type || !["Parts", "Labor"].includes(type)) {
        return { status: 400, jsonBody: { message: "Invalid type. Must be 'Parts' or 'Labor'" } };
      }

      const lineItems = await lineItemService.findByType(type);
      return { status: 200, jsonBody: { data: lineItems } };
    } catch (err: any) {
      context.error("lineItem.getByType error", err);
      return this.toError(err);
    }
  }

  // GET /line-items/taxable/{taxable}
  async getTaxable(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const taxableParam = request.params.taxable;
      if (taxableParam !== "true" && taxableParam !== "false") {
        return { status: 400, jsonBody: { message: "Invalid taxable parameter. Must be 'true' or 'false'" } };
      }

      const taxable = taxableParam === "true";
      const lineItems = await lineItemService.findTaxable(taxable);
      return { status: 200, jsonBody: { data: lineItems } };
    } catch (err: any) {
      context.error("lineItem.getTaxable error", err);
      return this.toError(err);
    }
  }

  // GET /line-items/warranty/{warranty}
  async getWithWarranty(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const warrantyParam = request.params.warranty;
      if (warrantyParam !== "true" && warrantyParam !== "false") {
        return { status: 400, jsonBody: { message: "Invalid warranty parameter. Must be 'true' or 'false'" } };
      }

      const warranty = warrantyParam === "true";
      const lineItems = await lineItemService.findWithWarranty(warranty);
      return { status: 200, jsonBody: { data: lineItems } };
    } catch (err: any) {
      context.error("lineItem.getWithWarranty error", err);
      return this.toError(err);
    }
  }

  // GET /line-items/filter/{serviceTypeId}/{type}/{unitPrice}
  async getByServiceTypeIdAndTypeAndUnitPrice(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const serviceTypeId = request.params.serviceTypeId;
      const type = request.params.type as LineItemType;
      const unitPrice = request.params.unitPrice;

      if (!serviceTypeId) {
        return { status: 400, jsonBody: { message: "Service type ID parameter is required" } };
      }

      if (!type || !["Parts", "Labor"].includes(type)) {
        return { status: 400, jsonBody: { message: "Invalid type. Must be 'Parts' or 'Labor'" } };
      }

      if (!unitPrice || isNaN(Number(unitPrice))) {
        return { status: 400, jsonBody: { message: "Unit price parameter is required and must be a valid number" } };
      }

      const unitPriceNum = Number(unitPrice);
      const lineItems = await lineItemService.findByServiceTypeIdAndTypeAndUnitPrice(serviceTypeId, type, unitPriceNum);
      return { status: 200, jsonBody: { data: lineItems } };
    } catch (err: any) {
      context.error("lineItem.getByServiceTypeIdAndTypeAndUnitPrice error", err);
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

export const lineItemController = new LineItemController();

// Basic CRUD endpoints
app.http("PostLineItem", {
  methods: ["POST"],
  route: lineItemsRoute,
  authLevel: "function",
  handler: (req, ctx) => lineItemController.postOne(req, ctx),
});

app.http("ImportLineItems", {
  methods: ["POST"],
  route: `${lineItemsRoute}/import`,
  authLevel: "function",
  handler: (req, ctx) => lineItemController.importList(req, ctx),
});

app.http("GetLineItem", {
  methods: ["GET"],
  route: `${lineItemsRoute}/{id}`,
  authLevel: "function",
  handler: (req, ctx) => lineItemController.getOne(req, ctx),
});

app.http("ListLineItems", {
  methods: ["GET"],
  route: lineItemsRoute,
  authLevel: "function",
  handler: (req, ctx) => lineItemController.getMany(req, ctx),
});

app.http("PutLineItem", {
  methods: ["PUT"],
  route: `${lineItemsRoute}/{id}`,
  authLevel: "function",
  handler: (req, ctx) => lineItemController.putOne(req, ctx),
});

app.http("DeleteLineItem", {
  methods: ["DELETE"],
  route: `${lineItemsRoute}/{id}`,
  authLevel: "function",
  handler: (req, ctx) => lineItemController.deleteOne(req, ctx),
});

// Additional filter endpoints
app.http("GetLineItemsByInvoice", {
  methods: ["GET"],
  route: `${lineItemsRoute}/by-invoice/{invoiceId}`,
  authLevel: "function",
  handler: (req, ctx) => lineItemController.getByInvoiceId(req, ctx),
});

app.http("GetLineItemsByServiceType", {
  methods: ["GET"],
  route: `${lineItemsRoute}/by-service-type/{serviceTypeId}`,
  authLevel: "function",
  handler: (req, ctx) => lineItemController.getByServiceTypeId(req, ctx),
});

app.http("GetLineItemsByType", {
  methods: ["GET"],
  route: `${lineItemsRoute}/by-type/{type}`,
  authLevel: "function",
  handler: (req, ctx) => lineItemController.getByType(req, ctx),
});

app.http("GetLineItemsByTaxable", {
  methods: ["GET"],
  route: `${lineItemsRoute}/taxable/{taxable}`,
  authLevel: "function",
  handler: (req, ctx) => lineItemController.getTaxable(req, ctx),
});

app.http("GetLineItemsWithWarranty", {
  methods: ["GET"],
  route: `${lineItemsRoute}/warranty/{warranty}`,
  authLevel: "function",
  handler: (req, ctx) => lineItemController.getWithWarranty(req, ctx),
});

app.http("GetLineItemsByServiceTypeAndTypeAndUnitPrice", {
  methods: ["GET"],
  route: `${lineItemsRoute}/filter/{serviceTypeId}/{type}/{unitPrice}`,
  authLevel: "function",
  handler: (req, ctx) => lineItemController.getByServiceTypeIdAndTypeAndUnitPrice(req, ctx),
});