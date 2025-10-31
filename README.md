# Auto Force API

API REST para el sistema de gestión de flotas vehiculares Auto Force.

## Descripción

Esta API proporciona endpoints para gestionar vehículos, facturas, alertas, tipos de servicio, vendedores y más. Está construida con Azure Functions y TypeScript, utilizando Cosmos DB como base de datos.

## Tecnologías

- **Runtime**: Node.js 18+
- **Framework**: Azure Functions v4
- **Lenguaje**: TypeScript 4.x
- **Base de Datos**: Azure Cosmos DB
- **Storage**: Azure Blob Storage

## Instalación

```bash
# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env

# Configurar variables de entorno en .env
```

## Variables de Entorno

Configura las siguientes variables en tu archivo `.env`:

```env
COSMOS_ENDPOINT=<your-cosmos-endpoint>
COSMOS_KEY=<your-cosmos-key>
COSMOS_DATABASE_NAME=auto-force-db
STORAGE_ACCOUNT_NAME=<your-storage-account>
STORAGE_ACCOUNT_KEY=<your-storage-key>
STORAGE_CONTAINER_NAME=transportation
```

## Scripts Disponibles

```bash
# Desarrollo
npm start                    # Iniciar servidor local con Azure Functions Core Tools
npm run watch                # Compilar TypeScript en modo watch

# Build
npm run build                # Compilar TypeScript
npm run clean                # Limpiar directorio dist

# Code Quality
npm run lint                 # Ejecutar ESLint
npm run lint:fix             # Ejecutar ESLint y arreglar problemas
npm run format               # Formatear código con Prettier
npm run format:check         # Verificar formato sin modificar

# Migraciones
npm run migrate:snapshots           # Migrar snapshots de vehículos/vendedores en facturas
npm run migrate:snapshots:dry-run   # Vista previa de la migración sin hacer cambios
```

## Estructura del Proyecto

```
auto-force-api/
├── src/
│   ├── infra/              # Configuración de infraestructura (Cosmos DB, Storage)
│   ├── modules/            # Módulos de la aplicación
│   │   ├── alert/          # Gestión de alertas
│   │   ├── invoice/        # Gestión de facturas
│   │   ├── line-item/      # Items de factura
│   │   ├── vehicle/        # Gestión de vehículos
│   │   ├── vendor/         # Gestión de vendedores
│   │   └── service-type/   # Tipos de servicio
│   └── shared/             # Utilidades y servicios compartidos
├── scripts/                # Scripts de migración y utilidades
├── docs/                   # Documentación
└── dist/                   # Código compilado
```

## Módulos Principales

### 🚨 Alertas
Sistema de notificaciones y avisos para gestionar:
- Garantías activas superpuestas
- Precios más altos detectados
- Servicios duplicados
- Documentos próximos a vencer

**Documentación**:
- [Documentación Completa de Alertas](./docs/ALERT_API.md)
- [Referencia Rápida de Alertas](./docs/ALERT_API_QUICK_REFERENCE.md)

### 🚗 Vehículos
Gestión completa de la flota vehicular incluyendo:
- Información del vehículo
- Documentos y permisos
- Historial de mantenimiento

### 📄 Facturas
Gestión de facturas y gastos:
- Creación y actualización de facturas
- Carga de documentos
- Snapshots de vehículos y vendedores
- Cálculo automático de totales

### 📋 Line Items
Items individuales de factura:
- Precios unitarios y labor
- Cálculo automático de totales
- Información de garantía
- Validación de precios

### 🏢 Vendedores
Gestión de proveedores y vendedores:
- Información de contacto
- Historial de transacciones
- Estado activo/inactivo

### 🔧 Tipos de Servicio
Catálogo de servicios:
- Categorización de servicios
- Precios de referencia
- Historial de uso

## API Endpoints

### Base URL
```
http://localhost:7071/api/v1
```

### Principales Endpoints

#### Alertas
```
GET    /v1/alerts                    # Listar alertas (con filtros)
GET    /v1/alerts/{id}               # Obtener alerta por ID
POST   /v1/alerts                    # Crear alerta
PUT    /v1/alerts/{id}               # Actualizar alerta
DELETE /v1/alerts/{id}               # Eliminar alerta
GET    /v1/alerts/by-vehicle/{id}   # Alertas por vehículo
GET    /v1/alerts/by-invoice/{id}   # Alertas por factura
GET    /v1/alerts/by-status/{status} # Alertas por estado
```

#### Vehículos
```
GET    /v1/vehicles                  # Listar vehículos
GET    /v1/vehicles/{id}             # Obtener vehículo
POST   /v1/vehicles                  # Crear vehículo
PUT    /v1/vehicles/{id}             # Actualizar vehículo
DELETE /v1/vehicles/{id}             # Eliminar vehículo
```

#### Facturas
```
GET    /v1/invoices                  # Listar facturas
GET    /v1/invoices/{id}             # Obtener factura
POST   /v1/invoices                  # Crear factura
PUT    /v1/invoices/{id}             # Actualizar factura
DELETE /v1/invoices/{id}             # Eliminar factura
POST   /v1/invoices/upload           # Subir factura con archivo
```

#### Line Items
```
GET    /v1/line-items                # Listar line items
GET    /v1/line-items/{id}           # Obtener line item
POST   /v1/line-items                # Crear line item
PUT    /v1/line-items/{id}           # Actualizar line item
DELETE /v1/line-items/{id}           # Eliminar line item
GET    /v1/line-items/by-invoice/{id} # Line items por factura
```

## Migraciones

### Migración de Snapshots de Facturas

El sistema incluye scripts de migración para agregar snapshots de vehículos y vendedores a facturas existentes:

```bash
# Ver qué cambios se harían (sin modificar datos)
npm run migrate:snapshots:dry-run

# Ejecutar la migración real
npm run migrate:snapshots
```

**Documentación**: [scripts/README.md](./scripts/README.md)

## Desarrollo

### Iniciar Servidor Local

```bash
# Instalar Azure Functions Core Tools globalmente (si no lo tienes)
npm install -g azure-functions-core-tools@4

# Iniciar el servidor
npm start
```

El servidor estará disponible en `http://localhost:7071`

### Hot Reload

```bash
# En una terminal
npm run watch

# En otra terminal
npm start
```

## Testing

```bash
# Ejecutar tests (cuando estén implementados)
npm test
```

## Postman Collection

Una colección de Postman con todos los endpoints está disponible en:
```
Auto-Force-API.postman_collection.json
```

Importa este archivo en Postman para probar la API fácilmente.

## Características Especiales

### 🔄 Generación Automática de Alertas

El sistema genera alertas automáticamente cuando:
- Se detecta una garantía activa superpuesta al crear un line item
- Un precio unitario es más alto que transacciones previas del mismo servicio
- Se encuentra un servicio duplicado para el mismo vehículo
- Documentos de vehículos están próximos a vencer

### 📸 Snapshots de Facturas

Las facturas capturan automáticamente snapshots de:
- **Vehículo**: VIN, marca, año, color, estado
- **Vendedor**: Nombre, estado, tipo

Esto preserva la información histórica incluso si los registros originales cambian.

### 💰 Cálculo Automático de Totales

Los totales se calculan automáticamente:
- **Line Items**: `totalPrice = (unitPrice + unitLabor) × quantity`
- **Facturas**: `invoiceAmount = subTotal + tax`
- El `subTotal` se calcula sumando todos los line items
- El `tax` se calcula sobre items marcados como taxables

### 📁 Gestión de Archivos

Soporte para carga y gestión de archivos:
- Facturas (PDF, imágenes)
- Documentos de vehículos (seguro, registro, inspección, etc.)
- Almacenamiento en Azure Blob Storage
- Generación automática de rutas organizadas

## Code Style

Este proyecto usa:
- **ESLint** para linting
- **Prettier** para formateo de código
- **TypeScript** con strict mode

```bash
# Verificar estilo
npm run lint
npm run format:check

# Arreglar problemas
npm run lint:fix
npm run format
```

## Despliegue

Para desplegar a Azure:

```bash
# Build del proyecto
npm run build

# Desplegar (requiere Azure CLI configurado)
func azure functionapp publish <nombre-de-tu-function-app>
```

## Documentación Adicional

- [Documentación de Alertas](./docs/ALERT_API.md)
- [Referencia Rápida de Alertas](./docs/ALERT_API_QUICK_REFERENCE.md)
- [Guía de Migraciones](./scripts/README.md)

## Contribuir

1. Crear una rama feature: `git checkout -b feature/nueva-funcionalidad`
2. Hacer commit de los cambios: `git commit -m 'Agregar nueva funcionalidad'`
3. Push a la rama: `git push origin feature/nueva-funcionalidad`
4. Crear un Pull Request

## Licencia

Propiedad de LMMC Dev / Auto Force

## Soporte

Para preguntas o problemas, contacta al equipo de desarrollo.
