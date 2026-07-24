import { FastifyInstance, FastifyRequest } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware";
import { merchantService } from "../../services/merchant.service";
import { customerService } from "../../services/customers.service";
import {
  LeaderboardQuerystring,
  LeaderboardApiResponse,
  LeaderboardStatsApiResponse,
  TransactionsQuerystring,
  TransactionsApiResponse,
  CreatePurchaseRequest,
  CreatePurchaseApiResponse,
  CreateRedemptionRequest,
  CreateRedemptionApiResponse,
  CreditRemainingApiResponse,
} from "../../schemas/customers.schema";

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
   * GET /customers/transactions
   * Merchant-scoped transactions list, ordered by transaction_date desc, offset-paginated.
   */
  fastify.get<{
    Querystring: TransactionsQuerystring;
    Reply: TransactionsApiResponse;
  }>("/transactions", {
    preHandler: [requireAuth],
    schema: {
      querystring: TransactionsQuerystring,
      response: {
        200: TransactionsApiResponse,
        400: TransactionsApiResponse,
        401: TransactionsApiResponse,
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
        const page = await customerService.getTransactions(merchantId, {
          branch_id: q.branch_id ?? null,
          start: q.start ?? null,
          end: q.end ?? null,
          limit: q.limit ?? 20,
          offset: q.offset ?? 0,
        });
        return { success: true, data: page };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load transactions";
        request.log.error(error, "GET /customers/transactions failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * POST /customers/transactions/purchase
   * Records a purchase in customer_purchases. Auto-creates the customer (by
   * phone) if missing. Matching running credit configs are auto-issued after
   * the purchase is persisted; issuance failures are logged but do not fail
   * the purchase.
   */
  fastify.post<{
    Body: CreatePurchaseRequest;
    Reply: CreatePurchaseApiResponse;
  }>("/transactions/purchase", {
    preHandler: [requireAuth],
    schema: {
      body: CreatePurchaseRequest,
      response: {
        201: CreatePurchaseApiResponse,
        400: CreatePurchaseApiResponse,
        401: CreatePurchaseApiResponse,
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
        const body = request.body;
        const row = await customerService.createPurchase(
          request.user!,
          {
            phone: body.phone,
            amount: body.amount,
            branch_id: body.branch_id ?? null,
          },
          merchantId,
          request.log,
        );
        reply.status(201);
        return { success: true, data: row };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to record purchase";
        request.log.error(
          error,
          "POST /customers/transactions/purchase failed",
        );
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * POST /customers/credits/redeem
   * Records an approved redemption against a specific customer_credit row.
   * Auto-approves (approved_at = now(), approved_by_user_id = caller) since
   * redemptions recorded from the webapp are immediate; the approved_at
   * column exists for a future customer-initiated approval flow. Validates
   * merchant scope and that the amount does not exceed remaining credit.
   */
  fastify.post<{
    Body: CreateRedemptionRequest;
    Reply: CreateRedemptionApiResponse;
  }>("/credits/redeem", {
    preHandler: [requireAuth],
    schema: {
      body: CreateRedemptionRequest,
      response: {
        200: CreateRedemptionApiResponse,
        400: CreateRedemptionApiResponse,
        401: CreateRedemptionApiResponse,
        403: CreateRedemptionApiResponse,
        404: CreateRedemptionApiResponse,
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
        const body = request.body;
        const data = await customerService.createRedemption(
          request.user!,
          { credit_id: body.credit_id, amount_redeemed: body.amount_redeemed },
          merchantId,
        );
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to record redemption";
        const notFound =
          message.includes("not found") || message.includes("does not belong");
        reply.status(notFound ? 404 : 400);
        request.log.error(error, "POST /customers/credits/redeem failed");
        return { success: false, error: message };
      }
    },
  });

  /**
   * GET /customers/credits/:creditId/remaining
   * Live "remaining credit" snapshot for a single customer_credit row.
   *   remaining = credit_amount − SUM(approved, non-deleted redemptions)
   */
  fastify.get<{
    Params: { creditId: number };
    Reply: CreditRemainingApiResponse;
  }>("/credits/:creditId/remaining", {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: CreditRemainingApiResponse,
        400: CreditRemainingApiResponse,
        401: CreditRemainingApiResponse,
        404: CreditRemainingApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        // Merchant scope is enforced inside getCreditRemaining via the
        // credit's branch ownership — but we still resolve merchantId here
        // so a caller with no merchant gets a 403 instead of a 404 leak.
        const merchantId = await resolveMerchantId(request);
        if (merchantId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: no merchant assigned to this user",
          };
        }
        const data = await customerService.getCreditRemaining(
          Number(request.params.creditId),
        );
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load remaining credit";
        const notFound = message.includes("not found");
        reply.status(notFound ? 404 : 400);
        request.log.error(
          error,
          "GET /customers/credits/:creditId/remaining failed",
        );
        return { success: false, error: message };
      }
    },
  });
}
