import { FastifyInstance, FastifyRequest } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { requireAuth } from "../../middleware/auth.middleware";
import { merchantService } from "../../services/merchant.service";
import { customerService } from "../../services/customers.service";
import { customerCreditsService } from "../../services/customerCredits.service";
import { customerActivitiesService } from "../../services/customerActivities.service";
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
}
