import { FastifyInstance, FastifyRequest } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { requireAuth } from "../../middleware/auth.middleware";
import { merchantService } from "../../services/merchant.service";
import { customerService } from "../../services/customers.service";
import { customerCreditsService } from "../../services/customerCredits.service";
import { customerActivitiesService } from "../../services/customerActivities.service";
import { customerRedemptionsService } from "../../services/customerRedemptions.service";
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

// Querystring for the customer-app Home tab Recent Activity feed.
// `cursor` is the numeric id of the last item from the previous page
// (stringified — URL querystrings are always strings, so we coerce in the
// handler). `limit` is optional and clamped server-side.
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
  /**
   * GET /customers
   * Paginated, searchable customer directory. Scopes to the caller's branch
   * by default (via the webapp passing branch_id) or merchant-wide when
   * branch_id is omitted. Search is a substring match on surname,
   * other_names, or phone — applied server-side inside the RPC.
   */
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

  /**
   * GET /customers/:customerId
   * Single-customer detail: merchant-wide totals + every live credit row
   * with per-credit redeemed_total / remaining. 404 if the customer has no
   * purchase at any of the merchant's branches (also the security boundary).
   */
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

  /**
   * GET /customers/leaderboard
   * Paginated, merchant-scoped customer leaderboard with sort + branch + date filters.
   */
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

  /**
   * GET /customers/leaderboard-stats
   * Lightweight totals for the leaderboard hero stats row.
   */
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

  /**
   * GET /customers/me/credits
   * Customer-app Credits tab — returns the logged-in customer's credit rows
   * split into `live` and `expired` arrays. Customer-token only: the
   * `customer_id` is derived from the JWT, never trusted from the client.
   *
   * The route lives on the staff `/customers/*` namespace rather than
   * `/customer-auth/*` because it reads business data (credits), not auth
   * state — but the auth gate is `customer_id != null`, the same as the
   * customer `/me` endpoint. Staff tokens are rejected.
   */
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

  /**
   * GET /customers/me/transactions
   * Customer-app Home tab — Recent Activity feed. Unified, time-ordered
   * stream of issuances and approved redemptions for the logged-in customer.
   * Customer-token only: `customer_id` is derived from the JWT, never
   * trusted from the client. Staff tokens are rejected.
   *
   * Cursor-based pagination (`cursor` query param, `limit` 1-50, default 20).
   * The cursor is the numeric `id` of the last item from the previous page.
   */
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

        // Coerce the cursor from string to number if present. Fastify's
        // querystring validation accepts both string and number for
        // cursor; we always pass a number to the service.
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

  /**
   * GET /customers/me/merchants/:merchantId/branches
   *
   * List non-deleted branches at the merchant. Drives the customer-app
   * redemption sheet's branch picker. Customer-token only — `customer_id`
   * is derived from the JWT, the merchant id from the URL.
   */
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

  /**
   * GET /customers/me/merchants/:merchantId/redemptions/pending
   *
   * The customer's pending redemption request at one merchant — returns
   * the audit row projection with the 4-digit `redemption_code`. Returns
   * `{ success: true, data: null }` when there's no pending row at this
   * merchant. Customer-token only.
   *
   * The `redemption_code` is INTENTIONALLY exposed here — the customer
   * is the only party who should see it. The merchant service reads the
   * same audit row but strips the code from its response.
   */
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

  /**
   * GET /customers/me/merchants/:merchantId/redemptions/approved
   *
   * Cursor-paginated list of the customer's approved redemptions at one
   * merchant — drives the merchant-screen "Approved" tab.
   *
   * Querystring:
   *   - `cursor` (optional, ms epoch): the last item's `approved_at`
   *     from the previous page. Pass `null` / omit on the first page.
   *   - `limit` (optional, integer): page size, defaults to 20, max 50.
   *
   * Returns `{ success: true, data: { items, nextCursor } }`. `nextCursor`
   * is the last item's `approved_at` (ms) when the page was exactly
   * `limit`-sized (caller should keep fetching); `null` on a partial /
   * empty page (end-of-feed).
   *
   * The 4-digit `redemption_code` is INTENTIONALLY not returned — it
   * was used once at the till and is no longer needed for reference.
   * The customer app falls back to `—` for `branch_name` when the
   * branch was soft-deleted after the redemption (the audit row keeps
   * `branch_id` for accounting).
   */
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

        // Coerce the cursor from querystring to a finite number. The
        // TypeBox schema accepts `string | number | undefined`; the
        // service expects a number for `lt(approved_at, new Date(ms))`.
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

  /**
   * POST /customers/me/merchants/:merchantId/redemptions
   *
   * Create a new pending redemption request at (customer, merchant).
   * Body: `{ amount, branchId }`. Calls the SQL RPC
   * `redemption_request_create` which generates the 4-digit code,
   * inserts the audit row, and runs the fan-out atomically.
   *
   * Returns 409 if a pending row already exists at this merchant (the
   * RPC raises P0001 — "A pending redemption already exists for this
   * merchant"). The customer app handles 409 by routing the user into
   * the edit flow instead.
   */
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
        // SQL RPC raises P0001 ("A pending redemption already exists")
        // when a pending row is already present — surface as 409.
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

  /**
   * PATCH /customers/me/merchants/:merchantId/redemptions
   *
   * Edit an existing pending redemption request. Body: `{ amount, branchId }`.
   * Calls the SQL RPC `redemption_request_update` which:
   *   - no-ops when amount + branch are both unchanged (the code stays);
   *   - otherwise hard-deletes the old row + inserts a new one with a
   *     fresh code + re-runs the fan-out. Edits don't accumulate
   *     soft-deleted rows in the audit table.
   *
   * Returns 404 when there is no pending row at the merchant (the RPC
   * raises P0002). The customer app handles 404 by falling back to the
   * create flow.
   */
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

  /**
   * DELETE /customers/me/merchants/:merchantId/redemptions
   *
   * Cancel the logged-in customer's pending request at a merchant.
   * Calls the SQL RPC `redemption_request_cancel` which hard-deletes
   * the audit row + zeroes the fan-out slices. Idempotent — no-op
   * when there's no pending row to cancel.
   *
   * Returns `{ success: true, data: { cancelled: true|false } }`.
   */
  fastify.delete<{
    Params: { merchantId: number };
    Reply: CustomerRedemptionCancelApiResponse;
  }>("/me/merchants/:merchantId/redemptions", {
    preHandler: [requireAuth],
    schema: {
      // DELETE carries no body. Fastify 5's default JSON parser rejects
      // `Content-Type: application/json` + empty payload with
      // `FST_ERR_CTP_EMPTY_JSON_BODY` before the handler runs. The
      // global JSON parser override (in `app.ts`) replaces that
      // behaviour so an empty body parses to `undefined` instead of
      // throwing. The route still declares `body: null` so the schema
      // validator doesn't require a body shape.
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
}
