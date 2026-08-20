import * as path from "path";
import { FastifyInstance } from "fastify";
import AutoLoad from "@fastify/autoload";
import cookie from "@fastify/cookie";

/* eslint-disable-next-line */
export interface AppOptions {}

export async function app(fastify: FastifyInstance, opts: AppOptions) {
  await fastify.register(cookie, {
    secret: process.env.REFRESH_TOKEN_SECRET || "dev-refresh-secret-change-in-production",
    parseOptions: {},
  });

  // Fastify 5's stock JSON parser rejects `Content-Type: application/json` + zero-byte body with FST_ERR_CTP_EMPTY_JSON_BODY BEFORE the handler runs; on response-schema unions without an error shape the framework then crashes serializing into FST_ERR_FAILED_ERROR_SERIALIZATION (HTTP 500). curl / RN fetch send application/json even on body-less DELETE — without this override those routes silently 500. Empty payload parses to undefined, matching the body: null contract.
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

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "plugins"),
    options: { ...opts },
  });

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "routes"),
    options: { ...opts },
  });
}
