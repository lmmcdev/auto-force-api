/**
 * Integration Examples
 *
 * This file shows how to integrate the auth module with other controllers
 * in your Azure Functions project.
 */

import { HttpRequest, HttpResponseInit, InvocationContext, app } from "@azure/functions";
import { authService, AuthMiddleware, AuthenticatedUser } from "../index";

// Example 1: Basic protected endpoint
export class ExampleController {

  /**
   * Simple protected endpoint that requires authentication
   */
  async protectedEndpoint(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      // Require authentication - will throw AuthenticationError if not authenticated
      const user = authService.getAuthenticatedUser(request);

      return {
        status: 200,
        jsonBody: {
          message: `Hello ${user.name}! You are authenticated.`,
          data: {
            userId: user.oid,
            email: user.email,
            roles: user.roles
          }
        }
      };
    } catch (error: any) {
      context.error("protectedEndpoint error", error);
      return {
        status: 401,
        jsonBody: {
          message: error.message || "Authentication required",
          error: "UNAUTHORIZED"
        }
      };
    }
  }

  /**
   * Admin-only endpoint using middleware helper
   */
  async adminOnlyEndpoint(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      // This will throw if user is not authenticated or doesn't have Admin role
      const user = AuthMiddleware.requireRole(request, ['Admin']);

      return {
        status: 200,
        jsonBody: {
          message: "Admin access granted",
          data: {
            adminUser: user.name,
            timestamp: new Date().toISOString()
          }
        }
      };
    } catch (error: any) {
      context.error("adminOnlyEndpoint error", error);
      return {
        status: error.statusCode || 403,
        jsonBody: {
          message: error.message || "Access denied",
          error: "ACCESS_DENIED"
        }
      };
    }
  }

  /**
   * Endpoint that requires multiple roles
   */
  async multiRoleEndpoint(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      // User must have BOTH Admin AND Approver roles
      const user = AuthMiddleware.requireAllRoles(request, ['Admin', 'Approver']);

      return {
        status: 200,
        jsonBody: {
          message: "Multi-role access granted",
          data: user
        }
      };
    } catch (error: any) {
      context.error("multiRoleEndpoint error", error);
      return {
        status: error.statusCode || 403,
        jsonBody: {
          message: error.message || "Insufficient permissions",
          error: "INSUFFICIENT_PERMISSIONS"
        }
      };
    }
  }

  /**
   * Endpoint that allows either Admin OR Approver role
   */
  async flexibleRoleEndpoint(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      // User must have either Admin OR Approver role
      const user = AuthMiddleware.requireRole(request, ['Admin', 'Approver']);

      return {
        status: 200,
        jsonBody: {
          message: "Flexible role access granted",
          data: user
        }
      };
    } catch (error: any) {
      context.error("flexibleRoleEndpoint error", error);
      return {
        status: error.statusCode || 403,
        jsonBody: {
          message: error.message || "Access denied",
          error: "ACCESS_DENIED"
        }
      };
    }
  }

  /**
   * User-specific resource endpoint
   * Users can only access their own data, unless they have Admin role
   */
  async userResourceEndpoint(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const userId = request.params.userId;

      if (!userId) {
        return {
          status: 400,
          jsonBody: {
            message: "User ID parameter is required",
            error: "MISSING_PARAMETER"
          }
        };
      }

      // This will allow:
      // 1. Users to access their own data (user.oid === userId)
      // 2. Admins to access any user's data
      const user = AuthMiddleware.requireOwnershipOrAdmin(request, userId);

      // Simulate fetching user-specific data
      const userData = {
        userId: userId,
        accessedBy: user.oid,
        isOwnData: user.oid === userId,
        data: `User data for ${userId}`
      };

      return {
        status: 200,
        jsonBody: {
          message: "User data retrieved successfully",
          data: userData
        }
      };
    } catch (error: any) {
      context.error("userResourceEndpoint error", error);
      return {
        status: error.statusCode || 403,
        jsonBody: {
          message: error.message || "Access denied",
          error: "ACCESS_DENIED"
        }
      };
    }
  }

  /**
   * Optional authentication endpoint
   * Works differently for authenticated vs anonymous users
   */
  async optionalAuthEndpoint(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      // This returns the user if authenticated, null otherwise (doesn't throw)
      const user = AuthMiddleware.optionalAuth(request);

      if (user) {
        // Personalized response for authenticated users
        return {
          status: 200,
          jsonBody: {
            message: `Welcome back, ${user.name}!`,
            data: {
              personalized: true,
              user: user,
              timestamp: new Date().toISOString()
            }
          }
        };
      } else {
        // Generic response for anonymous users
        return {
          status: 200,
          jsonBody: {
            message: "Welcome, visitor!",
            data: {
              personalized: false,
              timestamp: new Date().toISOString(),
              suggestion: "Consider logging in for a personalized experience"
            }
          }
        };
      }
    } catch (error: any) {
      context.error("optionalAuthEndpoint error", error);
      return {
        status: 500,
        jsonBody: {
          message: "Internal server error",
          error: "INTERNAL_ERROR"
        }
      };
    }
  }

  /**
   * Conditional logic based on user roles
   */
  async conditionalRoleEndpoint(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      const user = authService.getAuthenticatedUser(request);

      // Different behavior based on roles
      let responseData: any = {
        basicInfo: "This is available to all authenticated users",
        user: {
          name: user.name,
          email: user.email
        }
      };

      // Add admin-specific data
      if (authService.hasRole(request, 'Admin')) {
        responseData.adminData = {
          message: "This is admin-only information",
          serverStats: {
            uptime: "24h",
            users: 150
          }
        };
      }

      // Add approver-specific data
      if (authService.hasRole(request, 'Approver')) {
        responseData.approverData = {
          message: "This is approver-specific information",
          pendingApprovals: 5
        };
      }

      // Add manager-specific data
      if (authService.hasAnyRole(request, ['Manager', 'Admin'])) {
        responseData.managementData = {
          message: "This is for managers and admins",
          teamMetrics: {
            productivity: "95%",
            satisfaction: "4.8/5"
          }
        };
      }

      return {
        status: 200,
        jsonBody: {
          message: "Conditional data based on roles",
          data: responseData
        }
      };
    } catch (error: any) {
      context.error("conditionalRoleEndpoint error", error);
      return {
        status: error.statusCode || 401,
        jsonBody: {
          message: error.message || "Authentication required",
          error: "AUTHENTICATION_REQUIRED"
        }
      };
    }
  }

  /**
   * Helper method to handle authentication errors consistently
   */
  private handleAuthError(error: any, context: InvocationContext): HttpResponseInit {
    context.error("Authentication error", error);

    // Determine appropriate status code
    let status = 500;
    let errorCode = "INTERNAL_ERROR";

    if (error.name === 'AuthenticationError') {
      status = 401;
      errorCode = "AUTHENTICATION_REQUIRED";
    } else if (error.name === 'AuthorizationError') {
      status = 403;
      errorCode = "ACCESS_DENIED";
    }

    return {
      status,
      jsonBody: {
        message: error.message || "An error occurred",
        error: errorCode,
        timestamp: new Date().toISOString()
      }
    };
  }
}

export const exampleController = new ExampleController();

// Azure Functions registrations for examples
const exampleRoute = "v1/examples";

app.http("ExampleProtected", {
  methods: ["GET"],
  route: `${exampleRoute}/protected`,
  authLevel: "function",
  handler: (req, ctx) => exampleController.protectedEndpoint(req, ctx),
});

app.http("ExampleAdminOnly", {
  methods: ["GET"],
  route: `${exampleRoute}/admin-only`,
  authLevel: "function",
  handler: (req, ctx) => exampleController.adminOnlyEndpoint(req, ctx),
});

app.http("ExampleMultiRole", {
  methods: ["GET"],
  route: `${exampleRoute}/multi-role`,
  authLevel: "function",
  handler: (req, ctx) => exampleController.multiRoleEndpoint(req, ctx),
});

app.http("ExampleFlexibleRole", {
  methods: ["GET"],
  route: `${exampleRoute}/flexible-role`,
  authLevel: "function",
  handler: (req, ctx) => exampleController.flexibleRoleEndpoint(req, ctx),
});

app.http("ExampleUserResource", {
  methods: ["GET"],
  route: `${exampleRoute}/user/{userId}`,
  authLevel: "function",
  handler: (req, ctx) => exampleController.userResourceEndpoint(req, ctx),
});

app.http("ExampleOptionalAuth", {
  methods: ["GET"],
  route: `${exampleRoute}/optional-auth`,
  authLevel: "function",
  handler: (req, ctx) => exampleController.optionalAuthEndpoint(req, ctx),
});

app.http("ExampleConditionalRole", {
  methods: ["GET"],
  route: `${exampleRoute}/conditional-role`,
  authLevel: "function",
  handler: (req, ctx) => exampleController.conditionalRoleEndpoint(req, ctx),
});

/**
 * Usage in existing controllers
 *
 * To integrate with your existing modules (vehicle, vendor, invoice, etc.):
 *
 * 1. Import the auth module:
 *    import { AuthMiddleware } from '@/modules/auth';
 *
 * 2. Add authentication to your existing endpoints:
 *
 *    async getVehicles(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
 *      try {
 *        // Add this line to require authentication
 *        const user = AuthMiddleware.requireAuth(request);
 *
 *        // Your existing logic
 *        const vehicles = await vehicleService.findAll();
 *        return { status: 200, jsonBody: { data: vehicles } };
 *      } catch (error) {
 *        // Handle auth errors
 *        if (error.name === 'AuthenticationError') {
 *          return { status: 401, jsonBody: { message: error.message } };
 *        }
 *        // Your existing error handling
 *      }
 *    }
 *
 * 3. For admin-only endpoints:
 *
 *    async deleteVehicle(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
 *      try {
 *        // Require Admin role
 *        const user = AuthMiddleware.requireRole(request, ['Admin']);
 *
 *        // Your existing delete logic
 *        await vehicleService.delete(id);
 *        return { status: 204 };
 *      } catch (error) {
 *        // Handle errors
 *      }
 *    }
 */