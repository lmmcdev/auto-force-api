import { ServiceTypeController } from './controllers/service-type.controller';
import { ServiceTypeService } from './services/service-type.service';

export class ServiceTypeModule {
  private serviceTypeService: ServiceTypeService;
  private serviceTypeController: ServiceTypeController;

  constructor() {
    this.serviceTypeService = new ServiceTypeService();
    this.serviceTypeController = new ServiceTypeController();
  }

  getController(): ServiceTypeController {
    return this.serviceTypeController;
  }

  getService(): ServiceTypeService {
    return this.serviceTypeService;
  }
}

// Entity exports
export * from './entities/service-type.entity';

// DTO exports
export * from './dto/create-service-type.dto';
export * from './dto/update-service-type.dto';
export * from './dto/query-service-type.dto';

// Service exports
export * from './services/service-type.service';

// Controller exports - this will register all HTTP routes
export * from './controllers/service-type.controller';