# Helper Functions

This directory contains reusable helper and utility functions used across the application.

## Document Validation Helpers

Located in [document-validation.helper.ts](./document-validation.helper.ts)

### Date Extraction Functions

#### `extractYear(dateString?: string): number | null`

Extracts the year from an ISO date string.

```typescript
import { extractYear } from '@/shared/helpers';

const year = extractYear('2024-01-15'); // 2024
const nullYear = extractYear(undefined); // null
```

#### `extractMonth(dateString?: string): number | null`

Extracts the month (1-12) from an ISO date string.

```typescript
import { extractMonth } from '@/shared/helpers';

const month = extractMonth('2024-01-15'); // 1 (January)
const month2 = extractMonth('2024-12-31'); // 12 (December)
const nullMonth = extractMonth(undefined); // null
```

### Validation Functions

#### `validateDocumentStartDate(startDate: string | undefined, vehicle: Vehicle): void`

Validates that a document's start date year is not earlier than the vehicle's manufacturing year.

**Throws:** `Error` if the document start year is earlier than the vehicle year.

```typescript
import { validateDocumentStartDate } from '@/shared/helpers';

const vehicle = {
  id: 'VEH-123',
  year: 2020,
  // ... other fields
};

// Valid - document year >= vehicle year
validateDocumentStartDate('2024-01-15', vehicle); // OK

// Invalid - document year < vehicle year
validateDocumentStartDate('2019-01-15', vehicle); // Throws Error
```

**Error Message:**
```
Start year 2019 cannot be earlier than vehicle year 2020 for vehicle ID VEH-123
```

#### `validateExpirationDate(startDate?: string, expirationDate?: string): void`

Validates that an expiration date is after the start date.

**Throws:** `Error` if expiration date is before or equal to start date.

```typescript
import { validateExpirationDate } from '@/shared/helpers';

// Valid - expiration after start
validateExpirationDate('2024-01-15', '2025-01-15'); // OK

// Invalid - expiration before start
validateExpirationDate('2024-01-15', '2023-12-31'); // Throws Error

// Invalid - expiration same as start
validateExpirationDate('2024-01-15', '2024-01-15'); // Throws Error

// Skips validation if either date is missing
validateExpirationDate(undefined, '2025-01-15'); // OK
validateExpirationDate('2024-01-15', undefined); // OK
```

**Error Message:**
```
Expiration date 2023-12-31 must be after start date 2024-01-15
```

### Path Generation Functions

#### `generateDocumentStoragePath(vehicleId: string, startDate?: string): string`

Generates a standardized storage path for document files in Azure Blob Storage.

**Path Format:** `documents/vehicles/{vehicleId}/{year}/{month}`

```typescript
import { generateDocumentStoragePath } from '@/shared/helpers';

// With start date
const path1 = generateDocumentStoragePath('VEH-123', '2024-01-15');
// Result: 'documents/vehicles/VEH-123/2024/1'

// Without start date
const path2 = generateDocumentStoragePath('VEH-456');
// Result: 'documents/vehicles/VEH-456/unknown/unknown'

// Edge cases
const path3 = generateDocumentStoragePath('VEH-789', '2024-12-31');
// Result: 'documents/vehicles/VEH-789/2024/12'
```

### File Name Generation Functions

#### `generateStandardFileName(documentType: DocumentType, vehicleId: string, originalFileName: string, startDate?: string): string`

Generates a standardized file name based on document type, vehicle ID, and date. The original file extension is preserved.

**File Name Format:** `{vehicleId}_{typeCode}_{date}.{extension}`

**Document Type Codes:**
- `Truck Insurance Liability` → `insurance`
- `Lease Paperwork` → `lease`
- `Registration` → `registration`
- `Annual Inspection` → `annual-inspection`
- `Inspeccion Alivi` → `inspeccion-alivi`
- `Custom Document` → `custom`

```typescript
import { generateStandardFileName } from '@/shared/helpers';

// With start date
const name1 = generateStandardFileName(
  'Truck Insurance Liability',
  'VEH-123',
  'scan.pdf',
  '2024-01-15'
);
// Result: 'VEH-123_insurance_2024-01-15.pdf'

// Without start date
const name2 = generateStandardFileName(
  'Registration',
  'VEH-456',
  'document.png'
);
// Result: 'VEH-456_registration.png'

// Annual inspection with date
const name3 = generateStandardFileName(
  'Annual Inspection',
  'VEH-789',
  'inspection_report.pdf',
  '2024-06-30'
);
// Result: 'VEH-789_annual-inspection_2024-06-30.pdf'
```

#### `sanitizeFileName(fileName: string): string`

Sanitizes a file name by converting to lowercase and replacing spaces and special characters with hyphens.

**Rules:**
- Converts to lowercase
- Replaces non-alphanumeric characters with hyphens
- Removes leading/trailing hyphens
- Collapses multiple consecutive hyphens into one
- Preserves file extension

```typescript
import { sanitizeFileName } from '@/shared/helpers';

const safe1 = sanitizeFileName('My Document (2024).pdf');
// Result: 'my-document-2024.pdf'

const safe2 = sanitizeFileName('Insurance Policy #12345!.PDF');
// Result: 'insurance-policy-12345.pdf'

const safe3 = sanitizeFileName('file___with___spaces.txt');
// Result: 'file-with-spaces.txt'
```

## Usage Examples

### Complete Document Upload Flow

```typescript
import {
  validateDocumentStartDate,
  validateExpirationDate,
  generateDocumentStoragePath,
  generateStandardFileName,
} from '@/shared/helpers';

async function uploadDocumentToVehicle(
  vehicleId: string,
  documentType: DocumentType,
  originalFileName: string,
  startDate: string,
  expirationDate: string,
  fileBuffer: Buffer
) {
  // 1. Get vehicle
  const vehicle = await vehicleService.getById(vehicleId);
  if (!vehicle) {
    throw new Error(`Vehicle ${vehicleId} not found`);
  }

  // 2. Validate dates
  validateDocumentStartDate(startDate, vehicle);
  validateExpirationDate(startDate, expirationDate);

  // 3. Generate standardized file name
  const standardFileName = generateStandardFileName(
    documentType,
    vehicleId,
    originalFileName,
    startDate
  );

  // 4. Generate storage path
  const storagePath = generateDocumentStoragePath(vehicleId, startDate);

  // 5. Upload file with standardized name
  const uploadedFile = await fileUploadService.uploadFile({
    file: fileBuffer,
    fileName: standardFileName,
    container: 'transportation',
    path: storagePath,
    metadata: {
      vehicleId,
      documentType,
      originalFileName,
      uploadedAt: new Date().toISOString(),
    },
  });

  // 6. Create document record
  // ...
}
```

### Error Handling

```typescript
import {
  validateDocumentStartDate,
  validateExpirationDate,
} from '@/shared/helpers';

try {
  validateDocumentStartDate(startDate, vehicle);
  validateExpirationDate(startDate, expirationDate);

  // Proceed with document creation
} catch (error) {
  if (error instanceof Error) {
    // Handle validation errors
    console.error('Validation failed:', error.message);
    return {
      status: 400,
      jsonBody: { message: error.message },
    };
  }
}
```

## Benefits

1. **Reusability** - Validation logic can be used in multiple services
2. **Testability** - Pure functions are easy to unit test
3. **Maintainability** - Changes to validation logic happen in one place
4. **Consistency** - Ensures uniform validation across the application
5. **Clarity** - Descriptive function names make code self-documenting

## Testing

These helper functions are designed to be easily testable. Example test cases:

```typescript
describe('validateDocumentStartDate', () => {
  it('should pass when document year equals vehicle year', () => {
    const vehicle = { id: 'VEH-1', year: 2020 };
    expect(() => validateDocumentStartDate('2020-01-01', vehicle)).not.toThrow();
  });

  it('should pass when document year is after vehicle year', () => {
    const vehicle = { id: 'VEH-1', year: 2020 };
    expect(() => validateDocumentStartDate('2024-01-01', vehicle)).not.toThrow();
  });

  it('should throw when document year is before vehicle year', () => {
    const vehicle = { id: 'VEH-1', year: 2020 };
    expect(() => validateDocumentStartDate('2019-01-01', vehicle)).toThrow();
  });

  it('should pass when startDate is undefined', () => {
    const vehicle = { id: 'VEH-1', year: 2020 };
    expect(() => validateDocumentStartDate(undefined, vehicle)).not.toThrow();
  });
});
```

## Future Enhancements

Potential additions to this module:

- Date formatting utilities
- Date range validation
- Business day calculations
- Timezone conversions
- Document type-specific validations
