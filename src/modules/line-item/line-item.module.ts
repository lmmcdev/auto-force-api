import { LineItemController } from './controllers/line-item.controller';
import { LineItemService } from './services/line-item.service';

export class LineItemModule {
  private lineItemService: LineItemService;
  private lineItemController: LineItemController;

  constructor() {
    this.lineItemService = new LineItemService();
    this.lineItemController = new LineItemController();
  }

  getController(): LineItemController {
    return this.lineItemController;
  }

  getService(): LineItemService {
    return this.lineItemService;
  }
}

// Entity exports
export * from './entities/line-item.entity';

// DTO exports
export * from './dto/create-line-item.dto';
export * from './dto/update-line-item.dto';
export * from './dto/query-line-item.dto';

// Service exports
export * from './services/line-item.service';

// Controller exports - this will register all HTTP routes
export * from './controllers/line-item.controller';