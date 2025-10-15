import { AlertController } from './controllers/alert.controller';
import { AlertService } from './services/alert.service';

export class AlertModule {
  private alertService: AlertService;
  private alertController: AlertController;

  constructor() {
    this.alertService = new AlertService();
    this.alertController = new AlertController();
  }

  getController(): AlertController {
    return this.alertController;
  }

  getService(): AlertService {
    return this.alertService;
  }
}

// Also export types for external use
export * from './entities/alert.entity';
export * from './dto/create-alert.dto';
export * from './dto/update-alert.dto';
export * from './dto/query-alert.dto';
export * from './services/alert.service';
