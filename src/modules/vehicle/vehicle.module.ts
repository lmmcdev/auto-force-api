import { VehicleController } from './controllers/vehicle.controller';
import { VehicleService } from './services/vehicle.service';

export class VehicleModule {
  private vehicleService: VehicleService;
  private vehicleController: VehicleController;

  constructor() {
    this.vehicleService = new VehicleService();
    this.vehicleController = new VehicleController();
  }

  getController(): VehicleController {
    return this.vehicleController;
  }

  getService(): VehicleService {
    return this.vehicleService;
  }
}
