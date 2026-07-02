import fp from "fastify-plugin";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

/**
 * TypeBox Type Provider Plugin
 * Enables automatic type inference from TypeBox schemas
 */
export default fp(async function (fastify) {
  // Register TypeBox as the type provider
  fastify.withTypeProvider<TypeBoxTypeProvider>();
});
