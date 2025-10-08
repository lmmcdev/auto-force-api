import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { msalAuthService } from "../services/msal-auth.service";
import {
  AuthenticationError,
  AuthorizationError
} from "../entities/auth.entity";

const authRoute = "v1/msal-auth";

export class MsalAuthController {

  /**
   * GET /msal-auth/me - Returns current authenticated user information
   */
  async getCurrentUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const user = await msalAuthService.getAuthenticatedUser(request);

      return {
        status: 200,
        jsonBody: {
          message: "User authenticated successfully",
          data: user
        }
      };
    } catch (err: any) {
      context.error("msal-auth.getCurrentUser error", err);
      return this.toError(err);
    }
  }

  /**
   * GET /msal-auth/context - Returns full authentication context
   */
  async getAuthContext(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const authContext = await msalAuthService.getAuthContext(request);

      return {
        status: 200,
        jsonBody: {
          message: "Authentication context retrieved",
          data: authContext
        }
      };
    } catch (err: any) {
      context.error("msal-auth.getAuthContext error", err);
      return this.toError(err);
    }
  }

  /**
   * GET /msal-auth/roles - Returns user roles
   */
  async getUserRoles(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const user = await msalAuthService.getAuthenticatedUser(request);

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
      context.error("msal-auth.getUserRoles error", err);
      return this.toError(err);
    }
  }

  /**
   * POST /msal-auth/check-role - Checks if user has a specific role
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

      const hasRole = await msalAuthService.hasRole(request, body.role);
      const user = await msalAuthService.getAuthenticatedUserOrNull(request);

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
      context.error("msal-auth.checkRole error", err);
      return this.toError(err);
    }
  }

  /**
   * POST /msal-auth/require-role - Endpoint that requires a specific role (for testing)
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
      await msalAuthService.requireRole(request, [body.role]);

      const user = await msalAuthService.getAuthenticatedUser(request);

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
      context.error("msal-auth.requireRoleEndpoint error", err);
      return this.toError(err);
    }
  }

  /**
   * GET /msal-auth/config - Configuration validation endpoint (no auth required)
   */
  async getConfig(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const config = msalAuthService.getConfig();

      if (!config) {
        return {
          status: 500,
          jsonBody: {
            message: "Authentication configuration not found",
            error: "MISSING_CONFIG",
            help: "Please set AZURE_AD_CLIENT_ID, AZURE_AD_TENANT_ID, AZURE_AD_APP_ID_URI, and AZURE_AD_ALLOWED_ROLES environment variables"
          }
        };
      }

      // Return safe configuration (excluding sensitive data)
      const safeConfig = {
        tenantId: config.tenantId,
        appIdUri: config.appIdUri,
        allowedRoles: config.allowedRoles,
        issuer: config.issuer,
        jwksUri: config.jwksUri,
        clientId: `${config.clientId.substring(0, 8)}...`,
        configStatus: "valid"
      };

      return {
        status: 200,
        jsonBody: {
          message: "MSAL authentication configuration retrieved",
          data: safeConfig
        }
      };
    } catch (err: any) {
      context.error("msal-auth.getConfig error", err);
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
   * GET /msal-auth/health - Health check endpoint (no auth required)
   */
  async healthCheck(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const isAuth = await msalAuthService.getAuthenticatedUserOrNull(request) !== null;
      const config = msalAuthService.getConfig();
      const hasValidConfig = config !== null;

      return {
        status: 200,
        jsonBody: {
          message: "MSAL Auth service is healthy",
          data: {
            timestamp: new Date().toISOString(),
            authenticated: isAuth,
            configurationValid: hasValidConfig,
            service: "msal-auth-service",
            version: "1.0.0"
          }
        }
      };
    } catch (err: any) {
      context.error("msal-auth.healthCheck error", err);
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

export const msalAuthController = new MsalAuthController();

// Azure Functions registrations
app.http("MsalGetCurrentUser", {
  methods: ["GET"],
  route: `${authRoute}/me`,
  authLevel: "anonymous",
  handler: (req, ctx) => msalAuthController.getCurrentUser(req, ctx),
});

app.http("MsalGetAuthContext", {
  methods: ["GET"],
  route: `${authRoute}/context`,
  authLevel: "anonymous",
  handler: (req, ctx) => msalAuthController.getAuthContext(req, ctx),
});

app.http("MsalGetUserRoles", {
  methods: ["GET"],
  route: `${authRoute}/roles`,
  authLevel: "anonymous",
  handler: (req, ctx) => msalAuthController.getUserRoles(req, ctx),
});

app.http("MsalCheckRole", {
  methods: ["POST"],
  route: `${authRoute}/check-role`,
  authLevel: "anonymous",
  handler: (req, ctx) => msalAuthController.checkRole(req, ctx),
});

app.http("MsalRequireRoleEndpoint", {
  methods: ["POST"],
  route: `${authRoute}/require-role`,
  authLevel: "anonymous",
  handler: (req, ctx) => msalAuthController.requireRoleEndpoint(req, ctx),
});

app.http("MsalGetAuthConfig", {
  methods: ["GET"],
  route: `${authRoute}/config`,
  authLevel: "anonymous",
  handler: (req, ctx) => msalAuthController.getConfig(req, ctx),
});

app.http("MsalAuthHealthCheck", {
  methods: ["GET"],
  route: `${authRoute}/health`,
  authLevel: "anonymous",
  handler: (req, ctx) => msalAuthController.healthCheck(req, ctx),
});
