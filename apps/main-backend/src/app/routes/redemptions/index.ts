import { FastifyInstance, FastifyRequest } from "fastify";
import { requireAuth, requireRoles } from "../../middleware/auth.middleware";
import { merchantService } from "../../services/merchant.service";
import { redemptionService } from "../../services/redemptions.service";
import {
  RedemptionsQuerystring,
  RedemptionsApiResponse,
  RedemptionMutationApiResponse,
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
   * GET /redemptions
   * Merchant-scoped, paginated, status-filtered redemption list. `status` is
   * required (pending | approved | rejected) — there is no "all" tab. Optional
   * `branch_id` filters within the merchant's branches. Each row carries a
   * per-row `remaining` (credit.credit_amount − SUM(approved redemptions on
   * that credit)).
   *
   // TODO(frontend-permissions): the Redemptions nav item is already
   // manager-gated via `permissions: ["manager"]` in MainLayout, but the
   // list endpoint itself is currently readable by any authenticated staff
   // member of the merchant. The backend role check on approve/reject is the
   // source of truth for now; finer-grained frontend permission gating for
   // the page itself is a follow-up.
   */
  fastify.get<{
    Querystring: RedemptionsQuerystring;
    Reply: RedemptionsApiResponse;
  }>("/", {
    preHandler: [requireAuth],
    schema: {
      querystring: RedemptionsQuerystring,
      response: {
        200: RedemptionsApiResponse,
        400: RedemptionsApiResponse,
        401: RedemptionsApiResponse,
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
        const status = q.status;
        if (
          status !== "pending" &&
          status !== "approved" &&
          status !== "rejected"
        ) {
          reply.status(400);
          return {
            success: false,
            error: "Invalid status: must be pending, approved, or rejected",
          };
        }
        const page = await redemptionService.listRedemptions(merchantId, {
          status,
          branch_id: q.branch_id ?? null,
          limit: q.limit ?? 20,
          offset: q.offset ?? 0,
        });
        return { success: true, data: page };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load redemptions";
        request.log.error(error, "GET /redemptions failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * POST /redemptions/:id/approve
   * Manager-only. Approves a pending redemption: sets `approved_at = now()`
   * and `approved_by_staff_id = caller.staff_id`. 409 if already in a
   * terminal state. 400 if `amount_redeemed` exceeds the credit's current
   * remaining. Returns the updated row.
   *
   // TODO(frontend-permissions): the Approve button is rendered only on the
   // Pending tab in the webapp, but the backend `requireRoles("manager")`
   // check is the source of truth for now. A finer-grained frontend
   // permission check (hiding the button for non-managers who somehow reach
   // the page) is a follow-up.
   */
  fastify.post<{
    Params: { id: number };
    Reply: RedemptionMutationApiResponse;
  }>("/:id/approve", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      response: {
        200: RedemptionMutationApiResponse,
        400: RedemptionMutationApiResponse,
        401: RedemptionMutationApiResponse,
        403: RedemptionMutationApiResponse,
        404: RedemptionMutationApiResponse,
        409: RedemptionMutationApiResponse,
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
        const row = await redemptionService.approveRedemption(
          request.user!,
          Number(request.params.id),
          merchantId,
        );
        return { success: true, data: row };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to approve redemption";
        request.log.error(error, "POST /redemptions/:id/approve failed");
        const conflict =
          message.includes("already approved") ||
          message.includes("already rejected");
        const notFound = message.includes("not found");
        const exceeded = message.includes("exceeds remaining credit");
        if (conflict) reply.status(409);
        else if (notFound) reply.status(404);
        else if (exceeded) reply.status(400);
        else reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * POST /redemptions/:id/reject
   * Manager-only. Rejects a pending redemption: sets `rejected_at = now()`.
   * No `rejected_by_staff_id` column (decision 7). 409 if already in a
   * terminal state. Returns the updated row.
   */
  fastify.post<{
    Params: { id: number };
    Reply: RedemptionMutationApiResponse;
  }>("/:id/reject", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      response: {
        200: RedemptionMutationApiResponse,
        400: RedemptionMutationApiResponse,
        401: RedemptionMutationApiResponse,
        403: RedemptionMutationApiResponse,
        404: RedemptionMutationApiResponse,
        409: RedemptionMutationApiResponse,
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
        const row = await redemptionService.rejectRedemption(
          Number(request.params.id),
          merchantId,
        );
        return { success: true, data: row };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to reject redemption";
        request.log.error(error, "POST /redemptions/:id/reject failed");
        const conflict =
          message.includes("already approved") ||
          message.includes("already rejected");
        const notFound = message.includes("not found");
        if (conflict) reply.status(409);
        else if (notFound) reply.status(404);
        else reply.status(400);
        return { success: false, error: message };
      }
    },
  });
}