import { authService } from './services/auth.service';
import { authController } from './controllers/auth.controller';

export class AuthModule {
  private readonly authService = authService;
  private readonly authController = authController;

  constructor() {
    // Auth module initialization
    console.log('Auth module initialized');
  }

  getAuthService() {
    return this.authService;
  }

  getAuthController() {
    return this.authController;
  }

  getServices() {
    return {
      auth: this.authService
    };
  }

  getControllers() {
    return {
      auth: this.authController
    };
  }
}