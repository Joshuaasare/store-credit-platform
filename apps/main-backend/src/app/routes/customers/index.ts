import { FastifyInstance, FastifyRequest } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { requireAuth } from "../../middleware/auth.middleware";
import { merchantService } from "../../services/merchant.service";
import { customerService } from "../../services/customers.service";
import { customerCreditsService } from "../../services/customerCredits.service";
import { customerActivitiesService } from "../../services/customerActivities.service";
import { customerRedemptionsService } from "../../services/customerRedemptions.service";
import { customerProfileService } from "../../services/customerProfile.service";
import { exploreService } from "../../services/explore.service";
import { branchService } from "../../services/branch.service";
import {
  LeaderboardQuerystring,
  LeaderboardApiResponse,
  LeaderboardStatsApiResponse,
  CustomerListQuerystring,
  CustomerListApiResponse,
  CustomerDetailApiResponse,
} from "../../schemas/customers.schema";
import { CustomerCreditsApiResponse } from "../../schemas/customerCredits.schema";
import { CustomerActivitiesApiResponse } from "../../schemas/customerActivities.schema";
import {
  CustomerMerchantBranchesApiResponse,
  CustomerPendingRedemptionApiResponse,
  CustomerRedemptionCancelApiResponse,
  CustomerRedemptionRequestBody,
  CustomerRedemptionRequestMutationApiResponse,
  CustomerApprovedRedemptionApiResponse,
  CustomerApprovedRedemptionQuerystring,
} from "../../schemas/customerRedemptions.schema";
import {
  CustomerPhoneChangeSendOtpRequest,
  CustomerPhoneChangeSendOtpApiResponse,
  CustomerPhoneChangeVerifyRequest,
  CustomerPhoneChangeVerifyApiResponse,
  CustomerProfileUpdateRequest,
  CustomerProfileUpdateApiResponse,
} from "../../schemas/customerProfile.schema";
import { CustomerExploreOffersApiResponse } from "../../schemas/explore.schema";
import { CustomerExploreBranchesApiResponse } from "../../schemas/branch.schema";
import { CustomerMerchantSearchApiResponse } from "../../schemas/merchant.schema";

// cursor is the numeric id of the last item from the previous page (stringified in the querystring, coerced to number in the handler).
const CustomerActivitiesQuerystring = Type.Object({
  cursor: Type.Optional(
    Type.Union([Type.String(), Type.Number()]),
  ),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
});
type CustomerActivitiesQuerystring = Static<typeof CustomerActivitiesQuerystring>;

async function resolveMerchantId(
  request: FastifyRequest,
): Promise<number | null> {
  const user = request.user!;
  if (user.merchant_id != null) return user.merchant_id;
  const resolved = await merchantService.getMerchantIdForUser(user.sub);
  return resolved?.merchant_id ?? null;
}

export default async function (fastify: FastifyInstance) {
  fastify.get<{
    Querystring: CustomerListQuerystring;
    Reply: CustomerListApiResponse;
  }>("/", {
    preHandler: [requireAuth],
    schema: {
      querystring: CustomerListQuerystring,
      response: {
        200: CustomerListApiResponse,
        400: CustomerListApiResponse,
        401: CustomerListApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const merchantId = await resolveMerchantId(request);
        if (merchantId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: no merchant assigned to this user",
          };
        }
        const q = request.query as CustomerListQuerystring;
        const page = await customerService.listCustomers(merchantId, {
          branch_id: q.branch_id ?? null,
          search: q.search ?? null,
          limit: q.limit ?? 20,
          offset: q.offset ?? 0,
        });
        return { success: true, data: page };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load customers";
        request.log.error(error, "GET /customers failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  // 404 doubles as the security boundary: customer must have a purchase at one of the merchant's branches.
  fastify.get<{
    Params: { customerId: number };
    Reply: CustomerDetailApiResponse;
  }>("/:customerId", {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: CustomerDetailApiResponse,
        400: CustomerDetailApiResponse,
        401: CustomerDetailApiResponse,
        404: CustomerDetailApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const merchantId = await resolveMerchantId(request);
        if (merchantId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: no merchant assigned to this user",
          };
        }
        const data = await customerService.getCustomerDetail(
          merchantId,
          Number(request.params.customerId),
        );
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load customer detail";
        const notFound = message.includes("not found");
        reply.status(notFound ? 404 : 400);
        request.log.error(
          error,
          "GET /customers/:customerId failed",
        );
        return { success: false, error: message };
      }
    },
  });

  fastify.get<{
    Querystring: LeaderboardQuerystring;
    Reply: LeaderboardApiResponse;
  }>("/leaderboard", {
    preHandler: [requireAuth],
    schema: {
      querystring: LeaderboardQuerystring,
      response: {
        200: LeaderboardApiResponse,
        400: LeaderboardApiResponse,
        401: LeaderboardApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const merchantId = await resolveMerchantId(request);
        if (merchantId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: no merchant assigned to this user",
          };
        }
        const q = request.query as LeaderboardQuerystring;
        const page = await customerService.getLeaderboard(merchantId, {
          sort: q.sort,
          branch_id: q.branch_id ?? null,
          start: q.start ?? null,
          end: q.end ?? null,
          limit: q.limit ?? 20,
          offset: q.offset ?? 0,
        });
        return { success: true, data: page };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load leaderboard";
        request.log.error(error, "GET /customers/leaderboard failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  fastify.get<{
    Querystring: LeaderboardQuerystring;
    Reply: LeaderboardStatsApiResponse;
  }>("/leaderboard-stats", {
    preHandler: [requireAuth],
    schema: {
      querystring: LeaderboardQuerystring,
      response: {
        200: LeaderboardStatsApiResponse,
        400: LeaderboardStatsApiResponse,
        401: LeaderboardStatsApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const merchantId = await resolveMerchantId(request);
        if (merchantId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: no merchant assigned to this user",
          };
        }
        const q = request.query as LeaderboardQuerystring;
        const stats = await customerService.getLeaderboardStats(merchantId, {
          branch_id: q.branch_id ?? null,
          start: q.start ?? null,
          end: q.end ?? null,
        });
        return { success: true, data: stats };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load stats";
        request.log.error(error, "GET /customers/leaderboard-stats failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  // customer_id is derived from the JWT; staff tokens are rejected.
  fastify.get<{
    Reply: CustomerCreditsApiResponse;
  }>("/me/credits", {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: CustomerCreditsApiResponse,
        401: CustomerCreditsApiResponse,
        403: CustomerCreditsApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const customerId = request.user?.customer_id;
        if (customerId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: this endpoint is for customer accounts only",
          };
        }
        const data = await customerCreditsService.getMyCredits(customerId);
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load credits";
        request.log.error(error, "GET /customers/me/credits failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  // Customer-token only (customer_id from JWT). Cursor = numeric id of last item from previous page.
  fastify.get<{
    Querystring: CustomerActivitiesQuerystring;
    Reply: CustomerActivitiesApiResponse;
  }>("/me/transactions", {
    preHandler: [requireAuth],
    schema: {
      querystring: CustomerActivitiesQuerystring,
      response: {
        200: CustomerActivitiesApiResponse,
        400: CustomerActivitiesApiResponse,
        401: CustomerActivitiesApiResponse,
        403: CustomerActivitiesApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const customerId = request.user?.customer_id;
        if (customerId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: this endpoint is for customer accounts only",
          };
        }

        // Fastify accepts string|number for cursor; the service expects a number.
        const rawCursor = request.query.cursor;
        let cursor: number | null = null;
        if (rawCursor != null && rawCursor !== "") {
          const parsed = Number(rawCursor);
          if (!Number.isFinite(parsed) || parsed < 0) {
            reply.status(400);
            return {
              success: false,
              error: "Invalid cursor: must be a non-negative number",
            };
          }
          cursor = parsed;
        }

        const data = await customerActivitiesService.listMyActivities(
          customerId,
          { cursor, limit: request.query.limit },
        );
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load activity feed";
        request.log.error(error, "GET /customers/me/transactions failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  fastify.get<{
    Params: { merchantId: number };
    Reply: CustomerMerchantBranchesApiResponse;
  }>("/me/merchants/:merchantId/branches", {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: CustomerMerchantBranchesApiResponse,
        400: CustomerMerchantBranchesApiResponse,
        401: CustomerMerchantBranchesApiResponse,
        403: CustomerMerchantBranchesApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const customerId = request.user?.customer_id;
        if (customerId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: this endpoint is for customer accounts only",
          };
        }
        const branches = await customerRedemptionsService.getMyBranches(
          Number(request.params.merchantId),
        );
        return { success: true, data: branches };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load branches";
        request.log.error(
          error,
          "GET /customers/me/merchants/:merchantId/branches failed",
        );
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  // redemption_code is intentionally exposed — the customer is the only party who should see it.
  fastify.get<{
    Params: { merchantId: number };
    Reply: CustomerPendingRedemptionApiResponse;
  }>("/me/merchants/:merchantId/redemptions/pending", {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: CustomerPendingRedemptionApiResponse,
        400: CustomerPendingRedemptionApiResponse,
        401: CustomerPendingRedemptionApiResponse,
        403: CustomerPendingRedemptionApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const customerId = request.user?.customer_id;
        if (customerId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: this endpoint is for customer accounts only",
          };
        }
        const pending = await customerRedemptionsService.getMyPendingRequest(
          customerId,
          Number(request.params.merchantId),
        );
        return { success: true, data: pending };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load pending request";
        request.log.error(
          error,
          "GET /customers/me/merchants/:merchantId/redemptions/pending failed",
        );
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  // redemption_code is intentionally not returned (used once at the till). branch_name falls back to — when the branch was soft-deleted after the redemption.
  fastify.get<{
    Params: { merchantId: number };
    Querystring: Static<typeof CustomerApprovedRedemptionQuerystring>;
    Reply: CustomerApprovedRedemptionApiResponse;
  }>("/me/merchants/:merchantId/redemptions/approved", {
    preHandler: [requireAuth],
    schema: {
      querystring: CustomerApprovedRedemptionQuerystring,
      response: {
        200: CustomerApprovedRedemptionApiResponse,
        400: CustomerApprovedRedemptionApiResponse,
        401: CustomerApprovedRedemptionApiResponse,
        403: CustomerApprovedRedemptionApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const customerId = request.user?.customer_id;
        if (customerId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: this endpoint is for customer accounts only",
          };
        }

        // Schema accepts string|number|undefined; the service needs a number for lt(approved_at, ...).
        const rawCursor = request.query.cursor;
        let cursor: number | undefined;
        if (rawCursor != null && rawCursor !== "") {
          const parsed = Number(rawCursor);
          if (!Number.isFinite(parsed) || parsed < 0) {
            reply.status(400);
            return {
              success: false,
              error: "Invalid cursor: must be a non-negative number",
            };
          }
          cursor = parsed;
        }

        const limit = request.query.limit ?? 20;
        const page = await customerRedemptionsService.getMyApprovedRedemptions(
          customerId,
          Number(request.params.merchantId),
          { cursor, limit },
        );
        return { success: true, data: page };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load approved redemptions";
        request.log.error(
          error,
          "GET /customers/me/merchants/:merchantId/redemptions/approved failed",
        );
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  // 409 when a pending row already exists (RPC raises P0001) — client routes into the edit flow.
  fastify.post<{
    Params: { merchantId: number };
    Body: CustomerRedemptionRequestBody;
    Reply: CustomerRedemptionRequestMutationApiResponse;
  }>("/me/merchants/:merchantId/redemptions", {
    preHandler: [requireAuth],
    schema: {
      body: CustomerRedemptionRequestBody,
      response: {
        200: CustomerRedemptionRequestMutationApiResponse,
        400: CustomerRedemptionRequestMutationApiResponse,
        401: CustomerRedemptionRequestMutationApiResponse,
        403: CustomerRedemptionRequestMutationApiResponse,
        409: CustomerRedemptionRequestMutationApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const customerId = request.user?.customer_id;
        if (customerId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: this endpoint is for customer accounts only",
          };
        }
        const body = request.body;
        if (typeof body.amount !== "number" || Number.isNaN(body.amount) || body.amount < 0) {
          reply.status(400);
          return { success: false, error: "Invalid amount: must be a non-negative number" };
        }
        if (typeof body.branchId !== "number" || !Number.isFinite(body.branchId)) {
          reply.status(400);
          return { success: false, error: "Invalid branchId: must be a number" };
        }
        const result = await customerRedemptionsService.createMyRedemptionRequest(
          customerId,
          Number(request.params.merchantId),
          body,
        );
        return { success: true, data: result };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create pending request";
        const conflict = message.includes("already exists");
        request.log.error(
          error,
          "POST /customers/me/merchants/:merchantId/redemptions failed",
        );
        reply.status(conflict ? 409 : 400);
        return { success: false, error: message };
      }
    },
  });

  // RPC no-ops when amount+branch unchanged; otherwise hard-deletes + re-inserts with fresh code. 404 when no pending row (RPC raises P0002).
  fastify.patch<{
    Params: { merchantId: number };
    Body: CustomerRedemptionRequestBody;
    Reply: CustomerRedemptionRequestMutationApiResponse;
  }>("/me/merchants/:merchantId/redemptions", {
    preHandler: [requireAuth],
    schema: {
      body: CustomerRedemptionRequestBody,
      response: {
        200: CustomerRedemptionRequestMutationApiResponse,
        400: CustomerRedemptionRequestMutationApiResponse,
        401: CustomerRedemptionRequestMutationApiResponse,
        403: CustomerRedemptionRequestMutationApiResponse,
        404: CustomerRedemptionRequestMutationApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const customerId = request.user?.customer_id;
        if (customerId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: this endpoint is for customer accounts only",
          };
        }
        const body = request.body;
        if (typeof body.amount !== "number" || Number.isNaN(body.amount) || body.amount < 0) {
          reply.status(400);
          return { success: false, error: "Invalid amount: must be a non-negative number" };
        }
        if (typeof body.branchId !== "number" || !Number.isFinite(body.branchId)) {
          reply.status(400);
          return { success: false, error: "Invalid branchId: must be a number" };
        }
        const result = await customerRedemptionsService.updateMyRedemptionRequest(
          customerId,
          Number(request.params.merchantId),
          body,
        );
        return { success: true, data: result };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to edit pending request";
        const notFound = message.includes("No pending redemption");
        request.log.error(
          error,
          "PATCH /customers/me/merchants/:merchantId/redemptions failed",
        );
        reply.status(notFound ? 404 : 400);
        return { success: false, error: message };
      }
    },
  });

  // Idempotent — no-op when there's no pending row to cancel.
  fastify.delete<{
    Params: { merchantId: number };
    Reply: CustomerRedemptionCancelApiResponse;
  }>("/me/merchants/:merchantId/redemptions", {
    preHandler: [requireAuth],
    schema: {
      // Fastify 5 rejects empty JSON bodies before the handler runs; the global parser override (app.ts) makes an empty body parse to undefined. body: null keeps the schema validator happy.
      body: null,
      response: {
        200: CustomerRedemptionCancelApiResponse,
        400: CustomerRedemptionCancelApiResponse,
        401: CustomerRedemptionCancelApiResponse,
        403: CustomerRedemptionCancelApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const customerId = request.user?.customer_id;
        if (customerId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: this endpoint is for customer accounts only",
          };
        }
        const result = await customerRedemptionsService.cancelMyRedemptionRequest(
          customerId,
          Number(request.params.merchantId),
        );
        return { success: true, data: result };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to cancel pending request";
        request.log.error(
          error,
          "DELETE /customers/me/merchants/:merchantId/redemptions failed",
        );
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  fastify.post<{
    Body: Static<typeof CustomerPhoneChangeSendOtpRequest>;
    Reply: CustomerPhoneChangeSendOtpApiResponse;
  }>("/me/phone-change/send-otp", {
    preHandler: [requireAuth],
    schema: {
      body: CustomerPhoneChangeSendOtpRequest,
      response: {
        200: CustomerPhoneChangeSendOtpApiResponse,
        400: CustomerPhoneChangeSendOtpApiResponse,
        401: CustomerPhoneChangeSendOtpApiResponse,
        403: CustomerPhoneChangeSendOtpApiResponse,
        429: CustomerPhoneChangeSendOtpApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const customerId = request.user?.customer_id;
        if (customerId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: this endpoint is for customer accounts only",
          };
        }
        const newPhone = request.body?.newPhone;
        if (typeof newPhone !== "string" || newPhone.trim() === "") {
          reply.status(400);
          return { success: false, error: "newPhone is required" };
        }
        const clientIp =
          (request.ip as string | undefined) ??
          (request.ips?.[0] as string | undefined);
        const data = await customerProfileService.sendPhoneChangeOtp(
          customerId,
          newPhone,
          clientIp,
        );
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to send phone-change OTP";
        const statusCode =
          (error as Error & { statusCode?: number }).statusCode ?? 400;
        request.log.error(
          error,
          "POST /customers/me/phone-change/send-otp failed",
        );
        reply.status(statusCode);
        return { success: false, error: message };
      }
    },
  });

  // Returns a 10-minute phone-verified JWT for the subsequent PATCH /me/profile body.
  fastify.post<{
    Body: Static<typeof CustomerPhoneChangeVerifyRequest>;
    Reply: CustomerPhoneChangeVerifyApiResponse;
  }>("/me/phone-change/verify", {
    preHandler: [requireAuth],
    schema: {
      body: CustomerPhoneChangeVerifyRequest,
      response: {
        200: CustomerPhoneChangeVerifyApiResponse,
        400: CustomerPhoneChangeVerifyApiResponse,
        401: CustomerPhoneChangeVerifyApiResponse,
        403: CustomerPhoneChangeVerifyApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const customerId = request.user?.customer_id;
        if (customerId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: this endpoint is for customer accounts only",
          };
        }
        const newPhone = request.body?.newPhone;
        const otp = request.body?.otp;
        if (typeof newPhone !== "string" || newPhone.trim() === "") {
          reply.status(400);
          return { success: false, error: "newPhone is required" };
        }
        if (typeof otp !== "string" || otp.trim() === "") {
          reply.status(400);
          return { success: false, error: "otp is required" };
        }
        const data = await customerProfileService.verifyPhoneChangeOtp(
          customerId,
          newPhone,
          otp.trim(),
        );
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to verify phone-change OTP";
        request.log.error(
          error,
          "POST /customers/me/phone-change/verify failed",
        );
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  // newPhone requires phoneVerifiedToken from /phone-change/verify.
  fastify.patch<{
    Body: Static<typeof CustomerProfileUpdateRequest>;
    Reply: CustomerProfileUpdateApiResponse;
  }>("/me/profile", {
    preHandler: [requireAuth],
    schema: {
      body: CustomerProfileUpdateRequest,
      response: {
        200: CustomerProfileUpdateApiResponse,
        400: CustomerProfileUpdateApiResponse,
        401: CustomerProfileUpdateApiResponse,
        403: CustomerProfileUpdateApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const customerId = request.user?.customer_id;
        if (customerId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: this endpoint is for customer accounts only",
          };
        }
        const body = request.body ?? {};
        const user = await customerProfileService.updateProfile(
          customerId,
          body,
        );
        return { success: true, data: { user } };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update profile";
        const statusCode =
          (error as Error & { statusCode?: number }).statusCode ?? 400;
        request.log.error(error, "PATCH /customers/me/profile failed");
        reply.status(statusCode);
        return { success: false, error: message };
      }
    },
  });

  fastify.get<{
    Reply: CustomerExploreOffersApiResponse;
  }>("/me/explore-offers", {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: CustomerExploreOffersApiResponse,
        401: CustomerExploreOffersApiResponse,
        403: CustomerExploreOffersApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const customerId = request.user?.customer_id;
        if (customerId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: this endpoint is for customer accounts only",
          };
        }
        const offers = await exploreService.listExploreOffers(customerId);
        return { success: true, data: offers };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load explore offers";
        request.log.error(error, "GET /customers/me/explore-offers failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  fastify.get<{
    Reply: CustomerExploreBranchesApiResponse;
  }>("/me/explore-branches", {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: CustomerExploreBranchesApiResponse,
        401: CustomerExploreBranchesApiResponse,
        403: CustomerExploreBranchesApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const customerId = request.user?.customer_id;
        if (customerId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: this endpoint is for customer accounts only",
          };
        }
        const branches = await branchService.listExploreBranches(customerId);
        return { success: true, data: branches };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load explore branches";
        request.log.error(
          error,
          "GET /customers/me/explore-branches failed",
        );
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  fastify.get<{
    Querystring: { q?: string };
    Reply: CustomerMerchantSearchApiResponse;
  }>("/me/merchants/search", {
    preHandler: [requireAuth],
    schema: {
      querystring: Type.Object({ q: Type.Optional(Type.String()) }),
      response: {
        200: CustomerMerchantSearchApiResponse,
        401: CustomerMerchantSearchApiResponse,
        403: CustomerMerchantSearchApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const customerId = request.user?.customer_id;
        if (customerId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: this endpoint is for customer accounts only",
          };
        }
        const results = await merchantService.searchMerchants(
          request.query.q ?? "",
        );
        return { success: true, data: results };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to search merchants";
        request.log.error(error, "GET /customers/me/merchants/search failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });
}
