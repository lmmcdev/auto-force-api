import { InvoiceController } from './controllers/invoice.controller';
import { InvoiceService } from './services/invoice.service';

export class InvoiceModule {
  private invoiceService: InvoiceService;
  private invoiceController: InvoiceController;

  constructor() {
    this.invoiceService = new InvoiceService();
    this.invoiceController = new InvoiceController();
  }

  getController(): InvoiceController {
    return this.invoiceController;
  }

  getService(): InvoiceService {
    return this.invoiceService;
  }
}

// Entity exports
export * from './entities/invoice.entity';

// DTO exports
export * from './dto/create-invoice.dto';
export * from './dto/update-invoice.dto';
export * from './dto/query-invoice.dto';

// Service exports
export * from './services/invoice.service';

// Controller exports - this will register all HTTP routes
export * from './controllers/invoice.controller';
