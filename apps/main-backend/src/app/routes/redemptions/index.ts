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
  // redemption_code is intentionally never included — the code is customer-only, not staff-visible.
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

  // RPC verifies the 4-digit code matches the pending audit row before stamping approved_at. 400 on mismatch (P0001), 404 when no pending request.
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

  // 404 when no pending request at the merchant; 400 when the supplied code does not match.
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
