# Guía de Implementación MSAL para Azure Functions

Esta guía explica cómo usar la autenticación MSAL (Microsoft Authentication Library) implementada en este módulo.

## 🆕 ¿Qué es MSAL?

MSAL es la librería oficial de Microsoft para validar tokens JWT de Azure AD directamente en tu aplicación, sin depender de Easy Auth de Azure.

### Diferencias: MSAL vs Easy Auth

| Característica | Easy Auth | MSAL |
|---------------|-----------|------|
| Validación de tokens | Azure lo hace | Tu aplicación lo hace |
| Desarrollo local | Difícil de probar | Fácil de probar |
| Control | Limitado | Total |
| Configuración | Azure Portal | Código |
| JWT Validation | Automática | Manual (pero más flexible) |

## 📦 Paquetes Instalados

```json
{
  "@azure/msal-node": "^3.8.0",
  "jsonwebtoken": "^9.0.2",
  "jwks-rsa": "^3.2.0"
}
```

## ⚙️ Configuración

Las mismas variables de entorno que Easy Auth:

```json
{
  "AZURE_AD_CLIENT_ID": "77c80afa-38e9-4284-8033-b599f1667afe",
  "AZURE_AD_TENANT_ID": "7313ad10-b885-4b50-9c75-9dbbd975618f",
  "AZURE_AD_APP_ID_URI": "api://77c80afa-38e9-4284-8033-b599f1667afe",
  "AZURE_AD_ALLOWED_ROLES": "access_user,access_admin"
}
```

## 🔑 Obtener Token de Azure AD

### Opción 1: Azure CLI (Recomendado para desarrollo)

```bash
az login
az account get-access-token --resource api://77c80afa-38e9-4284-8033-b599f1667afe
```

Resultado:
```json
{
  "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "expiresOn": "2024-10-07 12:00:00",
  "subscription": "...",
  "tenant": "7313ad10-b885-4b50-9c75-9dbbd975618f",
  "tokenType": "Bearer"
}
```

### Opción 2: Client Credentials Flow

```bash
curl -X POST https://login.microsoftonline.com/7313ad10-b885-4b50-9c75-9dbbd975618f/oauth2/v2.0/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=77c80afa-38e9-4284-8033-b599f1667afe" \
  -d "scope=api://77c80afa-38e9-4284-8033-b599f1667afe/.default" \
  -d "client_secret=TU_CLIENT_SECRET" \
  -d "grant_type=client_credentials"
```

### Opción 3: Postman

1. Crear nueva request
2. Tab "Authorization"
3. Type: "OAuth 2.0"
4. Grant Type: "Client Credentials"
5. Access Token URL: `https://login.microsoftonline.com/7313ad10-b885-4b50-9c75-9dbbd975618f/oauth2/v2.0/token`
6. Client ID: `77c80afa-38e9-4284-8033-b599f1667afe`
7. Client Secret: Tu secret
8. Scope: `api://77c80afa-38e9-4284-8033-b599f1667afe/.default`

## 🚀 Testing

### 1. Iniciar el servidor

```bash
npm start
```

### 2. Probar endpoint sin autenticación

```bash
curl http://localhost:7071/api/v1/msal-auth/health
```

Respuesta:
```json
{
  "message": "MSAL Auth service is healthy",
  "data": {
    "timestamp": "2024-10-07T10:00:00.000Z",
    "authenticated": false,
    "configurationValid": true,
    "service": "msal-auth-service",
    "version": "1.0.0"
  }
}
```

### 3. Obtener token

```bash
TOKEN=$(az account get-access-token --resource api://77c80afa-38e9-4284-8033-b599f1667afe --query accessToken -o tsv)
```

### 4. Probar endpoint con autenticación

```bash
curl http://localhost:7071/api/v1/msal-auth/me \
  -H "Authorization: Bearer $TOKEN"
```

Respuesta:
```json
{
  "message": "User authenticated successfully",
  "data": {
    "oid": "usuario-id-12345",
    "name": "Juan Pérez",
    "email": "juan.perez@empresa.com",
    "roles": ["access_user", "access_admin"]
  }
}
```

### 5. Verificar roles

```bash
curl -X POST http://localhost:7071/api/v1/msal-auth/check-role \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"access_admin"}'
```

## 🎯 Endpoints MSAL Disponibles

Todos en la ruta base `/api/v1/msal-auth`:

### Sin autenticación:
- `GET /health` - Health check
- `GET /config` - Ver configuración

### Con autenticación (Bearer token):
- `GET /me` - Información del usuario
- `GET /roles` - Roles del usuario
- `GET /context` - Contexto de autenticación
- `POST /check-role` - Verificar rol
- `POST /require-role` - Endpoint que requiere rol específico

## 💻 Uso en tu Código

### Ejemplo 1: Endpoint protegido básico

```typescript
import { HttpRequest, HttpResponseInit, InvocationContext, app } from "@azure/functions";
import { msalAuthService } from "@/modules/auth";

export async function getVendors(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Validar autenticación
    const user = await msalAuthService.getAuthenticatedUser(request);

    // Tu lógica aquí
    const vendors = await getVendorsFromDB();

    return {
      status: 200,
      jsonBody: {
        message: `Hello ${user.name}`,
        data: vendors
      }
    };
  } catch (error: any) {
    if (error.name === 'AuthenticationError') {
      return {
        status: 401,
        jsonBody: { error: error.message }
      };
    }
    throw error;
  }
}

app.http("GetVendors", {
  methods: ["GET"],
  route: "v1/vendors",
  authLevel: "anonymous", // MSAL maneja la auth
  handler: getVendors
});
```

### Ejemplo 2: Endpoint que requiere rol específico

```typescript
import { HttpRequest, HttpResponseInit, InvocationContext, app } from "@azure/functions";
import { msalAuthService } from "@/modules/auth";

export async function deleteVendor(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Requiere rol de admin
    await msalAuthService.requireRole(request, ['access_admin']);
    const user = await msalAuthService.getAuthenticatedUser(request);

    const vendorId = request.params.id;

    // Tu lógica de delete
    await deleteVendorFromDB(vendorId);

    return {
      status: 200,
      jsonBody: {
        message: `Vendor ${vendorId} deleted by ${user.name}`
      }
    };
  } catch (error: any) {
    if (error.name === 'AuthenticationError') {
      return { status: 401, jsonBody: { error: error.message } };
    }
    if (error.name === 'AuthorizationError') {
      return { status: 403, jsonBody: { error: error.message } };
    }
    throw error;
  }
}

app.http("DeleteVendor", {
  methods: ["DELETE"],
  route: "v1/vendors/{id}",
  authLevel: "anonymous",
  handler: deleteVendor
});
```

### Ejemplo 3: Usando Middleware

```typescript
import { HttpRequest, HttpResponseInit, InvocationContext, app } from "@azure/functions";
import { MsalAuthMiddleware } from "@/modules/auth";

export async function updateVendor(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Forma más limpia con middleware
    const user = await MsalAuthMiddleware.requireRole(request, ['access_admin']);

    const vendorId = request.params.id;
    const body = await request.json();

    // Tu lógica aquí
    await updateVendorInDB(vendorId, body);

    return {
      status: 200,
      jsonBody: { message: "Vendor updated" }
    };
  } catch (error: any) {
    if (error.name === 'AuthenticationError') {
      return { status: 401, jsonBody: { error: error.message } };
    }
    if (error.name === 'AuthorizationError') {
      return { status: 403, jsonBody: { error: error.message } };
    }
    throw error;
  }
}
```

### Ejemplo 4: Endpoint con autenticación opcional

```typescript
import { HttpRequest, HttpResponseInit, InvocationContext, app } from "@azure/functions";
import { MsalAuthMiddleware } from "@/modules/auth";

export async function getPublicVendors(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Usuario puede estar autenticado o no
  const user = await MsalAuthMiddleware.optionalAuth(request);

  const vendors = await getVendorsFromDB();

  // Mostrar más info si está autenticado
  const data = user
    ? { vendors, userLevel: 'premium' }
    : { vendors: vendors.slice(0, 10), userLevel: 'guest' };

  return {
    status: 200,
    jsonBody: {
      message: user ? `Welcome back ${user.name}` : "Welcome guest",
      data
    }
  };
}
```

## 🔒 Métodos del servicio MSAL

```typescript
// Todos los métodos son async
await msalAuthService.getAuthenticatedUser(request)        // Lanza error si no auth
await msalAuthService.getAuthenticatedUserOrNull(request)  // Retorna null si no auth
await msalAuthService.requireAuthentication(request)       // Solo valida auth
await msalAuthService.requireRole(request, ['role1'])      // Requiere uno de los roles
await msalAuthService.requireAllRoles(request, ['r1'])     // Requiere todos los roles
await msalAuthService.hasRole(request, 'admin')            // true/false
await msalAuthService.hasAnyRole(request, ['r1', 'r2'])    // true/false
await msalAuthService.requireOwnership(request, userId)    // Solo el dueño
await msalAuthService.requireOwnershipOrRole(...)          // Dueño o admin
await msalAuthService.getAuthContext(request)              // Contexto completo
```

## 🛠️ Script Helper para Testing

Crea un archivo `test-msal.sh`:

```bash
#!/bin/bash

# Obtener token
echo "🔑 Obteniendo token de Azure AD..."
TOKEN=$(az account get-access-token --resource api://77c80afa-38e9-4284-8033-b599f1667afe --query accessToken -o tsv)

if [ -z "$TOKEN" ]; then
  echo "❌ No se pudo obtener el token. Asegúrate de estar logueado: az login"
  exit 1
fi

echo "✅ Token obtenido"
echo ""

# Test 1: Health check
echo "🏥 Test 1: Health Check"
curl -s http://localhost:7071/api/v1/msal-auth/health | jq
echo ""

# Test 2: Get current user
echo "👤 Test 2: Get Current User"
curl -s http://localhost:7071/api/v1/msal-auth/me \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Test 3: Get roles
echo "🎭 Test 3: Get User Roles"
curl -s http://localhost:7071/api/v1/msal-auth/roles \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Test 4: Check role
echo "✓ Test 4: Check if user has 'access_admin' role"
curl -s -X POST http://localhost:7071/api/v1/msal-auth/check-role \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"access_admin"}' | jq
echo ""

echo "✅ Tests completados"
```

Hacer ejecutable y correr:
```bash
chmod +x test-msal.sh
./test-msal.sh
```

## 📊 Comparación de Implementaciones

### Easy Auth (auth.controller.ts)
```typescript
// Endpoint en /api/v1/auth/*
// Usa header x-ms-client-principal de Azure
const user = authService.getAuthenticatedUser(request); // Síncrono
```

### MSAL (msal-auth.controller.ts)
```typescript
// Endpoint en /api/v1/msal-auth/*
// Valida JWT directamente
const user = await msalAuthService.getAuthenticatedUser(request); // Async
```

## ❓ FAQ

**Q: ¿Cuál debo usar, Easy Auth o MSAL?**
A: MSAL para desarrollo local y mayor control. Easy Auth si ya tienes Azure App Service configurado.

**Q: ¿MSAL funciona en Azure?**
A: Sí, funciona tanto localmente como en Azure.

**Q: ¿Cómo debugging de tokens?**
A: Usa [jwt.ms](https://jwt.ms) para decodificar y ver el contenido del token.

**Q: Error "No authentication token found"?**
A: Verifica que el header sea `Authorization: Bearer TOKEN` (no `X-MS-CLIENT-PRINCIPAL`).

**Q: Error "Token has expired"?**
A: El token tiene 1 hora de validez. Obtén uno nuevo con `az account get-access-token`.

**Q: ¿Cómo agregar roles a mi usuario?**
A: En Azure AD → App registrations → Tu app → App roles → Assign users

## 🔗 Referencias

- [MSAL Node Docs](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node)
- [Azure AD Tokens](https://learn.microsoft.com/en-us/azure/active-directory/develop/access-tokens)
- [JWT.io](https://jwt.io/) - Decodificar tokens
- [jwt.ms](https://jwt.ms) - Decodificar tokens Azure AD

## ✅ Checklist de Implementación

- [x] Instalar paquetes MSAL
- [x] Crear servicio de autenticación MSAL
- [x] Crear middleware MSAL
- [x] Crear controladores de testing
- [x] Configurar variables de entorno
- [ ] Probar localmente con token real
- [ ] Implementar en endpoints de negocio
- [ ] Desplegar a Azure
- [ ] Configurar roles en Azure AD
