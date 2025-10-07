import { HttpRequest } from "@azure/functions";
import { authService } from "../services/auth.service";
import {
  AuthenticatedUser,
  AuthenticationError,
  AuthorizationError
} from "../entities/auth.entity";

/**
 * Authentication middleware helper functions
 */
export class AuthMiddleware {

  /**
   * Validates authentication and extracts user
   * Use this as the first step in protected endpoints
   */
  static requireAuth(request: HttpRequest): AuthenticatedUser {
    return authService.getAuthenticatedUser(request);
  }

  /**
   * Validates authentication and role requirements
   * Use this for endpoints that require specific roles
   */
  static requireRole(request: HttpRequest, roles: string[]): AuthenticatedUser {
    const user = authService.getAuthenticatedUser(request);
    authService.requireRole(request, roles);
    return user;
  }

  /**
   * Validates authentication and requires all specified roles
   * Use this for endpoints that require multiple roles
   */
  static requireAllRoles(request: HttpRequest, roles: string[]): AuthenticatedUser {
    const user = authService.getAuthenticatedUser(request);
    authService.requireAllRoles(request, roles);
    return user;
  }

  /**
   * Validates resource ownership or admin role
   * Use this for endpoints where users can only access their own data
   */
  static requireOwnershipOrAdmin(request: HttpRequest, resourceUserId: string): AuthenticatedUser {
    const user = authService.getAuthenticatedUser(request);
    authService.requireOwnershipOrRole(request, resourceUserId, ['Admin', 'SuperAdmin']);
    return user;
  }

  /**
   * Optional authentication - returns user if authenticated, null otherwise
   * Use this for endpoints that work differently for authenticated vs anonymous users
   */
  static optionalAuth(request: HttpRequest): AuthenticatedUser | null {
    return authService.getAuthenticatedUserOrNull(request);
  }
}

/**
 * Decorator-style helpers for common auth patterns
 */
export const AuthDecorators = {
  /**
   * Requires authentication
   */
  requireAuth: (request: HttpRequest) => AuthMiddleware.requireAuth(request),

  /**
   * Requires Admin role
   */
  requireAdmin: (request: HttpRequest) => AuthMiddleware.requireRole(request, ['Admin']),

  /**
   * Requires Approver role
   */
  requireApprover: (request: HttpRequest) => AuthMiddleware.requireRole(request, ['Approver']),

  /**
   * Requires either Admin or Approver role
   */
  requireAdminOrApprover: (request: HttpRequest) => AuthMiddleware.requireRole(request, ['Admin', 'Approver']),

  /**
   * Requires SuperAdmin role
   */
  requireSuperAdmin: (request: HttpRequest) => AuthMiddleware.requireRole(request, ['SuperAdmin']),
};

/**
 * Higher-order function to wrap controllers with authentication
 * @param authFn - Authentication function to apply
 * @returns Wrapped controller function
 */
export function withAuth<T extends any[]>(
  authFn: (request: HttpRequest) => AuthenticatedUser | null
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
        const user = authFn(request);

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