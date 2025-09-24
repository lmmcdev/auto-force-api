import { VehicleModule } from './modules/vehicle/vehicle.module';
import { HealthModule } from './modules/health/health.module';

export class AppModule {
  private vehicleModule: VehicleModule;
  private healthModule: HealthModule;

  constructor() {
    this.vehicleModule = new VehicleModule();
    this.healthModule = new HealthModule();
  }

  getVehicleModule(): VehicleModule {
    return this.vehicleModule;
  }

  getHealthModule(): HealthModule {
    return this.healthModule;
  }

  getModules() {
    return {
      vehicle: this.vehicleModule,
      health: this.healthModule
    };
  }
}