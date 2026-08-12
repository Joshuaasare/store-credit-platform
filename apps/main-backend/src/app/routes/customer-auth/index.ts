import crypto from "crypto";
import { FastifyInstance } from "fastify";
import { CustomerAuthService } from "../../services/customer-auth.service";
import { TokenService } from "../../services/token.service";
import { requireAuth } from "../../middleware/auth.middleware";
import {
  CustomerOtpSendRequest,
  CustomerOtpVerifyRequest,
  CustomerRegisterRequest,
  CustomerRefreshRequest,
  CustomerOtpSendApiResponse,
  CustomerOtpVerifyApiResponse,
  CustomerRegisterApiResponse,
  CustomerRefreshApiResponse,
  CustomerLogoutApiResponse,
  CustomerGetCurrentUserApiResponse,
} from "../../schemas/auth.schema";

/**
 * Customer-app auth routes (`/api/customer-auth/*`).
 *
 * Mirror the staff `/api/auth/*` shape but with refresh tokens in the JSON
 * body (React Native has no httpOnly cookies) and a discriminated
 * `otp/verify` response (`logged_in` vs `needs_profile`) that drives the
 * mobile flow. See docs/plans/customer_app_auth_feature.md.
 */
export default async function (fastify: FastifyInstance) {
  const customerAuthService = new CustomerAuthService();

  /**
   * POST /api/customer-auth/otp/send
   * Always sends an OTP (no anti-enumeration — phone ownership must be
   * proven for brand-new phones). Rate-limited.
   */
  fastify.post<{
    Body: CustomerOtpSendRequest;
    Reply: CustomerOtpSendApiResponse;
  }>("/otp/send", {
    schema: {
      body: CustomerOtpSendRequest,
      response: {
        200: CustomerOtpSendApiResponse,
        400: CustomerOtpSendApiResponse,
        429: CustomerOtpSendApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const clientIp = request.ip;
        const result = await customerAuthService.sendOtp(
          request.body,
          clientIp,
        );
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
   * POST /api/customer-auth/otp/verify
   * Verifies the OTP and returns either a full session (flow 3) or a
   * pending_token (flows 1+2). The refresh token is in the JSON body, not
   * a cookie.
   */
  fastify.post<{
    Body: CustomerOtpVerifyRequest;
    Reply: CustomerOtpVerifyApiResponse;
  }>("/otp/verify", {
    schema: {
      body: CustomerOtpVerifyRequest,
      response: {
        200: CustomerOtpVerifyApiResponse,
        400: CustomerOtpVerifyApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const userAgent = request.headers["user-agent"];
        const clientIp = request.ip;
        const result = await customerAuthService.verifyOtp(
          request.body,
          userAgent,
          clientIp,
        );

        if (result.status === "logged_in") {
          return {
            success: true,
            message: "Login successful",
            data: {
              status: "logged_in",
              access_token: result.access_token,
              refresh_token: result.refresh_token,
              expires_in: result.expires_in,
              expires_at: result.expires_at,
              token_type: result.token_type,
              user: result.user,
            },
          };
        }
        return {
          success: true,
          message: "Phone verified — let's set up your account.",
          data: {
            status: "needs_profile",
            pending_token: result.pending_token,
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
   * POST /api/customer-auth/register
   * Consumes the pending_token (carrying the OTP-verified phone) and the
   * submitted name, creates/links the users + customers rows, issues the
   * real session.
   */
  fastify.post<{
    Body: CustomerRegisterRequest;
    Reply: CustomerRegisterApiResponse;
  }>("/register", {
    schema: {
      body: CustomerRegisterRequest,
      response: {
        200: CustomerRegisterApiResponse,
        400: CustomerRegisterApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const userAgent = request.headers["user-agent"];
        const clientIp = request.ip;
        const session = await customerAuthService.register(
          request.body,
          userAgent,
          clientIp,
        );
        return {
          success: true,
          message: "Account created successfully",
          data: session,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to register";
        const statusCode =
          (error as Error & { statusCode?: number }).statusCode || 400;
        reply.status(statusCode);
        return { success: false, error: message };
      }
    },
  });

  /**
   * POST /api/customer-auth/refresh
   * Rotates the refresh token from the JSON body and issues a new access
   * token. The new refresh token is returned in the JSON body.
   */
  fastify.post<{
    Body: CustomerRefreshRequest;
    Reply: CustomerRefreshApiResponse;
  }>("/refresh", {
    schema: {
      body: CustomerRefreshRequest,
      response: {
        200: CustomerRefreshApiResponse,
        400: CustomerRefreshApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const userAgent = request.headers["user-agent"];
        const clientIp = request.ip;
        const session = await customerAuthService.refreshSession(
          request.body.refresh_token,
          userAgent,
          clientIp,
        );
        return {
          success: true,
          message: "Token refreshed successfully",
          data: session,
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
   * POST /api/customer-auth/logout
   * Revokes the refresh token from the JSON body. Access token is stateless
   * and expires naturally (15 min).
   */
  fastify.post<{
    Body: CustomerRefreshRequest;
    Reply: CustomerLogoutApiResponse;
  }>("/logout", {
    schema: {
      body: CustomerRefreshRequest,
      response: {
        200: CustomerLogoutApiResponse,
        400: CustomerLogoutApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const tokenHash = crypto
          .createHash("sha256")
          .update(request.body.refresh_token)
          .digest("hex");
        await TokenService.revokeRefreshToken(tokenHash);
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
   * GET /api/customer-auth/me
   * Returns the current customer. Gated to customer tokens
   * (customer_id != null) — staff tokens are rejected.
   */
  fastify.get<{
    Reply: CustomerGetCurrentUserApiResponse;
  }>("/me", {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: CustomerGetCurrentUserApiResponse,
        401: CustomerGetCurrentUserApiResponse,
        403: CustomerGetCurrentUserApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        if (request.user?.customer_id == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: this endpoint is for customer accounts only",
          };
        }
        const userData = await customerAuthService.getCurrentCustomer(
          request.user.sub,
        );
        return { success: true, data: userData };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to get user";
        reply.status(401);
        return { success: false, error: message };
      }
    },
  });
}