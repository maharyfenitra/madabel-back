import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleGetMyProfile = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const userPayload = (request as any).user;

  const user = await prisma.user.findUnique({
    where: { id: userPayload.userId },
    include: {
      vehicles: true,
      pricings: true
    },
  });

  return reply.status(200).send(user);
};
