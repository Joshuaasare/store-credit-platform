import fp from "fastify-plugin";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

export default fp(async function (fastify) {
  fastify.withTypeProvider<TypeBoxTypeProvider>();
});
