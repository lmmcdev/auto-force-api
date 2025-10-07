# Solución: Error AADSTS90102 - Redirect URI en Postman

## El Problema

```
AADSTS90102: 'redirect_uri' value must be a valid absolute URI.
```

Este error ocurre porque Postman usa una URL de callback que no está registrada en tu aplicación de Azure AD.

---

## Solución: Registrar Redirect URI en Azure AD

### Paso 1: Ir al Portal de Azure

1. Ve a https://portal.azure.com
2. Busca **Azure Active Directory**
3. En el menú izquierdo, click en **App registrations**
4. Busca y click en tu aplicación: **Auto Force API**
   - O busca por Client ID: `77c80afa-38e9-4284-8033-b599f1667afe`

### Paso 2: Agregar Redirect URI

1. En el menú izquierdo de tu app, click en **Authentication**
2. En la sección **Platform configurations**, click en **+ Add a platform**
3. Selecciona **Web**
4. En **Redirect URIs**, agrega estas dos URLs:
   ```
   https://oauth.pstmn.io/v1/callback
   https://oauth.pstmn.io/v1/browser-callback
   ```
5. **NO** marques las casillas de Access tokens o ID tokens (aún)
6. Click en **Configure**

### Paso 3: Habilitar Implicit Grant (Si es necesario)

Si usas Authorization Code con Implicit Grant:

1. En la misma página **Authentication**
2. Baja hasta **Implicit grant and hybrid flows**
3. Marca:
   - ☑️ **Access tokens** (used for implicit flows)
   - ☑️ **ID tokens** (used for implicit and hybrid flows)
4. Click en **Save** (arriba)

### Paso 4: Configurar Permisos de API (Importante)

1. En el menú izquierdo, click en **API permissions**
2. Deberías ver al menos:
   - Microsoft Graph → User.Read
3. Si no existe, agrega:
   - Click **+ Add a permission**
   - **Microsoft Graph** → **Delegated permissions**
   - Busca y marca: `User.Read`, `openid`, `profile`, `email`
   - Click **Add permissions**
4. Click en **✓ Grant admin consent for [Tu Organización]**
5. Confirma

---

## Configuración Final en Azure AD

Tu configuración debería verse así:

### Authentication
```
Platform: Web
Redirect URIs:
  ✓ https://oauth.pstmn.io/v1/callback
  ✓ https://oauth.pstmn.io/v1/browser-callback

Implicit grant and hybrid flows:
  ✓ Access tokens
  ✓ ID tokens

Supported account types:
  • Accounts in this organizational directory only
```

### API Permissions
```
Microsoft Graph (3):
  • User.Read (Delegated) - Admin consent granted
  • openid (Delegated) - Admin consent granted
  • profile (Delegated) - Admin consent granted
```

---

## Volver a Probar en Postman

### Configuración Correcta en Postman

Ahora que registraste el redirect URI, usa esta configuración:

| Campo | Valor |
|-------|-------|
| **Callback URL** | `https://oauth.pstmn.io/v1/callback` |
| **Authorize using browser** | ✓ (marcado) |
| **Auth URL** | `https://login.microsoftonline.com/7313ad10-b885-4b50-9c75-9dbbd975618f/oauth2/v2.0/authorize` |
| **Access Token URL** | `https://login.microsoftonline.com/7313ad10-b885-4b50-9c75-9dbbd975618f/oauth2/v2.0/token` |
| **Client ID** | `77c80afa-38e9-4284-8033-b599f1667afe` |
| **Scope** | `api://77c80afa-38e9-4284-8033-b599f1667afe/.default openid profile email` |
| **Client Authentication** | `Send as Basic Auth header` |

### Pasos en Postman

1. Click en **Get New Access Token**
2. Se abrirá el navegador
3. Inicia sesión con tu cuenta
4. Acepta los permisos
5. El navegador se cerrará y volverás a Postman
6. Click en **Use Token**
7. **Send** tu request

---

## Alternativa: Usar Device Code Flow (Sin Redirect)

Si no puedes modificar Azure AD o prefieres no usar redirect URIs:

### En Azure Portal

1. **App registrations** → Tu app → **Authentication**
2. En **Advanced settings** → **Allow public client flows**
3. Cambia a **Yes**
4. **Save**

### En Postman

Desafortunadamente, Postman no soporta Device Code Flow directamente. Pero puedes usar Azure CLI:

```bash
# Obtener token con Device Code
az login --use-device-code --tenant 7313ad10-b885-4b50-9c75-9dbbd975618f

# Obtener access token
az account get-access-token --resource 77c80afa-38e9-4284-8033-b599f1667afe --query accessToken -o tsv
```

Luego copia el token y úsalo manualmente en Postman:
1. Authorization → Type: **Bearer Token**
2. Pega el token
3. Send

---

## Alternativa 2: Usar Client Credentials (Sin Usuario)

Si tienes un Client Secret configurado (para app-to-app):

### Paso 1: Crear Client Secret en Azure

1. **App registrations** → Tu app → **Certificates & secrets**
2. Click **+ New client secret**
3. Description: `Postman Testing`
4. Expires: `180 days` (o lo que prefieras)
5. Click **Add**
6. **COPIA EL SECRET INMEDIATAMENTE** (solo se muestra una vez)

### Paso 2: Configurar en Postman

| Campo | Valor |
|-------|-------|
| **Grant Type** | `Client Credentials` |
| **Access Token URL** | `https://login.microsoftonline.com/7313ad10-b885-4b50-9c75-9dbbd975618f/oauth2/v2.0/token` |
| **Client ID** | `77c80afa-38e9-4284-8033-b599f1667afe` |
| **Client Secret** | `[EL SECRET QUE COPIASTE]` |
| **Scope** | `api://77c80afa-38e9-4284-8033-b599f1667afe/.default` |

**Ventaja**: No necesita redirect URI ni interacción del usuario.
**Desventaja**: No tendrás información del usuario (oid, email, etc).

---

## Verificar la Configuración

Una vez configurado, verifica que funcione:

```bash
# Test con curl
curl "https://login.microsoftonline.com/7313ad10-b885-4b50-9c75-9dbbd975618f/oauth2/v2.0/authorize?client_id=77c80afa-38e9-4284-8033-b599f1667afe&response_type=code&redirect_uri=https://oauth.pstmn.io/v1/callback&scope=api://77c80afa-38e9-4284-8033-b599f1667afe/.default"
```

Debería redirigir a la página de login (no dar error 400).

---

## Troubleshooting

### Error: "AADSTS65005: Invalid resource"

**Causa**: El scope está mal configurado.

**Solución**: Usa `api://77c80afa-38e9-4284-8033-b599f1667afe/.default`

### Error: "AADSTS50011: No reply address registered"

**Causa**: Falta el redirect URI o está mal escrito.

**Solución**: Verifica en Azure AD → Authentication que está exactamente:
- `https://oauth.pstmn.io/v1/callback` (con 's' en https)

### Error: "AADSTS7000218: Invalid client secret"

**Causa**: El Client Secret expiró o está mal.

**Solución**: Genera uno nuevo en Azure AD → Certificates & secrets.

### Error: "Consent required"

**Causa**: Faltan permisos o no se dio admin consent.

**Solución**: Azure AD → API permissions → Grant admin consent.

---

## Resumen Rápido

**Lo que DEBES hacer** (opción más fácil):

1. ✅ Azure Portal → App registrations → Tu app
2. ✅ Authentication → Add platform → Web
3. ✅ Redirect URI: `https://oauth.pstmn.io/v1/callback`
4. ✅ Save
5. ✅ Postman → Get New Access Token (con la config de arriba)

**Tiempo estimado**: 2-3 minutos

Una vez hecho esto, Postman funcionará perfectamente con OAuth 2.0.
