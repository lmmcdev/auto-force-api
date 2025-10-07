import { HttpRequest } from "@azure/functions";
import {
  ClientPrincipal,
  AuthenticatedUser,
  AuthenticationError,
  ClaimTypes
} from "../entities/auth.entity";

/**
 * Extracts and decodes the x-ms-client-principal header
 * @param request - Azure Functions HTTP request
 * @returns Parsed ClientPrincipal or null if not authenticated
 */
export function getClientPrincipal(request: HttpRequest): ClientPrincipal | null {
  try {
    const header = request.headers.get('x-ms-client-principal');

    if (!header) {
      return null;
    }

    // The header is base64 encoded JSON
    const buffer = Buffer.from(header, 'base64');
    const principal = JSON.parse(buffer.toString('utf8')) as ClientPrincipal;

    return principal;
  } catch (error) {
    console.error('Failed to parse x-ms-client-principal header:', error);
    return null;
  }
}

/**
 * Extracts claim value by type from claims array
 * @param claims - Array of claims
 * @param claimType - Type of claim to extract
 * @returns Claim value or empty string if not found
 */
function getClaimValue(claims: { typ: string; val: string }[], claimType: string): string {
  const claim = claims.find(c => c.typ === claimType);
  return claim?.val || '';
}

/**
 * Extracts multiple claim values by type (for arrays like roles)
 * @param claims - Array of claims
 * @param claimType - Type of claim to extract
 * @returns Array of claim values
 */
function getClaimValues(claims: { typ: string; val: string }[], claimType: string): string[] {
  const claim = claims.find(c => c.typ === claimType);
  if (!claim?.val) {
    return [];
  }

  try {
    // Roles might be stored as JSON array string
    if (claim.val.startsWith('[') && claim.val.endsWith(']')) {
      return JSON.parse(claim.val);
    }
    // Or as comma-separated string
    if (claim.val.includes(',')) {
      return claim.val.split(',').map(r => r.trim()).filter(r => r.length > 0);
    }
    // Or as single value
    return [claim.val];
  } catch {
    // If parsing fails, treat as single value
    return [claim.val];
  }
}

/**
 * Extracts user information from client principal
 * @param principal - ClientPrincipal from Easy Auth
 * @returns AuthenticatedUser object
 */
export function extractUser(principal: ClientPrincipal): AuthenticatedUser {
  const { claims } = principal;

  // Try different claim types for object ID
  const oid = getClaimValue(claims, ClaimTypes.ObjectId) ||
              getClaimValue(claims, ClaimTypes.ObjectIdShort) ||
              getClaimValue(claims, 'sub') ||
              getClaimValue(claims, 'unique_name');

  // Try different claim types for name
  const name = getClaimValue(claims, ClaimTypes.Name) ||
               getClaimValue(claims, ClaimTypes.PreferredUsername) ||
               getClaimValue(claims, ClaimTypes.GivenName) ||
               oid;

  // Try different claim types for email
  const email = getClaimValue(claims, ClaimTypes.Email) ||
                getClaimValue(claims, ClaimTypes.EmailShort) ||
                getClaimValue(claims, ClaimTypes.PreferredUsername) ||
                getClaimValue(claims, 'upn');

  // Extract roles
  const roles = getClaimValues(claims, ClaimTypes.Roles);

  if (!oid) {
    throw new AuthenticationError('Unable to extract user identifier from claims');
  }

  return {
    oid,
    name: name || 'Unknown User',
    email: email || '',
    roles
  };
}

/**
 * Main function to get authenticated user from request
 * @param request - Azure Functions HTTP request
 * @returns AuthenticatedUser object
 * @throws AuthenticationError if user is not authenticated or cannot be parsed
 */
export function getUser(request: HttpRequest): AuthenticatedUser {
  const principal = getClientPrincipal(request);

  if (!principal) {
    throw new AuthenticationError('No authentication information found');
  }

  return extractUser(principal);
}

/**
 * Checks if request is authenticated
 * @param request - Azure Functions HTTP request
 * @returns true if authenticated, false otherwise
 */
export function isAuthenticated(request: HttpRequest): boolean {
  return getClientPrincipal(request) !== null;
}

/**
 * Gets user if authenticated, returns null otherwise
 * @param request - Azure Functions HTTP request
 * @returns AuthenticatedUser or null
 */
export function getUserOrNull(request: HttpRequest): AuthenticatedUser | null {
  try {
    return getUser(request);
  } catch {
    return null;
  }
}