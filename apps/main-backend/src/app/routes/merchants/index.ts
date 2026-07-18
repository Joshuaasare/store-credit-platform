import { FastifyInstance } from "fastify";
import { requireAuth, requireRoles } from "../../middleware/auth.middleware";
import { merchantService } from "../../services/merchant.service";
import {
  UpdateMerchantRequest,
  MerchantMeApiResponse,
  MerchantMutationApiResponse,
} from "../../schemas/merchant.schema";

export default async function (fastify: FastifyInstance) {
  /**
   * GET /merchants/me
   * Returns the authenticated user's merchant + stats + pool, or null if
   * the user has no staff row (no-merchant state).
   */
  fastify.get<{
    Reply: MerchantMeApiResponse;
  }>("/me", {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: MerchantMeApiResponse,
        401: MerchantMeApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const user = request.user!;
        // Prefer the JWT-embedded merchant_id; fall back to staff lookup.
        let merchantId = user.merchant_id;
        if (merchantId == null) {
          const resolved = await merchantService.getMerchantIdForUser(user.sub);
          merchantId = resolved?.merchant_id ?? null;
        }

        if (merchantId == null) {
          return { success: true, data: null };
        }

        const merchant =
          await merchantService.getMyMerchantWithStats(merchantId);
        if (!merchant) {
          return { success: true, data: null };
        }
        return { success: true, data: merchant };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to fetch merchant";
        request.log.error(error, "GET /merchants/me failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * PATCH /merchants/me
   * Manager-only. Updates editable merchant profile fields.
   */
  fastify.patch<{
    Body: UpdateMerchantRequest;
    Reply: MerchantMutationApiResponse;
  }>("/me", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      body: UpdateMerchantRequest,
      response: {
        200: MerchantMutationApiResponse,
        401: MerchantMutationApiResponse,
        403: MerchantMutationApiResponse,
        400: MerchantMutationApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const user = request.user!;
        let merchantId = user.merchant_id;
        if (merchantId == null) {
          const resolved = await merchantService.getMerchantIdForUser(user.sub);
          merchantId = resolved?.merchant_id ?? null;
        }

        if (merchantId == null) {
          reply.status(403);
          return {
            success: false,
            error: "Forbidden: no merchant assigned to this user",
          };
        }

        const updated = await merchantService.updateMyMerchant(
          merchantId,
          request.body as UpdateMerchantRequest,
        );
        if (!updated) {
          reply.status(404);
          return { success: false, error: "Merchant not found" };
        }
        return { success: true, data: updated };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update merchant";
        request.log.error(error, "PATCH /merchants/me failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });
}
