import { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware";
import { storageService } from "../../services/storage.service";
import {
  CreateUploadUrlRequest,
  CreateDownloadUrlRequest,
  DeleteStorageRequest,
  UploadUrlApiResponse,
  DownloadUrlApiResponse,
  PublicUrlApiResponse,
  DeleteStorageApiResponse,
} from "../../schemas/storage.schema";

export default async function (fastify: FastifyInstance) {
  /**
   * POST /storage/upload-url
   * Returns a short-lived signed upload URL + the object's eventual public URL.
   * The path is generated server-side so clients can't pick arbitrary paths.
   */
  fastify.post<{
    Body: CreateUploadUrlRequest;
    Reply: UploadUrlApiResponse;
  }>("/upload-url", {
    preHandler: [requireAuth],
    schema: {
      body: CreateUploadUrlRequest,
      response: {
        200: UploadUrlApiResponse,
        401: UploadUrlApiResponse,
        400: UploadUrlApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const body = request.body;
        const result = await storageService.createUploadUrl({
          bucket: body.bucket,
          folder: body.folder,
          id: body.id,
          contentType: body.contentType,
          upsert: body.upsert,
          expiresIn: body.expiresIn,
        });
        return { success: true, data: result };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create upload URL";
        request.log.error(error, "POST /storage/upload-url failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * POST /storage/download-url
   * Returns a short-lived signed download URL for a (private) object.
   */
  fastify.post<{
    Body: CreateDownloadUrlRequest;
    Reply: DownloadUrlApiResponse;
  }>("/download-url", {
    preHandler: [requireAuth],
    schema: {
      body: CreateDownloadUrlRequest,
      response: {
        200: DownloadUrlApiResponse,
        401: DownloadUrlApiResponse,
        400: DownloadUrlApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const body = request.body;
        const url = await storageService.createDownloadUrl(
          body.bucket,
          body.path,
          body.expiresIn,
        );
        return { success: true, data: { url } };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create download URL";
        request.log.error(error, "POST /storage/download-url failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * POST /storage/delete
   * Deletes one or more objects by path, or a single object by public URL.
   */
  fastify.post<{
    Body: DeleteStorageRequest;
    Reply: DeleteStorageApiResponse;
  }>("/delete", {
    preHandler: [requireAuth],
    schema: {
      body: DeleteStorageRequest,
      response: {
        200: DeleteStorageApiResponse,
        401: DeleteStorageApiResponse,
        400: DeleteStorageApiResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const body = request.body;
        let deleted = false;
        if (body.paths && body.paths.length > 0) {
          await storageService.deleteFiles(body.bucket, body.paths);
          deleted = true;
        } else if (body.url) {
          deleted = await storageService.deleteFileByUrl(body.bucket, body.url);
        }
        return { success: true, data: { deleted } };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete object";
        request.log.error(error, "POST /storage/delete failed");
        reply.status(400);
        return { success: false, error: message };
      }
    },
  });

  /**
   * GET /storage/public-url?bucket=&path=
   * Returns the public URL for an object (no network call).
   */
  fastify.get<{
    Querystring: { bucket: string; path: string };
    Reply: PublicUrlApiResponse;
  }>("/public-url", {
    preHandler: [requireAuth],
    schema: {
      querystring: {
        type: "object",
        properties: {
          bucket: { type: "string", minLength: 1 },
          path: { type: "string", minLength: 1 },
        },
        required: ["bucket", "path"],
      },
      response: {
        200: PublicUrlApiResponse,
        401: PublicUrlApiResponse,
      },
    },
    handler: async (request) => {
      const { bucket, path } = request.query;
      const publicUrl = storageService.getPublicUrl(bucket, path);
      return { success: true as const, data: { publicUrl } };
    },
  });
}
