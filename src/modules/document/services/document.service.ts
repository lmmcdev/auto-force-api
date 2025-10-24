import { SqlQuerySpec } from "@azure/cosmos";
import { getDocumentsContainer } from "../../../infra/cosmos";
import { Document, DocumentType } from "../entities/document.entity";
import { CreateDocumentDto } from "../dto/create-document.dto";
import { UpdateDocumentDto } from "../dto/update-document.dto";
import { QueryDocumentDto } from "../dto/query-document.dto";

function nowIso() {
  return new Date().toISOString();
}

// Helper para remover campos undefined (Cosmos no acepta undefined, solo null)
function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  const cleaned: Record<string, unknown> | unknown[] = Array.isArray(obj)
    ? []
    : {};
  for (const key in obj) {
    const value = obj[key];
    if (value !== undefined) {
      if (Array.isArray(cleaned)) {
        cleaned.push(typeof value === "object" ? cleanUndefined(value) : value);
      } else {
        cleaned[key] =
          typeof value === "object" ? cleanUndefined(value) : value;
      }
    }
  }
  return cleaned as T;
}

export class DocumentService {
  private async getContainer() {
    return await getDocumentsContainer();
  }

  private generateId(): string {
    return `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Create a new document
   */
  async create(payload: CreateDocumentDto): Promise<Document> {
    if (!payload.type) throw new Error("type is required");

    const doc: Document = {
      id: this.generateId(),
      vehicleId: payload.vehicleId || null,
      type: payload.type,
      startDate: payload.startDate || null,
      expirationDate: payload.expirationDate || null,
      file: payload.file ? cleanUndefined(payload.file) : null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    const cleanDoc = cleanUndefined(doc);
    const container = await this.getContainer();
    await container.items.create(cleanDoc);
    return cleanDoc;
  }

  /**
   * Get document by ID
   */
  async getById(id: string): Promise<Document | null> {
    try {
      const container = await this.getContainer();
      const { resource } = await container
        .item(id, id)
        .read<Document>();
      return resource ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Find documents with filters and pagination
   */
  async find(
    query: QueryDocumentDto = {}
  ): Promise<{ data: Document[]; total: number }> {
    const take = Math.max(1, Math.min(query.take ?? 50, 1000));
    const skip = Math.max(0, query.skip ?? 0);

    let whereClause = "WHERE 1=1";
    const parameters: Array<{ name: string; value: any }> = [];

    if (query.vehicleId) {
      whereClause += " AND c.vehicleId = @vehicleId";
      parameters.push({ name: "@vehicleId", value: query.vehicleId });
    }

    if (query.type) {
      whereClause += " AND c.type = @type";
      parameters.push({ name: "@type", value: query.type });
    }

    if (query.startDateFrom) {
      whereClause += " AND c.startDate >= @startDateFrom";
      parameters.push({ name: "@startDateFrom", value: query.startDateFrom });
    }

    if (query.startDateTo) {
      whereClause += " AND c.startDate <= @startDateTo";
      parameters.push({ name: "@startDateTo", value: query.startDateTo });
    }

    if (query.expirationDateFrom) {
      whereClause += " AND c.expirationDate >= @expirationDateFrom";
      parameters.push({
        name: "@expirationDateFrom",
        value: query.expirationDateFrom,
      });
    }

    if (query.expirationDateTo) {
      whereClause += " AND c.expirationDate <= @expirationDateTo";
      parameters.push({
        name: "@expirationDateTo",
        value: query.expirationDateTo,
      });
    }

    // Filter expired documents
    if (query.expired !== undefined) {
      const now = new Date().toISOString();
      if (query.expired) {
        whereClause += " AND c.expirationDate < @now";
        parameters.push({ name: "@now", value: now });
      } else {
        whereClause += " AND (c.expirationDate >= @now OR c.expirationDate = null)";
        parameters.push({ name: "@now", value: now });
      }
    }

    // Filter documents expiring soon
    if (query.expiringSoon) {
      const now = new Date();
      const futureDate = new Date(
        now.getTime() + query.expiringSoon * 24 * 60 * 60 * 1000
      );
      whereClause += " AND c.expirationDate >= @now AND c.expirationDate <= @futureDate";
      parameters.push({ name: "@now", value: now.toISOString() });
      parameters.push({ name: "@futureDate", value: futureDate.toISOString() });
    }

    // General search
    if (query.q && query.q.trim()) {
      whereClause += " AND CONTAINS(LOWER(c.type), LOWER(@q))";
      parameters.push({ name: "@q", value: query.q.trim() });
    }

    // Count query
    const container = await this.getContainer();
    const countQuery: SqlQuerySpec = {
      query: `SELECT VALUE COUNT(1) FROM c ${whereClause}`,
      parameters,
    };
    const { resources: countRes } = await container.items
      .query<number>(countQuery)
      .fetchAll();
    const total = countRes[0] || 0;

    // Data query with pagination
    const dataQuery: SqlQuerySpec = {
      query: `SELECT * FROM c ${whereClause} ORDER BY c.createdAt DESC OFFSET ${skip} LIMIT ${take}`,
      parameters,
    };
    const { resources: data } = await container.items
      .query<Document>(dataQuery)
      .fetchAll();

    return { data, total };
  }

  /**
   * Find all documents
   */
  async findAll(): Promise<Document[]> {
    const container = await this.getContainer();
    const query: SqlQuerySpec = {
      query: "SELECT * FROM c ORDER BY c.createdAt DESC",
    };
    const { resources } = await container.items
      .query<Document>(query)
      .fetchAll();
    return resources;
  }

  /**
   * Find documents by vehicle ID
   */
  async findByVehicleId(vehicleId: string): Promise<Document[]> {
    const container = await this.getContainer();
    const query: SqlQuerySpec = {
      query: "SELECT * FROM c WHERE c.vehicleId = @vehicleId ORDER BY c.createdAt DESC",
      parameters: [{ name: "@vehicleId", value: vehicleId }],
    };
    const { resources } = await container.items
      .query<Document>(query)
      .fetchAll();
    return resources;
  }

  /**
   * Find documents by type
   */
  async findByType(type: DocumentType): Promise<Document[]> {
    const container = await this.getContainer();
    const query: SqlQuerySpec = {
      query: "SELECT * FROM c WHERE c.type = @type ORDER BY c.createdAt DESC",
      parameters: [{ name: "@type", value: type }],
    };
    const { resources } = await container.items
      .query<Document>(query)
      .fetchAll();
    return resources;
  }

  /**
   * Find expired documents
   */
  async findExpired(): Promise<Document[]> {
    const container = await this.getContainer();
    const now = new Date().toISOString();
    const query: SqlQuerySpec = {
      query: "SELECT * FROM c WHERE c.expirationDate < @now ORDER BY c.expirationDate ASC",
      parameters: [{ name: "@now", value: now }],
    };
    const { resources } = await container.items
      .query<Document>(query)
      .fetchAll();
    return resources;
  }

  /**
   * Find documents expiring soon
   */
  async findExpiringSoon(days: number): Promise<Document[]> {
    const container = await this.getContainer();
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const query: SqlQuerySpec = {
      query:
        "SELECT * FROM c WHERE c.expirationDate >= @now AND c.expirationDate <= @futureDate ORDER BY c.expirationDate ASC",
      parameters: [
        { name: "@now", value: now.toISOString() },
        { name: "@futureDate", value: futureDate.toISOString() },
      ],
    };
    const { resources } = await container.items
      .query<Document>(query)
      .fetchAll();
    return resources;
  }

  /**
   * Update a document
   */
  async update(id: string, payload: UpdateDocumentDto): Promise<Document> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("document not found");

    const updated: Document = {
      ...existing,
      vehicleId: payload.vehicleId !== undefined ? payload.vehicleId : existing.vehicleId,
      type: payload.type || existing.type,
      startDate: payload.startDate !== undefined ? payload.startDate : existing.startDate,
      expirationDate:
        payload.expirationDate !== undefined
          ? payload.expirationDate
          : existing.expirationDate,
      file: payload.file !== undefined ? cleanUndefined(payload.file) : existing.file,
      updatedAt: nowIso(),
    };

    const cleanDoc = cleanUndefined(updated);
    const container = await this.getContainer();
    await container.item(id, id).replace(cleanDoc);
    return cleanDoc;
  }

  /**
   * Delete a document
   */
  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("document not found");
    const container = await this.getContainer();
    await container.item(id, id).delete();
  }

  /**
   * Bulk import documents
   */
  async bulkImport(
    documents: Document[]
  ): Promise<{ success: Document[]; errors: Array<{ item: Document; error: string }> }> {
    const success: Document[] = [];
    const errors: Array<{ item: Document; error: string }> = [];

    for (const doc of documents) {
      try {
        const created = await this.create(doc);
        success.push(created);
      } catch (err: any) {
        errors.push({
          item: doc,
          error: err?.message || "Unknown error",
        });
      }
    }

    return { success, errors };
  }
}

export const documentService = new DocumentService();
