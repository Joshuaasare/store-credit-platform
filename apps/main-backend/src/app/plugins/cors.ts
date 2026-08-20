import fp from "fastify-plugin";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

async function corsPlugin(fastify: FastifyInstance) {
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

      const isAllowed = allowedOrigins.some((allowedOrigin) => {
        if (allowedOrigin === "*") {
          return true;
        }

        if (allowedOrigin === origin) {
          return true;
        }

        // Subdomain wildcard (e.g., *.example.com) — match on dotted suffix to avoid partial matches.
        if (allowedOrigin.startsWith("*.")) {
          const domain = allowedOrigin.slice(2);
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
    credentials: true,
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
  dependencies: ["env"],
});