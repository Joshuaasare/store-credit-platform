import { FastifyInstance } from "fastify";
import { AuthService } from "../../services/auth.service";
import { supabaseAdmin } from "../../utils/supabase.client";
import {
  SendOtpRequest,
  VerifyOtpRequest,
  SendOtpApiResponse,
  VerifyOtpApiResponse,
  GetCurrentUserApiResponse,
} from "../../schemas/auth.schema";

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
      },
    },
    handler: async (request, reply) => {
      try {
        const result = await authService.sendOtp(request.body);
        return { success: true, message: result.message };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to send OTP";
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * POST /api/auth/otp/verify
   * Verify OTP and sign user in
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
        const session = await authService.verifyOtp(request.body);
        return {
          success: true,
          message: "Login successful",
          data: session,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to verify OTP";
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * GET /api/auth/me
   * Get current authenticated user
   */
  fastify.get<{
    Reply: GetCurrentUserApiResponse;
  }>("/me", {
    schema: {
      response: {
        200: GetCurrentUserApiResponse,
        401: GetCurrentUserApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
          reply.status(401);
          return { success: false, error: "Unauthorized" };
        }

        const token = authHeader.slice(7);
        // supabaseAdmin already imported at top of file

        const {
          data: { user },
          error,
        } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
          reply.status(401);
          return { success: false, error: "Invalid or expired token" };
        }

        const userData = await authService.getCurrentUser(user.id);
        return { success: true, data: userData };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to get user";
        reply.status(401);
        return { success: false, error: message };
      }
    },
  });
}
