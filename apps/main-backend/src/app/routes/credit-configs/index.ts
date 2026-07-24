import { FastifyInstance, FastifyRequest } from "fastify";
import { requireAuth, requireRoles } from "../../middleware/auth.middleware";
import { merchantService } from "../../services/merchant.service";
import { creditConfigService } from "../../services/creditConfig.service";
import {
  CreateRunningCreditConfigRequest,
  UpdateRunningCreditConfigRequest,
  RunningCreditConfigListApiResponse,
  RunningCreditConfigMutationApiResponse,
  RunningCreditConfigDeleteApiResponse,
  ToggleActiveRequest,
  CreateFixedCreditConfigRequest,
  UpdateFixedCreditConfigRequest,
  FixedCreditConfigListApiResponse,
  FixedCreditConfigMutationApiResponse,
  FixedCreditConfigDeleteApiResponse,
} from "../../schemas/creditConfig.schema";

async function resolveMerchantId(
  request: FastifyRequest,
): Promise<number | null> {
  const user = request.user!;
  if (user.merchant_id != null) return user.merchant_id;
  const resolved = await merchantService.getMerchantIdForUser(user.sub);
  return resolved?.merchant_id ?? null;
}

export default async function (fastify: FastifyInstance) {
  // ── Running configs ──────────────────────────────────────

  fastify.get<{
    Reply: RunningCreditConfigListApiResponse;
  }>("/running", {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: RunningCreditConfigListApiResponse,
        400: RunningCreditConfigListApiResponse,
        401: RunningCreditConfigListApiResponse,
        403: RunningCreditConfigListApiResponse,
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
        const data = await creditConfigService.listRunningConfigs(merchantId);
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to list running configs";
        request.log.error(error, "GET /credit-configs/running failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  fastify.post<{
    Body: CreateRunningCreditConfigRequest;
    Reply: RunningCreditConfigMutationApiResponse;
  }>("/running", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      body: CreateRunningCreditConfigRequest,
      response: {
        201: RunningCreditConfigMutationApiResponse,
        400: RunningCreditConfigMutationApiResponse,
        401: RunningCreditConfigMutationApiResponse,
        403: RunningCreditConfigMutationApiResponse,
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
        const data = await creditConfigService.createRunningConfig(
          merchantId,
          request.body,
        );
        reply.status(201);
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create running config";
        request.log.error(error, "POST /credit-configs/running failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  fastify.patch<{
    Params: { configGroupId: string };
    Body: UpdateRunningCreditConfigRequest;
    Reply: RunningCreditConfigMutationApiResponse;
  }>("/running/:configGroupId", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      body: UpdateRunningCreditConfigRequest,
      response: {
        200: RunningCreditConfigMutationApiResponse,
        400: RunningCreditConfigMutationApiResponse,
        401: RunningCreditConfigMutationApiResponse,
        403: RunningCreditConfigMutationApiResponse,
        404: RunningCreditConfigMutationApiResponse,
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
        const data = await creditConfigService.updateRunningConfig(
          merchantId,
          request.params.configGroupId,
          request.body,
        );
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update running config";
        if (message.includes("not found")) {
          reply.status(404);
        } else {
          reply.status(400);
        }
        request.log.error(error, "PATCH /credit-configs/running/:id failed");
        return { success: false, error: message };
      }
    },
  });

  fastify.delete<{
    Params: { configGroupId: string };
    Reply: RunningCreditConfigDeleteApiResponse;
  }>("/running/:configGroupId", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      response: {
        200: RunningCreditConfigDeleteApiResponse,
        400: RunningCreditConfigDeleteApiResponse,
        401: RunningCreditConfigDeleteApiResponse,
        403: RunningCreditConfigDeleteApiResponse,
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
        await creditConfigService.deleteRunningConfig(
          merchantId,
          request.params.configGroupId,
        );
        return { success: true, data: null };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete running config";
        request.log.error(error, "DELETE /credit-configs/running/:id failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  fastify.patch<{
    Params: { configGroupId: string };
    Body: ToggleActiveRequest;
    Reply: RunningCreditConfigMutationApiResponse;
  }>("/running/:configGroupId/active", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      body: ToggleActiveRequest,
      response: {
        200: RunningCreditConfigMutationApiResponse,
        400: RunningCreditConfigMutationApiResponse,
        401: RunningCreditConfigMutationApiResponse,
        403: RunningCreditConfigMutationApiResponse,
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
        const data = await creditConfigService.toggleRunningConfigActive(
          merchantId,
          request.params.configGroupId,
          request.body.is_active,
        );
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to toggle running config";
        request.log.error(error, "PATCH /credit-configs/running/:id/active failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  // ── Fixed configs ─────────────────────────────────────────

  fastify.get<{
    Reply: FixedCreditConfigListApiResponse;
  }>("/fixed", {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: FixedCreditConfigListApiResponse,
        400: FixedCreditConfigListApiResponse,
        401: FixedCreditConfigListApiResponse,
        403: FixedCreditConfigListApiResponse,
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
        const data = await creditConfigService.listFixedConfigs(merchantId);
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to list fixed configs";
        request.log.error(error, "GET /credit-configs/fixed failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  fastify.post<{
    Body: CreateFixedCreditConfigRequest;
    Reply: FixedCreditConfigMutationApiResponse;
  }>("/fixed", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      body: CreateFixedCreditConfigRequest,
      response: {
        201: FixedCreditConfigMutationApiResponse,
        400: FixedCreditConfigMutationApiResponse,
        401: FixedCreditConfigMutationApiResponse,
        403: FixedCreditConfigMutationApiResponse,
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
        const data = await creditConfigService.createFixedConfig(
          merchantId,
          request.body,
        );
        reply.status(201);
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create fixed config";
        request.log.error(error, "POST /credit-configs/fixed failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  fastify.patch<{
    Params: { configGroupId: string };
    Body: UpdateFixedCreditConfigRequest;
    Reply: FixedCreditConfigMutationApiResponse;
  }>("/fixed/:configGroupId", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      body: UpdateFixedCreditConfigRequest,
      response: {
        200: FixedCreditConfigMutationApiResponse,
        400: FixedCreditConfigMutationApiResponse,
        401: FixedCreditConfigMutationApiResponse,
        403: FixedCreditConfigMutationApiResponse,
        404: FixedCreditConfigMutationApiResponse,
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
        const data = await creditConfigService.updateFixedConfig(
          merchantId,
          request.params.configGroupId,
          request.body,
        );
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update fixed config";
        if (message.includes("not found")) {
          reply.status(404);
        } else {
          reply.status(400);
        }
        request.log.error(error, "PATCH /credit-configs/fixed/:id failed");
        return { success: false, error: message };
      }
    },
  });

  fastify.delete<{
    Params: { configGroupId: string };
    Reply: FixedCreditConfigDeleteApiResponse;
  }>("/fixed/:configGroupId", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      response: {
        200: FixedCreditConfigDeleteApiResponse,
        400: FixedCreditConfigDeleteApiResponse,
        401: FixedCreditConfigDeleteApiResponse,
        403: FixedCreditConfigDeleteApiResponse,
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
        await creditConfigService.deleteFixedConfig(
          merchantId,
          request.params.configGroupId,
        );
        return { success: true, data: null };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete fixed config";
        request.log.error(error, "DELETE /credit-configs/fixed/:id failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  fastify.patch<{
    Params: { configGroupId: string };
    Body: ToggleActiveRequest;
    Reply: FixedCreditConfigMutationApiResponse;
  }>("/fixed/:configGroupId/active", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      body: ToggleActiveRequest,
      response: {
        200: FixedCreditConfigMutationApiResponse,
        400: FixedCreditConfigMutationApiResponse,
        401: FixedCreditConfigMutationApiResponse,
        403: FixedCreditConfigMutationApiResponse,
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
        const data = await creditConfigService.toggleFixedConfigActive(
          merchantId,
          request.params.configGroupId,
          request.body.is_active,
        );
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to toggle fixed config";
        request.log.error(error, "PATCH /credit-configs/fixed/:id/active failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });
}