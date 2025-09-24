import { HealthController } from './controllers/health.controller';
import { HealthService } from './services/health.service';

export class HealthModule {
  private healthService: HealthService;
  private healthController: HealthController;

  constructor() {
    this.healthService = new HealthService();
    this.healthController = new HealthController(this.healthService);
  }

  getController(): HealthController {
    return this.healthController;
  }

  getService(): HealthService {
    return this.healthService;
  }
}