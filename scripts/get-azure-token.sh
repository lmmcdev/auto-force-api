#!/bin/bash
# Script para obtener un token de Azure AD
# Requiere Azure CLI instalado: https://aka.ms/installazurecli

CLIENT_ID="${1:-77c80afa-38e9-4284-8033-b599f1667afe}"
TENANT_ID="${2:-7313ad10-b885-4b50-9c75-9dbbd975618f}"
SCOPE="api://${CLIENT_ID}/.default"

echo -e "\033[36mObteniendo token de Azure AD...\033[0m"
echo -e "\033[90mClient ID: $CLIENT_ID\033[0m"
echo -e "\033[90mTenant ID: $TENANT_ID\033[0m"
echo ""

# Verificar si Azure CLI está instalado
if ! command -v az &> /dev/null; then
    echo -e "\033[31mError: Azure CLI no está instalado.\033[0m"
    echo -e "\033[33mInstálalo desde: https://aka.ms/installazurecli\033[0m"
    exit 1
fi

# Login a Azure (abrirá el navegador)
echo -e "\033[33mIniciando sesión en Azure...\033[0m"
az login --tenant "$TENANT_ID"

if [ $? -ne 0 ]; then
    echo -e "\033[31mError al iniciar sesión en Azure\033[0m"
    exit 1
fi

# Obtener el token
echo -e "\n\033[33mObteniendo token de acceso...\033[0m"
TOKEN=$(az account get-access-token --resource "$CLIENT_ID" --query accessToken -o tsv)

if [ $? -eq 0 ] && [ ! -z "$TOKEN" ]; then
    echo -e "\n\033[32m=== TOKEN OBTENIDO ===\033[0m"
    echo -e "\033[37m$TOKEN\033[0m"
    echo -e "\n\033[36m=== EJEMPLO DE USO ===\033[0m"
    echo -e "\033[90mcurl -H 'Authorization: Bearer $TOKEN' http://localhost:7071/api/v1/vendors\033[0m"
    echo -e "\n\033[36m=== GUARDAR EN VARIABLE ===\033[0m"
    echo -e "\033[90mexport TOKEN='$TOKEN'\033[0m"
    echo -e "\n\033[32m✓ Token obtenido exitosamente\033[0m"
else
    echo -e "\033[31mError al obtener el token\033[0m"
    echo -e "\033[33mVerifica que tienes permisos en la aplicación de Azure AD\033[0m"
    exit 1
fi
