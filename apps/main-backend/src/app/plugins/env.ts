import fp from "fastify-plugin";
import fastifyEnv from "@fastify/env";
import type { FastifyInstance } from "fastify";

const schema = {
  type: "object",
  properties: {
    NODE_ENV: {
      type: "string",
      default: "development",
      enum: ["development", "production", "test"],
    },
    HOST: {
      type: "string",
      default: "localhost",
    },
    PORT: {
      type: "string",
      default: "3000",
    },
    SUPABASE_URL: {
      type: "string",
      description: "Supabase project URL",
    },
    SUPABASE_PUBLISHABLE_KEY: {
      type: "string",
      description: "Supabase anonymous key (for client operations)",
    },
    SUPABASE_SECRET_KEY: {
      type: "string",
      description: "Supabase service role key (for admin operations)",
    },
    SMS_PROVIDER: {
      type: "string",
      default: "twilio",
      enum: ["twilio", "hubtel", "none"],
    },
    TWILIO_ACCOUNT_SID: {
      type: "string",
      default: "",
    },
    TWILIO_AUTH_TOKEN: {
      type: "string",
      default: "",
    },
    TWILIO_PHONE_NUMBER: {
      type: "string",
      default: "",
    },
    HUBTEL_CLIENT_ID: {
      type: "string",
      default: "",
    },
    HUBTEL_CLIENT_SECRET: {
      type: "string",
      default: "",
    },
    HUBTEL_SENDER_ID: {
      type: "string",
      default: "SmartSchool",
    },
    JWT_SECRET: {
      type: "string",
      default: "change-this-in-production",
    },
    API_KEY: {
      type: "string",
      default: "",
      description: "API key for authenticating client applications",
    },
    LOG_LEVEL: {
      type: "string",
      default: "info",
      enum: ["debug", "info", "warn", "error"],
    },
    ALLOWED_ORIGINS: {
      type: "string",
      default:
        "http://localhost:4200,http://localhost:3000,http://localhost:4201",
      description: "Comma-separated list of allowed origins",
    },
  },
};

declare module "fastify" {
  interface FastifyInstance {
    config: {
      NODE_ENV: "development" | "production" | "test";
      HOST: string;
      PORT: string;
      SUPABASE_URL: string;
      SUPABASE_PUBLISHABLE_KEY: string;
      SUPABASE_SECRET_KEY: string;
      SMS_PROVIDER: "twilio" | "hubtel" | "none";
      TWILIO_ACCOUNT_SID: string;
      TWILIO_AUTH_TOKEN: string;
      TWILIO_PHONE_NUMBER: string;
      HUBTEL_CLIENT_ID: string;
      HUBTEL_CLIENT_SECRET: string;
      HUBTEL_SENDER_ID: string;
      JWT_SECRET: string;
      API_KEY: string;
      LOG_LEVEL: "debug" | "info" | "warn" | "error";
      ALLOWED_ORIGINS: string;
    };
  }
}

async function envPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyEnv, {
    schema,
    dotenv: true,
    confKey: "config",
  });

  fastify.log.info(
    {
      NODE_ENV: fastify.config.NODE_ENV,
      HOST: fastify.config.HOST,
      PORT: fastify.config.PORT,
      SUPABASE_URL: fastify.config.SUPABASE_URL,
      SMS_PROVIDER: fastify.config.SMS_PROVIDER,
    },
    "Environment configuration loaded",
  );

  if (fastify.config.NODE_ENV === "production") {
    if (fastify.config.JWT_SECRET === "change-this-in-production") {
      fastify.log.warn(
        "Using default JWT_SECRET in production! Please set a secure value.",
      );
    }
    if (!fastify.config.API_KEY) {
      fastify.log.warn(
        "No API_KEY set in production! Client authentication will be disabled.",
      );
    }
  }
}

export default fp(envPlugin, {
  name: "env",
});