import { HttpRequest } from "@azure/functions";
import * as jwt from "jsonwebtoken";
import * as jwksClient from "jwks-rsa";
import {
  AuthContext,
  AuthenticatedUser,
  AuthenticationError,
  AuthorizationError,
  ClaimTypes
} from "../entities/auth.entity";
import {
  getAuthConfig,
  validateAuthConfig,
  isValidRole,
  getSafeAuthConfig,
  type AuthConfig
} from "../config/auth.config";

/**
 * JWT Payload interface from Azure AD tokens
 */
interface AzureAdTokenPayload {
  oid?: string;
  sub?: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  emails?: string[];
  upn?: string;
  roles?: string[];
  iss?: string;
  aud?: string;
  exp?: number;
  nbf?: number;
  tid?: string;
  [key: string]: any;
}

export class MsalAuthService {
  private config: AuthConfig | null = null;
  private jwksClient: jwksClient.JwksClient | null = null;

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

      // Initialize JWKS client for token validation
      this.jwksClient = new jwksClient.JwksClient({
        jwksUri: this.config.jwksUri,
        cache: true,
        cacheMaxAge: 86400000, // 24 hours
        rateLimit: true,
      });

      console.log('MSAL Auth service initialized with config:', getSafeAuthConfig(this.config));
    } catch (error) {
      console.warn('Auth configuration validation failed:', error);
      throw new Error('MSAL Auth service initialization failed. Check environment variables.');
    }
  }

  /**
   * Gets the current auth configuration
   */
  getConfig(): AuthConfig | null {
    return this.config;
  }

  /**
   * Extracts Bearer token from Authorization header
   */
  private extractToken(request: HttpRequest): string | null {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Gets signing key from JWKS
   */
  private async getSigningKey(kid: string): Promise<string> {
    if (!this.jwksClient) {
      throw new AuthenticationError('JWKS client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.jwksClient!.getSigningKey(kid, (err, key) => {
        if (err) {
          reject(new AuthenticationError('Failed to get signing key'));
        } else {
          const signingKey = key?.getPublicKey();
          if (!signingKey) {
            reject(new AuthenticationError('Signing key not found'));
          } else {
            resolve(signingKey);
          }
        }
      });
    });
  }

  /**
   * Validates and decodes JWT token
   */
  private async validateToken(token: string): Promise<AzureAdTokenPayload> {
    if (!this.config) {
      throw new AuthenticationError('Auth configuration not initialized');
    }

    try {
      // Decode token header to get kid
      const decodedHeader = jwt.decode(token, { complete: true });

      if (!decodedHeader || typeof decodedHeader === 'string') {
        throw new AuthenticationError('Invalid token format');
      }

      const kid = decodedHeader.header.kid;
      if (!kid) {
        throw new AuthenticationError('Token missing kid in header');
      }

      // Get signing key
      const signingKey = await this.getSigningKey(kid);

      // Verify token
      const decoded = jwt.verify(token, signingKey, {
        audience: this.config.clientId,
        issuer: this.config.issuer,
        algorithms: ['RS256'],
      }) as AzureAdTokenPayload;

      return decoded;
    } catch (error: any) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token has expired');
      }

      if (error.name === 'JsonWebTokenError') {
        throw new AuthenticationError(`Invalid token: ${error.message}`);
      }

      throw new AuthenticationError('Token validation failed');
    }
  }

  /**
   * Extracts user information from token payload
   */
  private extractUserFromToken(payload: AzureAdTokenPayload): AuthenticatedUser {
    // Extract user ID (oid or sub)
    const oid = payload.oid || payload.sub;
    if (!oid) {
      throw new AuthenticationError('Token missing user identifier (oid/sub)');
    }

    // Extract name
    const name = payload.name || payload.preferred_username || payload.upn || 'Unknown User';

    // Extract email
    const email = payload.email ||
                  (Array.isArray(payload.emails) && payload.emails.length > 0 ? payload.emails[0] : '') ||
                  payload.preferred_username ||
                  payload.upn ||
                  '';

    // Extract roles
    const roles = Array.isArray(payload.roles) ? payload.roles : [];

    return {
      oid,
      name,
      email,
      roles
    };
  }

  /**
   * Validates if a role is allowed by the application configuration
   */
  private validateRole(role: string): boolean {
    if (!this.config) {
      return true;
    }
    return isValidRole(role, this.config);
  }

  /**
   * Gets the authentication context from the request
   */
  async getAuthContext(request: HttpRequest): Promise<AuthContext> {
    try {
      const user = await this.getAuthenticatedUserOrNull(request);

      if (!user) {
        return {
          isAuthenticated: false
        };
      }

      return {
        isAuthenticated: true,
        user
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
   */
  async getAuthenticatedUser(request: HttpRequest): Promise<AuthenticatedUser> {
    const token = this.extractToken(request);

    if (!token) {
      throw new AuthenticationError('No authentication token found');
    }

    const payload = await this.validateToken(token);
    return this.extractUserFromToken(payload);
  }

  /**
   * Gets authenticated user from request, returns null if not authenticated
   */
  async getAuthenticatedUserOrNull(request: HttpRequest): Promise<AuthenticatedUser | null> {
    try {
      return await this.getAuthenticatedUser(request);
    } catch {
      return null;
    }
  }

  /**
   * Validates that the request is authenticated
   */
  async requireAuthentication(request: HttpRequest): Promise<void> {
    await this.getAuthenticatedUser(request);
  }

  /**
   * Validates that the authenticated user has one of the required roles
   */
  async requireRole(request: HttpRequest, requiredRoles: string[]): Promise<void> {
    const user = await this.getAuthenticatedUser(request);

    if (!user.roles || user.roles.length === 0) {
      throw new AuthorizationError('User has no assigned roles');
    }

    // Validate that required roles are allowed by application configuration
    const invalidRoles = requiredRoles.filter(role => !this.validateRole(role));
    if (invalidRoles.length > 0) {
      console.warn(`Invalid roles specified: ${invalidRoles.join(', ')}. Check AZURE_AD_ALLOWED_ROLES configuration.`);
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
   */
  async requireAllRoles(request: HttpRequest, requiredRoles: string[]): Promise<void> {
    const user = await this.getAuthenticatedUser(request);

    if (!user.roles || user.roles.length === 0) {
      throw new AuthorizationError('User has no assigned roles');
    }

    const missingRoles = requiredRoles.filter(role => !user.roles.includes(role));

    if (missingRoles.length > 0) {
      throw new AuthorizationError(
        `Access denied. Missing required roles: ${missingRoles.join(', ')}`
      );
    }
  }

  /**
   * Checks if the authenticated user has a specific role
   */
  async hasRole(request: HttpRequest, role: string): Promise<boolean> {
    try {
      const user = await this.getAuthenticatedUser(request);
      return user.roles?.includes(role) || false;
    } catch {
      return false;
    }
  }

  /**
   * Checks if the authenticated user has any of the specified roles
   */
  async hasAnyRole(request: HttpRequest, roles: string[]): Promise<boolean> {
    try {
      const user = await this.getAuthenticatedUser(request);
      return roles.some(role => user.roles?.includes(role)) || false;
    } catch {
      return false;
    }
  }

  /**
   * Validates that the user is accessing their own resource
   */
  async requireOwnership(request: HttpRequest, resourceUserId: string): Promise<void> {
    const user = await this.getAuthenticatedUser(request);

    if (user.oid !== resourceUserId) {
      throw new AuthorizationError('Access denied. You can only access your own resources');
    }
  }

  /**
   * Validates that the user owns the resource or has one of the specified roles
   */
  async requireOwnershipOrRole(
    request: HttpRequest,
    resourceUserId: string,
    allowedRoles: string[]
  ): Promise<void> {
    const user = await this.getAuthenticatedUser(request);

    // Check if user owns the resource
    if (user.oid === resourceUserId) {
      return;
    }

    // Check if user has one of the allowed roles
    if (await this.hasAnyRole(request, allowedRoles)) {
      return;
    }

    throw new AuthorizationError(
      `Access denied. You can only access your own resources or must have one of these roles: ${allowedRoles.join(', ')}`
    );
  }
}

// Export singleton instance
export const msalAuthService = new MsalAuthService();
