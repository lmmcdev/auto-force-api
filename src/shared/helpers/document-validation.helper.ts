import { Vehicle } from '../../modules/vehicle/entities/vehicle.entity';
import { DocumentType } from '../../modules/document/entities/document.entity';

/**
 * Extracts year from a date string
 * @param dateString ISO date string
 * @returns Year as number or null if dateString is not provided
 */
export function extractYear(dateString?: string): number | null {
  if (!dateString) return null;
  return new Date(dateString).getFullYear();
}

/**
 * Extracts month from a date string (1-12)
 * @param dateString ISO date string
 * @returns Month as number (1-12) or null if dateString is not provided
 */
export function extractMonth(dateString?: string): number | null {
  if (!dateString) return null;
  return new Date(dateString).getMonth() + 1;
}

/**
 * Validates that document start date is not earlier than vehicle year
 * @param startDate Document start date
 * @param vehicle Vehicle entity
 * @throws Error if validation fails
 */
export function validateDocumentStartDate(startDate: string | undefined, vehicle: Vehicle): void {
  const documentYear = extractYear(startDate);

  if (documentYear && vehicle.year && documentYear < vehicle.year) {
    throw new Error(
      `Start year ${documentYear} cannot be earlier than vehicle year ${vehicle.year} for vehicle ID ${vehicle.id}`
    );
  }
}

/**
 * Validates that expiration date is after start date
 * @param startDate Document start date
 * @param expirationDate Document expiration date
 * @throws Error if validation fails
 */
export function validateExpirationDate(startDate?: string, expirationDate?: string): void {
  if (!startDate || !expirationDate) return;

  const start = new Date(startDate);
  const expiration = new Date(expirationDate);

  if (expiration <= start) {
    throw new Error(`Expiration date ${expirationDate} must be after start date ${startDate}`);
  }
}

/**
 * Generates a storage path for document files
 * @param vehicleId Vehicle ID
 * @param startDate Document start date (optional)
 * @returns Storage path string in format: documents/vehicles/{vehicleId}/{year}/{month}
 */
export function generateDocumentStoragePath(vehicleId: string, startDate?: string): string {
  const year = extractYear(startDate) ?? 'unknown';
  const month = extractMonth(startDate) ?? 'unknown';

  return `documents/vehicles/${vehicleId}/${year}/${month}`;
}

/**
 * Generates a standardized file name based on document type
 * @param documentType Type of document
 * @param vehicleId Vehicle ID
 * @param originalFileName Original file name (to extract extension)
 * @param startDate Optional start date for versioning
 * @returns Standardized file name
 *
 * @example
 * generateStandardFileName('Truck Insurance Liability', 'VEH-123', 'scan.pdf', '2024-01-15')
 * // Returns: 'VEH-123_insurance_2024-01-15.pdf'
 *
 * generateStandardFileName('Registration', 'VEH-456', 'document.png')
 * // Returns: 'VEH-456_registration.png'
 */
export function generateStandardFileName(
  documentType: DocumentType,
  vehicleId: string,
  originalFileName: string,
  startDate?: string
): string {
  // Extract file extension
  const extension = originalFileName.includes('.') ? originalFileName.substring(originalFileName.lastIndexOf('.')) : '';

  // Map document types to short codes
  const typeMap: Record<DocumentType, string> = {
    'Truck Insurance Liability': 'insurance',
    'Lease Paperwork': 'lease',
    Registration: 'registration',
    'Annual Inspection': 'annual-inspection',
    'Inspeccion Alivi': 'inspeccion-alivi',
    'Custom Document': 'custom',
  };

  const typeCode = typeMap[documentType] || 'document';

  // Build file name parts
  const parts = [vehicleId, typeCode];

  // Add date if provided
  if (startDate) {
    parts.push(startDate);
  }

  // Join parts and add extension
  return `${parts.join('_')}${extension}`;
}

/**
 * Sanitizes a file name by removing invalid characters and spaces
 * @param fileName Original file name
 * @returns Sanitized file name safe for storage
 *
 * @example
 * sanitizeFileName('My Document (2024).pdf')
 * // Returns: 'my-document-2024.pdf'
 */
export function sanitizeFileName(fileName: string): string {
  // Extract extension
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';

  // Sanitize name: lowercase, replace spaces and special chars with hyphens
  const sanitizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .replace(/-{2,}/g, '-'); // Replace multiple hyphens with single

  return `${sanitizedName}${extension.toLowerCase()}`;
}

export function generateInvoiceStoragePath(vehicleId?: string, startDate?: string): string {
  const year = extractYear(startDate) ?? 'unknown';
  const month = extractMonth(startDate) ?? 'unknown';
  const vehicleIdPart = vehicleId || 'others';

  return `invoices/vehicles/${vehicleIdPart}/${year}/${month}`;
}
