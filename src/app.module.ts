import { VehicleModule } from './modules/vehicle/vehicle.module';
import { HealthModule } from './modules/health/health.module';
import { VendorModule } from './modules/vendor/vendor.module';


export class AppModule {
  private vehicleModule: VehicleModule;
  private healthModule: HealthModule;
  private vendorModule : VendorModule;

  constructor() {
    this.vehicleModule = new VehicleModule();
    this.healthModule = new HealthModule();
    this.vendorModule = new VendorModule();
  }

  getVehicleModule(): VehicleModule {
    return this.vehicleModule;
  }

  getHealthModule(): HealthModule {
    return this.healthModule;
  }
  getvendorthModule(): VendorModule {
    return this.vendorModule;
  }

  getModules() {
    return {
      vehicle: this.vehicleModule,
      health: this.healthModule,
      vendor: this.vendorModule
    };
  }
}