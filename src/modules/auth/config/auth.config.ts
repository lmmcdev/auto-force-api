import 'dotenv/config';

/**
 * Authentication Configuration
 *
 * Environment variables that will be available after Azure AD app registration:
 * - CLIENT_ID: The Application (client) ID of your Azure AD app
 * - TENANT_ID: The Directory (tenant) ID of your Azure AD tenant
 * - APP_ID_URI: The Application ID URI (Identifier URI) of your API
 * - ALLOWED_ROLES: Comma-separated list of valid roles for your application
 */

export interface AuthConfig {
  clientId: string;
  tenantId: string;
  appIdUri: string;
  allowedRoles: string[];
  issuer: string;
  jwksUri: string;
}

/**
 * Gets authentication configuration from environment variables
 */
export function getAuthConfig(): AuthConfig {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const appIdUri = process.env.AZURE_AD_APP_ID_URI;
  const allowedRolesEnv = process.env.AZURE_AD_ALLOWED_ROLES;

  // Validate required environment variables
  if (!clientId) {
    throw new Error('AZURE_AD_CLIENT_ID environment variable is required');
  }

  if (!tenantId) {
    throw new Error('AZURE_AD_TENANT_ID environment variable is required');
  }

  if (!appIdUri) {
    throw new Error('AZURE_AD_APP_ID_URI environment variable is required');
  }

  // Parse allowed roles (comma-separated)
  const allowedRoles = allowedRolesEnv
    ? allowedRolesEnv
        .split(',')
        .map(role => role.trim())
        .filter(role => role.length > 0)
    : [];

  return {
    clientId,
    tenantId,
    appIdUri,
    allowedRoles,
    issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
    jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
  };
}

/**
 * Default role names that your application might use
 * Update these based on your Azure AD app registration roles
 */
export const DefaultRoles = {
  ADMIN: 'Admin',
  APPROVER: 'Approver',
  MANAGER: 'Manager',
  USER: 'User',
  READONLY: 'ReadOnly',
  SUPER_ADMIN: 'SuperAdmin',
} as const;

/**
 * Validates if a role is in the allowed roles list
 */
export function isValidRole(role: string, config?: AuthConfig): boolean {
  const authConfig = config || getAuthConfig();

  // If no allowed roles configured, accept any role
  if (authConfig.allowedRoles.length === 0) {
    return true;
  }

  return authConfig.allowedRoles.includes(role);
}

/**
 * Gets all valid roles for the application
 */
export function getValidRoles(config?: AuthConfig): string[] {
  const authConfig = config || getAuthConfig();
  return authConfig.allowedRoles;
}

/**
 * Azure AD specific claim types that might be present in tokens
 */
export const AzureAdClaimTypes = {
  // Object identifier (unique user ID)
  ObjectId: 'http://schemas.microsoft.com/identity/claims/objectidentifier',
  ObjectIdShort: 'oid',

  // User principal name
  UPN: 'upn',

  // Display name
  Name: 'name',

  // Email
  Email: 'email',
  Emails: 'emails',
  PreferredUsername: 'preferred_username',

  // Roles
  Roles: 'roles',
  Role: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',

  // Groups
  Groups: 'groups',

  // Tenant
  TenantId: 'tid',

  // Application
  ApplicationId: 'appid',
  Audience: 'aud',

  // Issuer
  Issuer: 'iss',

  // Subject
  Subject: 'sub',

  // Given name
  GivenName: 'given_name',

  // Family name
  FamilyName: 'family_name',

  // Authentication method
  AuthenticationMethod: 'http://schemas.microsoft.com/claims/authnmethodsreferences',
} as const;

/**
 * Configuration validation
 */
export function validateAuthConfig(config: AuthConfig): void {
  const errors: string[] = [];

  if (!config.clientId || config.clientId.trim().length === 0) {
    errors.push('clientId is required and cannot be empty');
  }

  if (!config.tenantId || config.tenantId.trim().length === 0) {
    errors.push('tenantId is required and cannot be empty');
  }

  if (!config.appIdUri || config.appIdUri.trim().length === 0) {
    errors.push('appIdUri is required and cannot be empty');
  }

  // Validate tenant ID format (GUID)
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!guidRegex.test(config.tenantId)) {
    errors.push('tenantId must be a valid GUID format');
  }

  // Validate client ID format (GUID)
  if (!guidRegex.test(config.clientId)) {
    errors.push('clientId must be a valid GUID format');
  }

  // Validate App ID URI format
  if (!config.appIdUri.startsWith('api://') && !config.appIdUri.startsWith('https://')) {
    errors.push('appIdUri must start with "api://" or "https://"');
  }

  if (errors.length > 0) {
    throw new Error(`Auth configuration validation failed: ${errors.join(', ')}`);
  }
}

/**
 * Gets safe configuration for logging (excludes sensitive data)
 */
export function getSafeAuthConfig(config?: AuthConfig): Partial<AuthConfig> {
  const authConfig = config || getAuthConfig();

  return {
    tenantId: authConfig.tenantId,
    appIdUri: authConfig.appIdUri,
    allowedRoles: authConfig.allowedRoles,
    issuer: authConfig.issuer,
    // Exclude clientId for security
    clientId: `${authConfig.clientId.substring(0, 8)}...`,
  };
}
