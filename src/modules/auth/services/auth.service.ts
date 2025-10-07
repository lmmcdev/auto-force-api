import { HttpRequest } from "@azure/functions";
import {
  AuthContext,
  AuthenticatedUser,
  ClientPrincipal,
  AuthenticationError,
  AuthorizationError
} from "../entities/auth.entity";
import {
  getUser,
  getUserOrNull,
  getClientPrincipal,
  isAuthenticated
} from "../utils/getUser";
import {
  getAuthConfig,
  validateAuthConfig,
  isValidRole,
  getSafeAuthConfig,
  type AuthConfig
} from "../config/auth.config";

export class AuthService {
  private config: AuthConfig | null = null;

  constructor() {
    this.initializeConfig();
  }

  /**
   * Initialize and validate authentication configuration
   */
  private initializeConfig(): void {
    try {
      this.config = getAuthConfig();
      validateAuthConfig(this.config);
      console.log('Auth service initialized with config:', getSafeAuthConfig(this.config));
    } catch (error) {
      console.warn('Auth configuration validation failed:', error);
      console.warn('Auth service will work with basic functionality only');
      // Don't throw error - allow service to work without full config for development
    }
  }

  /**
   * Gets the current auth configuration
   */
  getConfig(): AuthConfig | null {
    return this.config;
  }

  /**
   * Validates if a role is allowed by the application configuration
   */
  private validateRole(role: string): boolean {
    if (!this.config) {
      return true; // Allow all roles if no config available
    }
    return isValidRole(role, this.config);
  }

  /**
   * Gets the authentication context from the request
   * @param request - Azure Functions HTTP request
   * @returns AuthContext with authentication status and user info
   */
  getAuthContext(request: HttpRequest): AuthContext {
    const principal = getClientPrincipal(request);

    if (!principal) {
      return {
        isAuthenticated: false
      };
    }

    try {
      const user = getUserOrNull(request);
      return {
        isAuthenticated: true,
        user: user || undefined,
        principal
      };
    } catch (error) {
      console.error('Error creating auth context:', error);
      return {
        isAuthenticated: false
      };
    }
  }

  /**
   * Gets authenticated user from request, throws if not authenticated
   * @param request - Azure Functions HTTP request
   * @returns AuthenticatedUser
   * @throws AuthenticationError if not authenticated
   */
  getAuthenticatedUser(request: HttpRequest): AuthenticatedUser {
    return getUser(request);
  }

  /**
   * Gets authenticated user from request, returns null if not authenticated
   * @param request - Azure Functions HTTP request
   * @returns AuthenticatedUser or null
   */
  getAuthenticatedUserOrNull(request: HttpRequest): AuthenticatedUser | null {
    return getUserOrNull(request);
  }

  /**
   * Validates that the request is authenticated
   * @param request - Azure Functions HTTP request
   * @throws AuthenticationError if not authenticated
   */
  requireAuthentication(request: HttpRequest): void {
    if (!isAuthenticated(request)) {
      throw new AuthenticationError('Authentication required');
    }
  }

  /**
   * Validates that the authenticated user has one of the required roles
   * @param request - Azure Functions HTTP request
   * @param requiredRoles - Array of roles, user must have at least one
   * @throws AuthenticationError if not authenticated
   * @throws AuthorizationError if user doesn't have required role
   */
  requireRole(request: HttpRequest, requiredRoles: string[]): void {
    const user = this.getAuthenticatedUser(request);

    if (!user.roles || user.roles.length === 0) {
      throw new AuthorizationError('User has no assigned roles');
    }

    // Validate that required roles are allowed by application configuration
    const invalidRoles = requiredRoles.filter(role => !this.validateRole(role));
    if (invalidRoles.length > 0) {
      console.warn(`Invalid roles specified: ${invalidRoles.join(', ')}. Check ALLOWED_ROLES configuration.`);
    }

    const hasRequiredRole = requiredRoles.some(role =>
      user.roles.includes(role) && this.validateRole(role)
    );

    if (!hasRequiredRole) {
      throw new AuthorizationError(
        `Access denied. Required roles: ${requiredRoles.join(', ')}. User roles: ${user.roles.join(', ')}`
      );
    }
  }

  /**
   * Validates that the authenticated user has all of the required roles
   * @param request - Azure Functions HTTP request
   * @param requiredRoles - Array of roles, user must have all
   * @throws AuthenticationError if not authenticated
   * @throws AuthorizationError if user doesn't have all required roles
   */
  requireAllRoles(request: HttpRequest, requiredRoles: string[]): void {
    const user = this.getAuthenticatedUser(request);

    if (!user.roles || user.roles.length === 0) {
      throw new AuthorizationError('User has no assigned roles');
    }

    const missingRoles = requiredRoles.filter(role =>
      !user.roles.includes(role)
    );

    if (missingRoles.length > 0) {
      throw new AuthorizationError(
        `Access denied. Missing required roles: ${missingRoles.join(', ')}`
      );
    }
  }

  /**
   * Checks if the authenticated user has a specific role
   * @param request - Azure Functions HTTP request
   * @param role - Role to check for
   * @returns true if user has the role, false otherwise
   */
  hasRole(request: HttpRequest, role: string): boolean {
    try {
      const user = this.getAuthenticatedUser(request);
      return user.roles?.includes(role) || false;
    } catch {
      return false;
    }
  }

  /**
   * Checks if the authenticated user has any of the specified roles
   * @param request - Azure Functions HTTP request
   * @param roles - Array of roles to check for
   * @returns true if user has at least one role, false otherwise
   */
  hasAnyRole(request: HttpRequest, roles: string[]): boolean {
    try {
      const user = this.getAuthenticatedUser(request);
      return roles.some(role => user.roles?.includes(role)) || false;
    } catch {
      return false;
    }
  }

  /**
   * Validates that the user is accessing their own resource
   * @param request - Azure Functions HTTP request
   * @param resourceUserId - The user ID that owns the resource
   * @throws AuthenticationError if not authenticated
   * @throws AuthorizationError if user doesn't own the resource
   */
  requireOwnership(request: HttpRequest, resourceUserId: string): void {
    const user = this.getAuthenticatedUser(request);

    if (user.oid !== resourceUserId) {
      throw new AuthorizationError('Access denied. You can only access your own resources');
    }
  }

  /**
   * Validates that the user owns the resource or has one of the specified roles
   * @param request - Azure Functions HTTP request
   * @param resourceUserId - The user ID that owns the resource
   * @param allowedRoles - Roles that can access any resource
   * @throws AuthenticationError if not authenticated
   * @throws AuthorizationError if user doesn't own the resource and lacks required role
   */
  requireOwnershipOrRole(request: HttpRequest, resourceUserId: string, allowedRoles: string[]): void {
    const user = this.getAuthenticatedUser(request);

    // Check if user owns the resource
    if (user.oid === resourceUserId) {
      return;
    }

    // Check if user has one of the allowed roles
    if (this.hasAnyRole(request, allowedRoles)) {
      return;
    }

    throw new AuthorizationError(
      `Access denied. You can only access your own resources or must have one of these roles: ${allowedRoles.join(', ')}`
    );
  }

  /**
   * Gets the raw client principal for advanced scenarios
   * @param request - Azure Functions HTTP request
   * @returns ClientPrincipal or null
   */
  getClientPrincipal(request: HttpRequest): ClientPrincipal | null {
    return getClientPrincipal(request);
  }
}

// Export singleton instance
export const authService = new AuthService();