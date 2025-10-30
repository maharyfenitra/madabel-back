import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleFindUsers = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const userPayload = (request as any).user;

  const users = await prisma.user.findMany({
    where: {
      AND: {
        NOT: { id: userPayload.userId },
      },
    },

    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
    },
  });

  return reply.status(200).send(users);
};
