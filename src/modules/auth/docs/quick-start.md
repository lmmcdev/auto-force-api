# Auth Module Quick Start

This guide helps you get started with the auth module using your Azure AD environment variables.

## Environment Variables

After registering your API in Azure AD, you'll have these values:

```bash
# Required variables
CLIENT_ID=your-client-id-from-azure-ad
TENANT_ID=your-tenant-id-from-azure-ad
APP_ID_URI=api://your-app-id-uri
ALLOWED_ROLES=Admin,Approver,Manager,User
```

## Setup Steps

### 1. Configure Environment Variables

Copy the `.env.template` file and fill in your values:

```bash
cp src/modules/auth/config/.env.template .env.local
```

Then edit `.env.local` with your actual values:

```bash
CLIENT_ID=12345678-1234-1234-1234-123456789012
TENANT_ID=87654321-4321-4321-4321-210987654321
APP_ID_URI=api://auto-force-api
ALLOWED_ROLES=Admin,Approver,Manager,User
```

### 2. Deploy Your Function App

Deploy your function app with the environment variables:

```bash
# Using Azure CLI
func azure functionapp publish your-function-app-name --publish-local-settings
```

Or set them manually in Azure Portal:
1. Go to your Function App
2. Configuration → Application settings
3. Add each environment variable

### 3. Test Configuration

#### Check Configuration Endpoint
```bash
GET https://your-function-app.azurewebsites.net/api/v1/auth/config
```

Expected response:
```json
{
  "message": "Authentication configuration retrieved",
  "data": {
    "tenantId": "87654321-4321-4321-4321-210987654321",
    "appIdUri": "api://auto-force-api",
    "allowedRoles": ["Admin", "Approver", "Manager", "User"],
    "issuer": "https://login.microsoftonline.com/87654321-4321-4321-4321-210987654321/v2.0",
    "clientId": "12345678...",
    "configStatus": "valid"
  }
}
```

#### Check Health Endpoint
```bash
GET https://your-function-app.azurewebsites.net/api/v1/auth/health
```

Expected response:
```json
{
  "message": "Auth service is healthy",
  "data": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "authenticated": false,
    "configurationValid": true,
    "service": "auth-service",
    "version": "1.0.0"
  }
}
```

### 4. Test Authentication

#### Get Current User (requires login)
```bash
GET https://your-function-app.azurewebsites.net/api/v1/auth/me
```

This will redirect to Microsoft login if not authenticated.

After login, expected response:
```json
{
  "message": "User authenticated successfully",
  "data": {
    "oid": "user-1234",
    "name": "Andres Perez",
    "email": "andres.perez@clmmail.com",
    "roles": ["Admin", "Approver"]
  }
}
```

## Using in Your Controllers

### Basic Authentication

```typescript
import { AuthMiddleware } from '@/modules/auth';

export class VehicleController {
  async getVehicles(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      // Require authentication
      const user = AuthMiddleware.requireAuth(request);

      // Your existing logic
      const vehicles = await vehicleService.findAll();
      return { status: 200, jsonBody: { data: vehicles } };
    } catch (error) {
      if (error.name === 'AuthenticationError') {
        return { status: 401, jsonBody: { message: error.message } };
      }
      // Your existing error handling
    }
  }
}
```

### Role-Based Access

```typescript
export class AdminController {
  async deleteVehicle(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      // Require Admin role
      const user = AuthMiddleware.requireRole(request, ['Admin']);

      // Your delete logic
      await vehicleService.delete(id);
      return { status: 204 };
    } catch (error) {
      if (error.name === 'AuthorizationError') {
        return { status: 403, jsonBody: { message: error.message } };
      }
      // Handle other errors
    }
  }
}
```

### User-Specific Resources

```typescript
export class InvoiceController {
  async getUserInvoices(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const userId = request.params.userId;

      // Allow users to see their own invoices, or admins to see any
      const user = AuthMiddleware.requireOwnershipOrAdmin(request, userId);

      const invoices = await invoiceService.findByUserId(userId);
      return { status: 200, jsonBody: { data: invoices } };
    } catch (error) {
      // Handle auth errors
    }
  }
}
```

## Role Configuration

Your Azure AD app should have these roles configured:

| Role | Description | Typical Users |
|------|-------------|---------------|
| `Admin` | Full system access | System administrators |
| `Approver` | Can approve invoices | Managers, supervisors |
| `Manager` | Team management access | Department managers |
| `User` | Basic user access | Regular employees |

## Common Issues

### ❌ Configuration Not Found
**Error**: `"Authentication configuration not found"`

**Solution**:
1. Check environment variables are set
2. Restart your Function App
3. Verify variable names match exactly

### ❌ Invalid Role
**Error**: `"Invalid roles specified"`

**Solution**:
1. Check `ALLOWED_ROLES` includes the role you're using
2. Verify role names match Azure AD exactly (case-sensitive)

### ❌ User Not Authenticated
**Error**: `"No authentication information found"`

**Solution**:
1. Ensure Easy Auth is enabled in Azure
2. Check user is logged in
3. Verify `x-ms-client-principal` header is present

### ❌ Access Denied
**Error**: `"Access denied. Required roles: Admin"`

**Solution**:
1. Check user has the required role in Azure AD
2. Verify role assignment in Enterprise Applications
3. User may need to log out and back in for new roles

## Testing with Postman

### Setup Authentication
1. Set request URL to your auth endpoint
2. Azure will redirect to login
3. Complete login in browser
4. Copy cookies/headers for subsequent requests

### Headers to Include
```
Cookie: AppServiceAuthSession=...
x-ms-client-principal: ...
```

## Next Steps

1. ✅ Configure environment variables
2. ✅ Test configuration endpoints
3. ✅ Test authentication flow
4. ✅ Add auth to existing controllers
5. ✅ Configure user roles in Azure AD
6. ✅ Test role-based access
7. ✅ Set up monitoring and logging

## Support

- Check Azure AD sign-in logs for authentication issues
- Review Function App logs for configuration problems
- Use `/v1/auth/config` endpoint to validate setup
- Refer to `azure-ad-setup.md` for detailed Azure configuration