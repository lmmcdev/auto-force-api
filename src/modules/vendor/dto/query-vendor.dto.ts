import { Vendor,VendorAddress,VendorContact,VendorStatus,VendorType } from "../entities/vendor.entity";

export interface QueryVendorDTO{
  /**
   * Texto de búsqueda parcial en el nombre del vendor
   * Ej: q=acme devolverá "Acme Auto Shop"
   */
  q?: string;

  /**
   * Filtrar por estado (Active | Inactive)
   */
  status?: VendorStatus;

  /**
   * Filtrar por tipo de proveedor
   * Ej: ServiceProvider | PartsSupplier | Insurance | DMV | Other
   */
  type?: VendorType;

  /**
   * Número de registros a saltar (para paginación)
   */
  skip?: number;

  /**
   * Número máximo de registros a devolver (para paginación)
   */
  take?: number;

  /**
   * Tamaño de página para paginación con Cosmos DB (1-1000)
   */
  pageSize?: number;

  /**
   * Token de continuación para la siguiente página de resultados
   */
  continuationToken?: string;

}