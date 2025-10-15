import { AppModule } from './app.module';
import { initCosmos } from './infra/cosmos';

// Inicializa una vez al arrancar el proceso
const cosmosReady = initCosmos().catch(err => {
  console.error('Cosmos init error', err);
  throw err;
});

// Helper para garantizar la init antes de cada handler
const withCosmos = <T extends (...args: any[]) => any>(handler: T): T =>
  (async (...args: any[]) => {
    await cosmosReady;
    return handler(...args);
  }) as unknown as T;

async function bootstrap() {
  const app = new AppModule();

  console.log('Auto Force API starting...');
  console.log('Available modules:', Object.keys(app.getModules()));

  return app;
}

export { bootstrap, AppModule };
