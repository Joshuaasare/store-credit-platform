import { FastifyInstance, FastifyRequest } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware";
import { merchantService } from "../../services/merchant.service";
import { transactionService } from "../../services/transactions.service";
import {
  TransactionsQuerystring,
  TransactionsApiResponse,
  CreatePurchaseRequest,
  CreatePurchaseApiResponse,
} from "../../schemas/transactions.schema";

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
   * GET /transactions
   * Merchant-scoped activity feed (purchases + credit issued + credit redeemed),
   * ordered by transaction_date desc, offset-paginated. `type` query param
   * filters the union to a single kind before pagination.
   */
  fastify.get<{
    Querystring: TransactionsQuerystring;
    Reply: TransactionsApiResponse;
  }>("/", {
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
        const page = await transactionService.getTransactions(merchantId, {
          type: q.type ?? "all",
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
        request.log.error(error, "GET /transactions failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * POST /transactions/purchase
   * Records a purchase in customer_purchases. Auto-creates the customer (by
   * phone) if missing. Matching running credit configs are auto-issued after
   * the purchase is persisted; issuance failures are logged but do not fail
   * the purchase.
   */
  fastify.post<{
    Body: CreatePurchaseRequest;
    Reply: CreatePurchaseApiResponse;
  }>("/purchase", {
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
        const row = await transactionService.createPurchase(
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
        request.log.error(error, "POST /transactions/purchase failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });
}