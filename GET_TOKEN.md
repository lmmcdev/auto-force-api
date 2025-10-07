# Cómo Obtener un Token de Azure AD Real

## Configuración Actual

Tu aplicación está configurada con:
- **Client ID**: `77c80afa-38e9-4284-8033-b599f1667afe`
- **Tenant ID**: `7313ad10-b885-4b50-9c75-9dbbd975618f`
- **App ID URI**: `api://77c80afa-38e9-4284-8033-b599f1667afe`
- **Roles Permitidos**: `access_user`, `access_admin`

---

## Método 1: Usando Scripts Automatizados (Recomendado)

### Windows (PowerShell)

```powershell
.\scripts\get-azure-token.ps1
```

### Linux/Mac (Bash)

```bash
chmod +x scripts/get-azure-token.sh
./scripts/get-azure-token.sh
```

El script:
1. Abrirá tu navegador para autenticarte con Azure AD
2. Obtendrá automáticamente un token válido
3. Lo copiará al portapapeles (Windows)
4. Mostrará ejemplos de uso

---

## Método 2: Azure CLI Manual

### Paso 1: Instalar Azure CLI

Si no lo tienes instalado:
- **Windows**: Descarga desde https://aka.ms/installazurecli
- **Mac**: `brew install azure-cli`
- **Linux**: Sigue https://learn.microsoft.com/cli/azure/install-azure-cli-linux

### Paso 2: Iniciar Sesión

```bash
az login --tenant 7313ad10-b885-4b50-9c75-9dbbd975618f
```

Esto abrirá tu navegador. Inicia sesión con tu cuenta de Azure AD.

### Paso 3: Obtener el Token

```bash
az account get-access-token --resource 77c80afa-38e9-4284-8033-b599f1667afe --query accessToken -o tsv
```

### Paso 4: Usar el Token

```bash
# Guardar el token en una variable
TOKEN=$(az account get-access-token --resource 77c80afa-38e9-4284-8033-b599f1667afe --query accessToken -o tsv)

# Usar el token en una petición
curl -H "Authorization: Bearer $TOKEN" http://localhost:7071/api/v1/vendors
```

---

## Método 3: Usando Postman

1. Abre Postman
2. Crea una nueva petición GET: `http://localhost:7071/api/v1/vendors`
3. Ve a la pestaña **Authorization**
4. Selecciona **Type**: `OAuth 2.0`
5. Click en **Configure New Token**
6. Configuración:
   - **Token Name**: Auto Force API Token
   - **Grant Type**: `Authorization Code` o `Implicit`
   - **Auth URL**: `https://login.microsoftonline.com/7313ad10-b885-4b50-9c75-9dbbd975618f/oauth2/v2.0/authorize`
   - **Access Token URL**: `https://login.microsoftonline.com/7313ad10-b885-4b50-9c75-9dbbd975618f/oauth2/v2.0/token`
   - **Client ID**: `77c80afa-38e9-4284-8033-b599f1667afe`
   - **Scope**: `api://77c80afa-38e9-4284-8033-b599f1667afe/.default`
   - **Client Authentication**: `Send as Basic Auth header`
7. Click **Get New Access Token**
8. Inicia sesión cuando se abra el navegador
9. Click **Use Token**

---

## Método 4: Usando el Navegador (Device Code Flow)

```bash
# Paso 1: Iniciar el flujo
az login --tenant 7313ad10-b885-4b50-9c75-9dbbd975618f --use-device-code

# Paso 2: Sigue las instrucciones en pantalla
# Te dará un código y un enlace web

# Paso 3: Una vez autenticado, obtén el token
az account get-access-token --resource 77c80afa-38e9-4284-8033-b599f1667afe
```

---

## Verificar el Token

Una vez que tengas tu token, puedes verificar su contenido en https://jwt.ms/

Deberías ver:
- **aud** (audience): Tu Client ID
- **iss** (issuer): URL de tu tenant
- **roles**: Los roles asignados a tu usuario
- **oid**: Tu Object ID de usuario

---

## Ejemplo Completo de Uso

### Con curl

```bash
# Obtener token
TOKEN=$(az account get-access-token --resource 77c80afa-38e9-4284-8033-b599f1667afe --query accessToken -o tsv)

# Hacer petición
curl -v \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:7071/api/v1/vendors

# Con Pretty Print
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:7071/api/v1/vendors | jq
```

### Con PowerShell

```powershell
# Obtener token
$token = az account get-access-token --resource 77c80afa-38e9-4284-8033-b599f1667afe --query accessToken -o tsv

# Hacer petición
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:7071/api/v1/vendors" -Headers $headers
```

### En el archivo .http

```http
### Get vendors with real Azure AD token
GET http://localhost:7071/api/v1/vendors
Authorization: Bearer {{$dotenv AZURE_TOKEN}}
```

Y en tu terminal:
```bash
export AZURE_TOKEN=$(az account get-access-token --resource 77c80afa-38e9-4284-8033-b599f1667afe --query accessToken -o tsv)
```

---

## Troubleshooting

### Error: "AADSTS50105: The signed in user is not assigned to a role"

Tu usuario necesita tener un rol asignado en la aplicación de Azure AD.

**Solución**:
1. Ve al Portal de Azure
2. Azure Active Directory → Enterprise Applications
3. Busca "Auto Force API"
4. Users and groups → Add user/group
5. Selecciona tu usuario y asigna un rol (`access_user` o `access_admin`)

### Error: "AADSTS700016: Application not found"

El Client ID no es correcto o la aplicación no existe.

**Solución**: Verifica el Client ID en el Portal de Azure AD.

### Error: "Invalid audience"

El token no es para esta aplicación.

**Solución**: Asegúrate de usar `--resource` con el Client ID correcto.

---

## Desarrollo Local (Sin Azure AD Real)

Para desarrollo local sin configurar Azure AD real, puedes usar el mock:

```bash
# Ver el archivo test-auth.http
# Usa el header x-ms-client-principal con datos simulados
```

---

## Notas Importantes

1. **Los tokens expiran**: Por defecto después de 1 hora. Necesitarás obtener uno nuevo.
2. **Roles**: Asegúrate de que tu usuario tenga roles asignados (`access_user` o `access_admin`)
3. **Permisos**: Tu usuario debe tener permisos para acceder a la aplicación en Azure AD
4. **Local vs Producción**: En local usa `localhost:7071`, en producción usa la URL de tu Azure Function App
