import { FastifyReply, FastifyRequest } from "fastify";
import { TokenService } from "../services/token.service";
import { AccessTokenPayload } from "../schemas/auth.schema";

/**
 * Custom request type with authenticated user payload
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user?: AccessTokenPayload;
}

/**
 * Verify JWT access token from Authorization header and attach user to request.
 * This should be used on ALL protected routes.
 */
export async function requireAuth(
  request: AuthenticatedRequest,
  reply: FastifyReply,
) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return reply.code(401).send({
        success: false,
        error: "Unauthorized: Missing or invalid authorization header",
      });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return reply.code(401).send({
        success: false,
        error: "Unauthorized: Token is empty",
      });
    }

    const payload = await TokenService.verifyAccessToken(token);
    request.user = payload;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Authentication failed";
    request.log.error(error, "JWT verification error");
    return reply.code(401).send({
      success: false,
      error: `Unauthorized: ${message}`,
    });
  }
}

/**
 * Check if the authenticated user has at least one of the required roles.
 */
export function requireRoles(...allowedRoles: string[]) {
  return async (
    request: AuthenticatedRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = request.user;
    if (!user) {
      return reply.code(401).send({
        success: false,
        error: "Unauthorized: User not authenticated",
      });
    }

    const hasRole = user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      return reply.code(403).send({
        success: false,
        error: "Forbidden: Insufficient permissions",
      });
    }
  };
}
