import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { validateToken, hasRequiredRole, JWTPayload } from '../middleware/auth';

type AuthenticatedHandler = (
  request: HttpRequest,
  context: InvocationContext,
  tokenPayload: JWTPayload
) => Promise<HttpResponseInit>;

/**
 * Higher-order function que agrega validación JWT a una función
 * @param handler - Handler de la función HTTP
 * @param requiredRoles - Roles requeridos (opcional)
 * @returns Handler con validación JWT
 */
export function withAuth(
  handler: AuthenticatedHandler,
  requiredRoles?: string[]
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> {
  return async (request: HttpRequest, context: InvocationContext) => {
    try {
      // Validar token
      const tokenPayload = await validateToken(request);

      context.log(`Usuario autenticado: ${tokenPayload.email || tokenPayload.upn}`);
      context.log(`Roles del usuario: ${tokenPayload.roles?.join(', ') || 'ninguno'}`);
      context.log(`User OID: ${tokenPayload.oid}`);

      // Verificar roles si se especificaron
      if (requiredRoles && requiredRoles.length > 0) {
        if (!hasRequiredRole(tokenPayload, requiredRoles)) {
          return {
            status: 403,
            body: JSON.stringify({
              error: 'Forbidden',
              message: 'No tienes permisos para acceder a este recurso',
            }),
            headers: { 'Content-Type': 'application/json' },
          };
        }
      }

      // Ejecutar el handler original con el payload del token
      return await handler(request, context, tokenPayload);
    } catch (error) {
      context.error('Error en autenticación:', error);

      return {
        status: 401,
        body: JSON.stringify({
          error: 'Unauthorized',
          message: error instanceof Error ? error.message : 'Token inválido',
        }),
        headers: { 'Content-Type': 'application/json' },
      };
    }
  };
}
