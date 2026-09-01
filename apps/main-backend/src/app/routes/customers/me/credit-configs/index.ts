import { FastifyInstance } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { requireAuth } from "../../../../middleware/auth.middleware";
import { customerConfigInteractionsService } from "../../../../services/customerConfigInteractions.service";
import {
  CustomerFavoritesListApiResponse,
  FavoriteMutationApiResponse,
} from "../../../../schemas/creditConfig.schema";

const ConfigTypeParam = Type.Object({
  configType: Type.Union([Type.Literal("running"), Type.Literal("fixed")]),
  configId: Type.String(),
});
type ConfigTypeParam = Static<typeof ConfigTypeParam>;

// Always reply 200 with a JSON body — the lib's apiRequest unconditionally
// calls response.json(), so a body-less 204 would throw client-side.
const EmptyOkResponse = Type.Object({ success: Type.Literal(true) });

export default async function (fastify: FastifyInstance) {
  fastify.get<{
    Reply: CustomerFavoritesListApiResponse;
  }>("/favorites", {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: CustomerFavoritesListApiResponse,
        401: CustomerFavoritesListApiResponse,
        403: CustomerFavoritesListApiResponse,
      },
    },
    handler: async (request, reply) => {
      const customerId = request.user?.customer_id;
      if (customerId == null) {
        reply.status(403);
        return {
          success: false,
          error: "Forbidden: this endpoint is for customer accounts only",
        };
      }
      try {
        const data =
          await customerConfigInteractionsService.listMyFavorites(customerId);
        return { success: true as const, data };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load favorites";
        request.log.error(error, "GET /customers/me/credit-configs/favorites failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  fastify.post<{
    Params: ConfigTypeParam;
    Reply: FavoriteMutationApiResponse;
  }>("/:configType/:configId/favorite", {
    preHandler: [requireAuth],
    schema: {
      params: ConfigTypeParam,
      response: {
        200: EmptyOkResponse,
        400: FavoriteMutationApiResponse,
        401: FavoriteMutationApiResponse,
        403: FavoriteMutationApiResponse,
      },
    },
    handler: async (request, reply) => {
      const customerId = request.user?.customer_id;
      if (customerId == null) {
        reply.status(403);
        return {
          success: false,
          error: "Forbidden: this endpoint is for customer accounts only",
        };
      }
      try {
        const { configType, configId } = request.params;
        await customerConfigInteractionsService.addFavorite(
          configType,
          Number(configId),
          customerId,
        );
        return { success: true as const };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to favorite config";
        request.log.error(error, "POST .../favorite failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  fastify.delete<{
    Params: ConfigTypeParam;
    Reply: FavoriteMutationApiResponse;
  }>("/:configType/:configId/favorite", {
    preHandler: [requireAuth],
    schema: {
      params: ConfigTypeParam,
      response: {
        200: EmptyOkResponse,
        400: FavoriteMutationApiResponse,
        401: FavoriteMutationApiResponse,
        403: FavoriteMutationApiResponse,
      },
    },
    handler: async (request, reply) => {
      const customerId = request.user?.customer_id;
      if (customerId == null) {
        reply.status(403);
        return {
          success: false,
          error: "Forbidden: this endpoint is for customer accounts only",
        };
      }
      try {
        const { configType, configId } = request.params;
        await customerConfigInteractionsService.removeFavorite(
          configType,
          Number(configId),
          customerId,
        );
        return { success: true as const };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to unfavorite config";
        request.log.error(error, "DELETE .../favorite failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });
}