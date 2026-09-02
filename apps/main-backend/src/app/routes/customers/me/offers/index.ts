import { FastifyInstance } from "fastify";
import { requireAuth } from "../../../../middleware/auth.middleware";
import { customerOffersService } from "../../../../services/customerOffers.service";
import {
  NearbyOffersApiResponse,
  NearbyOffersQuerystring,
  OfferBranchesApiResponse,
  OfferBranchesParams,
  OfferBranchesQuerystring,
} from "../../../../schemas/customerOffers.schema";

export default async function (fastify: FastifyInstance) {
  fastify.get<{
    Querystring: NearbyOffersQuerystring;
    Reply: NearbyOffersApiResponse;
  }>("/nearby", {
    preHandler: [requireAuth],
    schema: {
      querystring: NearbyOffersQuerystring,
      response: {
        200: NearbyOffersApiResponse,
        400: NearbyOffersApiResponse,
        401: NearbyOffersApiResponse,
        403: NearbyOffersApiResponse,
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
        const q = request.query;
        const lat = q.lat != null ? Number(q.lat) : null;
        const lng = q.lng != null ? Number(q.lng) : null;
        const limit = q.limit != null ? Number(q.limit) : 20;
        const offset = q.offset != null ? Number(q.offset) : 0;
        const data = await customerOffersService.getNearbyOffers({
          lat,
          lng,
          limit,
          offset,
        });
        return { success: true as const, data };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load offers";
        request.log.error(error, "GET /customers/me/offers/nearby failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  fastify.get<{
    Params: OfferBranchesParams;
    Querystring: OfferBranchesQuerystring;
    Reply: OfferBranchesApiResponse;
  }>("/:configType/:configId/branches", {
    preHandler: [requireAuth],
    schema: {
      params: OfferBranchesParams,
      querystring: OfferBranchesQuerystring,
      response: {
        200: OfferBranchesApiResponse,
        400: OfferBranchesApiResponse,
        401: OfferBranchesApiResponse,
        403: OfferBranchesApiResponse,
        404: OfferBranchesApiResponse,
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
        const q = request.query;
        const lat = q.lat != null ? Number(q.lat) : null;
        const lng = q.lng != null ? Number(q.lng) : null;
        const data = await customerOffersService.getOfferBranches(
          request.params.configType,
          Number(request.params.configId),
          lat,
          lng,
        );
        return { success: true as const, data };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load offer branches";
        const notFound = message.includes("not found");
        request.log.error(
          error,
          "GET /customers/me/offers/:configType/:configId/branches failed",
        );
        reply.status(notFound ? 404 : 400);
        return { success: false, error: message };
      }
    },
  });
}