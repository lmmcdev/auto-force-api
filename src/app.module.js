"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const vehicle_module_1 = require("./modules/vehicle/vehicle.module");
const health_module_1 = require("./modules/health/health.module");
const vendor_module_1 = require("./modules/vendor/vendor.module");
const service_type_module_1 = require("./modules/service-type/service-type.module");
const invoice_module_1 = require("./modules/invoice/invoice.module");
const line_item_module_1 = require("./modules/line-item/line-item.module");
const alert_module_1 = require("./modules/alert/alert.module");
class AppModule {
    vehicleModule;
    healthModule;
    vendorModule;
    serviceTypeModule;
    invoiceModule;
    lineItemModule;
    alertModule;
    constructor() {
        this.vehicleModule = new vehicle_module_1.VehicleModule();
        this.healthModule = new health_module_1.HealthModule();
        this.vendorModule = new vendor_module_1.VendorModule();
        this.serviceTypeModule = new service_type_module_1.ServiceTypeModule();
        this.invoiceModule = new invoice_module_1.InvoiceModule();
        this.lineItemModule = new line_item_module_1.LineItemModule();
        this.alertModule = new alert_module_1.AlertModule();
    }
    getVehicleModule() {
        return this.vehicleModule;
    }
    getHealthModule() {
        return this.healthModule;
    }
    getvendorthModule() {
        return this.vendorModule;
    }
    getServiceTypeModule() {
        return this.serviceTypeModule;
    }
    getInvoiceModule() {
        return this.invoiceModule;
    }
    getLineItemModule() {
        return this.lineItemModule;
    }
    getAlertModule() {
        return this.alertModule;
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
        };
    }
}
exports.AppModule = AppModule;
