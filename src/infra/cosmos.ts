// src/infra/cosmos.ts
import { CosmosClient, Container, Database } from '@azure/cosmos';

const connection = process.env.COSMOS_DB_CONNECTION!;
const dbName = process.env.COSMOS_DB_DATABASE!;
const vendorsContainerName = process.env.COSMOS_DB_CONTAINER_VENDORS!;
const vehiclesContainerName = process.env.COSMOS_DB_CONTAINER_VEHICLES!;
const serviceTypesContainerName = process.env.COSMOS_DB_CONTAINER_SERVICE_TYPES || 'service-types';
const invoicesContainerName = process.env.COSMOS_DB_CONTAINER_INVOICES || 'invoices';

// Cliente único para toda la app
const client = new CosmosClient(connection);

let database: Database;
let vendorsContainer: Container;
let vehiclesContainer: Container;
let serviceTypesContainer: Container;
let invoicesContainer: Container;

/**
 * En DEV: createIfNotExists para que corra out-of-the-box.
 * En PROD: aprovisiona con IaC y usa getDatabase/getContainer.
 */
export async function initCosmos(): Promise<void> {
  const { database: db } = await client.databases.createIfNotExists({ id: dbName });
  database = db;

  // vendors: partitionKey /id (simple para lecturas por id)
  const { container: vCont } = await database.containers.createIfNotExists({
    id: vendorsContainerName,
    partitionKey: { paths: ['/id'] },
    uniqueKeyPolicy: {
      // opcional: prevenir nombres duplicados
      uniqueKeys: [{ paths: ['/name'] }]
    }
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
      uniqueKeys: [{ paths: ['/name'] }]
    }
  });
  serviceTypesContainer = stCont;

  // invoices
  const { container: invCont } = await database.containers.createIfNotExists({
    id: invoicesContainerName,
    partitionKey: { paths: ['/id'] },
    uniqueKeyPolicy: {
      // Prevent duplicate invoice numbers
      uniqueKeys: [{ paths: ['/invoiceNumber'] }]
    }
  });
  invoicesContainer = invCont;
}

export function getVendorsContainer(): Container {
  if (!vendorsContainer) throw new Error('Cosmos not initialized: vendors container');
  return vendorsContainer;
}

export function getVehiclesContainer(): Container {
  if (!vehiclesContainer) throw new Error('Cosmos not initialized: vehicles container');
  return vehiclesContainer;
}

export function getServiceTypesContainer(): Container {
  if (!serviceTypesContainer) throw new Error('Cosmos not initialized: service-types container');
  return serviceTypesContainer;
}

export function getInvoicesContainer(): Container {
  if (!invoicesContainer) throw new Error('Cosmos not initialized: invoices container');
  return invoicesContainer;
}
