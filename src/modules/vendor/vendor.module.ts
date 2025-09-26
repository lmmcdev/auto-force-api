import { VendorController } from "./controllers/vendor.controller";
import { VendorService } from "./services/vendor.service";

export class VendorModule{
    private vendorService: VendorService;
    private vendorController: VendorController;

    constructor(){
        this.vendorService = new VendorService();
        this.vendorController = new VendorController(this.vendorService);

    }

    getController(): VendorController{
        return this.vendorController;
    }

    getService(): VendorService{
        return this.vendorService;
    }
}