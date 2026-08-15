import * as path from "path";
import { FastifyInstance } from "fastify";
import AutoLoad from "@fastify/autoload";
import cookie from "@fastify/cookie";

/* eslint-disable-next-line */
export interface AppOptions {}

export async function app(fastify: FastifyInstance, opts: AppOptions) {
  // Register cookie plugin for httpOnly refresh token storage
  await fastify.register(cookie, {
    secret: process.env.REFRESH_TOKEN_SECRET || "dev-refresh-secret-change-in-production",
    parseOptions: {},
  });

  // Replace Fastify's default JSON body parser with a tolerant one
  // that accepts empty payloads. Fastify 5's stock parser rejects
  // `Content-Type: application/json` + zero-byte body with
  // `FST_ERR_CTP_EMPTY_JSON_BODY` BEFORE the route handler runs —
  // and on routes that declare a response-schema union without an
  // error shape, the framework then crashes serializing the error
  // into `FST_ERR_FAILED_ERROR_SERIALIZATION` (HTTP 500). Several
  // clients (curl, RN fetch when callers forget to drop the
  // header, etc.) send `Content-Type: application/json` even on
  // body-less DELETE — without this override, our cancel endpoint
  // and any future body-less DELETE silently 500. The new parser
  // treats an empty payload as `undefined`, matching the
  // documented contract for `body: null` schemas.
  fastify.removeContentTypeParser("application/json");
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => {
      const raw = typeof body === "string" ? body : body.toString("utf8");
      if (raw.length === 0) {
        done(null, undefined);
        return;
      }
      try {
        done(null, JSON.parse(raw));
      } catch (err) {
        done(err as Error);
      }
    },
  );

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "plugins"),
    options: { ...opts },
  });

  // This loads all plugins defined in routes
  // define your routes in one of these
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "routes"),
    options: { ...opts },
  });
}
