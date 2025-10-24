// src/infra/cosmos.ts
import { CosmosClient, Container, Database } from '@azure/cosmos';

const connection = process.env.COSMOS_DB_CONNECTION!;
const dbName = process.env.COSMOS_DB_DATABASE!;
const vendorsContainerName = process.env.COSMOS_DB_CONTAINER_VENDORS!;
const vehiclesContainerName = process.env.COSMOS_DB_CONTAINER_VEHICLES!;
const serviceTypesContainerName = process.env.COSMOS_DB_CONTAINER_SERVICE_TYPES || 'service-types';
const invoicesContainerName = process.env.COSMOS_DB_CONTAINER_INVOICES || 'invoices';
const lineItemsContainerName = process.env.COSMOS_DB_CONTAINER_LINE_ITEMS || 'line-items';
const alertsContainerName = process.env.COSMOS_DB_CONTAINER_ALERTS || 'alerts';
const documentsContainerName = process.env.COSMOS_DB_CONTAINER_DOCUMENTS || 'documents';

// Cliente único para toda la app
const client = new CosmosClient(connection);

let database: Database;
let vendorsContainer: Container;
let vehiclesContainer: Container;
let serviceTypesContainer: Container;
let invoicesContainer: Container;
let lineItemsContainer: Container;
let alertsContainer: Container;
let documentsContainer: Container;

// Flag para rastrear el estado de inicialización
let initPromise: Promise<void> | null = null;
let isInitialized = false;

/**
 * En DEV: createIfNotExists para que corra out-of-the-box.
 * En PROD: aprovisiona con IaC y usa getDatabase/getContainer.
 */
export async function initCosmos(): Promise<void> {
  // Si ya está inicializado, retornar inmediatamente
  if (isInitialized) {
    return;
  }

  // Si hay una inicialización en progreso, esperar a que termine
  if (initPromise) {
    return initPromise;
  }

  // Crear la promesa de inicialización
  initPromise = (async () => {
    const { database: db } = await client.databases.createIfNotExists({ id: dbName });
    database = db;

    console.log(`Cosmos DB initialized: Database "${dbName}"`);
    console.log(`Cosmos DB initialized: Container "${vendorsContainerName}"`);
    console.log(`Cosmos DB initialized: Container "${vehiclesContainerName}"`);
    console.log(`Cosmos DB initialized: Container "${serviceTypesContainerName}"`);
    console.log(`Cosmos DB initialized: Container "${invoicesContainerName}"`);
    console.log(`Cosmos DB initialized: Container "${lineItemsContainerName}"`);
    console.log(`Cosmos DB initialized: Container "${alertsContainerName}"`);
    console.log(`Cosmos DB initialized: Container "${documentsContainerName}"`);

    // vendors: partitionKey /id (simple para lecturas por id)
    const { container: vCont } = await database.containers.createIfNotExists({
      id: vendorsContainerName,
      partitionKey: { paths: ['/id'] },
      uniqueKeyPolicy: {
        // opcional: prevenir nombres duplicados
        uniqueKeys: [{ paths: ['/name'] }],
      },
    });
    vendorsContainer = vCont;

    // vehicles
    const { container: veCont } = await database.containers.createIfNotExists({
      id: vehiclesContainerName,
      partitionKey: { paths: ['/id'] },
      // ejemplo de índice custom si lo necesitas:
      // indexingPolicy: { indexingMode: 'consistent' }
    });
    vehiclesContainer = veCont;

    // service-types
    const { container: stCont } = await database.containers.createIfNotExists({
      id: serviceTypesContainerName,
      partitionKey: { paths: ['/id'] },
      uniqueKeyPolicy: {
        // Prevent duplicate names
        uniqueKeys: [{ paths: ['/name'] }],
      },
    });
    serviceTypesContainer = stCont;

    // invoices
    const { container: invCont } = await database.containers.createIfNotExists({
      id: invoicesContainerName,
      partitionKey: { paths: ['/id'] },
      uniqueKeyPolicy: {
        // Prevent duplicate invoice numbers
        uniqueKeys: [{ paths: ['/invoiceNumber'] }],
      },
    });
    invoicesContainer = invCont;

    // line-items
    const { container: liCont } = await database.containers.createIfNotExists({
      id: lineItemsContainerName,
      partitionKey: { paths: ['/id'] },
    });
    lineItemsContainer = liCont;

    // alerts
    const { container: alertCont } = await database.containers.createIfNotExists({
      id: alertsContainerName,
      partitionKey: { paths: ['/id'] },
    });
    alertsContainer = alertCont;

    // documents
    const { container: docCont } = await database.containers.createIfNotExists({
      id: documentsContainerName,
      partitionKey: { paths: ['/id'] },
    });
    documentsContainer = docCont;

    // Marcar como inicializado
    isInitialized = true;
  })();

  return initPromise;
}

export async function getVendorsContainer(): Promise<Container> {
  await initCosmos();
  if (!vendorsContainer) throw new Error('Cosmos not initialized: vendors container');
  return vendorsContainer;
}

export async function getVehiclesContainer(): Promise<Container> {
  await initCosmos();
  if (!vehiclesContainer) throw new Error('Cosmos not initialized: vehicles container');
  return vehiclesContainer;
}

export async function getServiceTypesContainer(): Promise<Container> {
  await initCosmos();
  if (!serviceTypesContainer) throw new Error('Cosmos not initialized: service-types container');
  return serviceTypesContainer;
}

export async function getInvoicesContainer(): Promise<Container> {
  await initCosmos();
  if (!invoicesContainer) throw new Error('Cosmos not initialized: invoices container');
  return invoicesContainer;
}

export async function getLineItemsContainer(): Promise<Container> {
  await initCosmos();
  if (!lineItemsContainer) throw new Error('Cosmos not initialized: line-items container');
  return lineItemsContainer;
}

export async function getAlertsContainer(): Promise<Container> {
  await initCosmos();
  if (!alertsContainer) throw new Error('Cosmos not initialized: alerts container');
  return alertsContainer;
}

export async function getDocumentsContainer(): Promise<Container> {
  await initCosmos();
  if (!documentsContainer) throw new Error('Cosmos not initialized: documents container');
  return documentsContainer;
}
