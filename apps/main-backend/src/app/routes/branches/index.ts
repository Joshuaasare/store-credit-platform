import { FastifyInstance } from "fastify";
import {
  requireAuth,
  requireRoles,
} from "../../middleware/auth.middleware";
import { branchService } from "../../services/branch.service";
import { merchantService } from "../../services/merchant.service";
import {
  CreateBranchRequest,
  UpdateBranchRequest,
  BranchListApiResponse,
  BranchMutationApiResponse,
  BranchesNearbyApiResponse,
  BranchSearchApiResponse,
  BranchesNearbyQuerystring,
  BranchSearchQuerystring,
} from "../../schemas/branch.schema";
import { BranchCategoryValues } from "../../types/main.types";

export default async function (fastify: FastifyInstance) {
  fastify.get<{
    Reply: BranchListApiResponse;
  }>("/", {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: BranchListApiResponse,
        401: BranchListApiResponse,
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
          return { success: true, data: [] };
        }

        const branches =
          await branchService.listBranchesForMerchant(merchantId);
        return { success: true, data: branches };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to list branches";
        request.log.error(error, "GET /branches failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  fastify.post<{
    Body: CreateBranchRequest;
    Reply: BranchMutationApiResponse;
  }>("/", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      body: CreateBranchRequest,
      response: {
        201: BranchMutationApiResponse,
        401: BranchMutationApiResponse,
        403: BranchMutationApiResponse,
        400: BranchMutationApiResponse,
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

        const branch = await branchService.createBranch(
          merchantId,
          request.body as CreateBranchRequest,
        );
        reply.status(201);
        return { success: true, data: branch };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create branch";
        request.log.error(error, "POST /branches failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  fastify.patch<{
    Params: { id: string };
    Body: UpdateBranchRequest;
    Reply: BranchMutationApiResponse;
  }>("/:id", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      body: UpdateBranchRequest,
      response: {
        200: BranchMutationApiResponse,
        401: BranchMutationApiResponse,
        403: BranchMutationApiResponse,
        404: BranchMutationApiResponse,
        400: BranchMutationApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const user = request.user!;
        const branchId = Number((request.params as { id: string }).id);
        if (!Number.isInteger(branchId)) {
          reply.status(400);
          return { success: false, error: "Invalid branch id" };
        }

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

        const updated = await branchService.updateBranch(
          branchId,
          merchantId,
          request.body as UpdateBranchRequest,
        );
        return { success: true, data: updated };
      } catch (error) {
        const e = error as Error & { statusCode?: number };
        const message = e.message || "Failed to update branch";
        request.log.error(error, "PATCH /branches/:id failed");
        if (e.statusCode === 403) {
          reply.status(403);
          return { success: false, error: message };
        }
        if (message.includes("not found")) {
          reply.status(404);
          return { success: false, error: message };
        }
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  fastify.get<{
    Querystring: BranchesNearbyQuerystring;
    Reply: BranchesNearbyApiResponse;
  }>("/nearby", {
    preHandler: [requireAuth],
    schema: {
      querystring: BranchesNearbyQuerystring,
      response: {
        200: BranchesNearbyApiResponse,
        400: BranchesNearbyApiResponse,
        401: BranchesNearbyApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const q = request.query;
        const lat = q.lat != null ? Number(q.lat) : null;
        const lng = q.lng != null ? Number(q.lng) : null;
        const limit = q.limit != null ? Number(q.limit) : 20;
        const offset = q.offset != null ? Number(q.offset) : 0;
        const rawCategory = q.category;
        const category: BranchCategoryValues[] | null = Array.isArray(rawCategory)
          ? (rawCategory as BranchCategoryValues[])
          : rawCategory
            ? [rawCategory as BranchCategoryValues]
            : null;
        const data = await branchService.getBranchesByLocation({
          lat,
          lng,
          category,
          limit,
          offset,
        });
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load nearby branches";
        request.log.error(error, "GET /branches/nearby failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  fastify.get<{
    Querystring: BranchSearchQuerystring;
    Reply: BranchSearchApiResponse;
  }>("/search", {
    preHandler: [requireAuth],
    schema: {
      querystring: BranchSearchQuerystring,
      response: {
        200: BranchSearchApiResponse,
        400: BranchSearchApiResponse,
        401: BranchSearchApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const q = request.query;
        const lat = q.lat != null ? Number(q.lat) : null;
        const lng = q.lng != null ? Number(q.lng) : null;
        const limit = q.limit != null ? Number(q.limit) : 20;
        const offset = q.offset != null ? Number(q.offset) : 0;
        const data = await branchService.searchBranchesByLocation({
          lat,
          lng,
          query: q.q ?? "",
          limit,
          offset,
        });
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to search branches";
        request.log.error(error, "GET /branches/search failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });
}
