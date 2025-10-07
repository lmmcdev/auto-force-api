# Configuración de Azure AD Authentication para Auto Force API

## Opción 1: Autenticación Real en Azure (Producción)

### Requisitos Previos
- Una suscripción activa de Azure
- Permisos de administrador en Azure AD
- Azure CLI instalado

### Pasos para Configurar Azure AD

#### 1. Registrar la Aplicación en Azure AD

```bash
# Login a Azure
az login

# Crear el registro de la aplicación
az ad app create \
  --display-name "Auto Force API" \
  --sign-in-audience AzureADMyOrg

# Obtener el Application (client) ID
az ad app list --display-name "Auto Force API" --query "[0].appId" -o tsv
```

Guarda el **Application (client) ID** - lo necesitarás después.

#### 2. Configurar Roles de la Aplicación

Ve al Portal de Azure → Azure Active Directory → App Registrations → Auto Force API → App roles

Crea los roles necesarios (ejemplo):
- `admin`: Acceso completo
- `user`: Acceso de lectura
- `vendor.write`: Puede crear/editar vendors

#### 3. Desplegar Azure Function App

```bash
# Crear un Resource Group
az group create --name auto-force-rg --location eastus

# Crear una Storage Account
az storage account create \
  --name autoforcestore \
  --resource-group auto-force-rg \
  --location eastus \
  --sku Standard_LRS

# Crear Function App
az functionapp create \
  --resource-group auto-force-rg \
  --name auto-force-api \
  --storage-account autoforcestore \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --consumption-plan-location eastus
```

#### 4. Habilitar Azure AD Authentication en Function App

```bash
# Habilitar Easy Auth
az functionapp auth update \
  --resource-group auto-force-rg \
  --name auto-force-api \
  --enabled true \
  --action LoginWithAzureActiveDirectory

# Configurar Azure AD como proveedor
az functionapp auth microsoft update \
  --resource-group auto-force-rg \
  --name auto-force-api \
  --client-id <TU_APPLICATION_CLIENT_ID> \
  --issuer https://sts.windows.net/<TU_TENANT_ID>/
```

#### 5. Obtener Token de Acceso Real

Una vez configurado, puedes obtener un token usando cualquiera de estos métodos:

**Método A: Usando Azure CLI**
```bash
az account get-access-token --resource <TU_APPLICATION_CLIENT_ID>
```

**Método B: Usando MSAL (Microsoft Authentication Library)**

Instala el paquete:
```bash
npm install @azure/msal-node
```

Crea un script `get-token.js`:
```javascript
const msal = require('@azure/msal-node');

const config = {
  auth: {
    clientId: 'TU_CLIENT_ID',
    authority: 'https://login.microsoftonline.com/TU_TENANT_ID',
    clientSecret: 'TU_CLIENT_SECRET' // O usa certificado
  }
};

const pca = new msal.ConfidentialClientApplication(config);

const tokenRequest = {
  scopes: ['https://graph.microsoft.com/.default']
};

pca.acquireTokenByClientCredential(tokenRequest)
  .then(response => {
    console.log('Access Token:', response.accessToken);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

**Método C: Usando Postman**

1. Ve a Authorization tab
2. Selecciona Type: OAuth 2.0
3. Configure:
   - Grant Type: Authorization Code
   - Auth URL: `https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/authorize`
   - Access Token URL: `https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/token`
   - Client ID: Tu Application (client) ID
   - Client Secret: Tu client secret
   - Scope: `api://<YOUR_APP_ID>/.default`
4. Click en "Get New Access Token"

#### 6. Usar el Token en las Peticiones

```bash
# Ejemplo con curl
curl -H "Authorization: Bearer <TU_TOKEN_REAL>" \
  https://auto-force-api.azurewebsites.net/api/v1/vendors
```

---

## Opción 2: Mock Local con Static Web Apps CLI (Desarrollo)

Para simular Easy Auth localmente:

### 1. Instalar SWA CLI

```bash
npm install -g @azure/static-web-apps-cli
```

### 2. Crear archivo de configuración `swa-cli.config.json`

```json
{
  "configurations": {
    "auto-force-api": {
      "appLocation": ".",
      "apiLocation": ".",
      "outputLocation": "dist",
      "appDevserverUrl": "http://localhost:7071"
    }
  }
}
```

### 3. Ejecutar con SWA CLI

```bash
# En una terminal, inicia la función
npm start

# En otra terminal, inicia SWA CLI
swa start http://localhost:7071 --api-location .
```

SWA CLI te permitirá simular autenticación localmente en `http://localhost:4280/.auth/login/aad`

---

## Opción 3: Development Mock (Actual - Más Simple)

Este es el método que ya tienes configurado con el archivo `test-auth.http`.

El header `x-ms-client-principal` contiene:
```json
{
  "auth_typ": "aad",
  "claims": [
    {"typ": "oid", "val": "12345678-1234-1234-1234-1234567890ab"},
    {"typ": "name", "val": "Test User"},
    {"typ": "emails", "val": "test@example.com"},
    {"typ": "roles", "val": "admin"}
  ]
}
```

Codificado en Base64 para el header.

### Personalizar el Mock

Para crear tu propio mock:

```bash
# Crear el JSON
echo '{
  "auth_typ": "aad",
  "name_typ": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
  "role_typ": "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
  "claims": [
    {"typ": "oid", "val": "tu-user-id"},
    {"typ": "name", "val": "Tu Nombre"},
    {"typ": "emails", "val": "tu@email.com"},
    {"typ": "roles", "val": "admin"}
  ]
}' | base64 -w 0
```

Usa el resultado en el header `x-ms-client-principal`.

---

## Recomendación

**Para desarrollo local**: Usa la Opción 3 (Mock con header)
**Para staging/producción**: Usa la Opción 1 (Azure AD real)

## Verificar Autenticación

Para verificar que la autenticación funciona:

```bash
# Debe retornar 401 (No autenticado)
curl http://localhost:7071/api/v1/vendors

# Debe retornar 200 con datos
curl -H "x-ms-client-principal: eyJhdXRoX3R5cCI6..." http://localhost:7071/api/v1/vendors
```
