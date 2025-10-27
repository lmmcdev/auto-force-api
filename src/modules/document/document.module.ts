/**
 * Document Module
 * Manages vehicle documents including insurance, registration, inspections, etc.
 */

// Import controller to register Azure Functions
import './controllers/document.controller';

import { DocumentController } from './controllers/document.controller';
import { DocumentService } from './services/document.service';

export class DocumentModule {
  private documentService: DocumentService;
  private documentController: DocumentController;

  constructor() {
    this.documentService = new DocumentService();
    this.documentController = new DocumentController();
  }

  getController(): DocumentController {
    return this.documentController;
  }

  getService(): DocumentService {
    return this.documentService;
  }
}

export { Document, DocumentType, File, DocumentEntity } from './entities/document.entity';
export { CreateDocumentDto } from './dto/create-document.dto';
export { UpdateDocumentDto } from './dto/update-document.dto';
export { QueryDocumentDto } from './dto/query-document.dto';
export { DocumentService, documentService } from './services/document.service';
export { DocumentController, documentController } from './controllers/document.controller';
