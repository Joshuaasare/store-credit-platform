import { FastifyInstance } from "fastify";
import { requireAuth, requireRoles } from "../../middleware/auth.middleware";
import { staffService } from "../../services/staff.service";
import {
  StaffListQuerystring,
  StaffListApiResponse,
  CreateStaffRequest,
  UpdateStaffRequest,
  SetStaffAccessRequest,
  StaffMutationApiResponse,
  StaffAccessApiResponse,
  StaffDeleteApiResponse,
} from "../../schemas/staff.schema";

export default async function (fastify: FastifyInstance) {
  /**
   * GET /staff
   * Manager-only. Lists staff for the calling merchant, with optional
   * search / branch_id / role / include_disabled filters.
   */
  fastify.get<{
    Querystring: StaffListQuerystring;
    Reply: StaffListApiResponse;
  }>("/", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      querystring: StaffListQuerystring,
      response: {
        200: StaffListApiResponse,
        400: StaffListApiResponse,
        401: StaffListApiResponse,
        403: StaffListApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const q = request.query as StaffListQuerystring;
        const page = await staffService.listStaff(request.user!, {
          search: q.search ?? null,
          branch_id: q.branch_id ?? null,
          role: q.role ?? null,
          include_disabled: q.include_disabled ?? null,
          limit: q.limit ?? 50,
          offset: q.offset ?? 0,
        });
        return { success: true, data: page };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load staff";
        const forbidden = message.startsWith("Forbidden:");
        reply.status(forbidden ? 403 : 400);
        request.log.error(error, "GET /staff failed");
        return { success: false, error: message };
      }
    },
  });

  /**
   * POST /staff
   * Manager-only. Create a new staff member (or auto-restore a soft-deleted
   * phone — the service handles both paths).
   */
  fastify.post<{
    Body: CreateStaffRequest;
    Reply: StaffMutationApiResponse;
  }>("/", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      body: CreateStaffRequest,
      response: {
        200: StaffMutationApiResponse,
        400: StaffMutationApiResponse,
        401: StaffMutationApiResponse,
        403: StaffMutationApiResponse,
        409: StaffMutationApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const data = await staffService.createStaff(request.user!, request.body);
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create staff";
        const status = statusFor(message, 400);
        reply.status(status);
        request.log.error(error, "POST /staff failed");
        return { success: false, error: message };
      }
    },
  });

  /**
   * PATCH /staff/:userId
   * Manager-only. Full-replace edit of a staff member (name, phone, role,
   * branch, access_granted, address, notes).
   */
  fastify.patch<{
    Params: { userId: string };
    Body: UpdateStaffRequest;
    Reply: StaffMutationApiResponse;
  }>("/:userId", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      body: UpdateStaffRequest,
      response: {
        200: StaffMutationApiResponse,
        400: StaffMutationApiResponse,
        401: StaffMutationApiResponse,
        403: StaffMutationApiResponse,
        404: StaffMutationApiResponse,
        409: StaffMutationApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const data = await staffService.updateStaff(
          request.user!,
          request.params.userId,
          request.body,
        );
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update staff";
        const status = statusFor(message, 400);
        reply.status(status);
        request.log.error(error, "PATCH /staff/:userId failed");
        return { success: false, error: message };
      }
    },
  });

  /**
   * PATCH /staff/:userId/access
   * Manager-only. Toggle access_granted. Reuses updateStaff so self-protection
   * + last-manager guard both apply.
   */
  fastify.patch<{
    Params: { userId: string };
    Body: SetStaffAccessRequest;
    Reply: StaffAccessApiResponse;
  }>("/:userId/access", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      body: SetStaffAccessRequest,
      response: {
        200: StaffAccessApiResponse,
        400: StaffAccessApiResponse,
        401: StaffAccessApiResponse,
        403: StaffAccessApiResponse,
        404: StaffAccessApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const data = await staffService.setStaffAccess(
          request.user!,
          request.params.userId,
          request.body.access_granted,
        );
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to toggle staff access";
        const status = statusFor(message, 400);
        reply.status(status);
        request.log.error(error, "PATCH /staff/:userId/access failed");
        return { success: false, error: message };
      }
    },
  });

  /**
   * DELETE /staff/:userId
   * Manager-only. Soft-delete — tombstones users + linked staff + role rows.
   * Self-protection + last-manager guard apply.
   */
  fastify.delete<{
    Params: { userId: string };
    Reply: StaffDeleteApiResponse;
  }>("/:userId", {
    preHandler: [requireAuth, requireRoles("manager")],
    schema: {
      response: {
        200: StaffDeleteApiResponse,
        400: StaffDeleteApiResponse,
        401: StaffDeleteApiResponse,
        403: StaffDeleteApiResponse,
        404: StaffDeleteApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const data = await staffService.deleteStaff(
          request.user!,
          request.params.userId,
        );
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete staff";
        const status = statusFor(message, 400);
        reply.status(status);
        request.log.error(error, "DELETE /staff/:userId failed");
        return { success: false, error: message };
      }
    },
  });
}

/**
 * Map a service-layer error message to an HTTP status. Heuristics only —
 * the service throws Error with a stable substring ("not found", "Forbidden",
 * "already exists", "another staff member", "at least one manager").
 */
function statusFor(message: string, fallback: number): number {
  const lower = message.toLowerCase();
  if (lower.includes("not found")) return 404;
  if (lower.startsWith("forbidden") || lower.includes("your own")) return 403;
  if (
    lower.includes("already exists") ||
    lower.includes("already uses") ||
    lower.includes("at least one manager must remain")
  ) {
    return 409;
  }
  return fallback;
}