# Autenticación con Azure AD desde Postman

## Configuración Paso a Paso

### Método 1: OAuth 2.0 Authorization Code (Recomendado)

#### Paso 1: Crear una Nueva Request

1. Abre Postman
2. Click en **New** → **HTTP Request**
3. URL: `http://localhost:7071/api/v1/vendors`
4. Método: `GET`

#### Paso 2: Configurar Authorization

1. Ve a la pestaña **Authorization**
2. En **Type**, selecciona: `OAuth 2.0`
3. En **Add authorization data to**, selecciona: `Request Headers`

#### Paso 3: Configure New Token

Click en el botón **Get New Access Token** y llena los siguientes campos:

##### Configuración Básica

| Campo | Valor |
|-------|-------|
| **Token Name** | `Auto Force API Token` |
| **Grant Type** | `Authorization Code` |
| **Callback URL** | `https://oauth.pstmn.io/v1/callback` |
| **Auth URL** | `https://login.microsoftonline.com/7313ad10-b885-4b50-9c75-9dbbd975618f/oauth2/v2.0/authorize` |
| **Access Token URL** | `https://login.microsoftonline.com/7313ad10-b885-4b50-9c75-9dbbd975618f/oauth2/v2.0/token` |
| **Client ID** | `77c80afa-38e9-4284-8033-b599f1667afe` |
| **Client Secret** | *(Déjalo vacío si no tienes uno configurado)* |
| **Scope** | `api://77c80afa-38e9-4284-8033-b599f1667afe/.default` |
| **State** | *(Opcional - genera uno automático)* |
| **Client Authentication** | `Send as Basic Auth header` |

#### Paso 4: Obtener el Token

1. Click en **Get New Access Token**
2. Se abrirá una ventana del navegador
3. Inicia sesión con tu cuenta de Microsoft/Azure AD
4. Acepta los permisos si te lo solicita
5. Postman recibirá el token automáticamente

#### Paso 5: Usar el Token

1. Una vez que aparezca el token en la lista, click en **Use Token**
2. El token se agregará automáticamente a tus headers como: `Authorization: Bearer <token>`
3. Click en **Send** para hacer la petición

---

## Método 2: Usando Client Credentials (Para Apps)

Si tienes un **Client Secret** configurado:

### Configuración

| Campo | Valor |
|-------|-------|
| **Token Name** | `Auto Force API - Client Credentials` |
| **Grant Type** | `Client Credentials` |
| **Access Token URL** | `https://login.microsoftonline.com/7313ad10-b885-4b50-9c75-9dbbd975618f/oauth2/v2.0/token` |
| **Client ID** | `77c80afa-38e9-4284-8033-b599f1667afe` |
| **Client Secret** | `TU_CLIENT_SECRET` |
| **Scope** | `api://77c80afa-38e9-4284-8033-b599f1667afe/.default` |
| **Client Authentication** | `Send as Basic Auth header` |

---

## Método 3: Token Manual (Si ya tienes el token)

Si ya obtuviste un token usando Azure CLI o los scripts:

1. Ve a la pestaña **Authorization**
2. Selecciona **Type**: `Bearer Token`
3. Pega tu token en el campo **Token**
4. Click en **Send**

---

## Método 4: Usando Variables de Entorno (Pro Tip)

### Paso 1: Crear Variables de Entorno

1. Click en el ícono de ⚙️ (Settings) en la esquina superior derecha
2. Ve a **Environments**
3. Click en **Create Environment**
4. Nombre: `Auto Force Local`
5. Agrega estas variables:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `baseUrl` | `http://localhost:7071/api` | `http://localhost:7071/api` |
| `tenantId` | `7313ad10-b885-4b50-9c75-9dbbd975618f` | `7313ad10-b885-4b50-9c75-9dbbd975618f` |
| `clientId` | `77c80afa-38e9-4284-8033-b599f1667afe` | `77c80afa-38e9-4284-8033-b599f1667afe` |
| `scope` | `api://77c80afa-38e9-4284-8033-b599f1667afe/.default` | `api://77c80afa-38e9-4284-8033-b599f1667afe/.default` |
| `accessToken` | *(vacío)* | *(vacío)* |

### Paso 2: Configurar Authorization con Variables

En Authorization → OAuth 2.0:

| Campo | Valor con Variables |
|-------|---------------------|
| **Auth URL** | `https://login.microsoftonline.com/{{tenantId}}/oauth2/v2.0/authorize` |
| **Access Token URL** | `https://login.microsoftonline.com/{{tenantId}}/oauth2/v2.0/token` |
| **Client ID** | `{{clientId}}` |
| **Scope** | `{{scope}}` |

### Paso 3: Guardar Token Automáticamente

Agrega este script en la pestaña **Tests** de tu request:

```javascript
// Guardar el token en variables de entorno después de obtenerlo
if (pm.response.code === 200) {
    const token = pm.response.json().access_token;
    pm.environment.set("accessToken", token);
}
```

### Paso 4: Usar URL Relativa

Cambia tu URL a: `{{baseUrl}}/v1/vendors`

---

## Colección de Postman Pre-configurada

Puedes importar esta configuración JSON en Postman:

### Crear archivo: `Auto-Force-API.postman_collection.json`

```json
{
  "info": {
    "name": "Auto Force API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "oauth2",
    "oauth2": [
      {
        "key": "tokenName",
        "value": "Auto Force Token",
        "type": "string"
      },
      {
        "key": "grant_type",
        "value": "authorization_code",
        "type": "string"
      },
      {
        "key": "authUrl",
        "value": "https://login.microsoftonline.com/7313ad10-b885-4b50-9c75-9dbbd975618f/oauth2/v2.0/authorize",
        "type": "string"
      },
      {
        "key": "accessTokenUrl",
        "value": "https://login.microsoftonline.com/7313ad10-b885-4b50-9c75-9dbbd975618f/oauth2/v2.0/token",
        "type": "string"
      },
      {
        "key": "clientId",
        "value": "77c80afa-38e9-4284-8033-b599f1667afe",
        "type": "string"
      },
      {
        "key": "scope",
        "value": "api://77c80afa-38e9-4284-8033-b599f1667afe/.default",
        "type": "string"
      },
      {
        "key": "addTokenTo",
        "value": "header",
        "type": "string"
      }
    ]
  },
  "item": [
    {
      "name": "Vendors",
      "item": [
        {
          "name": "Get All Vendors",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/v1/vendors",
              "host": ["{{baseUrl}}"],
              "path": ["v1", "vendors"]
            }
          }
        },
        {
          "name": "Get Vendor by ID",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/v1/vendors/:id",
              "host": ["{{baseUrl}}"],
              "path": ["v1", "vendors", ":id"],
              "variable": [
                {
                  "key": "id",
                  "value": ""
                }
              ]
            }
          }
        },
        {
          "name": "Create Vendor",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"name\": \"Vendor Name\",\n  \"code\": \"VEN001\",\n  \"type\": \"Supplier\",\n  \"status\": \"Active\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/v1/vendors",
              "host": ["{{baseUrl}}"],
              "path": ["v1", "vendors"]
            }
          }
        }
      ]
    },
    {
      "name": "Health",
      "item": [
        {
          "name": "Health Check",
          "request": {
            "auth": {
              "type": "noauth"
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/v1/health",
              "host": ["{{baseUrl}}"],
              "path": ["v1", "health"]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:7071/api"
    }
  ]
}
```

Para importar:
1. En Postman, click en **Import**
2. Selecciona el archivo JSON
3. La colección aparecerá con todas las requests pre-configuradas

---

## Screenshots Paso a Paso

### 1. Configuración de Authorization
```
Authorization Tab
├── Type: OAuth 2.0
├── Add auth data to: Request Headers
└── Configure New Token (botón)
```

### 2. Token Configuration
```
Get New Access Token
├── Token Name: Auto Force API Token
├── Grant Type: Authorization Code ▼
├── Callback URL: https://oauth.pstmn.io/v1/callback
├── Auth URL: https://login.microsoftonline.com/7313ad10.../authorize
├── Access Token URL: https://login.microsoftonline.com/7313ad10.../token
├── Client ID: 77c80afa-38e9-4284-8033-b599f1667afe
├── Scope: api://77c80afa-38e9-4284-8033-b599f1667afe/.default
└── [Get New Access Token] (botón)
```

### 3. Browser Login
```
Se abre navegador →
Inicia sesión con tu cuenta →
Acepta permisos →
Redirect a Postman →
Token appears in list
```

### 4. Use Token
```
Manage Tokens
├── Token Name: Auto Force API Token
├── Access Token: eyJ0eXAiOiJKV1QiLC...
├── Expires: 2025-10-06 14:30:00
└── [Use Token] (botón) ← Click aquí
```

---

## Troubleshooting

### Error: "Could not get any response"

**Causa**: La API no está corriendo o la URL es incorrecta.

**Solución**:
```bash
# Asegúrate de que la API esté corriendo
npm start

# Verifica que responda
curl http://localhost:7071/api/v1/health
```

### Error: "AADSTS50105: User not assigned"

**Causa**: Tu usuario no tiene un rol asignado en la aplicación.

**Solución**: Ve al Portal de Azure → Enterprise Applications → Auto Force API → Users and groups → Agrega tu usuario con un rol.

### Error: "Invalid redirect_uri"

**Causa**: El callback URL no está registrado en Azure AD.

**Solución**: En Azure Portal → App registrations → Auto Force API → Authentication → Add platform → Web → Redirect URI: `https://oauth.pstmn.io/v1/callback`

### Error: "Token expired"

**Causa**: Los tokens de Azure AD expiran (por defecto en 1 hora).

**Solución**: Click en **Get New Access Token** nuevamente.

---

## Tips Pro

1. **Guardar la Collection**: Todas las requests compartirán la misma configuración de auth
2. **Usar Pre-request Scripts**: Para refrescar tokens automáticamente
3. **Environments**: Crea uno para Local, Dev, y Production
4. **Token Refresh**: Configura el `refresh_token` para renovar automáticamente

### Pre-request Script para Auto-refresh

```javascript
// Pre-request Script para auto-renovar token
const tokenExpiry = pm.environment.get("tokenExpiry");
const now = new Date().getTime();

if (!tokenExpiry || now > tokenExpiry) {
    // Token expiró, obtener uno nuevo
    pm.sendRequest({
        url: pm.environment.get("tokenUrl"),
        method: 'POST',
        header: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: {
            mode: 'urlencoded',
            urlencoded: [
                {key: 'grant_type', value: 'client_credentials'},
                {key: 'client_id', value: pm.environment.get("clientId")},
                {key: 'client_secret', value: pm.environment.get("clientSecret")},
                {key: 'scope', value: pm.environment.get("scope")}
            ]
        }
    }, (err, res) => {
        if (!err) {
            const jsonData = res.json();
            pm.environment.set("accessToken", jsonData.access_token);
            pm.environment.set("tokenExpiry", now + (jsonData.expires_in * 1000));
        }
    });
}
```

---

## Resumen Rápido

**Lo más simple**:
1. Postman → New Request → `GET http://localhost:7071/api/v1/vendors`
2. Authorization → OAuth 2.0 → Get New Access Token
3. Auth URL: `https://login.microsoftonline.com/7313ad10-b885-4b50-9c75-9dbbd975618f/oauth2/v2.0/authorize`
4. Access Token URL: `https://login.microsoftonline.com/7313ad10-b885-4b50-9c75-9dbbd975618f/oauth2/v2.0/token`
5. Client ID: `77c80afa-38e9-4284-8033-b599f1667afe`
6. Scope: `api://77c80afa-38e9-4284-8033-b599f1667afe/.default`
7. Get New Access Token → Login → Use Token → Send
