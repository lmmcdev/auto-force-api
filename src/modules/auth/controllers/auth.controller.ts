import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { authService } from "../services/auth.service";
import {
  AuthenticationError,
  AuthorizationError
} from "../entities/auth.entity";

const authRoute = "v1/auth";

export class AuthController {

  /**
   * GET /auth/me - Returns current authenticated user information
   */
  async getCurrentUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const user = authService.getAuthenticatedUser(request);

      return {
        status: 200,
        jsonBody: {
          message: "User authenticated successfully",
          data: user
        }
      };
    } catch (err: any) {
      context.error("auth.getCurrentUser error", err);
      return this.toError(err);
    }
  }

  /**
   * GET /auth/context - Returns full authentication context
   */
  async getAuthContext(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const authContext = authService.getAuthContext(request);

      return {
        status: 200,
        jsonBody: {
          message: "Authentication context retrieved",
          data: authContext
        }
      };
    } catch (err: any) {
      context.error("auth.getAuthContext error", err);
      return this.toError(err);
    }
  }

  /**
   * GET /auth/principal - Returns raw client principal (for debugging)
   */
  async getClientPrincipal(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      authService.requireAuthentication(request);
      const principal = authService.getClientPrincipal(request);

      return {
        status: 200,
        jsonBody: {
          message: "Client principal retrieved",
          data: principal
        }
      };
    } catch (err: any) {
      context.error("auth.getClientPrincipal error", err);
      return this.toError(err);
    }
  }

  /**
   * GET /auth/roles - Returns user roles
   */
  async getUserRoles(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const user = authService.getAuthenticatedUser(request);

      return {
        status: 200,
        jsonBody: {
          message: "User roles retrieved",
          data: {
            oid: user.oid,
            roles: user.roles
          }
        }
      };
    } catch (err: any) {
      context.error("auth.getUserRoles error", err);
      return this.toError(err);
    }
  }

  /**
   * POST /auth/check-role - Checks if user has a specific role
   */
  async checkRole(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const body = await request.json() as { role: string };

      if (!body.role) {
        return {
          status: 400,
          jsonBody: {
            message: "Role parameter is required",
            error: "MISSING_ROLE"
          }
        };
      }

      const hasRole = authService.hasRole(request, body.role);
      const user = authService.getAuthenticatedUserOrNull(request);

      return {
        status: 200,
        jsonBody: {
          message: `Role check completed for role: ${body.role}`,
          data: {
            hasRole,
            role: body.role,
            userRoles: user?.roles || []
          }
        }
      };
    } catch (err: any) {
      context.error("auth.checkRole error", err);
      return this.toError(err);
    }
  }

  /**
   * POST /auth/require-role - Endpoint that requires a specific role (for testing)
   */
  async requireRoleEndpoint(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const body = await request.json() as { role: string };

      if (!body.role) {
        return {
          status: 400,
          jsonBody: {
            message: "Role parameter is required",
            error: "MISSING_ROLE"
          }
        };
      }

      // This will throw if user doesn't have the role
      authService.requireRole(request, [body.role]);

      const user = authService.getAuthenticatedUser(request);

      return {
        status: 200,
        jsonBody: {
          message: `Access granted for role: ${body.role}`,
          data: {
            user: user,
            requiredRole: body.role
          }
        }
      };
    } catch (err: any) {
      context.error("auth.requireRoleEndpoint error", err);
      return this.toError(err);
    }
  }

  /**
   * GET /auth/config - Configuration validation endpoint (no auth required)
   */
  async getConfig(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const config = authService.getConfig();

      if (!config) {
        return {
          status: 500,
          jsonBody: {
            message: "Authentication configuration not found",
            error: "MISSING_CONFIG",
            help: "Please set CLIENT_ID, TENANT_ID, APP_ID_URI, and ALLOWED_ROLES environment variables"
          }
        };
      }

      // Return safe configuration (excluding sensitive data)
      const safeConfig = {
        tenantId: config.tenantId,
        appIdUri: config.appIdUri,
        allowedRoles: config.allowedRoles,
        issuer: config.issuer,
        clientId: `${config.clientId.substring(0, 8)}...`,
        configStatus: "valid"
      };

      return {
        status: 200,
        jsonBody: {
          message: "Authentication configuration retrieved",
          data: safeConfig
        }
      };
    } catch (err: any) {
      context.error("auth.getConfig error", err);
      return {
        status: 500,
        jsonBody: {
          message: "Configuration validation failed",
          error: err.message || "CONFIG_ERROR",
          help: "Check your environment variables and Azure AD setup"
        }
      };
    }
  }

  /**
   * GET /auth/health - Health check endpoint (no auth required)
   */
  async healthCheck(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const isAuth = authService.getAuthenticatedUserOrNull(request) !== null;
      const config = authService.getConfig();
      const hasValidConfig = config !== null;

      return {
        status: 200,
        jsonBody: {
          message: "Auth service is healthy",
          data: {
            timestamp: new Date().toISOString(),
            authenticated: isAuth,
            configurationValid: hasValidConfig,
            service: "auth-service",
            version: "1.0.0"
          }
        }
      };
    } catch (err: any) {
      context.error("auth.healthCheck error", err);
      return this.toError(err);
    }
  }

  /**
   * Maps errors to HTTP responses
   */
  private toError(err: any): HttpResponseInit {
    if (err instanceof AuthenticationError) {
      return {
        status: err.statusCode,
        jsonBody: {
          message: err.message,
          error: "AUTHENTICATION_ERROR"
        }
      };
    }

    if (err instanceof AuthorizationError) {
      return {
        status: err.statusCode,
        jsonBody: {
          message: err.message,
          error: "AUTHORIZATION_ERROR"
        }
      };
    }

    const msg = String(err?.message ?? "Internal server error");
    const status = /not found/i.test(msg) ? 404 :
                  /already exists/i.test(msg) ? 409 :
                  /required|invalid/i.test(msg) ? 400 :
                  500;

    return {
      status,
      jsonBody: {
        message: msg,
        error: "INTERNAL_ERROR"
      }
    };
  }
}

export const authController = new AuthController();

// Azure Functions registrations
app.http("GetCurrentUser", {
  methods: ["GET"],
  route: `${authRoute}/me`,
  authLevel: "function",
  handler: (req, ctx) => authController.getCurrentUser(req, ctx),
});

app.http("GetAuthContext", {
  methods: ["GET"],
  route: `${authRoute}/context`,
  authLevel: "function",
  handler: (req, ctx) => authController.getAuthContext(req, ctx),
});

app.http("GetClientPrincipal", {
  methods: ["GET"],
  route: `${authRoute}/principal`,
  authLevel: "function",
  handler: (req, ctx) => authController.getClientPrincipal(req, ctx),
});

app.http("GetUserRoles", {
  methods: ["GET"],
  route: `${authRoute}/roles`,
  authLevel: "function",
  handler: (req, ctx) => authController.getUserRoles(req, ctx),
});

app.http("CheckRole", {
  methods: ["POST"],
  route: `${authRoute}/check-role`,
  authLevel: "function",
  handler: (req, ctx) => authController.checkRole(req, ctx),
});

app.http("RequireRoleEndpoint", {
  methods: ["POST"],
  route: `${authRoute}/require-role`,
  authLevel: "function",
  handler: (req, ctx) => authController.requireRoleEndpoint(req, ctx),
});

app.http("GetAuthConfig", {
  methods: ["GET"],
  route: `${authRoute}/config`,
  authLevel: "function",
  handler: (req, ctx) => authController.getConfig(req, ctx),
});

app.http("AuthHealthCheck", {
  methods: ["GET"],
  route: `${authRoute}/health`,
  authLevel: "function",
  handler: (req, ctx) => authController.healthCheck(req, ctx),
});