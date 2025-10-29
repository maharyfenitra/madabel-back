import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../../utils";

export const handleGetUserDetails = async (
  request: FastifyRequest<{ Params: { id: number } }>,
  reply: FastifyReply
) => {
  const { id } = request.params;

  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
    include: { vehicles: true },
  });

  return reply.status(200).send(user);
};
