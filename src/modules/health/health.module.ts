import { HealthController } from './controllers/health.controller';
import { HealthService } from './services/health.service';

export class HealthModule {
  static controllers = [HealthController];
  static services = [HealthService];
}
