import { FastifyInstance, FastifyRequest } from "fastify";
import { requireAuth, requireRoles } from "../../middleware/auth.middleware";
import { merchantService } from "../../services/merchant.service";
import { redemptionService } from "../../services/redemptions.service";
import {
  MerchantApprovedRedemptionsApiResponse,
  MerchantAuditFeedFilters,
  MerchantPendingRequestsApiResponse,
  MerchantPendingRequestFilters,
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
   * pair that has any `customer_credit` row with
   * `pending_redemption_amount > 0`. Pending is implicit (no longer a
   * row in `customer_credit_redemptions`); the SQL `redemption_fan_out`
   * RPC is what writes the pending slice on the credit rows.
   *
   // TODO(frontend-permissions): the Redemptions nav item is already
   // manager-gated via `permissions: ["manager"]` in MainLayout, but the
   // list endpoint itself is currently readable by any authenticated staff
   // member of the merchant. The backend role check on approve/reject is
   // the source of truth for now; finer-grained frontend permission
   // gating for the page itself is a follow-up.
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
   * Manager-only. Approves the pending request for (customer, merchant)
   * — atomic via SQL RPC `redemption_approve`: writes the audit row,
   * moves `pending_redemption_amount → approved_redemption_amount` on
   * every touched credit, stamps `redemption_approval_staff_id`.
   */
  fastify.post<{
    Params: { customerId: number };
    Reply: MerchantRedemptionMutationApiResponse;
  }>("/customers/:customerId/approve", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
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
   * Manager-only. Rejects the pending request — atomic via SQL RPC
   * `redemption_reject`: writes the rejected audit row, zeroes
   * `pending_redemption_amount` on every touched credit.
   */
  fastify.post<{
    Params: { customerId: number };
    Reply: MerchantRedemptionMutationApiResponse;
  }>("/customers/:customerId/reject", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
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
