import { HttpRequest } from "@azure/functions";
import { msalAuthService } from "../services/msal-auth.service";
import {
  AuthenticatedUser,
  AuthenticationError,
  AuthorizationError
} from "../entities/auth.entity";

/**
 * MSAL Authentication middleware helper functions
 * All methods are async because MSAL validates JWT tokens
 */
export class MsalAuthMiddleware {

  /**
   * Validates authentication and extracts user
   * Use this as the first step in protected endpoints
   */
  static async requireAuth(request: HttpRequest): Promise<AuthenticatedUser> {
    return await msalAuthService.getAuthenticatedUser(request);
  }

  /**
   * Validates authentication and role requirements
   * Use this for endpoints that require specific roles
   */
  static async requireRole(request: HttpRequest, roles: string[]): Promise<AuthenticatedUser> {
    const user = await msalAuthService.getAuthenticatedUser(request);
    await msalAuthService.requireRole(request, roles);
    return user;
  }

  /**
   * Validates authentication and requires all specified roles
   * Use this for endpoints that require multiple roles
   */
  static async requireAllRoles(request: HttpRequest, roles: string[]): Promise<AuthenticatedUser> {
    const user = await msalAuthService.getAuthenticatedUser(request);
    await msalAuthService.requireAllRoles(request, roles);
    return user;
  }

  /**
   * Validates resource ownership or admin role
   * Use this for endpoints where users can only access their own data
   */
  static async requireOwnershipOrAdmin(request: HttpRequest, resourceUserId: string): Promise<AuthenticatedUser> {
    const user = await msalAuthService.getAuthenticatedUser(request);
    await msalAuthService.requireOwnershipOrRole(request, resourceUserId, ['access_admin']);
    return user;
  }

  /**
   * Optional authentication - returns user if authenticated, null otherwise
   * Use this for endpoints that work differently for authenticated vs anonymous users
   */
  static async optionalAuth(request: HttpRequest): Promise<AuthenticatedUser | null> {
    return await msalAuthService.getAuthenticatedUserOrNull(request);
  }
}

/**
 * Decorator-style helpers for common auth patterns
 */
export const MsalAuthDecorators = {
  /**
   * Requires authentication
   */
  requireAuth: async (request: HttpRequest) => await MsalAuthMiddleware.requireAuth(request),

  /**
   * Requires access_admin role
   */
  requireAdmin: async (request: HttpRequest) => await MsalAuthMiddleware.requireRole(request, ['access_admin']),

  /**
   * Requires access_user role
   */
  requireUser: async (request: HttpRequest) => await MsalAuthMiddleware.requireRole(request, ['access_user']),

  /**
   * Requires either admin or user role
   */
  requireAdminOrUser: async (request: HttpRequest) => await MsalAuthMiddleware.requireRole(request, ['access_admin', 'access_user']),
};

/**
 * Higher-order function to wrap controllers with MSAL authentication
 * @param authFn - Authentication function to apply
 * @returns Wrapped controller function
 */
export function withMsalAuth<T extends any[]>(
  authFn: (request: HttpRequest) => Promise<AuthenticatedUser | null>
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<any>>
  ) {
    const method = descriptor.value!;

    descriptor.value = async function (...args: T) {
      const request = args[0] as HttpRequest;
      try {
        // Apply authentication
        const user = await authFn(request);

        // Add user to request context for use in the controller
        (request as any).user = user;

        // Call original method
        return await method.apply(this, args);
      } catch (error) {
        if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
          return {
            status: error.statusCode,
            jsonBody: {
              message: error.message,
              error: error.name.toUpperCase()
            }
          };
        }
        throw error;
      }
    };

    return descriptor;
  };
}
