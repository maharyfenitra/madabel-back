import type { FastifyReply, FastifyRequest } from "fastify";

// Logout
export const handleTest = async (req: FastifyRequest, reply: FastifyReply) => {
  return reply.status(200).send({ ok: "ok" });
};
