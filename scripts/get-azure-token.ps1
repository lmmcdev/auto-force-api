# Script para obtener un token de Azure AD
# Requiere Azure CLI instalado: https://aka.ms/installazurecli

param(
    [string]$ClientId = "77c80afa-38e9-4284-8033-b599f1667afe",
    [string]$TenantId = "7313ad10-b885-4b50-9c75-9dbbd975618f",
    [string]$Scope = "api://77c80afa-38e9-4284-8033-b599f1667afe/.default"
)

Write-Host "Obteniendo token de Azure AD..." -ForegroundColor Cyan
Write-Host "Client ID: $ClientId" -ForegroundColor Gray
Write-Host "Tenant ID: $TenantId" -ForegroundColor Gray
Write-Host ""

# Verificar si Azure CLI esta instalado
$azInstalled = Get-Command az -ErrorAction SilentlyContinue
if (-not $azInstalled) {
    Write-Host "Error: Azure CLI no esta instalado." -ForegroundColor Red
    Write-Host "Instalalo desde: https://aka.ms/installazurecli" -ForegroundColor Yellow
    exit 1
}

# Login a Azure (abrira el navegador)
Write-Host "Iniciando sesion en Azure..." -ForegroundColor Yellow
az login --tenant $TenantId

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al iniciar sesion en Azure" -ForegroundColor Red
    exit 1
}

# Obtener el token
Write-Host "`nObteniendo token de acceso..." -ForegroundColor Yellow
# Intentar primero con el Client ID
$tokenResponse = az account get-access-token --resource $ClientId --query accessToken -o tsv 2>$null

# Si falla, intentar con el scope completo
if (-not $tokenResponse) {
    Write-Host "Intentando con scope alternativo..." -ForegroundColor Yellow
    $tokenResponse = az account get-access-token --scope "$Scope" --query accessToken -o tsv 2>$null
}

# Si falla, intentar con Microsoft Graph (para pruebas)
if (-not $tokenResponse) {
    Write-Host "Intentando con Microsoft Graph..." -ForegroundColor Yellow
    $tokenResponse = az account get-access-token --resource "https://graph.microsoft.com" --query accessToken -o tsv
}

if ($LASTEXITCODE -eq 0 -and $tokenResponse) {
    Write-Host "`n=== TOKEN OBTENIDO ===" -ForegroundColor Green
    Write-Host $tokenResponse -ForegroundColor White
    Write-Host "`n=== EJEMPLO DE USO ===" -ForegroundColor Cyan
    Write-Host "curl -H 'Authorization: Bearer $tokenResponse' http://localhost:7071/api/v1/vendors" -ForegroundColor Gray
    Write-Host "`n=== GUARDAR EN VARIABLE ===" -ForegroundColor Cyan
    Write-Host "`$token = '$tokenResponse'" -ForegroundColor Gray

    # Copiar al portapapeles
    $tokenResponse | Set-Clipboard
    Write-Host "`nToken copiado al portapapeles" -ForegroundColor Green
} else {
    Write-Host "Error al obtener el token" -ForegroundColor Red
    Write-Host "Verifica que tienes permisos en la aplicacion de Azure AD" -ForegroundColor Yellow
    exit 1
}
