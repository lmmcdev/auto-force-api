import { AppModule } from './app.module';

async function bootstrap() {
  const app = new AppModule();

  console.log('Auto Force API starting...');
  console.log('Available modules:', Object.keys(app.getModules()));

  return app;
}

export { bootstrap, AppModule };