import { FastifyInstance } from "fastify";
import { requireAuth, AuthenticatedRequest } from "../../middleware/auth.middleware";
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
} from "../../schemas/customers.schema";

async function resolveMerchantId(
  request: AuthenticatedRequest,
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
    handler: async (request: AuthenticatedRequest, reply) => {
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
          branchId: q.branch_id ?? null,
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
    handler: async (request: AuthenticatedRequest, reply) => {
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
          branchId: q.branch_id ?? null,
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
    handler: async (request: AuthenticatedRequest, reply) => {
      try {
        const merchantId = await resolveMerchantId(request);
        if (merchantId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: no merchant assigned to this user",
          };
        }
        const q = request.query as TransactionsQuerystring;
        const page = await customerService.getTransactions(merchantId, {
          branchId: q.branch_id ?? null,
          start: q.start ?? null,
          end: q.end ?? null,
          limit: q.limit ?? 20,
          offset: q.offset ?? 0,
        });
        return { success: true, data: page };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load transactions";
        request.log.error(error, "GET /customers/transactions failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * POST /customers/transactions/purchase
   * Records a purchase transaction. Auto-creates the customer (by phone) and
   * the branch_customer junction row. No credit issuance in this feature.
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
    handler: async (request: AuthenticatedRequest, reply) => {
      try {
        const merchantId = await resolveMerchantId(request);
        if (merchantId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: no merchant assigned to this user",
          };
        }
        const body = request.body as CreatePurchaseRequest;
        const row = await customerService.createPurchase(request.user!, {
          phone: body.phone,
          amount: body.amount,
        });
        reply.status(201);
        return { success: true, data: row };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to record purchase";
        request.log.error(error, "POST /customers/transactions/purchase failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });
}