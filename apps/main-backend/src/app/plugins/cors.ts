/**
 * CORS Plugin
 *
 * Configures Cross-Origin Resource Sharing (CORS) for the API.
 * Allows frontend applications to make requests to this API.
 */

import fp from "fastify-plugin";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

async function corsPlugin(fastify: FastifyInstance) {
  // Get allowed origins from environment
  const allowedOrigins = fastify.config.ALLOWED_ORIGINS.split(",").map(
    (origin) => origin.trim(),
  );

  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is in allowed list (exact match or wildcard)
      const isAllowed = allowedOrigins.some((allowedOrigin) => {
        // Global wildcard
        if (allowedOrigin === "*") {
          return true;
        }

        // Exact match
        if (allowedOrigin === origin) {
          return true;
        }

        // Subdomain wildcard (e.g., *.example.com)
        if (allowedOrigin.startsWith("*.")) {
          const domain = allowedOrigin.slice(2); // Remove "*."
          // Check if origin ends with the domain (with a dot to avoid partial matches)
          return (
            origin === `https://${domain}` ||
            origin === `http://${domain}` ||
            origin.endsWith(`.${domain}`)
          );
        }

        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        fastify.log.warn({ origin }, "CORS: Blocked origin");
        callback(new Error("Not allowed by CORS"), false);
      }
    },
    credentials: true, // Allow cookies
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-API-Key",
    ],
  });

  fastify.log.info({ allowedOrigins }, "CORS configured");
}

export default fp(corsPlugin, {
  name: "cors",
  dependencies: ["env"], // Requires env plugin to be loaded first
});
