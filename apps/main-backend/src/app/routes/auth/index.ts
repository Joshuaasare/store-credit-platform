import crypto from "crypto";
import { FastifyInstance, FastifyReply } from "fastify";
import { AuthService } from "../../services/auth.service";
import { TokenService } from "../../services/token.service";
import {
  requireAuth,
  AuthenticatedRequest,
} from "../../middleware/auth.middleware";
import {
  SendOtpRequest,
  VerifyOtpRequest,
  SendOtpApiResponse,
  VerifyOtpApiResponse,
  RefreshTokenApiResponse,
  LogoutApiResponse,
  SessionListApiResponse,
  SessionRevokeApiResponse,
  GetCurrentUserApiResponse,
} from "../../schemas/auth.schema";

const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function setRefreshTokenCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(REFRESH_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: "auto",
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  });
}

function clearRefreshTokenCookie(reply: FastifyReply): void {
  reply.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: "auto",
    sameSite: "strict",
    path: "/",
  });
}

function getRefreshTokenHashFromCookie(request: any): string | undefined {
  const rawToken = request.cookies[REFRESH_TOKEN_COOKIE_NAME];
  if (!rawToken) return undefined;
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export default async function (fastify: FastifyInstance) {
  const authService = new AuthService();

  /**
   * POST /api/auth/otp/send
   * Send OTP to phone number
   */
  fastify.post<{
    Body: SendOtpRequest;
    Reply: SendOtpApiResponse;
  }>("/otp/send", {
    schema: {
      body: SendOtpRequest,
      response: {
        200: SendOtpApiResponse,
        400: SendOtpApiResponse,
        429: SendOtpApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const clientIp = request.ip;
        const result = await authService.sendOtp(request.body, clientIp);
        return { success: true, message: result.message };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to send OTP";
        const statusCode =
          (error as Error & { statusCode?: number }).statusCode || 400;
        reply.status(statusCode);
        return { success: false, error: message };
      }
    },
  });

  /**
   * POST /api/auth/otp/verify
   * Verify OTP and sign user in with custom JWT
   */
  fastify.post<{
    Body: VerifyOtpRequest;
    Reply: VerifyOtpApiResponse;
  }>("/otp/verify", {
    schema: {
      body: VerifyOtpRequest,
      response: {
        200: VerifyOtpApiResponse,
        400: VerifyOtpApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const userAgent = request.headers["user-agent"];
        const clientIp = request.ip;
        const session = await authService.verifyOtp(
          request.body,
          userAgent,
          clientIp,
        );

        // Set refresh token as httpOnly cookie
        setRefreshTokenCookie(reply, session.refresh_token);

        return {
          success: true,
          message: "Login successful",
          data: {
            access_token: session.access_token,
            expires_in: session.expires_in,
            expires_at: session.expires_at,
            token_type: session.token_type,
            user: session.user,
          },
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to verify OTP";
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * POST /api/auth/refresh
   * Rotate refresh token from httpOnly cookie and issue new access token
   */
  fastify.post<{
    Reply: RefreshTokenApiResponse;
  }>("/refresh", {
    schema: {
      response: {
        200: RefreshTokenApiResponse,
        400: RefreshTokenApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const oldTokenHash = getRefreshTokenHashFromCookie(request);
        if (!oldTokenHash) {
          reply.status(401);
          return { success: false, error: "Unauthorized: No refresh token" };
        }

        const userAgent = request.headers["user-agent"];
        const clientIp = request.ip;
        const deviceFingerprint = TokenService.computeDeviceFingerprint(
          userAgent,
          clientIp,
        );

        const rotated = await TokenService.rotateRefreshToken(
          oldTokenHash,
          deviceFingerprint,
        );

        // Set new refresh token as httpOnly cookie
        setRefreshTokenCookie(reply, rotated.token);

        const user = await authService.getCurrentUser(rotated.userId);
        const accessToken = await TokenService.signAccessToken(
          user.id,
          user.phone,
          user.roles.map((r) => r.role),
        );

        const nowSeconds = Math.floor(Date.now() / 1000);
        const expiresIn = 15 * 60;

        return {
          success: true,
          message: "Token refreshed successfully",
          data: {
            access_token: accessToken,
            expires_in: expiresIn,
            expires_at: nowSeconds + expiresIn,
            token_type: "Bearer",
            user,
          },
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to refresh token";
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * POST /api/auth/logout
   * Revoke refresh token from httpOnly cookie and clear it
   */
  fastify.post<{
    Reply: LogoutApiResponse;
  }>("/logout", {
    schema: {
      response: {
        200: LogoutApiResponse,
        400: LogoutApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const tokenHash = getRefreshTokenHashFromCookie(request);
        if (tokenHash) {
          await TokenService.revokeRefreshToken(tokenHash);
        }

        clearRefreshTokenCookie(reply);
        return { success: true, message: "Logged out successfully" };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to logout";
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * GET /api/auth/sessions
   * List active refresh token sessions for the authenticated user
   */
  fastify.get<{
    Reply: SessionListApiResponse;
  }>("/sessions", {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: SessionListApiResponse,
        401: SessionListApiResponse,
      },
    },
    handler: async (request: AuthenticatedRequest, reply) => {
      try {
        const userId = request.user!.sub;
        const currentTokenHash = getRefreshTokenHashFromCookie(request);

        const sessions = await TokenService.listUserSessions(
          userId,
          currentTokenHash,
        );
        return { success: true, data: sessions };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to list sessions";
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * POST /api/auth/sessions/:id/revoke
   * Revoke a specific session by its database row ID
   */
  fastify.post<{
    Params: { id: string };
    Reply: SessionRevokeApiResponse;
  }>("/sessions/:id/revoke", {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: SessionRevokeApiResponse,
        401: SessionRevokeApiResponse,
        400: SessionRevokeApiResponse,
      },
    },
    handler: async (request: AuthenticatedRequest, reply) => {
      try {
        const userId = request.user!.sub;
        const sessionId = (request.params as { id: string }).id;

        const token = await TokenService.findRefreshTokenByJti(sessionId);
        if (!token || token.user_id !== userId) {
          reply.status(403);
          return { success: false, error: "Forbidden: Session not found" };
        }

        await TokenService.revokeRefreshTokenByJti(sessionId);
        return { success: true, message: "Session revoked successfully" };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to revoke session";
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * GET /auth/me
   * Get current authenticated user
   */
  fastify.get<{
    Reply: GetCurrentUserApiResponse;
  }>("/me", {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: GetCurrentUserApiResponse,
        401: GetCurrentUserApiResponse,
      },
    },
    handler: async (request: AuthenticatedRequest, reply) => {
      try {
        const userId = request.user!.sub;
        const userData = await authService.getCurrentUser(userId);
        return { success: true, data: userData };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to get user";
        reply.status(401);
        return { success: false, error: message };
      }
    },
  });
}
