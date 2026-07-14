import { FastifyInstance } from "fastify";
import {
  requireAuth,
  requireRoles,
  AuthenticatedRequest,
} from "../../middleware/auth.middleware";
import { branchService } from "../../services/branch.service";
import { merchantService } from "../../services/merchant.service";
import {
  CreateBranchRequest,
  UpdateBranchRequest,
  BranchListApiResponse,
  BranchMutationApiResponse,
} from "../../schemas/branch.schema";

export default async function (fastify: FastifyInstance) {
  /**
   * GET /branches
   * List all branches for the authenticated user's merchant.
   */
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
    handler: async (request: AuthenticatedRequest, reply) => {
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

  /**
   * POST /branches
   * Manager-only. Create a new branch for the merchant.
   */
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
    handler: async (request: AuthenticatedRequest, reply) => {
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

  /**
   * PATCH /branches/:id
   * Manager-only. Update a branch (must belong to the merchant).
   */
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
    handler: async (request: AuthenticatedRequest, reply) => {
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
}
