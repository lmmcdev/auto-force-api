import { HttpRequest } from "@azure/functions";
import * as jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

export interface JWTPayload {
  aud: string;
  iss: string;
  exp: number;
  roles?: string[];
  scp?: string;
  oid: string;
  email?: string;
  name?: string;
  upn?: string;
}

const tenantId = process.env.AZURE_AD_TENANT_ID!;
const audience = process.env.AZURE_AD_AUDIENCE!;

// JWKS client para obtener las claves públicas de Azure AD
const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 86400000, // 24 horas
});

// Función para obtener la clave de firma
function getSigningKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) {
        reject(err);
      } else {
        const signingKey = key?.getPublicKey();
        resolve(signingKey!);
      }
    });
  });
}

/**
 * Valida el token JWT de Azure AD
 * @param request - HttpRequest de Azure Functions
 * @returns Payload del token si es válido
 * @throws Error si el token es inválido
 */
export async function validateToken(request: HttpRequest): Promise<JWTPayload> {
  // 1. Extraer el token del header Authorization
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("No se encontró el token de autorización");
  }

  const token = authHeader.substring(7); // Remover "Bearer "

  // 2. Decodificar el header del token para obtener el 'kid' (Key ID)
  const decodedHeader = jwt.decode(token, { complete: true });

  if (!decodedHeader || !decodedHeader.header.kid) {
    throw new Error("Token inválido: no se pudo decodificar el header");
  }

  // 3. Obtener la clave pública de Azure AD usando el 'kid'
  const signingKey = await getSigningKey(decodedHeader.header.kid);

  // 4. Verificar y validar el token
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      signingKey,
      {
        audience: audience, // Validar audience
        issuer: [
          `https://sts.windows.net/${tenantId}/`,
          `https://login.microsoftonline.com/${tenantId}/v2.0`,
        ], // Validar issuer (ambos formatos)
        algorithms: ["RS256"], // Algoritmo esperado
      },
      (err, decoded) => {
        if (err) {
          reject(new Error(`Token inválido: ${err.message}`));
        } else {
          resolve(decoded as JWTPayload);
        }
      }
    );
  });
}

/**
 * Verifica si el usuario tiene alguno de los roles requeridos
 * @param payload - Payload del token JWT
 * @param requiredRoles - Array de roles requeridos
 * @returns true si el usuario tiene al menos uno de los roles
 */
export function hasRequiredRole(
  payload: JWTPayload,
  requiredRoles: string[]
): boolean {
  if (!payload.roles || payload.roles.length === 0) {
    return false;
  }

  return payload.roles.some((role) => requiredRoles.includes(role));
}

/**
 * Verifica si el token tiene el scope requerido
 * @param payload - Payload del token JWT
 * @param requiredScope - Scope requerido
 * @returns true si el token tiene el scope
 */
export function hasRequiredScope(
  payload: JWTPayload,
  requiredScope: string
): boolean {
  if (!payload.scp) {
    return false;
  }

  const scopes = payload.scp.split(" ");
  return scopes.includes(requiredScope);
}
