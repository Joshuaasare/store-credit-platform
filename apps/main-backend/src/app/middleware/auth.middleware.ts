import { FastifyReply, FastifyRequest } from "fastify";

/**
 * Verify JWT token and attach user to request
 * This should be used on ALL protected routes
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    // Get token from Authorization header
  } catch (error) {
    //     request.log.error(error, "Authentication error");
    console.log("error", error);
    return reply.code(500).send({
      success: false,
      message: "Authentication failed",
    });
  }
}
