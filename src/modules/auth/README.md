# Authentication Module

This module provides Azure Active Directory (Microsoft Entra ID) authentication integration for Azure Functions using Easy Auth (App Service Authentication).

## Features

- ✅ Extract user information from `x-ms-client-principal` header
- ✅ Type-safe user claims and authentication context
- ✅ Role-based access control (RBAC)
- ✅ Resource ownership validation
- ✅ Middleware helpers for easy integration
- ✅ Comprehensive error handling
- ✅ Azure Functions v4 compatible

## Quick Start

### 1. Import the module

```typescript
import { authService, getUser, AuthMiddleware } from '@/modules/auth';
```

### 2. Basic usage in a controller

```typescript
import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { authService } from '@/modules/auth';

export class MyController {
  async protectedEndpoint(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      // Require authentication
      const user = authService.getAuthenticatedUser(request);

      return {
        status: 200,
        jsonBody: {
          message: `Hello ${user.name}!`,
          user: user
        }
      };
    } catch (error) {
      context.error("Error:", error);
      return { status: 401, jsonBody: { message: "Unauthorized" } };
    }
  }
}
```

### 3. Role-based protection

```typescript
export class AdminController {
  async adminOnlyEndpoint(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      // Require Admin role
      const user = AuthMiddleware.requireRole(request, ['Admin']);

      return {
        status: 200,
        jsonBody: { message: "Admin access granted", user }
      };
    } catch (error) {
      return { status: 403, jsonBody: { message: "Access denied" } };
    }
  }
}
```

## Available Endpoints

The module automatically registers these endpoints:

- `GET /v1/auth/me` - Get current user information
- `GET /v1/auth/context` - Get full authentication context
- `GET /v1/auth/roles` - Get user roles
- `GET /v1/auth/principal` - Get raw client principal (debug)
- `POST /v1/auth/check-role` - Check if user has specific role
- `POST /v1/auth/require-role` - Test endpoint requiring specific role
- `GET /v1/auth/health` - Health check

## API Reference

### AuthService

Main service for authentication operations:

```typescript
// Get authenticated user (throws if not authenticated)
const user = authService.getAuthenticatedUser(request);

// Get user or null (doesn't throw)
const user = authService.getAuthenticatedUserOrNull(request);

// Check authentication status
const isAuth = authService.getAuthContext(request).isAuthenticated;

// Require specific role
authService.requireRole(request, ['Admin', 'Approver']);

// Check if user has role
const hasAdmin = authService.hasRole(request, 'Admin');

// Require resource ownership or admin role
authService.requireOwnershipOrRole(request, resourceUserId, ['Admin']);
```

### AuthMiddleware

Helper functions for common authentication patterns:

```typescript
// Basic authentication
const user = AuthMiddleware.requireAuth(request);

// Role-based authentication
const user = AuthMiddleware.requireRole(request, ['Admin']);
const user = AuthMiddleware.requireAllRoles(request, ['Admin', 'Approver']);

// Resource ownership
const user = AuthMiddleware.requireOwnershipOrAdmin(request, resourceUserId);

// Optional authentication
const user = AuthMiddleware.optionalAuth(request); // returns null if not authenticated
```

### Utility Functions

Direct utility functions for advanced usage:

```typescript
import { getUser, getUserOrNull, isAuthenticated } from '@/modules/auth';

// Get user (throws AuthenticationError if not authenticated)
const user = getUser(request);

// Get user or null
const user = getUserOrNull(request);

// Check if authenticated
const isAuth = isAuthenticated(request);
```

## Data Types

### AuthenticatedUser

```typescript
interface AuthenticatedUser {
  oid: string;      // Object ID (unique identifier)
  name: string;     // Display name
  email: string;    // Email address
  roles: string[];  // User roles
}
```

### Example Response

```json
{
  "oid": "user-1234",
  "name": "Andres Perez",
  "email": "andres.perez@clmmail.com",
  "roles": ["Admin", "Approver"]
}
```

## Error Handling

The module provides specific error types:

```typescript
try {
  const user = authService.getAuthenticatedUser(request);
} catch (error) {
  if (error instanceof AuthenticationError) {
    // 401 - Not authenticated
    return { status: 401, jsonBody: { message: error.message } };
  }
  if (error instanceof AuthorizationError) {
    // 403 - Authenticated but insufficient permissions
    return { status: 403, jsonBody: { message: error.message } };
  }
}
```

## Azure Configuration

### 1. Enable App Service Authentication

In your Azure Function App:

1. Go to Authentication/Authorization
2. Turn on App Service Authentication
3. Configure Azure Active Directory provider
4. Set "Action when request is not authenticated" to your preference

### 2. Configure Azure AD

1. Register your application in Azure AD
2. Configure redirect URIs
3. Set up API permissions if needed
4. Configure roles in the app manifest

### 3. Local Development

For local development, you can mock the `x-ms-client-principal` header:

```typescript
// Create a mock principal for testing
const mockPrincipal = {
  auth_typ: "aad",
  name_typ: "name",
  role_typ: "roles",
  claims: [
    { typ: "oid", val: "user-123" },
    { typ: "name", val: "Test User" },
    { typ: "email", val: "test@example.com" },
    { typ: "roles", val: JSON.stringify(["Admin"]) }
  ]
};

// Base64 encode for header
const header = Buffer.from(JSON.stringify(mockPrincipal)).toString('base64');
```

## Common Patterns

### Protecting an entire controller

```typescript
export class ProtectedController {
  async endpoint1(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const user = AuthMiddleware.requireAuth(request);
    // ... endpoint logic
  }

  async adminEndpoint(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const user = AuthMiddleware.requireRole(request, ['Admin']);
    // ... admin logic
  }
}
```

### User-specific resources

```typescript
export class UserResourceController {
  async getUserData(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const userId = request.params.userId;

    // Allow users to access their own data or admins to access any data
    const user = AuthMiddleware.requireOwnershipOrAdmin(request, userId);

    // ... fetch user data
  }
}
```

### Optional authentication

```typescript
export class PublicController {
  async publicEndpoint(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const user = AuthMiddleware.optionalAuth(request);

    if (user) {
      // Personalized response for authenticated users
      return { status: 200, jsonBody: { message: `Hello ${user.name}!` } };
    } else {
      // Generic response for anonymous users
      return { status: 200, jsonBody: { message: "Hello visitor!" } };
    }
  }
}
```

## Testing

The module includes test endpoints for verifying authentication:

```bash
# Test authentication
GET /v1/auth/me

# Test role checking
POST /v1/auth/check-role
{
  "role": "Admin"
}

# Test role requirement
POST /v1/auth/require-role
{
  "role": "Admin"
}
```

## Troubleshooting

### Common Issues

1. **"No authentication information found"**
   - Ensure Easy Auth is enabled in Azure
   - Check that `x-ms-client-principal` header is present
   - Verify the request is going through the Azure App Service

2. **"Unable to extract user identifier from claims"**
   - Check Azure AD configuration
   - Ensure user has proper claims in their token
   - Verify the app registration includes necessary permissions

3. **Role-based access not working**
   - Ensure roles are configured in Azure AD
   - Check that roles are being included in the token
   - Verify role claim type configuration

### Debug Information

Use the debug endpoints to troubleshoot:

```bash
# Get raw client principal
GET /v1/auth/principal

# Get full auth context
GET /v1/auth/context
```