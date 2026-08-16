import { FastifyInstance, FastifyRequest } from "fastify";
import { requireAuth, requireRoles } from "../../middleware/auth.middleware";
import { merchantService } from "../../services/merchant.service";
import { redemptionService } from "../../services/redemptions.service";
import {
  MerchantApprovedRedemptionsApiResponse,
  MerchantAuditFeedFilters,
  MerchantPendingRequestsApiResponse,
  MerchantPendingRequestFilters,
  MerchantRedemptionActionBody,
  MerchantRedemptionMutationApiResponse,
  MerchantRejectedRedemptionsApiResponse,
} from "../../schemas/redemptions.schema";

async function resolveMerchantId(
  request: FastifyRequest,
): Promise<number | null> {
  const user = request.user!;
  if (user.merchant_id != null) return user.merchant_id;
  const resolved = await merchantService.getMerchantIdForUser(user.sub);
  return resolved?.merchant_id ?? null;
}

export default async function (fastify: FastifyInstance) {
  /**
   * GET /redemptions/pending
   *
   * Pending requests at the merchant — one row per (customer, merchant)
   * pair that has a `customer_credit_redemptions` row in the pending
   * state (approved_at IS NULL AND rejected_at IS NULL AND deleted_at
   * IS NULL). The audit row IS the pending record; the customer app
   * shows the 4-digit code on its Pending tab and the merchant staff
   * types it into the approve dialog.
   *
   * IMPORTANT: the response shape NEVER includes `redemption_code` —
   * the code is customer-only, not staff-visible.
   */
  fastify.get<{
    Querystring: MerchantPendingRequestFilters;
    Reply: MerchantPendingRequestsApiResponse;
  }>("/pending", {
    preHandler: [requireAuth],
    schema: {
      querystring: MerchantPendingRequestFilters,
      response: {
        200: MerchantPendingRequestsApiResponse,
        400: MerchantPendingRequestsApiResponse,
        401: MerchantPendingRequestsApiResponse,
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
        const q = request.query;
        const page = await redemptionService.listPendingRedemptions(
          merchantId,
          {
            branch_id: q.branch_id ?? null,
            limit: q.limit ?? 20,
            offset: q.offset ?? 0,
          },
        );
        return { success: true, data: page };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load pending redemptions";
        request.log.error(error, "GET /redemptions/pending failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * GET /redemptions/approved
   *
   * Audit feed of APPROVED redemptions for the merchant — one row per
   * `customer_credit_redemptions` row with `approved_at IS NOT NULL`,
   * scoped to the merchant's customer set via `customer_credit.branch_id`.
   */
  fastify.get<{
    Querystring: MerchantAuditFeedFilters;
    Reply: MerchantApprovedRedemptionsApiResponse;
  }>("/approved", {
    preHandler: [requireAuth],
    schema: {
      querystring: MerchantAuditFeedFilters,
      response: {
        200: MerchantApprovedRedemptionsApiResponse,
        400: MerchantApprovedRedemptionsApiResponse,
        401: MerchantApprovedRedemptionsApiResponse,
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
        const q = request.query;
        const page = await redemptionService.listApprovedRedemptions(
          merchantId,
          {
            branch_id: q.branch_id ?? null,
            limit: q.limit ?? 20,
            offset: q.offset ?? 0,
          },
        );
        return { success: true, data: page };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load approved redemptions";
        request.log.error(error, "GET /redemptions/approved failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * GET /redemptions/rejected
   *
   * Audit feed of REJECTED redemptions for the merchant — one row per
   * `customer_credit_redemptions` row with `rejected_at IS NOT NULL`.
   */
  fastify.get<{
    Querystring: MerchantAuditFeedFilters;
    Reply: MerchantRejectedRedemptionsApiResponse;
  }>("/rejected", {
    preHandler: [requireAuth],
    schema: {
      querystring: MerchantAuditFeedFilters,
      response: {
        200: MerchantRejectedRedemptionsApiResponse,
        400: MerchantRejectedRedemptionsApiResponse,
        401: MerchantRejectedRedemptionsApiResponse,
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
        const q = request.query;
        const page = await redemptionService.listRejectedRedemptions(
          merchantId,
          {
            branch_id: q.branch_id ?? null,
            limit: q.limit ?? 20,
            offset: q.offset ?? 0,
          },
        );
        return { success: true, data: page };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load rejected redemptions";
        request.log.error(error, "GET /redemptions/rejected failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * POST /redemptions/customers/:customerId/approve
   *
   * Manager-only. Approves the pending request for (customer, merchant).
   * Body: `{ redemption_code, redemption_id }` — the staff member types
   * the 4-digit code from the customer's screen; the SQL RPC verifies
   * it matches the pending audit row at this merchant before stamping
   * `approved_at` + `approved_by_staff_id` + moving pending → approved.
   *
   * 404 when there's no pending request at the merchant. 400 when the
   * supplied code does not match (the SQL RPC raises P0001).
   */
  fastify.post<{
    Params: { customerId: number };
    Body: MerchantRedemptionActionBody;
    Reply: MerchantRedemptionMutationApiResponse;
  }>("/customers/:customerId/approve", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      body: MerchantRedemptionActionBody,
      response: {
        200: MerchantRedemptionMutationApiResponse,
        400: MerchantRedemptionMutationApiResponse,
        401: MerchantRedemptionMutationApiResponse,
        403: MerchantRedemptionMutationApiResponse,
        404: MerchantRedemptionMutationApiResponse,
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
        return await redemptionService.approveRequest(
          request.user!,
          merchantId,
          Number(request.params.customerId),
          request.body,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to approve redemption";
        request.log.error(
          error,
          "POST /redemptions/customers/:customerId/approve failed",
        );
        const notFound = message.includes("No pending request");
        if (notFound) reply.status(404);
        else reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * POST /redemptions/customers/:customerId/reject
   *
   * Manager-only. Rejects the pending request. Body: `{ redemption_code,
   * redemption_id }`. The SQL RPC verifies the code matches the pending
   * audit row at this merchant, stamps `rejected_at`, and zeroes the
   * fan-out slices.
   *
   * 404 when there's no pending request at the merchant. 400 when the
   * supplied code does not match.
   */
  fastify.post<{
    Params: { customerId: number };
    Body: MerchantRedemptionActionBody;
    Reply: MerchantRedemptionMutationApiResponse;
  }>("/customers/:customerId/reject", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      body: MerchantRedemptionActionBody,
      response: {
        200: MerchantRedemptionMutationApiResponse,
        400: MerchantRedemptionMutationApiResponse,
        401: MerchantRedemptionMutationApiResponse,
        403: MerchantRedemptionMutationApiResponse,
        404: MerchantRedemptionMutationApiResponse,
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
        return await redemptionService.rejectRequest(
          merchantId,
          Number(request.params.customerId),
          request.body,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to reject redemption";
        request.log.error(
          error,
          "POST /redemptions/customers/:customerId/reject failed",
        );
        const notFound = message.includes("No pending request");
        if (notFound) reply.status(404);
        else reply.status(400);
        return { success: false, error: message };
      }
    },
  });
}
