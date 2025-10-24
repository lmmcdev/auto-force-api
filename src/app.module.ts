import { VehicleModule } from './modules/vehicle/vehicle.module';
import { HealthModule } from './modules/health/health.module';
import { VendorModule } from './modules/vendor/vendor.module';
import { ServiceTypeModule } from './modules/service-type/service-type.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { LineItemModule } from './modules/line-item/line-item.module';
import { AlertModule } from './modules/alert/alert.module';
import { DocumentModule } from './modules/document/document.module';

export class AppModule {
  private vehicleModule: VehicleModule;
  private healthModule: HealthModule;
  private vendorModule: VendorModule;
  private serviceTypeModule: ServiceTypeModule;
  private invoiceModule: InvoiceModule;
  private lineItemModule: LineItemModule;
  private alertModule: AlertModule;
  private documentModule: DocumentModule;

  constructor() {
    this.vehicleModule = new VehicleModule();
    this.healthModule = new HealthModule();
    this.vendorModule = new VendorModule();
    this.serviceTypeModule = new ServiceTypeModule();
    this.invoiceModule = new InvoiceModule();
    this.lineItemModule = new LineItemModule();
    this.alertModule = new AlertModule();
    this.documentModule = new DocumentModule();
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

  getInvoiceModule(): InvoiceModule {
    return this.invoiceModule;
  }

  getLineItemModule(): LineItemModule {
    return this.lineItemModule;
  }

  getAlertModule(): AlertModule {
    return this.alertModule;
  }

  getDocumentModule(): DocumentModule {
    return this.documentModule;
  }

  getModules() {
    return {
      vehicle: this.vehicleModule,
      health: this.healthModule,
      vendor: this.vendorModule,
      serviceType: this.serviceTypeModule,
      invoice: this.invoiceModule,
      lineItem: this.lineItemModule,
      alert: this.alertModule,
      document: this.documentModule,
    };
  }
}
