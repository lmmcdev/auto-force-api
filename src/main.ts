import 'dotenv/config';
import { AppModule } from './app.module';
import { initCosmos } from './infra/cosmos';

async function bootstrap() {
  // Inicializa Cosmos antes de arrancar la app
  await initCosmos().catch(err => {
    console.error('Cosmos init error', err);
    throw err;
  });

  const app = new AppModule();

  console.log('Auto Force API starting...');
  console.log('Available modules:', Object.keys(app.getModules()));

  return app;
}

export { bootstrap, AppModule };
