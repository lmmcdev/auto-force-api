import { VehicleModule } from './modules/vehicle/vehicle.module';
import { HealthModule } from './modules/health/health.module';
import { VendorModule } from './modules/vendor/vendor.module';
import { ServiceTypeModule } from './modules/service-type/service-type.module';


export class AppModule {
  private vehicleModule: VehicleModule;
  private healthModule: HealthModule;
  private vendorModule : VendorModule;
  private serviceTypeModule: ServiceTypeModule;

  constructor() {
    this.vehicleModule = new VehicleModule();
    this.healthModule = new HealthModule();
    this.vendorModule = new VendorModule();
    this.serviceTypeModule = new ServiceTypeModule();
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

  getServiceTypeModule(): ServiceTypeModule {
    return this.serviceTypeModule;
  }

  getModules() {
    return {
      vehicle: this.vehicleModule,
      health: this.healthModule,
      vendor: this.vendorModule,
      serviceType: this.serviceTypeModule
    };
  }
}