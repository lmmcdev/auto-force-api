/**
 * Azure App Service Authentication (Easy Auth) Client Principal
 * Represents the authenticated user information from x-ms-client-principal header
 */
export interface ClientPrincipal {
  auth_typ: string;           // Authentication type (e.g., "aad")
  name_typ: string;           // Name claim type
  role_typ: string;           // Role claim type
  claims: Claim[];            // Array of user claims
}

/**
 * Individual claim from the client principal
 */
export interface Claim {
  typ: string;                // Claim type (e.g., "name", "emails", "oid", "roles")
  val: string;                // Claim value
}

/**
 * Simplified user information extracted from claims
 */
export interface AuthenticatedUser {
  oid: string;                // Object ID (unique user identifier)
  name: string;               // Display name
  email: string;              // Email address
  roles: string[];            // User roles
}

/**
 * Authentication context for requests
 */
export interface AuthContext {
  isAuthenticated: boolean;
  user?: AuthenticatedUser;
  principal?: ClientPrincipal;
}

/**
 * Common claim types used in Azure AD
 */
export enum ClaimTypes {
  ObjectId = "http://schemas.microsoft.com/identity/claims/objectidentifier",
  ObjectIdShort = "oid",
  Name = "name",
  Email = "emails",
  EmailShort = "email",
  Roles = "roles",
  Groups = "groups",
  GivenName = "given_name",
  FamilyName = "family_name",
  PreferredUsername = "preferred_username"
}

/**
 * Authentication error types
 */
export class AuthenticationError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message);
    this.name = 'AuthorizationError';
  }
}